import { randomUUID } from 'node:crypto'

const sanitizeText = (value, maxLength = 255) => String(value || '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, maxLength)

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const normalizeCouponCode = (value) => sanitizeText(value, 80)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, '')
  .toUpperCase()

export const mapCouponRow = (row) => {
  if (!row) return null
  return {
    id: row.id,
    establishment_id: row.establishment_id,
    code: row.code,
    discount_type: row.discount_type,
    discount_value: Number(toNumber(row.discount_value, 0).toFixed(2)),
    active: Boolean(row.active === 1 || row.active === true || row.active === 'true'),
    expires_at: row.expires_at || null,
    usage_limit: row.usage_limit != null ? Number(row.usage_limit) : null,
    usage_count: Number(row.usage_count || 0),
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  }
}

export const buildCouponWriteModel = (payload = {}, existing = null) => {
  const code = normalizeCouponCode(payload.code || existing?.code)
  const discountType = sanitizeText(payload.discount_type || existing?.discount_type, 40).toLowerCase()
  if (!code) {
    const error = new Error('Codigo do cupom obrigatorio.')
    error.httpStatus = 400
    error.publicBody = { error: 'invalid_coupon', message: 'Codigo do cupom obrigatorio.' }
    throw error
  }

  if (!['percentage', 'fixed'].includes(discountType)) {
    const error = new Error('Tipo de desconto invalido.')
    error.httpStatus = 400
    error.publicBody = { error: 'invalid_coupon', message: 'Tipo de desconto invalido.' }
    throw error
  }

  const discountValue = Number(toNumber(payload.discount_value ?? existing?.discount_value, -1).toFixed(2))
  if (discountValue < 0) {
    const error = new Error('Valor de desconto invalido.')
    error.httpStatus = 400
    error.publicBody = { error: 'invalid_coupon', message: 'Valor de desconto invalido.' }
    throw error
  }

  const usageLimit = payload.usage_limit != null && payload.usage_limit !== ''
    ? Math.max(0, parseInt(payload.usage_limit, 10) || 0)
    : (existing?.usage_limit ?? null)

  return {
    id: sanitizeText(payload.id || existing?.id || randomUUID(), 120),
    establishment_id: sanitizeText(payload.establishment_id || existing?.establishment_id, 120),
    code,
    discount_type: discountType,
    discount_value: discountValue,
    active: payload.active != null ? (payload.active ? 1 : 0) : (existing?.active ? 1 : 0),
    expires_at: sanitizeText(payload.expires_at ?? existing?.expires_at, 40) || null,
    usage_limit: usageLimit,
    usage_count: existing?.usage_count != null ? Number(existing.usage_count) : 0,
  }
}

export const calculateCouponDiscount = ({ coupon, subtotal }) => {
  if (!coupon) return 0
  if (coupon.discount_type === 'percentage') {
    return Number((Math.max(0, subtotal) * (coupon.discount_value / 100)).toFixed(2))
  }
  return Number(Math.min(Math.max(0, subtotal), Math.max(0, coupon.discount_value)).toFixed(2))
}

export const validateCouponForOrder = ({ coupon, now = new Date(), subtotal = 0 }) => {
  if (!coupon) {
    const error = new Error('Cupom nao encontrado.')
    error.httpStatus = 404
    error.publicBody = { error: 'coupon_not_found', message: 'Cupom nao encontrado.' }
    throw error
  }

  if (!coupon.active) {
    const error = new Error('Cupom inativo.')
    error.httpStatus = 409
    error.publicBody = { error: 'coupon_inactive', message: 'Cupom indisponivel no momento.' }
    throw error
  }

  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < now.getTime()) {
    const error = new Error('Cupom expirado.')
    error.httpStatus = 409
    error.publicBody = { error: 'coupon_expired', message: 'Cupom expirado.' }
    throw error
  }

  if (coupon.usage_limit != null && coupon.usage_count >= coupon.usage_limit) {
    const error = new Error('Cupom sem saldo de uso.')
    error.httpStatus = 409
    error.publicBody = { error: 'coupon_limit_reached', message: 'Cupom indisponivel no momento.' }
    throw error
  }

  const discountAmount = calculateCouponDiscount({ coupon, subtotal })
  return {
    ...coupon,
    discount_amount: discountAmount,
  }
}

export const getCouponByCode = async (db, { establishmentId, code }) => {
  const normalizedCode = normalizeCouponCode(code)
  if (!normalizedCode) return null
  const row = await db.prepare('SELECT * FROM coupons WHERE establishment_id=? AND code=?').get(establishmentId, normalizedCode)
  return mapCouponRow(row)
}
