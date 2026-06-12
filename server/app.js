import { createServer } from 'node:http'
import { randomBytes, randomUUID } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { audit, createDatabase, publishEvent, transaction } from './database.js'
import { signToken, verifyPassword, verifyToken, verifyWebhook } from './security.js'

const json = (response, status, body, headers = {}) => {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers })
  response.end(JSON.stringify(body))
}

const cents = (value) => Math.round(Number(value) * 100)
const fromCents = (value) => Number(value) / 100
const timestamp = () => new Date().toISOString()
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
}

function serveStatic(response, staticRoot, pathname) {
  if (!staticRoot || !existsSync(staticRoot)) return false
  const root = resolve(staticRoot)
  const requested = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '')
  let target = resolve(join(root, requested || 'index.html'))
  if (!target.startsWith(root)) return false
  if (!existsSync(target) || statSync(target).isDirectory()) target = join(root, 'index.html')
  if (!existsSync(target)) return false
  response.writeHead(200, {
    'content-type': contentTypes[extname(target)] || 'application/octet-stream',
    'cache-control': extname(target) === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  })
  response.end(readFileSync(target))
  return true
}

async function readBody(request, limit = 1024 * 1024) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > limit) throw Object.assign(new Error('payload_too_large'), { status: 413 })
    chunks.push(chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return { raw, value: raw ? JSON.parse(raw) : {} }
}

function permissionsFor(role) {
  if (role === 'administrator') return ['*']
  if (role === 'manager') return ['catalog:read', 'catalog:write', 'sales:read', 'sales:write', 'reports:read', 'sync:write']
  return ['catalog:read', 'sales:read', 'sales:write', 'sync:write']
}

function requirePermission(context, permission) {
  if (!context.permissions.includes('*') && !context.permissions.includes(permission)) {
    throw Object.assign(new Error('forbidden'), { status: 403 })
  }
}

function authenticate(request, config) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) throw Object.assign(new Error('authentication_required'), { status: 401 })
  const payload = verifyToken(token, config.tokenSecret)
  return {
    organizationId: payload.organizationId,
    branchId: payload.branchId,
    userId: payload.sub,
    deviceId: payload.deviceId || null,
    role: payload.role,
    permissions: payload.permissions || permissionsFor(payload.role),
    ip: request.socket.remoteAddress,
  }
}

function mapProduct(row) {
  return {
    id: row.id, sku: row.sku, name: row.name, category: row.category,
    price: fromCents(row.price_cents), cost: fromCents(row.cost_cents),
    reorder: row.reorder_level, stock: row.stock, version: row.version,
    updatedAt: row.updated_at,
  }
}

function mapOrder(row) {
  return {
    id: row.id, orderNumber: row.order_number, customer: row.customer_name || 'Walk-in customer',
    channel: row.channel, location: row.branch_name, total: fromCents(row.total_cents),
    payment: row.payment_method, status: row.status, date: row.occurred_at,
  }
}

