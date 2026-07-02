import path from 'node:path'

const normalizeEnvString = (value, fallback = '') => {
  if (value == null) return fallback
  const trimmed = String(value).trim()
  if (!trimmed) return fallback

  const hasMatchingQuotes =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))

  return hasMatchingQuotes ? trimmed.slice(1, -1).trim() : trimmed
}

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toBool = (value, fallback = false) => {
  if (value == null || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(normalizeEnvString(value).toLowerCase())
}

const runtimeMode = normalizeEnvString(process.env.APP_RUNTIME_MODE) ||
  (normalizeEnvString(process.env.VERCEL) === '1' ? 'serverless' : 'server')
const nodeEnv = normalizeEnvString(process.env.NODE_ENV, 'development')
const isProduction = nodeEnv === 'production'
const isServerless = runtimeMode === 'serverless'

const databaseProvider = normalizeEnvString(process.env.DB_PROVIDER, 'auto').toLowerCase()
const serverPort = toInt(normalizeEnvString(process.env.PORT) || normalizeEnvString(process.env.SERVER_PORT), 3001)
const frontendPort = toInt(normalizeEnvString(process.env.VITE_PORT), 5173)
const frontendDistDir = normalizeEnvString(process.env.FRONTEND_DIST_DIR) || path.join(process.cwd(), 'dist')

export const appConfig = {
  env: {
    nodeEnv,
    isProduction,
    isServerless,
    vercelEnv: normalizeEnvString(process.env.VERCEL_ENV),
  },
  server: {
    port: serverPort,
    host: normalizeEnvString(process.env.SERVER_HOST, '0.0.0.0'),
    frontendDistDir,
    requestBodyLimit: normalizeEnvString(process.env.REQUEST_BODY_LIMIT, '10mb'),
    usageStatsToken: normalizeEnvString(process.env.USAGE_STATS_TOKEN),
  },
  frontend: {
    port: frontendPort,
    localApiTarget: normalizeEnvString(process.env.VITE_LOCAL_API_TARGET) || `http://localhost:${serverPort}`,
  },
  database: {
    provider: databaseProvider,
    libsqlUrl: normalizeEnvString(process.env.LIBSQL_DB_URL),
    libsqlToken: normalizeEnvString(process.env.LIBSQL_DB_TOKEN),
    sqliteFile: normalizeEnvString(process.env.SQLITE_DB_FILE, 'data.sqlite'),
    postgresUrl: normalizeEnvString(process.env.DATABASE_URL),
    retryAttempts: toInt(normalizeEnvString(process.env.DB_RETRY_ATTEMPTS), 3),
    retryBaseDelayMs: toInt(normalizeEnvString(process.env.DB_RETRY_BASE_DELAY_MS), 150),
    retryMaxDelayMs: toInt(normalizeEnvString(process.env.DB_RETRY_MAX_DELAY_MS), 600),
    maxPoolSize: toInt(normalizeEnvString(process.env.DB_POOL_MAX), 10),
    idleTimeoutMs: toInt(normalizeEnvString(process.env.DB_POOL_IDLE_TIMEOUT_MS), 10000),
    connectionTimeoutMs: toInt(normalizeEnvString(process.env.DB_POOL_CONNECTION_TIMEOUT_MS), 3000),
    allowSqliteInServerless: toBool(process.env.ALLOW_SQLITE_IN_SERVERLESS, false),
  },
  auth: {
    adminPasswordHash: normalizeEnvString(process.env.ADMIN_PASSWORD_HASH),
  },
  integrations: {
    apiUpstreamUrl: normalizeEnvString(process.env.API_UPSTREAM_URL),
    defaultWhatsappNumber: normalizeEnvString(process.env.VITE_DEFAULT_WHATSAPP_NUMBER),
    defaultAdminPassword: normalizeEnvString(process.env.VITE_DEFAULT_ADMIN_PASSWORD),
  },
}
