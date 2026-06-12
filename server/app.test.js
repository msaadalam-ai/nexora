import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createHmac } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from './app.js'
import { createDatabase } from './database.js'

const testConfig = {
  host: '127.0.0.1',
  port: 0,
  databasePath: ':memory:',
  tokenSecret: 'test-secret-with-enough-entropy',
  tokenTtlSeconds: 3600,
  allowedOrigin: 'http://127.0.0.1:5173',
  webhookSecret: 'test-webhook-secret',
  environment: 'test',
}

async function setup() {
  const db = createDatabase(':memory:')
  const app = createApp({ config: testConfig, db })
  app.server.listen(0, '127.0.0.1')
  await once(app.server, 'listening')
  const address = app.server.address()
  const baseUrl = `http://127.0.0.1:${address.port}`
  const request = async (path, options = {}) => {
    const response = await fetch(`${baseUrl}${path}`, options)
    const contentType = response.headers.get('content-type') || ''
    const body = contentType.includes('json') ? await response.json() : await response.text()
    return { response, body }
  }
  const login = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@nexorapos.com', password: 'admin123' }),
  })
  return {
    ...app, baseUrl, request,
    token: login.body.accessToken,
    auth: { authorization: `Bearer ${login.body.accessToken}`, 'content-type': 'application/json' },
    close: async () => {
      app.server.close()
      await once(app.server, 'close')
      db.close()
    },
  }
}

test('health, authentication, and tenant-scoped catalog work', async () => {
  const app = await setup()
  try {
    const live = await app.request('/health/live')
    assert.equal(live.response.status, 200)
    assert.equal(live.body.status, 'ok')

    const unauthorized = await app.request('/api/v1/catalog/products')
    assert.equal(unauthorized.response.status, 401)

    const products = await app.request('/api/v1/catalog/products', { headers: app.auth })
    assert.equal(products.response.status, 200)
    assert.ok(products.body.items.length >= 5)
    assert.equal(products.body.items.find((item) => item.id === 'prd_runner').stock, 28)
  } finally {
    await app.close()
  }
})

test('order creation is transactional and idempotent', async () => {
  const app = await setup()
  try {
    const payload = {
      orderNumber: 'ORD-TEST-1',
      items: [{ productId: 'prd_runner', quantity: 2 }],
      paymentMethod: 'card',
      tax: 14.24,
    }
    const first = await app.request('/api/v1/orders', {
      method: 'POST',
      headers: { ...app.auth, 'idempotency-key': 'order-test-1' },
      body: JSON.stringify(payload),
    })
    assert.equal(first.response.status, 201)
    assert.equal(first.body.duplicate, false)

    const duplicate = await app.request('/api/v1/orders', {
      method: 'POST',
      headers: { ...app.auth, 'idempotency-key': 'order-test-1' },
      body: JSON.stringify(payload),
    })
    assert.equal(duplicate.response.status, 200)
    assert.equal(duplicate.body.duplicate, true)

    const products = await app.request('/api/v1/catalog/products', { headers: app.auth })
    assert.equal(products.body.items.find((item) => item.id === 'prd_runner').stock, 26)
    assert.equal(app.db.prepare("SELECT COUNT(*) AS count FROM orders WHERE order_number = 'ORD-TEST-1'").get().count, 1)
  } finally {
    await app.close()
  }
})