export function createApp(options) {
  const config = options.config
  const db = options.db || createDatabase(config.databasePath)
  const metrics = { requests: 0, errors: 0, syncAccepted: 0, syncConflicts: 0, startedAt: Date.now() }

  const server = createServer(async (request, response) => {
    const requestId = request.headers['x-request-id'] || randomUUID()
    const startedAt = Date.now()
    metrics.requests += 1
    response.setHeader('x-request-id', requestId)
    response.setHeader('access-control-allow-origin', config.allowedOrigin)
    response.setHeader('access-control-allow-headers', 'authorization, content-type, idempotency-key, x-device-id, x-webhook-signature, x-organization-id')
    response.setHeader('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.setHeader('x-content-type-options', 'nosniff')
    response.setHeader('x-frame-options', 'DENY')
    response.setHeader('referrer-policy', 'no-referrer')
    response.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=()')

    if (request.method === 'OPTIONS') return json(response, 204, null)
    const url = new URL(request.url, `http://${request.headers.host}`)

    try {
      if (request.method === 'GET' && url.pathname === '/health/live') return json(response, 200, { status: 'ok', service: 'nexora-api' })
      if (request.method === 'GET' && url.pathname === '/health/ready') {
        db.prepare('SELECT 1 AS ready').get()
        return json(response, 200, { status: 'ready', database: 'connected' })
      }
      if (request.method === 'GET' && url.pathname === '/metrics') {
        const body = [
          `nexora_http_requests_total ${metrics.requests}`,
          `nexora_http_errors_total ${metrics.errors}`,
          `nexora_sync_events_accepted_total ${metrics.syncAccepted}`,
          `nexora_sync_conflicts_total ${metrics.syncConflicts}`,
          `nexora_process_uptime_seconds ${Math.floor((Date.now() - metrics.startedAt) / 1000)}`,
        ].join('\n')
        response.writeHead(200, { 'content-type': 'text/plain; version=0.0.4' })
        return response.end(`${body}\n`)
      }

      if (request.method === 'GET' && !url.pathname.startsWith('/api/')) {
        if (serveStatic(response, config.staticRoot, url.pathname)) return
      }

      if (request.method === 'POST' && url.pathname === '/api/v1/auth/login') {
        const { value } = await readBody(request)
        const row = db.prepare(`SELECT u.*, b.name AS branch_name FROM users u
          LEFT JOIN branches b ON b.id = u.branch_id WHERE lower(u.email) = lower(?) AND u.status = 'active'`).get(value.email || '')
        if (!row || !verifyPassword(value.password || '', row.password_hash)) {
          throw Object.assign(new Error('invalid_credentials'), { status: 401 })
        }
        const permissions = JSON.parse(row.permissions_json)
        const token = signToken({
          sub: row.id, organizationId: row.organization_id, branchId: row.branch_id,
          role: row.role, permissions,
        }, config.tokenSecret, config.tokenTtlSeconds)
        audit(db, { organizationId: row.organization_id, branchId: row.branch_id, userId: row.id, ip: request.socket.remoteAddress }, 'auth.login', 'user', row.id, 'success')
        return json(response, 200, {
          accessToken: token, expiresIn: config.tokenTtlSeconds,
          user: { id: row.id, name: row.display_name, email: row.email, role: row.role, permissions },
          branch: { id: row.branch_id, name: row.branch_name },
        })
      }

      if (request.method === 'POST' && url.pathname.startsWith('/api/v1/webhooks/ecommerce/')) {
        const provider = url.pathname.split('/').at(-1)
        const { raw, value } = await readBody(request)
        if (!verifyWebhook(raw, request.headers['x-webhook-signature'], config.webhookSecret)) {
          throw Object.assign(new Error('invalid_webhook_signature'), { status: 401 })
        }
        const organizationId = request.headers['x-organization-id']
        if (!organizationId || !db.prepare('SELECT id FROM organizations WHERE id = ?').get(organizationId)) {
          throw Object.assign(new Error('organization_not_found'), { status: 404 })
        }
        const externalId = value.id || request.headers['x-request-id'] || randomUUID()
        try {
          db.prepare(`INSERT INTO integration_events
            (id, organization_id, provider, external_id, event_type, payload_json, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'received', ?)`).run(
            randomUUID(), organizationId, provider, externalId, value.type || 'unknown', JSON.stringify(value), timestamp(),
          )
        } catch (error) {
          if (String(error.message).includes('UNIQUE')) return json(response, 200, { received: true, duplicate: true })
          throw error
        }
        audit(db, { organizationId, ip: request.socket.remoteAddress }, 'integration.webhook.receive', 'integration_event', externalId, 'success', { provider })
        return json(response, 202, { received: true, duplicate: false })
      }

      const context = authenticate(request, config)

      if (request.method === 'GET' && url.pathname === '/api/v1/session') {
        return json(response, 200, { organizationId: context.organizationId, branchId: context.branchId, userId: context.userId, role: context.role, permissions: context.permissions })
      }

      if (request.method === 'GET' && url.pathname === '/api/v1/catalog/products') {
        requirePermission(context, 'catalog:read')
        const rows = db.prepare(`SELECT p.*,
          COALESCE(SUM(CASE WHEN m.branch_id = ? THEN m.quantity ELSE 0 END), 0) AS stock
          FROM products p LEFT JOIN inventory_movements m ON m.product_id = p.id
          WHERE p.organization_id = ? AND p.deleted_at IS NULL GROUP BY p.id ORDER BY p.name`).all(context.branchId, context.organizationId)
        return json(response, 200, { items: rows.map(mapProduct) })
      }

      if (request.method === 'PUT' && url.pathname.startsWith('/api/v1/catalog/products/')) {
        requirePermission(context, 'catalog:write')
        const id = url.pathname.split('/').at(-1)
        const { value } = await readBody(request)
        const current = db.prepare('SELECT * FROM products WHERE id = ? AND organization_id = ? AND deleted_at IS NULL').get(id, context.organizationId)
        if (!current) throw Object.assign(new Error('product_not_found'), { status: 404 })
        if (Number(value.version) !== current.version) {
          return json(response, 409, { error: 'version_conflict', current: mapProduct({ ...current, stock: 0 }) })
        }
        const nextVersion = current.version + 1
        const updatedAt = timestamp()
        transaction(db, () => {
          db.prepare(`UPDATE products SET name = ?, category = ?, price_cents = ?, cost_cents = ?,
            reorder_level = ?, version = ?, updated_at = ? WHERE id = ? AND organization_id = ?`).run(
            value.name, value.category, cents(value.price), cents(value.cost), Number(value.reorder || 0),
            nextVersion, updatedAt, id, context.organizationId,
          )
          publishEvent(db, context, { entityType: 'product', entityId: id, operation: 'updated', entityVersion: nextVersion, payload: value })
          audit(db, context, 'catalog.product.update', 'product', id, 'success', { version: nextVersion })
        })
        return json(response, 200, { id, version: nextVersion, updatedAt })
      }

      if (request.method === 'GET' && url.pathname === '/api/v1/orders') {
        requirePermission(context, 'sales:read')
        const rows = db.prepare(`SELECT o.*, c.name AS customer_name, b.name AS branch_name
          FROM orders o LEFT JOIN customers c ON c.id = o.customer_id JOIN branches b ON b.id = o.branch_id
          WHERE o.organization_id = ? ORDER BY o.created_at DESC LIMIT 200`).all(context.organizationId)
        return json(response, 200, { items: rows.map(mapOrder) })
      }

      if (request.method === 'POST' && url.pathname === '/api/v1/orders') {
        requirePermission(context, 'sales:write')
        const idempotencyKey = request.headers['idempotency-key']
        if (!idempotencyKey) throw Object.assign(new Error('idempotency_key_required'), { status: 400 })
        const existing = db.prepare('SELECT * FROM orders WHERE organization_id = ? AND idempotency_key = ?').get(context.organizationId, idempotencyKey)
        if (existing) return json(response, 200, { order: mapOrder({ ...existing, branch_name: 'Downtown' }), duplicate: true })
        const { value } = await readBody(request)
        const items = Array.isArray(value.items) ? value.items : []
        if (!items.length) throw Object.assign(new Error('order_items_required'), { status: 400 })
        const products = new Map()
        for (const item of items) {
          const product = db.prepare('SELECT * FROM products WHERE id = ? AND organization_id = ? AND deleted_at IS NULL').get(item.productId, context.organizationId)
          if (!product) throw Object.assign(new Error(`product_not_found:${item.productId}`), { status: 400 })
          products.set(product.id, product)
        }
        const subtotalCents = items.reduce((sum, item) => sum + products.get(item.productId).price_cents * Number(item.quantity), 0)
        const discountCents = cents(value.discount || 0)
        const taxCents = cents(value.tax || 0)
        const totalCents = subtotalCents - discountCents + taxCents
        const orderId = value.id || randomUUID()
        const orderNumber = value.orderNumber || `ORD-${Date.now().toString().slice(-8)}`
        const occurredAt = value.occurredAt || timestamp()
        const createdAt = timestamp()
        transaction(db, () => {
          db.prepare(`INSERT INTO orders
            (id, organization_id, branch_id, device_id, customer_id, order_number, channel, status,
             subtotal_cents, discount_cents, tax_cents, total_cents, payment_method, idempotency_key, occurred_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            orderId, context.organizationId, context.branchId, context.deviceId, value.customerId || null,
            orderNumber, value.channel || 'in_store', subtotalCents, discountCents, taxCents, totalCents,
            value.paymentMethod || 'cash', idempotencyKey, occurredAt, createdAt,
          )
          const insertItem = db.prepare(`INSERT INTO order_items
            (id, order_id, product_id, quantity, unit_price_cents, discount_cents, tax_cents) VALUES (?, ?, ?, ?, ?, 0, 0)`)
          const insertMovement = db.prepare(`INSERT INTO inventory_movements
            (id, organization_id, branch_id, product_id, movement_type, quantity, reference_type, reference_id, occurred_at, created_at)
            VALUES (?, ?, ?, ?, 'sale', ?, 'order', ?, ?, ?)`)
          for (const item of items) {
            const product = products.get(item.productId)
            insertItem.run(randomUUID(), orderId, product.id, Number(item.quantity), product.price_cents)
            insertMovement.run(randomUUID(), context.organizationId, context.branchId, product.id, -Number(item.quantity), orderId, occurredAt, createdAt)
          }
          const payload = { id: orderId, orderNumber, items, total: fromCents(totalCents), paymentMethod: value.paymentMethod || 'cash' }
          publishEvent(db, context, { entityType: 'order', entityId: orderId, operation: 'created', payload, occurredAt })
          audit(db, context, 'sales.order.create', 'order', orderId, 'success', { orderNumber, totalCents })
        })
        return json(response, 201, { order: { id: orderId, orderNumber, total: fromCents(totalCents), status: 'completed', occurredAt }, duplicate: false })
      }

      if (request.method === 'POST' && url.pathname === '/api/v1/devices/register') {
        requirePermission(context, 'sync:write')
        const { value } = await readBody(request)
        const deviceId = value.id || randomUUID()
        const credential = randomBytes(32).toString('hex')
        db.prepare(`INSERT INTO devices (id, organization_id, branch_id, name, platform, credential_hash, last_seen_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, platform = excluded.platform, last_seen_at = excluded.last_seen_at`).run(
          deviceId, context.organizationId, context.branchId, value.name || 'POS device', value.platform || 'web',
          credential, timestamp(), timestamp(),
        )
        audit(db, context, 'device.register', 'device', deviceId, 'success', { platform: value.platform || 'web' })
        return json(response, 201, { deviceId, credential })
      }

      if (request.method === 'POST' && url.pathname === '/api/v1/sync/push') {
        requirePermission(context, 'sync:write')
        const { value } = await readBody(request, 5 * 1024 * 1024)
        const result = { accepted: [], duplicates: [], conflicts: [], rejected: [] }
        for (const event of value.events || []) {
          try {
            const processed = db.prepare('SELECT result_json FROM processed_events WHERE event_id = ? OR (organization_id = ? AND idempotency_key = ?)').get(event.eventId, context.organizationId, event.idempotencyKey)
            if (processed) {
              result.duplicates.push({ eventId: event.eventId })
              continue
            }
            transaction(db, () => {
              if (event.entityType === 'order' && event.operation === 'created') {
                const orderRequest = event.payload
                const existingOrder = db.prepare('SELECT id FROM orders WHERE organization_id = ? AND idempotency_key = ?').get(context.organizationId, event.idempotencyKey)
                if (!existingOrder) {
                  const totalCents = cents(orderRequest.total)
                  db.prepare(`INSERT INTO orders
                    (id, organization_id, branch_id, device_id, customer_id, order_number, channel, status,
                     subtotal_cents, discount_cents, tax_cents, total_cents, payment_method, idempotency_key, occurred_at, created_at)
                    VALUES (?, ?, ?, ?, NULL, ?, ?, 'completed', ?, 0, 0, ?, ?, ?, ?, ?)`).run(
                    event.entityId, context.organizationId, context.branchId, context.deviceId,
                    orderRequest.orderNumber, orderRequest.channel || 'in_store', totalCents, totalCents,
                    orderRequest.paymentMethod || 'cash', event.idempotencyKey, event.occurredAt, timestamp(),
                  )
                  const insertItem = db.prepare(`INSERT INTO order_items
                    (id, order_id, product_id, quantity, unit_price_cents, discount_cents, tax_cents) VALUES (?, ?, ?, ?, ?, 0, 0)`)
                  const insertMovement = db.prepare(`INSERT INTO inventory_movements
                    (id, organization_id, branch_id, product_id, movement_type, quantity, reference_type, reference_id, occurred_at, created_at)
                    VALUES (?, ?, ?, ?, 'sale', ?, 'order', ?, ?, ?)`)
                  for (const item of orderRequest.items || []) {
                    const product = db.prepare('SELECT price_cents FROM products WHERE id = ? AND organization_id = ?').get(item.productId, context.organizationId)
                    if (!product) throw new Error(`product_not_found:${item.productId}`)
                    insertItem.run(randomUUID(), event.entityId, item.productId, Number(item.quantity), product.price_cents)
                    insertMovement.run(randomUUID(), context.organizationId, context.branchId, item.productId, -Number(item.quantity), event.entityId, event.occurredAt, timestamp())
                  }
                }
              } else if (event.entityType === 'product' && event.operation === 'updated') {
                const current = db.prepare('SELECT version FROM products WHERE id = ? AND organization_id = ?').get(event.entityId, context.organizationId)
                if (!current || current.version !== event.baseVersion) {
                  const conflict = new Error('version_conflict')
                  const serverProduct = current ? db.prepare('SELECT * FROM products WHERE id = ? AND organization_id = ?').get(event.entityId, context.organizationId) : null
                  conflict.conflict = {
                    eventId: event.eventId,
                    entityType: event.entityType,
                    entityId: event.entityId,
                    serverVersion: current?.version || null,
                    clientVersion: event.baseVersion,
                    serverValue: serverProduct ? {
                      id: serverProduct.id, name: serverProduct.name, category: serverProduct.category,
                      price: fromCents(serverProduct.price_cents), cost: fromCents(serverProduct.cost_cents),
                      reorder: serverProduct.reorder_level, version: serverProduct.version,
                    } : null,
                    clientValue: event.payload,
                  }
                  throw conflict
                }
                const nextVersion = current.version + 1
                db.prepare(`UPDATE products SET name = ?, category = ?, price_cents = ?, cost_cents = ?,
                  reorder_level = ?, version = ?, updated_at = ? WHERE id = ? AND organization_id = ?`).run(
                  event.payload.name, event.payload.category, cents(event.payload.price), cents(event.payload.cost),
                  Number(event.payload.reorder || 0), nextVersion, timestamp(), event.entityId, context.organizationId,
                )
                event.entityVersion = nextVersion
              }
              publishEvent(db, context, {
                eventId: event.eventId, entityType: event.entityType, entityId: event.entityId,
                operation: event.operation, entityVersion: event.entityVersion, payload: event.payload,
                occurredAt: event.occurredAt,
              })
              db.prepare('INSERT INTO processed_events (event_id, organization_id, idempotency_key, result_json, processed_at) VALUES (?, ?, ?, ?, ?)').run(
                event.eventId, context.organizationId, event.idempotencyKey, JSON.stringify({ accepted: true }), timestamp(),
              )
            })
            result.accepted.push({ eventId: event.eventId })
            metrics.syncAccepted += 1
          } catch (error) {
            if (error.conflict) {
              result.conflicts.push(error.conflict)
              metrics.syncConflicts += 1
            } else {
              result.rejected.push({ eventId: event.eventId, error: error.message })
            }
          }
        }
        audit(db, context, 'sync.push', 'sync_batch', null, 'success', {
          accepted: result.accepted.length, conflicts: result.conflicts.length, rejected: result.rejected.length,
        })
        return json(response, 200, result)
      }

      if (request.method === 'GET' && url.pathname === '/api/v1/sync/pull') {
        requirePermission(context, 'sync:write')
        const cursor = Math.max(0, Number(url.searchParams.get('cursor') || 0))
        const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') || 100)))
        const rows = db.prepare(`SELECT * FROM sync_events WHERE organization_id = ? AND sequence > ? ORDER BY sequence LIMIT ?`).all(context.organizationId, cursor, limit)
        const nextCursor = rows.length ? rows.at(-1).sequence : cursor
        return json(response, 200, {
          cursor: nextCursor,
          hasMore: rows.length === limit,
          events: rows.map((row) => ({
            sequence: row.sequence, eventId: row.event_id, branchId: row.branch_id, deviceId: row.device_id,
            entityType: row.entity_type, entityId: row.entity_id, operation: row.operation,
            entityVersion: row.entity_version, payload: JSON.parse(row.payload_json), occurredAt: row.occurred_at,
          })),
        })
      }

      if (request.method === 'GET' && url.pathname === '/api/v1/audit-logs') {
        requirePermission(context, 'reports:read')
        const rows = db.prepare('SELECT * FROM audit_logs WHERE organization_id = ? ORDER BY sequence DESC LIMIT 200').all(context.organizationId)
        return json(response, 200, { items: rows.map((row) => ({ ...row, metadata: JSON.parse(row.metadata_json), metadata_json: undefined })) })
      }

      throw Object.assign(new Error('not_found'), { status: 404 })
    } catch (error) {
      metrics.errors += 1
      const status = error.status || (error.message === 'invalid_token' || error.message === 'expired_token' ? 401 : 500)
      console.error(JSON.stringify({ level: 'error', requestId, method: request.method, path: url.pathname, status, error: error.message, durationMs: Date.now() - startedAt }))
      return json(response, status, { error: error.message, requestId })
    } finally {
      console.log(JSON.stringify({ level: 'info', requestId, method: request.method, path: url.pathname, durationMs: Date.now() - startedAt }))
    }
  })

  return { server, db, metrics }
}
