import 'dotenv/config'
import { createApp } from './app.js'
import { log, serializeError } from './logger.js'

const startServer = async () => {
  const { app, config, databaseMode } = await createApp()
  app.listen(config.server.port, config.server.host, () => {
    log('info', 'server.started', {
      host: config.server.host,
      port: config.server.port,
      database_mode: databaseMode,
    })
  })
}

startServer().catch((error) => {
  log('error', 'server.bootstrap.failed', {
    error: serializeError(error),
  })
  process.exit(1)
})
