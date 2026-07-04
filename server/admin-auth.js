import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const TOKEN_VERSION = 1

const toBase64Url = (value) => Buffer.from(value)
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/g, '')

const fromBase64Url = (value) => {
  const normalized = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  return Buffer.from(padded, 'base64')
}

const safeEqual = (left, right) => {
  const a = Buffer.from(String(left || ''))
  const b = Buffer.from(String(right || ''))
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

const normalizePassword = (value) => String(value || '').trim()

export const hashPassword = (password) => {
  const normalized = normalizePassword(password)
  if (!normalized) return ''
  const salt = randomBytes(16).toString('hex')
  const digest = scryptSync(normalized, salt, 64).toString('hex')
  return `scrypt$${salt}$${digest}`
}

export const verifyPassword = (password, storedHash) => {
  const normalized = normalizePassword(password)
  const serialized = String(storedHash || '')
  if (!normalized || !serialized) return false

  const [algorithm, salt, expected] = serialized.split('$')
  if (algorithm !== 'scrypt' || !salt || !expected) {
    return safeEqual(normalized, serialized)
  }

  const digest = scryptSync(normalized, salt, 64).toString('hex')
  return safeEqual(digest, expected)
}

const signPayload = (encodedPayload, secret) => createHmac('sha256', String(secret || ''))
  .update(encodedPayload)
  .digest('base64url')

export const createAdminToken = ({ secret, ttlHours = 12, payload = {} }) => {
  const now = Math.floor(Date.now() / 1000)
  const tokenPayload = {
    ...payload,
    v: TOKEN_VERSION,
    iat: now,
    exp: now + (Math.max(1, Number(ttlHours) || 12) * 3600),
  }
  const encodedPayload = toBase64Url(JSON.stringify(tokenPayload))
  const signature = signPayload(encodedPayload, secret)
  return `${encodedPayload}.${signature}`
}

export const verifyAdminToken = ({ token, secret }) => {
  if (!token || !secret) return null
  const [encodedPayload, signature] = String(token).split('.')
  if (!encodedPayload || !signature) return null
  if (!safeEqual(signPayload(encodedPayload, secret), signature)) return null

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload).toString('utf8'))
    const now = Math.floor(Date.now() / 1000)
    if (!payload?.exp || payload.exp < now) return null
    if (payload?.v !== TOKEN_VERSION) return null
    return payload
  } catch {
    return null
  }
}

export const extractBearerToken = (req) => {
  const raw = req.get('authorization') || ''
  const match = raw.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : ''
}

export const serializeAdminSession = (payload) => ({
  role: payload?.role || 'establishment',
  username: payload?.username || null,
  establishment_id: payload?.establishment_id || null,
})
