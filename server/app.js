import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import path from 'node:path'
import { appConfig } from './config.js'
import { getDatabase } from './db/index.js'
import { log, serializeError } from './logger.js'
import { registerOrderRoutes } from './orders-api.js'
import { createUsageStats } from './usage-stats.js'

const usageStats = createUsageStats()
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const nowIso = () => new Date().toISOString()
const toBool = (value) => !!(value && (value === 1 || value === true || value === 'true'))

const isRetryableDbError = (error) => {
  const message = String(error?.message || error || '').toLowerCase()
  const code = String(error?.code || error?.errno || '').toUpperCase()

  if (!message && !code) return false
  if (code === 'SQLITE_BUSY' || code === 'SQLITE_LOCKED') return true
  if (message.includes('database is locked')) return true

  return [
    'timeout',
    'timed out',
    'network',
    'fetch failed',
    'socket',
    'temporarily unavailable',
    'connection reset',
    'connection aborted',
    'connection refused',
    'too many requests',
    'service unavailable',
    'internal server error',
    'bad gateway',
    'gateway timeout',
    'econnreset',
    'econnrefused',
    'etimedout',
    'ehostunreach',
    'enotfound',
  ].some((token) => message.includes(token))
}

const handleDbError = (res, error, context = {}) => {
  if (error?.publicBody) {
    log('error', 'api.public_error', {
      ...context,
      status: error.httpStatus || 400,
      error: serializeError(error),
    })
    if (!res.headersSent) {
      res.status(error.httpStatus || 400).json(error.publicBody)
    }
    return
  }

  const retryable = error?.retryable ?? isRetryableDbError(error)
  const status = retryable ? 503 : 500
  const body = retryable
    ? { error: 'db_unavailable', message: 'Banco de dados indisponivel no momento. Tente novamente em instantes.' }
    : { error: 'db_error', message: 'Falha ao acessar o banco de dados.' }

  log('error', 'api.db_error', {
    ...context,
    retryable,
    error: serializeError(error),
  })

  if (!res.headersSent) {
    res.status(status).json(body)
  }
}

const asyncRoute = (handler) => async (req, res) => {
  try {
    await handler(req, res)
  } catch (error) {
    handleDbError(res, error, {
      method: req.method,
      path: req.originalUrl,
    })
  }
}

const normalizeRequestKey = (req) => `${req.method} ${req.path}`

const withDbRetry = async ({
  label,
  operation,
  context = {},
  writeKey = '',
  attempts = appConfig.database.retryAttempts,
}) => {
  let attempt = 0

  while (attempt < attempts) {
    attempt += 1

    try {
      const result = await operation()
      if (writeKey) {
        usageStats.recordDbWrite({ key: writeKey })
      }
      return result
    } catch (error) {
      const retryable = isRetryableDbError(error)
      const remainingAttempts = attempts - attempt

      log('error', 'db.operation.failed', {
        label,
        attempt,
        remainingAttempts,
        retryable,
        ...context,
        error: serializeError(error),
      })

      if (!retryable || remainingAttempts <= 0) {
        error.retryAttempts = attempt
        error.retryable = retryable
        throw error
      }

      const delayMs = Math.min(
        appConfig.database.retryBaseDelayMs * (2 ** (attempt - 1)),
        appConfig.database.retryMaxDelayMs,
      )
      await sleep(delayMs)
    }
  }
}

const ensureUsageStatsAccess = (req, res) => {
  const expectedToken = appConfig.server.usageStatsToken
  if (!expectedToken) return true

  const token = req.get('x-usage-stats-token') || req.query.token
  if (token === expectedToken) return true

  res.status(401).json({ error: 'unauthorized' })
  return false
}

