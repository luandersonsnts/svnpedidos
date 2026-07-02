import { randomUUID } from 'node:crypto'
import { z } from 'zod'

const ORDER_STATUS = {
  RECEBIDO: 'RECEBIDO',
  EM_PREPARO: 'EM_PREPARO',
  PRONTO: 'PRONTO',
  ENTREGUE: 'ENTREGUE',
  FINALIZADO: 'FINALIZADO',
  CANCELADO: 'CANCELADO',
}

const FINAL_STATUSES = new Set([
  ORDER_STATUS.ENTREGUE,
  ORDER_STATUS.FINALIZADO,
  ORDER_STATUS.CANCELADO,
])

const ALLOWED_TRANSITIONS = {
  [ORDER_STATUS.RECEBIDO]: new Set([ORDER_STATUS.EM_PREPARO, ORDER_STATUS.CANCELADO]),
  [ORDER_STATUS.EM_PREPARO]: new Set([ORDER_STATUS.PRONTO, ORDER_STATUS.CANCELADO]),
  [ORDER_STATUS.PRONTO]: new Set([ORDER_STATUS.ENTREGUE, ORDER_STATUS.FINALIZADO, ORDER_STATUS.CANCELADO]),
  [ORDER_STATUS.ENTREGUE]: new Set(),
  [ORDER_STATUS.FINALIZADO]: new Set(),
  [ORDER_STATUS.CANCELADO]: new Set(),
}

const normalizePhone = (raw) => String(raw || '').replace(/\D/g, '').slice(-11)

const sanitizeText = (value, maxLength = 255) => String(value || '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, maxLength)

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const addressSchema = z.object({
  street: z.string().trim().max(160).optional().nullable(),
  number: z.string().trim().max(30).optional().nullable(),
  neighborhood: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  uf: z.string().trim().max(8).optional().nullable(),
  complement: z.string().trim().max(160).optional().nullable(),
  reference: z.string().trim().max(160).optional().nullable(),
  zipcode: z.string().trim().max(20).optional().nullable(),
  fee: z.coerce.number().min(0).optional().nullable(),
}).passthrough()

const choiceSchema = z.object({
  id: z.string().trim().max(80).optional().nullable(),
  name: z.string().trim().max(160).optional().nullable(),
  priceDelta: z.coerce.number().optional().nullable(),
}).passthrough()

const orderItemSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  product_id: z.string().trim().max(120).optional().nullable(),
  productId: z.string().trim().max(120).optional().nullable(),
  name: z.string().trim().min(1).max(160),
  quantity: z.coerce.number().int().min(1).optional(),
  qty: z.coerce.number().int().min(1).optional(),
  unit_price: z.coerce.number().min(0).optional(),
  unitPrice: z.coerce.number().min(0).optional(),
  choice: choiceSchema.optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  obs: z.string().trim().max(500).optional().nullable(),
}).refine((value) => value.quantity != null || value.qty != null, {
  message: 'Item sem quantidade',
}).refine((value) => value.unit_price != null || value.unitPrice != null, {
  message: 'Item sem preco unitario',
})

const couponSchema = z.object({
  id: z.string().trim().max(120).optional().nullable(),
  label: z.string().trim().max(160).optional().nullable(),
  type: z.string().trim().max(40).optional().nullable(),
  value: z.coerce.number().optional().nullable(),
}).passthrough()

const createOrderSchema = z.object({
  client_order_id: z.string().trim().min(1).max(120),
  establishment_id: z.string().trim().min(1).max(120),
  customer: z.object({
    name: z.string().trim().min(1).max(160),
    phone: z.string().trim().min(8).max(20),
  }),
  fulfillment_type: z.enum(['delivery', 'pickup']).default('delivery'),
  address: addressSchema.optional().nullable(),
  payment_method: z.string().trim().min(1).max(80),
  change_for_amount: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  subtotal: z.coerce.number().min(0).optional().nullable(),
  discount: z.coerce.number().min(0).optional().nullable(),
  fee: z.coerce.number().min(0).optional().nullable(),
  total: z.coerce.number().min(0).optional().nullable(),
  coupon: couponSchema.optional().nullable(),
  items: z.array(orderItemSchema).min(1).max(100),
})

const updateStatusSchema = z.object({
  establishment_id: z.string().trim().min(1).max(120),
  status: z.nativeEnum(ORDER_STATUS),
  changed_by: z.string().trim().max(120).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
})

