export const serializeError = (error) => ({
  name: error?.name || 'Error',
  message: error?.message || String(error),
  code: error?.code || error?.errno || null,
  stack: error?.stack || null,
})

export const log = (level, event, meta = {}) => {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...meta,
  }
  const line = JSON.stringify(payload)
  if (level === 'error') {
    console.error(line)
    return
  }
  console.log(line)
}
