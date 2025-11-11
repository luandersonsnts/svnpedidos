import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'

// Flag para usar libSQL (Turso) se disponível
const useLibsql = !!process.env.LIBSQL_DB_URL
let db

// Util para mascarar tokens em logs
const mask = (v) => {
  if (!v) return '(not set)'
  const s = String(v)
  const head = s.slice(0, 6)
  const tail = s.slice(-4)
  return `${head}...${tail} (len=${s.length})`
}

// Create tables if not exist
// Inicialização assíncrona para suportar libSQL
const bootstrap = async () => {
  // Log de variáveis de ambiente relevantes
  console.log('[env] node', process.version)
  console.log('[env] NODE_ENV=', process.env.NODE_ENV || '(not set)')
  console.log('[env] LIBSQL_DB_URL=', process.env.LIBSQL_DB_URL || '(not set)')
  console.log('[env] LIBSQL_DB_TOKEN=', mask(process.env.LIBSQL_DB_TOKEN))
  console.log('[env] SKIP_BUILD=', process.env.SKIP_BUILD || '(not set)')
  console.log('[env] NPM_CONFIG_PRODUCTION=', process.env.NPM_CONFIG_PRODUCTION || '(not set)')
  console.log('[env] NPM_CONFIG_OPTIONAL=', process.env.NPM_CONFIG_OPTIONAL || '(not set)')
  console.log('[env] useLibsql=', useLibsql)
  // Inicializa client de banco (libSQL remoto ou SQLite local)
  if (useLibsql) {
    const { createClient } = await import('@libsql/client')
    const client = createClient({ url: process.env.LIBSQL_DB_URL, authToken: process.env.LIBSQL_DB_TOKEN })
    db = {
      exec: async (sql) => { const stmts = String(sql).split(';').map(s=> s.trim()).filter(Boolean); for (const s of stmts) { await client.execute(s) } },
      prepare: (sql) => ({
        get: async (...args) => { const r = await client.execute({ sql, args }); return r.rows?.[0] || undefined },
        all: async (...args) => { const r = await client.execute({ sql, args }); return r.rows || [] },
        run: async (...args) => client.execute({ sql, args }),
      }),
    }
  } else {
    const { default: BetterSqlite3 } = await import('better-sqlite3')
    const sqlite = new BetterSqlite3('data.sqlite')
    db = {
      exec: (sql) => sqlite.exec(sql),
      prepare: (sql) => { const stmt = sqlite.prepare(sql); return { get: (...args)=> stmt.get(...args), all: (...args)=> stmt.all(...args), run: (...args)=> stmt.run(...args) } },
    }
  }
  // Provisiona o schema tanto em SQLite local quanto no libSQL remoto (Turso)
  // Os statements são executados em sequência via db.exec.
  await db.exec(`
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
  `);

  const app = express()
  app.use(cors())
  app.use(bodyParser.json({ limit: '2mb' }))

// Seed one establishment if empty
  const estRow = await db.prepare('SELECT COUNT(*) as c FROM establishments').get()
  const estCount = estRow?.c || 0
  if (estCount === 0) {
    await db.prepare(`INSERT INTO establishments (id,name,city,uf,status,billing_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`)
      .run('default', 'Mundo Doce', 'Caieiras', 'SP', 'active', 'paid', new Date().toISOString(), new Date().toISOString())
  }

// Helpers
  const nowIso = () => new Date().toISOString()
  const toBool = (v) => !!(v && (v===1 || v===true || v==='true'))

// Status endpoint
  app.get('/api/establishment/:id/status', async (req,res)=>{
    const { id } = req.params
    const row = await db.prepare('SELECT status, billing_status, name, support_contact FROM establishments WHERE id=?').get(id)
    if (!row) return res.status(404).json({ error: 'not_found' })
    res.json(row)
  })

// Categories
  app.get('/api/categorias', async (req,res)=>{
    const { establishment_id } = req.query
    const rows = await db.prepare('SELECT * FROM categories WHERE establishment_id=? AND active=1').all(establishment_id)
    res.json(rows)
  })
  app.post('/api/categorias', async (req,res)=>{
    const { establishment_id, id, name, image_url } = req.body
    if (!establishment_id || !id || !name) return res.status(400).json({ error:'invalid' })
    try {
      await db.prepare('INSERT INTO categories (id,establishment_id,name,image_url,active) VALUES (?,?,?,?,1)')
        .run(id, establishment_id, name, image_url||null)
      res.json({ ok:true })
    } catch(e){ res.status(500).json({ error:'db_error', detail:String(e) }) }
  })
  app.put('/api/categorias/:id', async (req,res)=>{
    const { id } = req.params
    const { establishment_id, name, image_url } = req.body || {}
    if (!establishment_id) return res.status(400).json({ error:'missing_establishment_id' })
    const row = await db.prepare('SELECT * FROM categories WHERE id=? AND establishment_id=?').get(id, establishment_id)
    if (!row) return res.status(404).json({ error:'not_found' })
    try {
      const next = {
        name: name ?? row.name,
        image_url: image_url ?? row.image_url,
      }
      await db.prepare('UPDATE categories SET name=?, image_url=? WHERE id=? AND establishment_id=?')
        .run(next.name, next.image_url, id, establishment_id)
      res.json({ ok:true })
    } catch(e){ res.status(500).json({ error:'db_error', detail:String(e) }) }
  })

// Products
  app.get('/api/produtos', async (req,res)=>{
    const { establishment_id } = req.query
    const rows = await db.prepare('SELECT * FROM products WHERE establishment_id=?').all(establishment_id)
    res.json(rows)
  })
  app.post('/api/produtos', async (req,res)=>{
    const p = req.body || {}
    const required = ['id','name','base_price','image_url','category_id','status']
    for (const k of required){ if (!p[k] && p[k]!==0) return res.status(400).json({ error:`missing_${k}` }) }
    if (Number(p.base_price) <= 0) return res.status(400).json({ error:'price_must_be_positive' })
    const prep = parseInt(p.prep_time_min||0,10)
    if (!prep || prep < 1) return res.status(400).json({ error:'prep_time_invalid' })
    const now = nowIso()
    try {
      await db.prepare(`INSERT INTO products (id,establishment_id,category_id,name,desc_short,notes,image_url,base_price,promo_active,promo_price,status,available,prep_time_min,stock_qty,auto_stock_control,sku,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(p.id, p.establishment_id, p.category_id, p.name, p.desc_short||null, p.notes||null, p.image_url, Number(p.base_price), toBool(p.promo_active)?1:0, p.promo_price!=null? Number(p.promo_price): null, p.status, toBool(p.available)?1:0, prep, p.stock_qty!=null? parseInt(p.stock_qty,10): 0, toBool(p.auto_stock_control)?1:0, p.sku||null, now, now)
      await db.prepare('INSERT INTO product_history (product_id,establishment_id,action,by_user_id,changed_keys_json,at) VALUES (?,?,?,?,?,?)')
        .run(p.id, p.establishment_id, 'create', p.by_user_id||'admin', null, now)
      res.json({ ok:true })
    } catch(e){ res.status(500).json({ error:'db_error', detail:String(e) }) }
  })
  app.put('/api/produtos/:id', async (req,res)=>{
    const { id } = req.params
    const p = req.body || {}
    const row = await db.prepare('SELECT * FROM products WHERE id=? AND establishment_id=?').get(id, p.establishment_id)
    if (!row) return res.status(404).json({ error:'not_found' })
    const now = nowIso()
    try {
      const next = {
        name: p.name ?? row.name,
        desc_short: p.desc_short ?? row.desc_short,
        notes: p.notes ?? row.notes,
        image_url: p.image_url ?? row.image_url,
        base_price: p.base_price!=null? Number(p.base_price) : row.base_price,
        promo_active: p.promo_active!=null? (toBool(p.promo_active)?1:0) : row.promo_active,
        promo_price: p.promo_price!=null? Number(p.promo_price) : row.promo_price,
        status: p.status ?? row.status,
        available: p.available!=null? (toBool(p.available)?1:0) : row.available,
        prep_time_min: p.prep_time_min!=null? parseInt(p.prep_time_min,10) : row.prep_time_min,
        stock_qty: p.stock_qty!=null? parseInt(p.stock_qty,10) : row.stock_qty,
        auto_stock_control: p.auto_stock_control!=null? (toBool(p.auto_stock_control)?1:0) : row.auto_stock_control,
        sku: p.sku ?? row.sku,
        category_id: p.category_id ?? row.category_id,
      }
      await db.prepare(`UPDATE products SET name=?,desc_short=?,notes=?,image_url=?,base_price=?,promo_active=?,promo_price=?,status=?,available=?,prep_time_min=?,stock_qty=?,auto_stock_control=?,sku=?,category_id=?,updated_at=? WHERE id=? AND establishment_id=?`)
        .run(next.name,next.desc_short,next.notes,next.image_url,next.base_price,next.promo_active,next.promo_price,next.status,next.available,next.prep_time_min,next.stock_qty,next.auto_stock_control,next.sku,next.category_id,now,id,p.establishment_id)
      const changed = Object.keys(next).filter(k=> String(next[k]) !== String(row[k]))
      await db.prepare('INSERT INTO product_history (product_id,establishment_id,action,by_user_id,changed_keys_json,at) VALUES (?,?,?,?,?,?)')
        .run(id, p.establishment_id, 'update', p.by_user_id||'admin', JSON.stringify(changed), now)
      res.json({ ok:true })
    } catch(e){ res.status(500).json({ error:'db_error', detail:String(e) }) }
  })
  app.put('/api/produtos/:id/disponibilidade', async (req,res)=>{
    const { id } = req.params
    const { establishment_id, available } = req.body
    const row = await db.prepare('SELECT * FROM products WHERE id=? AND establishment_id=?').get(id, establishment_id)
    if (!row) return res.status(404).json({ error:'not_found' })
    if (row.status !== 'active') return res.status(400).json({ error:'status_inactive' })
    if (available){
      const hasCat = !!row.category_id
      const hasImage = !!row.image_url
      const stockOk = !row.auto_stock_control || ((row.stock_qty||0) > 0)
      if (!hasCat || !hasImage || !stockOk) return res.status(400).json({ error:'invalid_to_activate' })
    }
    const now = nowIso()
    await db.prepare('UPDATE products SET available=?, updated_at=? WHERE id=? AND establishment_id=?').run(available?1:0, now, id, establishment_id)
    await db.prepare('INSERT INTO product_history (product_id,establishment_id,action,by_user_id,changed_keys_json,at) VALUES (?,?,?,?,?,?)')
      .run(id, establishment_id, 'status', req.body.by_user_id||'admin', JSON.stringify(['available']), now)
    res.json({ ok:true })
  })

  app.delete('/api/produtos/:id', async (req,res)=>{
    const { id } = req.params
    const { establishment_id } = req.body || {}
    if (!establishment_id) return res.status(400).json({ error:'missing_establishment_id' })
    const row = await db.prepare('SELECT * FROM products WHERE id=? AND establishment_id=?').get(id, establishment_id)
    if (!row) return res.status(404).json({ error:'not_found' })
    await db.prepare('DELETE FROM products WHERE id=? AND establishment_id=?').run(id, establishment_id)
    await db.prepare('INSERT INTO product_history (product_id,establishment_id,action,by_user_id,changed_keys_json,at) VALUES (?,?,?,?,?,?)')
      .run(id, establishment_id, 'delete', req.body?.by_user_id||'admin', null, new Date().toISOString())
    res.json({ ok:true })
  })

// Cardápio consolidado
  app.get('/api/cardapio', async (req,res)=>{
    const { establishment_id } = req.query
    const est = await db.prepare('SELECT status, billing_status FROM establishments WHERE id=?').get(establishment_id)
    if (!est) return res.status(404).json({ error:'establishment_not_found' })
    if (est.status!=='active' || est.billing_status!=='paid'){
      return res.json({ inactive:true, message:'Entre em contato com a SVN PEDIDOS para regularizar' })
    }
    const cats = await db.prepare('SELECT * FROM categories WHERE establishment_id=? AND active=1').all(establishment_id)
    const prods = await db.prepare("SELECT * FROM products WHERE establishment_id=? AND status='active' AND available=1").all(establishment_id)
    const grouped = {}
    cats.forEach(c=> grouped[c.id] = [])
    prods.forEach(p=> { (grouped[p.category_id] = grouped[p.category_id] || []).push(p) })
    res.json({ categories: cats, productsByCategory: grouped })
  })

  const PORT = process.env.PORT || 3001
  app.listen(PORT, ()=> console.log('API running on http://localhost:'+PORT+' '+(useLibsql? '(libSQL remote)': '(local SQLite)')))
};

bootstrap().catch((e)=> { console.error('Failed to bootstrap API', e); process.exit(1) })