import { mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { hashPassword } from './security.js'

const timestamp = () => new Date().toISOString()

export function createDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'))
  seed(db)
  return db
}

function seed(db) {
  const existing = db.prepare('SELECT id FROM organizations LIMIT 1').get()
  if (existing) return
  const now = timestamp()
  const organizationId = 'org_nexora_demo'
  const branchId = 'branch_downtown'
  db.exec('BEGIN IMMEDIATE')
  try {
    db.prepare('INSERT INTO organizations (id, name, created_at) VALUES (?, ?, ?)').run(organizationId, 'Nexora Demo', now)
    db.prepare('INSERT INTO branches (id, organization_id, code, name, timezone, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(branchId, organizationId, 'BR-001', 'Downtown', 'Asia/Karachi', now)
    db.prepare(`INSERT INTO users (id, organization_id, branch_id, email, display_name, password_hash, role, permissions_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      'user_admin', organizationId, branchId, 'admin@nexorapos.com', 'Alex Morgan',
      hashPassword('admin123'), 'administrator', JSON.stringify(['*']), now,
    )
    const products = [
      ['prd_runner', 'SH-RUN-001', 'Everyday Runner', 'Footwear', 8900, 4200, 8, 28],
      ['prd_tee', 'AP-TEE-002', 'Classic Cotton Tee', 'Apparel', 3200, 1100, 12, 46],
      ['prd_bottle', 'AC-BTL-003', 'Hydration Bottle', 'Accessories', 2400, 800, 10, 7],
      ['prd_membership', 'GYM-PRO-01', 'Premium Membership', 'Membership', 6500, 0, 0, 999],
      ['prd_training', 'SVC-PT-001', 'Personal Training', 'Service', 4500, 2000, 0, 999],
    ]
    const insertProduct = db.prepare(`INSERT INTO products
      (id, organization_id, sku, name, category, price_cents, cost_cents, reorder_level, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    const insertMovement = db.prepare(`INSERT INTO inventory_movements
      (id, organization_id, branch_id, product_id, movement_type, quantity, reference_type, reference_id, occurred_at, created_at)
      VALUES (?, ?, ?, ?, 'opening', ?, 'seed', 'initial', ?, ?)`)
    for (const [id, sku, name, category, price, cost, reorder, stock] of products) {
      insertProduct.run(id, organizationId, sku, name, category, price, cost, reorder, now)
      insertMovement.run(randomUUID(), organizationId, branchId, id, stock, now, now)
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function transaction(db, work) {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = work()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function audit(db, context, action, resourceType, resourceId, result, metadata = {}) {
  db.prepare(`INSERT INTO audit_logs
    (id, organization_id, branch_id, actor_id, action, resource_type, resource_id, result, metadata_json, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    randomUUID(), context.organizationId, context.branchId || null, context.userId || context.deviceId || null,
    action, resourceType, resourceId || null, result, JSON.stringify(metadata), context.ip || null, timestamp(),
  )
}

export function publishEvent(db, context, event) {
  const createdAt = timestamp()
  db.prepare(`INSERT INTO sync_events
    (event_id, organization_id, branch_id, device_id, entity_type, entity_id, operation, entity_version, payload_json, occurred_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    event.eventId || randomUUID(), context.organizationId, context.branchId, context.deviceId || null,
    event.entityType, event.entityId, event.operation, event.entityVersion || null,
    JSON.stringify(event.payload), event.occurredAt || createdAt, createdAt,
  )
}
