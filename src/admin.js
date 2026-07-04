import { fetchApi } from './config'

const ADMIN_SESSION_KEY = 'adminSession'

const readJson = (key, fallback = null) => {
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

export const getAdminSession = () => readJson(ADMIN_SESSION_KEY, null)

export const isSuperAdmin = () => getAdminSession()?.session?.role === 'superadmin'

export const hasAdminAccess = (establishmentId) => {
  const session = getAdminSession()?.session
  if (!session) return false
  if (session.role === 'superadmin') return true
  return session.role === 'establishment' && session.establishment_id === establishmentId
}

export const getAdminAuthHeaders = () => {
  const token = getAdminSession()?.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const saveAdminSession = (payload) => {
  writeJson(ADMIN_SESSION_KEY, payload)
  const session = payload?.session || {}
  if (session.role === 'establishment' && session.establishment_id) {
    try {
      localStorage.setItem('currentEstabId', session.establishment_id)
      localStorage.setItem(`adminLogged_${session.establishment_id}`, 'true')
    } catch {}
  }
}

export const clearAdminSession = () => {
  const current = getAdminSession()?.session
  try {
    if (current?.establishment_id) {
      localStorage.removeItem(`adminLogged_${current.establishment_id}`)
    }
    localStorage.removeItem(ADMIN_SESSION_KEY)
  } catch {}
}

export const loginAdmin = async ({ mode, username, establishment_id, password }) => {
  const data = await fetchJson('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ mode, username, establishment_id, password }),
  })
  saveAdminSession(data)
  return data
}

export const fetchAdminSession = async () => fetchJson('/api/admin/session', {
  headers: getAdminAuthHeaders(),
})

export const changeAdminPassword = async (newPassword) => fetchJson('/api/admin/change-password', {
  method: 'POST',
  headers: getAdminAuthHeaders(),
  body: JSON.stringify({ new_password: newPassword }),
})

export const fetchManagedEstablishments = async () => {
  const data = await fetchJson('/api/admin/establishments', {
    headers: getAdminAuthHeaders(),
  })
  return data?.establishments || []
}

export const createManagedEstablishment = async (payload) => {
  const data = await fetchJson('/api/admin/establishments', {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(payload),
  })
  return data?.establishment || null
}

export const updateManagedEstablishment = async (id, payload) => {
  const data = await fetchJson(`/api/admin/establishments/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(payload),
  })
  return data?.establishment || null
}

export const resetManagedEstablishmentPassword = async (id, newPassword) => fetchJson(`/api/admin/establishments/${encodeURIComponent(id)}/reset-password`, {
  method: 'POST',
  headers: getAdminAuthHeaders(),
  body: JSON.stringify({ new_password: newPassword }),
})
