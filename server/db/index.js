import { createClient } from '@libsql/client'
import { Pool } from 'pg'
import { log, serializeError } from '../logger.js'

const LIBSQL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS establishments (
  id TEXT PRIMARY KEY,
  name TEXT,
  city TEXT,
  uf TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  status TEXT DEFAULT 'active',
  billing_status TEXT DEFAULT 'paid',
  paid_until TEXT,
  plan TEXT,
  support_contact TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS categories (
  id TEXT,
  establishment_id TEXT,
  name TEXT,
  image_url TEXT,
  active INTEGER DEFAULT 1,
  PRIMARY KEY (id, establishment_id)
);
CREATE TABLE IF NOT EXISTS products (
  id TEXT,
  establishment_id TEXT,
  category_id TEXT,
  name TEXT,
  desc_short TEXT,
  notes TEXT,
  image_url TEXT,
  base_price REAL,
  promo_active INTEGER,
  promo_price REAL,
  status TEXT,
  available INTEGER,
  prep_time_min INTEGER,
  stock_qty INTEGER,
  auto_stock_control INTEGER,
  sku TEXT,
  created_at TEXT,
  updated_at TEXT,
  PRIMARY KEY (id, establishment_id)
);
CREATE TABLE IF NOT EXISTS product_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT,
  establishment_id TEXT,
  action TEXT,
  by_user_id TEXT,
  changed_keys_json TEXT,
  at TEXT
);
`

const POSTGRES_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS establishments (
  id TEXT PRIMARY KEY,
  name TEXT,
  city TEXT,
  uf TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  status TEXT DEFAULT 'active',
  billing_status TEXT DEFAULT 'paid',
  paid_until TEXT,
  plan TEXT,
  support_contact TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS categories (
  id TEXT NOT NULL,
  establishment_id TEXT NOT NULL,
  name TEXT,
  image_url TEXT,
  active INTEGER DEFAULT 1,
  PRIMARY KEY (id, establishment_id)
);
CREATE TABLE IF NOT EXISTS products (
  id TEXT NOT NULL,
  establishment_id TEXT NOT NULL,
  category_id TEXT,
  name TEXT,
  desc_short TEXT,
  notes TEXT,
  image_url TEXT,
  base_price DOUBLE PRECISION,
  promo_active INTEGER,
  promo_price DOUBLE PRECISION,
  status TEXT,
  available INTEGER,
  prep_time_min INTEGER,
  stock_qty INTEGER,
  auto_stock_control INTEGER,
  sku TEXT,
  created_at TEXT,
  updated_at TEXT,
  PRIMARY KEY (id, establishment_id)
);
CREATE TABLE IF NOT EXISTS product_history (
  id BIGSERIAL PRIMARY KEY,
  product_id TEXT,
  establishment_id TEXT,
  action TEXT,
  by_user_id TEXT,
  changed_keys_json TEXT,
  at TEXT
);
`

let dbInstance
let libsqlClient
let sqliteConnection
let postgresPool

const SUPPORTED_PROVIDERS = new Set(['auto', 'libsql', 'postgres', 'sqlite'])

const splitStatements = (sql) => String(sql)
  .split(';')
  .map((statement) => statement.trim())
  .filter(Boolean)

const toPgStatement = (sql, args = []) => {
  let placeholderIndex = 0
  return {
    text: String(sql).replace(/\?/g, () => `$${++placeholderIndex}`),
    values: args,
  }
}

const createStatementAdapter = (executor, sql) => ({
  get: async (...args) => {
    const result = await executor({ sql, args })
    return result.rows?.[0] || undefined
  },
  all: async (...args) => {
    const result = await executor({ sql, args })
    return result.rows || []
  },
  run: async (...args) => executor({ sql, args }),
})

const createLibsqlDb = (config) => {
  if (!libsqlClient) {
    libsqlClient = createClient({
      url: config.database.libsqlUrl,
      authToken: config.database.libsqlToken,
    })
  }

  return {
    mode: 'libsql',
    schemaSql: LIBSQL_SCHEMA_SQL,
    prepare: (sql) => createStatementAdapter((statement) => libsqlClient.execute(statement), sql),
    exec: async (sql) => {
      for (const statement of splitStatements(sql)) {
        await libsqlClient.execute(statement)
      }
    },
    healthcheck: async () => libsqlClient.execute('SELECT 1 AS ok'),
    transaction: async (work) => {
      const tx = libsqlClient.transaction('write')
      const txDb = {
        mode: 'libsql',
        prepare: (sql) => createStatementAdapter((statement) => tx.execute(statement), sql),
        exec: async (sql) => {
          for (const statement of splitStatements(sql)) {
            await tx.execute(statement)
          }
        },
      }

      try {
        const result = await work(txDb)
        await tx.commit()
        return result
      } catch (error) {
        try {
          await tx.rollback()
        } catch (rollbackError) {
          log('error', 'db.transaction.rollback_failed', {
            driver: 'libsql',
            error: serializeError(rollbackError),
          })
        }
        throw error
      } finally {
        try {
          tx.close()
        } catch (closeError) {
          log('error', 'db.transaction.close_failed', {
            driver: 'libsql',
            error: serializeError(closeError),
          })
        }
      }
    },
  }
}

