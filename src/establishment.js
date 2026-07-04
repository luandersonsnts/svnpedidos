import { fetchApi } from './config'
import { getAdminAuthHeaders } from './admin'

const fetchJson = async (path, options = {}) => {
  const response = await fetchApi(path, {
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

export const normalizeEstablishment = (row) => {
  if (!row) return null
  return {
    ...row,
    avatarImage: row.avatar_url ?? row.avatarImage ?? '',
    coverImage: row.cover_url ?? row.coverImage ?? '',
    baseAddress: row.base_address ?? row.baseAddress ?? null,
    deliveryRules: row.delivery_rules ?? row.deliveryRules ?? [],
    paymentMethods: row.payment_methods ?? row.paymentMethods ?? [],
    hours: row.hours ?? [],
    runtimeStatus: row.runtimeStatus ?? null,
  }
}

export const fetchEstablishment = async (establishmentId) => {
  const data = await fetchJson(`/api/establishment/${encodeURIComponent(establishmentId)}`)
  return normalizeEstablishment(data)
}

export const saveEstablishment = async (payload) => {
  const data = await fetchJson('/api/establishment', {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(payload),
  })
  return data
}

export const fetchEstablishmentStatus = async (establishmentId) => {
  return fetchJson(`/api/establishment/${encodeURIComponent(establishmentId)}/status`)
}

export const fetchDeliveryQuote = async (establishmentId, address) => {
  const data = await fetchJson(`/api/establishment/${encodeURIComponent(establishmentId)}/delivery-quote`, {
    method: 'POST',
    body: JSON.stringify(address || {}),
  })
  return data?.quote || null
}
