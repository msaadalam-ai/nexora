import { resolve } from 'node:path'

export const config = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
  databasePath: resolve(process.env.DATABASE_PATH || 'data/nexora.db'),
  staticRoot: resolve(process.env.STATIC_ROOT || 'dist'),
  tokenSecret: process.env.TOKEN_SECRET || 'development-only-change-this-secret',
  tokenTtlSeconds: Number(process.env.TOKEN_TTL_SECONDS || 3600),
  allowedOrigin: process.env.ALLOWED_ORIGIN || 'http://127.0.0.1:5173',
  webhookSecret: process.env.WEBHOOK_SECRET || 'development-webhook-secret',
  environment: process.env.NODE_ENV || 'development',
}
