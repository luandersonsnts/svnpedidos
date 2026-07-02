const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'expect',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

const readRawRequestBody = async (req) => {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined
}

const getRequestBody = async (req, method) => {
  if (method === 'GET' || method === 'HEAD') return undefined

  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body) || typeof req.body === 'string') {
      return req.body
    }

    if (typeof req.body === 'object') {
      return Buffer.from(JSON.stringify(req.body))
    }

    return Buffer.from(String(req.body))
  }

  if (typeof req?.[Symbol.asyncIterator] === 'function') {
    return readRawRequestBody(req)
  }

  return undefined
}

export const proxyHandler = async function proxyRequest(req, res) {
  const upstreamBase = process.env.API_UPSTREAM_URL
  if (!upstreamBase) {
    res.status(500).json({ error: 'missing_api_upstream_url' })
    return
  }

  const targetUrl = new URL(req.url, upstreamBase)
  const headers = new Headers()
  Object.entries(req.headers || {}).forEach(([key, value]) => {
    if (!value || HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(key, item))
      return
    }
    headers.set(key, value)
  })

  const method = req.method || 'GET'
  const body = await getRequestBody(req, method)

  const upstreamResponse = await fetch(targetUrl, {
    method,
    headers,
    body,
    redirect: 'manual',
  })

  res.statusCode = upstreamResponse.status
  upstreamResponse.headers.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return
    res.setHeader(key, value)
  })

  const arrayBuffer = await upstreamResponse.arrayBuffer()
  res.send(Buffer.from(arrayBuffer))
}

export default proxyHandler