export const createApp = async () => {
  log('info', 'env.bootstrap', {
    node: process.version,
    node_env: appConfig.env.nodeEnv,
    runtime_mode: appConfig.env.isServerless ? 'serverless' : 'server',
    db_provider: appConfig.database.provider,
    has_libsql_url: Boolean(appConfig.database.libsqlUrl),
    has_postgres_url: Boolean(appConfig.database.postgresUrl),
  })

  const database = await getDatabase(appConfig)
  await withDbRetry({
    label: 'schema.bootstrap',
    operation: () => database.exec(database.schemaSql),
    context: { driver: database.mode },
    writeKey: 'schema.bootstrap',
  })

  const app = express()
  app.use(cors())
  app.use(bodyParser.json({ limit: appConfig.server.requestBodyLimit }))
  app.use(bodyParser.urlencoded({ limit: appConfig.server.requestBodyLimit, extended: true }))
  app.use((req, res, next) => {
    res.on('finish', () => {
      usageStats.recordRequest({ key: normalizeRequestKey(req) })
    })
    next()
  })

  app.get('/', (req, res) => res.status(200).send('ok'))

  const healthHandler = async (req, res) => {
    const startedAt = Date.now()

    try {
      await database.healthcheck()
      res.status(200).json({
        ok: true,
        database: {
          mode: database.mode,
          healthy: true,
        },
        latency_ms: Date.now() - startedAt,
      })
    } catch (error) {
      log('error', 'db.healthcheck.failed', {
        error: serializeError(error),
      })

      res.status(503).json({
        ok: false,
        database: {
          mode: database.mode,
          healthy: false,
        },
        error: 'db_unavailable',
        latency_ms: Date.now() - startedAt,
      })
    }
  }

  app.get('/health', healthHandler)
  app.get('/api/health', healthHandler)

  const estRow = await database.prepare('SELECT COUNT(*) as c FROM establishments').get()
  const estCount = Number(estRow?.c || 0)
  if (estCount === 0) {
    await withDbRetry({
      label: 'seed.establishment.default',
      operation: () => database.prepare('INSERT INTO establishments (id,name,city,uf,status,billing_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
        .run('default', 'Mundo Doce', 'Caieiras', 'SP', 'active', 'paid', nowIso(), nowIso()),
      context: { driver: database.mode },
      writeKey: 'seed.establishment.default',
    })
  }

  const usageStatsHandler = (req, res) => {
    if (!ensureUsageStatsAccess(req, res)) return
    res.json({
      ok: true,
      database_mode: database.mode,
      stats: usageStats.snapshot(),
    })
  }

  app.get('/admin/usage-stats', usageStatsHandler)
  app.get('/api/admin/usage-stats', usageStatsHandler)

  registerOrderRoutes({
    app,
    database,
    withDbRetry,
    asyncRoute,
  })

  app.get('/api/establishment/:id/status', asyncRoute(async (req, res) => {
    const { id } = req.params
    const row = await database.prepare('SELECT status, billing_status, name, support_contact FROM establishments WHERE id=?').get(id)
    if (!row) return res.status(404).json({ error: 'not_found' })
    res.json(row)
  }))

  app.post('/api/establishment', asyncRoute(async (req, res) => {
    const { id, name, city, uf, support_contact, avatar_url, cover_url } = req.body || {}
    if (!id || String(id).trim().length === 0) return res.status(400).json({ error: 'missing_id' })

    const now = nowIso()
    const exists = await database.prepare('SELECT id FROM establishments WHERE id=?').get(id)

    await withDbRetry({
      label: exists ? 'establishment.update' : 'establishment.create',
      context: { establishment_id: id, driver: database.mode },
      writeKey: exists ? 'establishment.update' : 'establishment.create',
      operation: () => exists
        ? database.prepare('UPDATE establishments SET name=?, city=?, uf=?, support_contact=?, avatar_url=?, cover_url=?, updated_at=? WHERE id=?')
          .run(name || null, city || null, uf || null, support_contact || null, avatar_url || null, cover_url || null, now, id)
        : database.prepare('INSERT INTO establishments (id,name,city,uf,avatar_url,cover_url,status,billing_status,support_contact,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
          .run(id, name || null, city || null, uf || null, avatar_url || null, cover_url || null, 'active', 'paid', support_contact || null, now, now),
    })

    res.json({ ok: true })
  }))

  app.get('/api/establishment/:id', asyncRoute(async (req, res) => {
    const { id } = req.params
    const row = await database.prepare('SELECT id,name,city,uf,avatar_url,cover_url,status,billing_status,paid_until,plan,support_contact,created_at,updated_at FROM establishments WHERE id=?').get(id)
    if (!row) return res.status(404).json({ error: 'not_found' })
    res.json(row)
  }))

  app.get('/api/categorias', asyncRoute(async (req, res) => {
    const { establishment_id } = req.query
    const rows = await database.prepare('SELECT * FROM categories WHERE establishment_id=? AND active=1').all(establishment_id)
    res.json(rows)
  }))

  app.post('/api/categorias', asyncRoute(async (req, res) => {
    const { establishment_id, id, name, image_url } = req.body || {}
    if (!establishment_id || !id || !name) return res.status(400).json({ error: 'invalid' })

    await withDbRetry({
      label: 'category.create',
      context: { establishment_id, category_id: id, driver: database.mode },
      writeKey: 'category.create',
      operation: () => database.prepare('INSERT INTO categories (id,establishment_id,name,image_url,active) VALUES (?,?,?,?,1)')
        .run(id, establishment_id, name, image_url || null),
    })

    res.json({ ok: true })
  }))

  app.put('/api/categorias/:id', asyncRoute(async (req, res) => {
    const { id } = req.params
    const { establishment_id, name, image_url } = req.body || {}
    if (!establishment_id) return res.status(400).json({ error: 'missing_establishment_id' })

    const row = await database.prepare('SELECT * FROM categories WHERE id=? AND establishment_id=?').get(id, establishment_id)
    if (!row) return res.status(404).json({ error: 'not_found' })

    const next = {
      name: name ?? row.name,
      image_url: image_url ?? row.image_url,
    }

    await withDbRetry({
      label: 'category.update',
      context: { establishment_id, category_id: id, driver: database.mode },
      writeKey: 'category.update',
      operation: () => database.prepare('UPDATE categories SET name=?, image_url=? WHERE id=? AND establishment_id=?')
        .run(next.name, next.image_url, id, establishment_id),
    })

    res.json({ ok: true })
  }))

  app.get('/api/produtos', asyncRoute(async (req, res) => {
    const { establishment_id } = req.query
    const rows = await database.prepare('SELECT * FROM products WHERE establishment_id=?').all(establishment_id)
    res.json(rows)
  }))

  app.post('/api/produtos', asyncRoute(async (req, res) => {
    const product = req.body || {}
    const required = ['id', 'name', 'base_price', 'image_url', 'category_id', 'status', 'establishment_id']
    for (const key of required) {
      if (!product[key] && product[key] !== 0) return res.status(400).json({ error: `missing_${key}` })
    }

    if (Number(product.base_price) <= 0) return res.status(400).json({ error: 'price_must_be_positive' })
    const prep = parseInt(product.prep_time_min || 0, 10)
    if (!prep || prep < 1) return res.status(400).json({ error: 'prep_time_invalid' })

    const now = nowIso()
    await withDbRetry({
      label: 'product.create',
      context: { establishment_id: product.establishment_id, product_id: product.id, driver: database.mode },
      writeKey: 'product.create',
      operation: () => database.transaction(async (tx) => {
        await tx.prepare('INSERT INTO products (id,establishment_id,category_id,name,desc_short,notes,image_url,base_price,promo_active,promo_price,status,available,prep_time_min,stock_qty,auto_stock_control,sku,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
          .run(
            product.id,
            product.establishment_id,
            product.category_id,
            product.name,
            product.desc_short || null,
            product.notes || null,
            product.image_url,
            Number(product.base_price),
            toBool(product.promo_active) ? 1 : 0,
            product.promo_price != null ? Number(product.promo_price) : null,
            product.status,
            toBool(product.available) ? 1 : 0,
            prep,
            product.stock_qty != null ? parseInt(product.stock_qty, 10) : 0,
            toBool(product.auto_stock_control) ? 1 : 0,
            product.sku || null,
            now,
            now,
          )

        await tx.prepare('INSERT INTO product_history (product_id,establishment_id,action,by_user_id,changed_keys_json,at) VALUES (?,?,?,?,?,?)')
          .run(product.id, product.establishment_id, 'create', product.by_user_id || 'admin', null, now)
      }),
    })

    res.json({ ok: true })
  }))

  app.put('/api/produtos/:id', asyncRoute(async (req, res) => {
    const { id } = req.params
    const product = req.body || {}
    const row = await database.prepare('SELECT * FROM products WHERE id=? AND establishment_id=?').get(id, product.establishment_id)
    if (!row) return res.status(404).json({ error: 'not_found' })

    const now = nowIso()
    const next = {
      name: product.name ?? row.name,
      desc_short: product.desc_short ?? row.desc_short,
      notes: product.notes ?? row.notes,
      image_url: product.image_url ?? row.image_url,
      base_price: product.base_price != null ? Number(product.base_price) : row.base_price,
      promo_active: product.promo_active != null ? (toBool(product.promo_active) ? 1 : 0) : row.promo_active,
      promo_price: product.promo_price != null ? Number(product.promo_price) : row.promo_price,
      status: product.status ?? row.status,
      available: product.available != null ? (toBool(product.available) ? 1 : 0) : row.available,
      prep_time_min: product.prep_time_min != null ? parseInt(product.prep_time_min, 10) : row.prep_time_min,
      stock_qty: product.stock_qty != null ? parseInt(product.stock_qty, 10) : row.stock_qty,
      auto_stock_control: product.auto_stock_control != null ? (toBool(product.auto_stock_control) ? 1 : 0) : row.auto_stock_control,
      sku: product.sku ?? row.sku,
      category_id: product.category_id ?? row.category_id,
    }
    const changed = Object.keys(next).filter((key) => String(next[key]) !== String(row[key]))

    await withDbRetry({
      label: 'product.update',
      context: { establishment_id: product.establishment_id, product_id: id, driver: database.mode },
      writeKey: 'product.update',
      operation: () => database.transaction(async (tx) => {
        await tx.prepare('UPDATE products SET name=?,desc_short=?,notes=?,image_url=?,base_price=?,promo_active=?,promo_price=?,status=?,available=?,prep_time_min=?,stock_qty=?,auto_stock_control=?,sku=?,category_id=?,updated_at=? WHERE id=? AND establishment_id=?')
          .run(
            next.name,
            next.desc_short,
            next.notes,
            next.image_url,
            next.base_price,
            next.promo_active,
            next.promo_price,
            next.status,
            next.available,
            next.prep_time_min,
            next.stock_qty,
            next.auto_stock_control,
            next.sku,
            next.category_id,
            now,
            id,
            product.establishment_id,
          )

        await tx.prepare('INSERT INTO product_history (product_id,establishment_id,action,by_user_id,changed_keys_json,at) VALUES (?,?,?,?,?,?)')
          .run(id, product.establishment_id, 'update', product.by_user_id || 'admin', JSON.stringify(changed), now)
      }),
    })

    res.json({ ok: true })
  }))

  app.put('/api/produtos/:id/disponibilidade', asyncRoute(async (req, res) => {
    const { id } = req.params
    const { establishment_id, available } = req.body || {}
    const row = await database.prepare('SELECT * FROM products WHERE id=? AND establishment_id=?').get(id, establishment_id)
    if (!row) return res.status(404).json({ error: 'not_found' })
    if (row.status !== 'active') return res.status(400).json({ error: 'status_inactive' })

    if (available) {
      const hasCat = !!row.category_id
      const hasImage = !!row.image_url
      const stockOk = !row.auto_stock_control || ((row.stock_qty || 0) > 0)
      if (!hasCat || !hasImage || !stockOk) return res.status(400).json({ error: 'invalid_to_activate' })
    }

    const now = nowIso()
    await withDbRetry({
      label: 'product.availability.update',
      context: { establishment_id, product_id: id, driver: database.mode },
      writeKey: 'product.availability.update',
      operation: () => database.transaction(async (tx) => {
        await tx.prepare('UPDATE products SET available=?, updated_at=? WHERE id=? AND establishment_id=?')
          .run(available ? 1 : 0, now, id, establishment_id)

        await tx.prepare('INSERT INTO product_history (product_id,establishment_id,action,by_user_id,changed_keys_json,at) VALUES (?,?,?,?,?,?)')
          .run(id, establishment_id, 'status', req.body?.by_user_id || 'admin', JSON.stringify(['available']), now)
      }),
    })

    res.json({ ok: true })
  }))

  app.delete('/api/produtos/:id', asyncRoute(async (req, res) => {
    const { id } = req.params
    const { establishment_id } = req.body || {}
    if (!establishment_id) return res.status(400).json({ error: 'missing_establishment_id' })

    const row = await database.prepare('SELECT * FROM products WHERE id=? AND establishment_id=?').get(id, establishment_id)
    if (!row) return res.status(404).json({ error: 'not_found' })

    const deletedAt = nowIso()
    await withDbRetry({
      label: 'product.delete',
      context: { establishment_id, product_id: id, driver: database.mode },
      writeKey: 'product.delete',
      operation: () => database.transaction(async (tx) => {
        await tx.prepare('DELETE FROM products WHERE id=? AND establishment_id=?').run(id, establishment_id)
        await tx.prepare('INSERT INTO product_history (product_id,establishment_id,action,by_user_id,changed_keys_json,at) VALUES (?,?,?,?,?,?)')
          .run(id, establishment_id, 'delete', req.body?.by_user_id || 'admin', null, deletedAt)
      }),
    })

    res.json({ ok: true })
  }))

  app.get('/api/cardapio', asyncRoute(async (req, res) => {
    const { establishment_id } = req.query
    const est = await database.prepare('SELECT status, billing_status FROM establishments WHERE id=?').get(establishment_id)
    if (!est) return res.status(404).json({ error: 'establishment_not_found' })

    if (est.status !== 'active' || est.billing_status !== 'paid') {
      return res.json({ inactive: true, message: 'Entre em contato com a SVN PEDIDOS para regularizar' })
    }

    const cats = await database.prepare('SELECT * FROM categories WHERE establishment_id=? AND active=1').all(establishment_id)
    const prods = await database.prepare("SELECT * FROM products WHERE establishment_id=? AND status='active' AND available=1").all(establishment_id)
    const grouped = {}
    cats.forEach((category) => {
      grouped[category.id] = []
    })
    prods.forEach((product) => {
      ;(grouped[product.category_id] = grouped[product.category_id] || []).push(product)
    })

    res.json({ categories: cats, productsByCategory: grouped })
  }))

  try {
    app.use(express.static(appConfig.server.frontendDistDir))
    app.use((req, res, next) => {
      if (
        req.path.startsWith('/api/') ||
        req.path === '/api' ||
        req.path === '/health' ||
        req.path === '/admin/usage-stats'
      ) return next()
      res.sendFile(path.resolve(appConfig.server.frontendDistDir, 'index.html'))
    })
  } catch (error) {
    log('error', 'static.serve.failed', { error: serializeError(error) })
  }

  return { app, config: appConfig, databaseMode: database.mode, usageStats }
}