const parseJsonText = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

const mapOrder = (row, items, history) => ({
  id: row.id,
  client_order_id: row.client_order_id,
  establishment_id: row.establishment_id,
  customer_name: row.customer_name,
  customer_phone: row.customer_phone,
  fulfillment_type: row.fulfillment_type,
  address: parseJsonText(row.address_json, null),
  payment_method: row.payment_method,
  change_for_amount: row.change_for_amount,
  notes: row.notes || '',
  subtotal: safeNumber(row.subtotal),
  discount: safeNumber(row.discount),
  fee: safeNumber(row.fee),
  total: safeNumber(row.total),
  coupon: parseJsonText(row.coupon_json, null),
  status: row.status,
  status_updated_at: row.status_updated_at,
  created_at: row.created_at,
  updated_at: row.updated_at,
  items: items.map((item) => ({
    id: item.id,
    product_id: item.product_id,
    name: item.name,
    quantity: Number(item.quantity),
    unit_price: safeNumber(item.unit_price),
    line_total: safeNumber(item.line_total),
    choice: parseJsonText(item.choice_json, null),
    notes: item.notes || '',
  })),
  history: history.map((entry) => ({
    status: entry.status,
    changed_at: entry.changed_at,
    changed_by: entry.changed_by || null,
    note: entry.note || null,
  })),
})

const loadOrderById = async (db, { orderId, establishmentId }) => {
  const row = await db.prepare('SELECT * FROM orders WHERE id=? AND establishment_id=?').get(orderId, establishmentId)
  if (!row) return null

  const items = await db.prepare('SELECT * FROM order_items WHERE order_id=? AND establishment_id=? ORDER BY created_at ASC').all(orderId, establishmentId)
  const history = await db.prepare('SELECT * FROM order_status_history WHERE order_id=? AND establishment_id=? ORDER BY changed_at ASC, id ASC').all(orderId, establishmentId)
  return mapOrder(row, items, history)
}

const loadOrders = async (db, { establishmentId, phone }) => {
  const args = [establishmentId]
  let sql = 'SELECT * FROM orders WHERE establishment_id=?'
  if (phone) {
    sql += ' AND customer_phone_normalized=?'
    args.push(phone)
  }
  sql += ' ORDER BY created_at DESC'

  const rows = await db.prepare(sql).all(...args)
  const orders = []
  for (const row of rows) {
    const items = await db.prepare('SELECT * FROM order_items WHERE order_id=? AND establishment_id=? ORDER BY created_at ASC').all(row.id, establishmentId)
    const history = await db.prepare('SELECT * FROM order_status_history WHERE order_id=? AND establishment_id=? ORDER BY changed_at ASC, id ASC').all(row.id, establishmentId)
    orders.push(mapOrder(row, items, history))
  }
  return orders
}

const canTransitionStatus = (currentStatus, nextStatus) => {
  if (currentStatus === nextStatus) return true
  if (FINAL_STATUSES.has(currentStatus)) return false
  return ALLOWED_TRANSITIONS[currentStatus]?.has(nextStatus) || false
}

const buildPersistedOrder = (payload) => {
  const items = payload.items.map((item) => {
    const quantity = Number(item.quantity ?? item.qty)
    const unitPrice = safeNumber(item.unit_price ?? item.unitPrice)
    return {
      id: item.id || randomUUID(),
      product_id: item.product_id ?? item.productId ?? null,
      name: sanitizeText(item.name, 160),
      quantity,
      unit_price: unitPrice,
      line_total: Number((unitPrice * quantity).toFixed(2)),
      choice: item.choice || null,
      notes: sanitizeText(item.notes ?? item.obs ?? '', 500),
    }
  })

  const subtotal = Number(items.reduce((sum, item) => sum + item.line_total, 0).toFixed(2))
  const discount = Number(safeNumber(payload.discount, 0).toFixed(2))
  const feeFromAddress = safeNumber(payload.address?.fee, 0)
  const fee = Number(safeNumber(payload.fee, feeFromAddress).toFixed(2))
  const total = Number((subtotal - discount + fee).toFixed(2))
  const customerName = sanitizeText(payload.customer.name, 160)
  const customerPhone = sanitizeText(payload.customer.phone, 20)
  const address = payload.fulfillment_type === 'delivery'
    ? {
        street: sanitizeText(payload.address?.street, 160),
        number: sanitizeText(payload.address?.number, 30),
        neighborhood: sanitizeText(payload.address?.neighborhood, 120),
        city: sanitizeText(payload.address?.city, 120),
        uf: sanitizeText(payload.address?.uf, 8),
        complement: sanitizeText(payload.address?.complement, 160),
        reference: sanitizeText(payload.address?.reference, 160),
        zipcode: sanitizeText(payload.address?.zipcode, 20),
        fee,
      }
    : null

  return {
    id: payload.client_order_id,
    client_order_id: payload.client_order_id,
    establishment_id: payload.establishment_id,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_phone_normalized: normalizePhone(customerPhone),
    fulfillment_type: payload.fulfillment_type,
    address_json: address ? JSON.stringify(address) : null,
    payment_method: sanitizeText(payload.payment_method, 80),
    change_for_amount: payload.change_for_amount != null ? Number(safeNumber(payload.change_for_amount).toFixed(2)) : null,
    notes: sanitizeText(payload.notes || '', 1000),
    subtotal,
    discount,
    fee,
    total,
    coupon_json: payload.coupon ? JSON.stringify(payload.coupon) : null,
    status: ORDER_STATUS.RECEBIDO,
    items,
  }
}

