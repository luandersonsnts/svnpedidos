const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

const readRequestBody = async (req) => {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined
}

export default async function handler(req, res) {
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
  const body = method === 'GET' || method === 'HEAD' ? undefined : await readRequestBody(req)
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
