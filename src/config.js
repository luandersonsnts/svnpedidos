const normalizeBase = (value) => String(value || '').replace(/\/+$/, '')

export const API_BASE = normalizeBase(import.meta.env.VITE_API_URL)
export const DEFAULT_ADMIN_PASSWORD = import.meta.env.VITE_DEFAULT_ADMIN_PASSWORD || ''
export const DEFAULT_WHATSAPP_NUMBER = import.meta.env.VITE_DEFAULT_WHATSAPP_NUMBER || ''

const appendParams = (url, params) => {
  if (!params) return url
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })
  return url
}

const getApiUrlCandidates = (path, params) => {
  const relativeUrl = appendParams(new URL(path, window.location.origin), params)
  const sameOriginUrl = `${relativeUrl.pathname}${relativeUrl.search}`
  const absoluteUrl = API_BASE
    ? appendParams(new URL(`${API_BASE}${path}`, window.location.origin), params).toString()
    : null

  return {
    primary: sameOriginUrl,
    fallback: absoluteUrl,
    canRetryAlternative: Boolean(absoluteUrl),
  }
}

export const buildApiUrl = (path, params) => getApiUrlCandidates(path, params).primary

export const fetchApi = async (path, options = {}, params) => {
  const { primary, fallback, canRetryAlternative } = getApiUrlCandidates(path, params)
  try {
    return await fetch(primary, options)
  } catch (error) {
    if (!canRetryAlternative) throw error
    return fetch(fallback, options)
  }
}