test('offline sync accepts once, exposes pull cursor, and reports version conflicts', async () => {
  const app = await setup()
  try {
    const orderEvent = {
      eventId: 'evt-order-1',
      idempotencyKey: 'offline-order-1',
      entityType: 'order',
      entityId: 'offline-order-id',
      operation: 'created',
      occurredAt: new Date().toISOString(),
      payload: {
        orderNumber: 'ORD-OFFLINE-1',
        total: 89,
        paymentMethod: 'cash',
        items: [{ productId: 'prd_runner', quantity: 1 }],
      },
    }
    const pushed = await app.request('/api/v1/sync/push', {
      method: 'POST', headers: app.auth, body: JSON.stringify({ events: [orderEvent] }),
    })
    assert.equal(pushed.response.status, 200)
    assert.deepEqual(pushed.body.accepted, [{ eventId: 'evt-order-1' }])

    const duplicate = await app.request('/api/v1/sync/push', {
      method: 'POST', headers: app.auth, body: JSON.stringify({ events: [orderEvent] }),
    })
    assert.deepEqual(duplicate.body.duplicates, [{ eventId: 'evt-order-1' }])

    const conflict = await app.request('/api/v1/sync/push', {
      method: 'POST',
      headers: app.auth,
      body: JSON.stringify({
        events: [{
          eventId: 'evt-product-conflict',
          idempotencyKey: 'product-conflict-1',
          entityType: 'product',
          entityId: 'prd_runner',
          operation: 'updated',
          baseVersion: 99,
          occurredAt: new Date().toISOString(),
          payload: { name: 'Conflicted', category: 'Footwear', price: 99, cost: 40, reorder: 8 },
        }],
      }),
    })
    assert.equal(conflict.body.conflicts.length, 1)
    assert.equal(conflict.body.conflicts[0].serverVersion, 1)
    assert.equal(conflict.body.conflicts[0].serverValue.name, 'Everyday Runner')
    assert.equal(conflict.body.conflicts[0].clientValue.name, 'Conflicted')

    const pulled = await app.request('/api/v1/sync/pull?cursor=0', { headers: app.auth })
    assert.ok(pulled.body.cursor > 0)
    assert.ok(pulled.body.events.some((event) => event.eventId === 'evt-order-1'))
  } finally {
    await app.close()
  }
})

test('monitoring, audit history, and signed ecommerce webhooks work', async () => {
  const app = await setup()
  try {
    const metrics = await app.request('/metrics')
    assert.equal(metrics.response.status, 200)
    assert.match(metrics.body, /nexora_http_requests_total/)

    const payload = JSON.stringify({ id: 'shopify-event-1', type: 'orders/create', order: { id: 1001 } })
    const signature = createHmac('sha256', testConfig.webhookSecret).update(payload).digest('hex')
    const webhook = await app.request('/api/v1/webhooks/ecommerce/shopify', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-webhook-signature': signature,
        'x-organization-id': 'org_nexora_demo',
      },
      body: payload,
    })
    assert.equal(webhook.response.status, 202)
    assert.equal(webhook.body.duplicate, false)

    const duplicate = await app.request('/api/v1/webhooks/ecommerce/shopify', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-webhook-signature': signature,
        'x-organization-id': 'org_nexora_demo',
      },
      body: payload,
    })
    assert.equal(duplicate.body.duplicate, true)

    const auditLogs = await app.request('/api/v1/audit-logs', { headers: app.auth })
    assert.equal(auditLogs.response.status, 200)
    assert.ok(auditLogs.body.items.some((item) => item.action === 'integration.webhook.receive'))
  } finally {
    await app.close()
  }
})

test('production server hosts the SPA and deep-route fallback', async () => {
  const staticRoot = await mkdtemp(join(tmpdir(), 'nexora-static-'))
  await writeFile(join(staticRoot, 'index.html'), '<!doctype html><title>Nexora POS</title><div id="root"></div>')
  const db = createDatabase(':memory:')
  const app = createApp({ config: { ...testConfig, staticRoot }, db })
  app.server.listen(0, '127.0.0.1')
  await once(app.server, 'listening')
  const address = app.server.address()
  try {
    for (const path of ['/', '/dashboard']) {
      const response = await fetch(`http://127.0.0.1:${address.port}${path}`)
      assert.equal(response.status, 200)
      assert.match(await response.text(), /Nexora POS/)
    }
  } finally {
    app.server.close()
    await once(app.server, 'close')
    db.close()
    await rm(staticRoot, { recursive: true, force: true })
  }
})