const decrementStockIfNeeded = async (tx, { establishmentId, items }) => {
  for (const item of items) {
    if (!item.product_id) continue

    const product = await tx.prepare('SELECT id, name, auto_stock_control, stock_qty FROM products WHERE id=? AND establishment_id=?').get(item.product_id, establishmentId)
    if (!product) continue
    if (!Number(product.auto_stock_control)) continue

    const nextQty = Number(product.stock_qty || 0) - Number(item.quantity || 0)
    if (nextQty < 0) {
      const error = new Error(`Estoque insuficiente para ${product.name || item.name}`)
      error.httpStatus = 409
      error.publicBody = {
        error: 'stock_unavailable',
        message: `Estoque insuficiente para ${product.name || item.name}.`,
      }
      throw error
    }

    await tx.prepare('UPDATE products SET stock_qty=?, updated_at=? WHERE id=? AND establishment_id=?')
      .run(nextQty, new Date().toISOString(), item.product_id, establishmentId)
  }
}

const handleValidationError = (res, error) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      error: 'invalid_payload',
      message: 'Dados do pedido invalidos.',
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    })
  }

  if (error?.publicBody) {
    return res.status(error.httpStatus || 400).json(error.publicBody)
  }

  return null
}

export const registerOrderRoutes = ({ app, database, withDbRetry, asyncRoute }) => {
  app.get('/api/pedidos', asyncRoute(async (req, res) => {
    const establishmentId = sanitizeText(req.query.establishment_id, 120)
    if (!establishmentId) return res.status(400).json({ error: 'missing_establishment_id' })

    const phone = normalizePhone(req.query.phone)
    const orders = await loadOrders(database, { establishmentId, phone: phone || null })
    res.json({ ok: true, orders })
  }))

  app.get('/api/pedidos/:id', asyncRoute(async (req, res) => {
    const establishmentId = sanitizeText(req.query.establishment_id, 120)
    if (!establishmentId) return res.status(400).json({ error: 'missing_establishment_id' })

    const order = await loadOrderById(database, {
      orderId: req.params.id,
      establishmentId,
    })

    if (!order) return res.status(404).json({ error: 'not_found' })
    res.json({ ok: true, order })
  }))

  app.post('/api/pedidos', asyncRoute(async (req, res) => {
    let payload
    try {
      payload = createOrderSchema.parse(req.body || {})
    } catch (error) {
      return handleValidationError(res, error)
    }

    const persistedOrder = buildPersistedOrder(payload)

    if (!persistedOrder.customer_phone_normalized) {
      return res.status(400).json({
        error: 'invalid_payload',
        message: 'Telefone do cliente invalido.',
      })
    }

    let responseOrder
    let duplicated = false

    await withDbRetry({
      label: 'order.create',
      context: {
        establishment_id: persistedOrder.establishment_id,
        client_order_id: persistedOrder.client_order_id,
        order_id: persistedOrder.id,
        driver: database.mode,
      },
      writeKey: 'order.create',
      operation: () => database.transaction(async (tx) => {
        const existing = await tx.prepare('SELECT id FROM orders WHERE establishment_id=? AND client_order_id=?').get(
          persistedOrder.establishment_id,
          persistedOrder.client_order_id,
        )

        if (existing) {
          duplicated = true
          responseOrder = await loadOrderById(database, {
            orderId: existing.id,
            establishmentId: persistedOrder.establishment_id,
          })
          return
        }

        const createdAt = new Date().toISOString()
        await tx.prepare('INSERT INTO orders (id, establishment_id, client_order_id, customer_name, customer_phone, customer_phone_normalized, fulfillment_type, address_json, payment_method, change_for_amount, notes, subtotal, discount, fee, total, coupon_json, status, status_updated_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
          .run(
            persistedOrder.id,
            persistedOrder.establishment_id,
            persistedOrder.client_order_id,
            persistedOrder.customer_name,
            persistedOrder.customer_phone,
            persistedOrder.customer_phone_normalized,
            persistedOrder.fulfillment_type,
            persistedOrder.address_json,
            persistedOrder.payment_method,
            persistedOrder.change_for_amount,
            persistedOrder.notes,
            persistedOrder.subtotal,
            persistedOrder.discount,
            persistedOrder.fee,
            persistedOrder.total,
            persistedOrder.coupon_json,
            persistedOrder.status,
            createdAt,
            createdAt,
            createdAt,
          )

        for (const item of persistedOrder.items) {
          await tx.prepare('INSERT INTO order_items (id, order_id, establishment_id, product_id, name, quantity, unit_price, line_total, choice_json, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
            .run(
              item.id,
              persistedOrder.id,
              persistedOrder.establishment_id,
              item.product_id,
              item.name,
              item.quantity,
              item.unit_price,
              item.line_total,
              item.choice ? JSON.stringify(item.choice) : null,
              item.notes,
              createdAt,
            )
        }

        await decrementStockIfNeeded(tx, {
          establishmentId: persistedOrder.establishment_id,
          items: persistedOrder.items,
        })

        await tx.prepare('INSERT INTO order_status_history (order_id, establishment_id, status, changed_at, changed_by, note) VALUES (?,?,?,?,?,?)')
          .run(
            persistedOrder.id,
            persistedOrder.establishment_id,
            persistedOrder.status,
            createdAt,
            'customer',
            'Pedido recebido',
          )

        responseOrder = await loadOrderById(tx, {
          orderId: persistedOrder.id,
          establishmentId: persistedOrder.establishment_id,
        })
      }),
    })

    res.status(duplicated ? 200 : 201).json({
      ok: true,
      duplicated,
      order: responseOrder,
    })
  }))

  app.put('/api/pedidos/:id/status', asyncRoute(async (req, res) => {
    let payload
    try {
      payload = updateStatusSchema.parse(req.body || {})
    } catch (error) {
      return handleValidationError(res, error)
    }

    const existing = await loadOrderById(database, {
      orderId: req.params.id,
      establishmentId: payload.establishment_id,
    })

    if (!existing) return res.status(404).json({ error: 'not_found' })
    if (existing.status === payload.status) {
      return res.json({ ok: true, order: existing })
    }
    if (!canTransitionStatus(existing.status, payload.status)) {
      return res.status(409).json({
        error: 'invalid_status_transition',
        message: `Nao e permitido mover pedido de ${existing.status} para ${payload.status}.`,
      })
    }

    await withDbRetry({
      label: 'order.status.update',
      context: {
        establishment_id: payload.establishment_id,
        order_id: req.params.id,
        next_status: payload.status,
        driver: database.mode,
      },
      writeKey: 'order.status.update',
      operation: () => database.transaction(async (tx) => {
        const changedAt = new Date().toISOString()
        await tx.prepare('UPDATE orders SET status=?, status_updated_at=?, updated_at=? WHERE id=? AND establishment_id=?')
          .run(payload.status, changedAt, changedAt, req.params.id, payload.establishment_id)

        await tx.prepare('INSERT INTO order_status_history (order_id, establishment_id, status, changed_at, changed_by, note) VALUES (?,?,?,?,?,?)')
          .run(
            req.params.id,
            payload.establishment_id,
            payload.status,
            changedAt,
            sanitizeText(payload.changed_by || 'admin', 120),
            sanitizeText(payload.note || '', 500) || null,
          )
      }),
    })

    const order = await loadOrderById(database, {
      orderId: req.params.id,
      establishmentId: payload.establishment_id,
    })

    res.json({ ok: true, order })
  }))
}
