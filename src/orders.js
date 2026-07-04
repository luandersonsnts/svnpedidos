import { fetchApi } from './config'
import { getAdminAuthHeaders } from './admin'

export const ORDER_STATUSES = {
  RECEBIDO: 'RECEBIDO',
  EM_PREPARO: 'EM_PREPARO',
  PRONTO: 'PRONTO',
  ENTREGUE: 'ENTREGUE',
  FINALIZADO: 'FINALIZADO',
  CANCELADO: 'CANCELADO',
}

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUSES.RECEBIDO]: 'Recebido',
  [ORDER_STATUSES.EM_PREPARO]: 'Em preparo',
  [ORDER_STATUSES.PRONTO]: 'Pronto',
  [ORDER_STATUSES.ENTREGUE]: 'Entregue',
  [ORDER_STATUSES.FINALIZADO]: 'Finalizado',
  [ORDER_STATUSES.CANCELADO]: 'Cancelado',
}

const normalizePhone = (raw) => String(raw || '').replace(/\D/g, '').slice(-11)

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

const removeStorage = (key) => {
  try {
    localStorage.removeItem(key)
  } catch {}
}

const normalizeOrder = (order) => {
  if (!order) return null
  return {
    ...order,
    id: order.id,
    clientOrderId: order.client_order_id,
    phone: order.customer_phone,
    name: order.customer_name,
    paymentMethod: order.payment_method,
    fulfillmentType: order.fulfillment_type,
    changeForAmount: order.change_for_amount,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    statusUpdatedAt: order.status_updated_at,
    statusLabel: ORDER_STATUS_LABELS[order.status] || order.status,
    deliveryFee: order.delivery_fee ?? order.fee ?? 0,
    items: (order.items || []).map((item) => ({
      ...item,
      productId: item.product_id,
      qty: item.quantity,
      unitPrice: item.unit_price,
      lineTotal: item.line_total,
      obs: item.notes || '',
    })),
    history: (order.history || []).map((entry) => ({
      ...entry,
      at: entry.changed_at,
      label: ORDER_STATUS_LABELS[entry.status] || entry.status,
    })),
  }
}

const fetchJson = async (path, options = {}, params) => {
  const response = await fetchApi(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  }, params)

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || 'request_failed')
    error.status = response.status
    error.body = data
    throw error
  }

  return data
}

export const getOrdersCacheKey = (establishmentId) => `orders_${establishmentId}`
export const getPendingOrdersKey = (establishmentId) => `pending_orders_${establishmentId}`
export const getLastConfirmedOrderKey = (establishmentId) => `last_confirmed_order_${establishmentId}`
export const getCheckoutDraftKey = (establishmentId) => `checkout_draft_${establishmentId}`

export const getCachedOrders = (establishmentId) => readJson(getOrdersCacheKey(establishmentId), [])
export const setCachedOrders = (establishmentId, orders) => writeJson(getOrdersCacheKey(establishmentId), orders || [])
export const getPendingOrders = (establishmentId) => readJson(getPendingOrdersKey(establishmentId), [])
export const setPendingOrders = (establishmentId, orders) => writeJson(getPendingOrdersKey(establishmentId), orders || [])
export const getLastConfirmedOrder = (establishmentId) => readJson(getLastConfirmedOrderKey(establishmentId), null)
export const setLastConfirmedOrder = (establishmentId, order) => writeJson(getLastConfirmedOrderKey(establishmentId), order || null)
export const getCheckoutDraft = (establishmentId) => readJson(getCheckoutDraftKey(establishmentId), null)
export const setCheckoutDraft = (establishmentId, draft) => writeJson(getCheckoutDraftKey(establishmentId), draft || null)
export const clearCheckoutDraft = (establishmentId) => removeStorage(getCheckoutDraftKey(establishmentId))

export const upsertPendingOrder = (establishmentId, pendingOrder) => {
  const current = getPendingOrders(establishmentId)
  const next = current.filter((item) => item.client_order_id !== pendingOrder.client_order_id)
  next.push(pendingOrder)
  setPendingOrders(establishmentId, next)
}

export const removePendingOrder = (establishmentId, clientOrderId) => {
  const current = getPendingOrders(establishmentId)
  setPendingOrders(establishmentId, current.filter((item) => item.client_order_id !== clientOrderId))
}

export const createClientOrderId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `pedido_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export const fetchOrders = async ({ establishmentId, phone }) => {
  const data = await fetchJson('/api/pedidos', {
    headers: phone ? {} : getAdminAuthHeaders(),
  }, {
    establishment_id: establishmentId,
    phone: normalizePhone(phone),
  })
  const orders = (data?.orders || []).map(normalizeOrder)
  setCachedOrders(establishmentId, orders)
  return orders
}

export const fetchOrderById = async ({ establishmentId, orderId }) => {
  const data = await fetchJson(`/api/pedidos/${encodeURIComponent(orderId)}`, {}, {
    establishment_id: establishmentId,
  })
  return normalizeOrder(data?.order)
}

export const submitOrder = async (payload) => {
  const data = await fetchJson('/api/pedidos', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return {
    duplicated: Boolean(data?.duplicated),
    order: normalizeOrder(data?.order),
  }
}

export const updateOrderStatus = async ({ establishmentId, orderId, status, changedBy, note }) => {
  const data = await fetchJson(`/api/pedidos/${encodeURIComponent(orderId)}/status`, {
    method: 'PUT',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({
      establishment_id: establishmentId,
      status,
      changed_by: changedBy,
      note,
    }),
  })
  return normalizeOrder(data?.order)
}

export const mergeOrderIntoCache = (establishmentId, order) => {
  const normalized = normalizeOrder(order)
  const current = getCachedOrders(establishmentId)
  const next = [normalized, ...current.filter((item) => item.id !== normalized.id)]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
  setCachedOrders(establishmentId, next)
  setLastConfirmedOrder(establishmentId, normalized)
  return normalized
}

export const syncPendingOrders = async ({ establishmentId, phone }) => {
  const pending = getPendingOrders(establishmentId)
  if (!pending.length) return []

  const normalizedPhone = normalizePhone(phone)
  const results = []
  for (const draft of pending) {
    if (normalizedPhone && normalizePhone(draft?.customer?.phone) !== normalizedPhone) continue
    const result = await submitOrder(draft)
    mergeOrderIntoCache(establishmentId, result.order)
    removePendingOrder(establishmentId, draft.client_order_id)
    if (getCheckoutDraft(establishmentId)?.client_order_id === draft.client_order_id) {
      clearCheckoutDraft(establishmentId)
    }
    results.push(result.order)
  }
  return results
}
