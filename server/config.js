import path from 'node:path'

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toBool = (value, fallback = false) => {
  if (value == null || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

const runtimeMode = process.env.APP_RUNTIME_MODE ||
  (process.env.VERCEL === '1' ? 'serverless' : 'server')
const nodeEnv = process.env.NODE_ENV || 'development'
const isProduction = nodeEnv === 'production'
const isServerless = runtimeMode === 'serverless'

const databaseProvider = (process.env.DB_PROVIDER || 'auto').toLowerCase()
const serverPort = toInt(process.env.PORT || process.env.SERVER_PORT, 3001)
const frontendPort = toInt(process.env.VITE_PORT, 5173)
const frontendDistDir = process.env.FRONTEND_DIST_DIR || path.join(process.cwd(), 'dist')

export const appConfig = {
  env: {
    nodeEnv,
    isProduction,
    isServerless,
    vercelEnv: process.env.VERCEL_ENV || '',
  },
  server: {
    port: serverPort,
    host: process.env.SERVER_HOST || '0.0.0.0',
    frontendDistDir,
    requestBodyLimit: process.env.REQUEST_BODY_LIMIT || '10mb',
    usageStatsToken: process.env.USAGE_STATS_TOKEN || '',
  },
  frontend: {
    port: frontendPort,
    localApiTarget: process.env.VITE_LOCAL_API_TARGET || `http://localhost:${serverPort}`,
  },
  database: {
    provider: databaseProvider,
    libsqlUrl: process.env.LIBSQL_DB_URL || '',
    libsqlToken: process.env.LIBSQL_DB_TOKEN || '',
    sqliteFile: process.env.SQLITE_DB_FILE || 'data.sqlite',
    postgresUrl: process.env.DATABASE_URL || '',
    retryAttempts: toInt(process.env.DB_RETRY_ATTEMPTS, 3),
    retryBaseDelayMs: toInt(process.env.DB_RETRY_BASE_DELAY_MS, 150),
    retryMaxDelayMs: toInt(process.env.DB_RETRY_MAX_DELAY_MS, 600),
    maxPoolSize: toInt(process.env.DB_POOL_MAX, 10),
    idleTimeoutMs: toInt(process.env.DB_POOL_IDLE_TIMEOUT_MS, 10000),
    connectionTimeoutMs: toInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS, 3000),
    allowSqliteInServerless: toBool(process.env.ALLOW_SQLITE_IN_SERVERLESS, false),
  },
  auth: {
    adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || '',
  },
  integrations: {
    apiUpstreamUrl: process.env.API_UPSTREAM_URL || '',
    defaultWhatsappNumber: process.env.VITE_DEFAULT_WHATSAPP_NUMBER || '',
    defaultAdminPassword: process.env.VITE_DEFAULT_ADMIN_PASSWORD || '',
  },
}