const createSqliteDb = async (config) => {
  if (!sqliteConnection) {
    const { default: BetterSqlite3 } = await import('better-sqlite3')
    sqliteConnection = new BetterSqlite3(config.database.sqliteFile)
  }

  const createPrepare = (connection) => (sql) => {
    const stmt = connection.prepare(sql)
    return {
      get: async (...args) => stmt.get(...args),
      all: async (...args) => stmt.all(...args),
      run: async (...args) => stmt.run(...args),
    }
  }

  return {
    mode: 'sqlite',
    schemaSql: LIBSQL_SCHEMA_SQL,
    prepare: createPrepare(sqliteConnection),
    exec: async (sql) => {
      sqliteConnection.exec(sql)
    },
    healthcheck: async () => sqliteConnection.prepare('SELECT 1 AS ok').get(),
    transaction: async (work) => {
      sqliteConnection.exec('BEGIN IMMEDIATE')
      const txDb = {
        mode: 'sqlite',
        prepare: createPrepare(sqliteConnection),
        exec: async (sql) => {
          sqliteConnection.exec(sql)
        },
      }

      try {
        const result = await work(txDb)
        sqliteConnection.exec('COMMIT')
        return result
      } catch (error) {
        try {
          sqliteConnection.exec('ROLLBACK')
        } catch (rollbackError) {
          log('error', 'db.transaction.rollback_failed', {
            driver: 'sqlite',
            error: serializeError(rollbackError),
          })
        }
        throw error
      }
    },
  }
}

const createPostgresDb = (config) => {
  if (!postgresPool) {
    postgresPool = new Pool({
      connectionString: config.database.postgresUrl,
      max: config.database.maxPoolSize,
      idleTimeoutMillis: config.database.idleTimeoutMs,
      connectionTimeoutMillis: config.database.connectionTimeoutMs,
    })
  }

  const createPrepare = (clientOrPool) => (sql) => ({
    get: async (...args) => {
      const result = await clientOrPool.query(toPgStatement(sql, args))
      return result.rows?.[0] || undefined
    },
    all: async (...args) => {
      const result = await clientOrPool.query(toPgStatement(sql, args))
      return result.rows || []
    },
    run: async (...args) => clientOrPool.query(toPgStatement(sql, args)),
  })

  return {
    mode: 'postgres',
    schemaSql: POSTGRES_SCHEMA_SQL,
    prepare: createPrepare(postgresPool),
    exec: async (sql) => {
      for (const statement of splitStatements(sql)) {
        await postgresPool.query(statement)
      }
    },
    healthcheck: async () => postgresPool.query('SELECT 1 AS ok'),
    transaction: async (work) => {
      const client = await postgresPool.connect()
      await client.query('BEGIN')
      const txDb = {
        mode: 'postgres',
        prepare: createPrepare(client),
        exec: async (sql) => {
          for (const statement of splitStatements(sql)) {
            await client.query(statement)
          }
        },
      }

      try {
        const result = await work(txDb)
        await client.query('COMMIT')
        return result
      } catch (error) {
        try {
          await client.query('ROLLBACK')
        } catch (rollbackError) {
          log('error', 'db.transaction.rollback_failed', {
            driver: 'postgres',
            error: serializeError(rollbackError),
          })
        }
        throw error
      } finally {
        client.release()
      }
    },
  }
}

const resolveProvider = (config) => {
  const provider = config.database.provider
  if (!SUPPORTED_PROVIDERS.has(provider)) {
    throw new Error(`DB_PROVIDER invalido: "${provider}". Use auto, libsql, postgres ou sqlite.`)
  }
  if (provider !== 'auto') return provider

  if (config.database.libsqlUrl || config.database.libsqlToken) return 'libsql'
  if (config.database.postgresUrl) return 'postgres'
  return 'sqlite'
}

const assertProviderConfiguration = (config, provider) => {
  const hasAnyLibsqlConfig = Boolean(config.database.libsqlUrl || config.database.libsqlToken)
  const hasCompleteLibsqlConfig = Boolean(config.database.libsqlUrl && config.database.libsqlToken)

  if (hasAnyLibsqlConfig && !hasCompleteLibsqlConfig) {
    throw new Error('LIBSQL_DB_URL e LIBSQL_DB_TOKEN devem ser configurados juntos.')
  }

  if (provider === 'libsql' && !hasCompleteLibsqlConfig) {
    throw new Error('DB_PROVIDER=libsql requer LIBSQL_DB_URL e LIBSQL_DB_TOKEN.')
  }

  if (provider === 'postgres' && !config.database.postgresUrl) {
    throw new Error('DB_PROVIDER=postgres requer DATABASE_URL.')
  }

  if (
    provider === 'sqlite' &&
    (config.env.isServerless || config.env.isProduction) &&
    !config.database.allowSqliteFallback &&
    !config.database.allowSqliteInServerless
  ) {
    throw new Error('SQLite local nao e permitido em producao. Configure LIBSQL_DB_URL/LIBSQL_DB_TOKEN ou DATABASE_URL, ou use ALLOW_SQLITE_FALLBACK=true apenas conscientemente.')
  }
}

export const getDatabase = async (config) => {
  if (dbInstance) return dbInstance

  const provider = resolveProvider(config)
  assertProviderConfiguration(config, provider)

  if (provider === 'libsql') {
    dbInstance = createLibsqlDb(config)
    return dbInstance
  }

  if (provider === 'postgres') {
    dbInstance = createPostgresDb(config)
    return dbInstance
  }

  dbInstance = await createSqliteDb(config)
  return dbInstance
}
