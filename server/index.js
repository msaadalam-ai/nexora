import { config } from './config.js'
import { createApp } from './app.js'

if (config.environment === 'production' && config.tokenSecret.startsWith('development-')) {
  console.warn(JSON.stringify({
    level: 'warn',
    message: 'TOKEN_SECRET is using the development default — set a strong value in production',
  }))
}

const { server, db } = createApp({ config })
server.listen(config.port, config.host, () => {
  console.log(JSON.stringify({
    level: 'info',
    message: 'Nexora API listening',
    url: `http://${config.host}:${config.port}`,
    environment: config.environment,
  }))
})

const shutdown = () => {
  server.close(() => {
    db.close()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
