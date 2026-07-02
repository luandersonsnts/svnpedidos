import { API_BASE } from './config'

const normalizeBase = (value) => String(value || '').replace(/\/+$/, '')
const baseUrl = normalizeBase(API_BASE)

const buildUrl = (path, params) => {
  const url = new URL(`${baseUrl}${path}`, window.location.origin)
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })
  return baseUrl ? url.toString() : `${url.pathname}${url.search}`
}

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

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

export const normalizeCoupon = (coupon) => {
  if (!coupon) return null
  return {
    ...coupon,
    id: coupon.id,
    code: coupon.code,
    label: coupon.label || coupon.code,
    type: coupon.discount_type || coupon.type,
    value: coupon.discount_value ?? coupon.value ?? 0,
    active: coupon.active !== false,
    usageLimit: coupon.usage_limit ?? null,
    usageCount: coupon.usage_count ?? 0,
    expiresAt: coupon.expires_at ?? null,
    discountAmount: coupon.discount_amount ?? null,
  }
}

export const fetchCoupons = async ({ establishmentId }) => {
  const data = await fetchJson(buildUrl('/api/coupons', { establishment_id: establishmentId }))
  return (data?.coupons || []).map(normalizeCoupon)
}

export const createCoupon = async (payload) => {
  const data = await fetchJson(buildUrl('/api/coupons'), {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return normalizeCoupon(data?.coupon)
}

export const updateCoupon = async (couponId, payload) => {
  const data = await fetchJson(buildUrl(`/api/coupons/${encodeURIComponent(couponId)}`), {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return normalizeCoupon(data?.coupon)
}

export const deleteCoupon = async (couponId) => {
  return fetchJson(buildUrl(`/api/coupons/${encodeURIComponent(couponId)}`), {
    method: 'DELETE',
  })
}

export const validateCoupon = async ({ establishmentId, code, subtotal }) => {
  const data = await fetchJson(buildUrl('/api/coupons/validate'), {
    method: 'POST',
    body: JSON.stringify({
      establishment_id: establishmentId,
      code,
      subtotal,
    }),
  })
  return normalizeCoupon(data?.coupon)
}
