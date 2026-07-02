const normalizeBase = (value) => String(value || '').replace(/\/+$/, '')

export const API_BASE = normalizeBase(import.meta.env.VITE_API_URL)
export const DEFAULT_ADMIN_PASSWORD = import.meta.env.VITE_DEFAULT_ADMIN_PASSWORD || ''
export const DEFAULT_WHATSAPP_NUMBER = import.meta.env.VITE_DEFAULT_WHATSAPP_NUMBER || ''
