# Multi-Branch Desktop Synchronization

## Recommended Topology

Package the React interface as a desktop application with Tauri or Electron. Each branch installation has:

- A local SQLite database for products, customers, cached stock, settings, and offline sales.
- A background sync worker that keeps running while the application is open.
- A unique `branch_id`, `device_id`, and authenticated device credential.
- A central HTTPS API backed by PostgreSQL as the source of truth for the whole company.

```text
Branch 1 desktop + SQLite ─┐
Branch 2 desktop + SQLite ─┼─ HTTPS sync API ─ PostgreSQL ─ Admin/reporting
Branch 3 desktop + SQLite ─┘
```

Do not share a SQLite file over a network drive and do not synchronize branches directly with each other. Both approaches create corruption, duplication, and conflict risks.

## Offline-First Data Flow

Every local change is committed to SQLite and an `outbox_events` table in one database transaction.

1. The cashier completes a sale locally without waiting for the internet.
2. The sale, payment reference, and stock movements receive globally unique IDs.
3. An outbox event is queued with an idempotency key.
4. The sync worker pushes unsent events to the central API in ordered batches.
5. The server applies each event once, updates the company database, and returns acknowledgements.
6. The branch pulls newer server changes using its last synchronization cursor.
7. Acknowledged outbox events are retained for audit or safely archived.

Suggested event fields:

```text
event_id, entity_type, entity_id, operation, branch_id, device_id,
entity_version, payload, occurred_at, idempotency_key, sync_status
```

## Conflict Rules

- Sales, payments, returns, and stock movements are append-only. Never overwrite or merge them.
- Inventory is calculated from stock movements, not by synchronizing a mutable quantity field.
- Products, prices, customers, and settings use optimistic version numbers.
- A stale product update is rejected and shown for manager review.
- Customer records can merge non-conflicting fields, but financial balances cannot.
- Deletes use tombstones (`deleted_at`) so disconnected branches also receive the deletion.
- The API must reject duplicate idempotency keys, preventing duplicate orders after retries.

## Inventory Behavior

Each branch owns its physical branch stock while offline. The central server maintains the consolidated view.

- A local sale immediately reduces the branch's cached available stock.
- Transfers create paired movement records: `transfer_out` and `transfer_in`.
- Incoming stock is unavailable until the destination branch receives it.
- Ecommerce availability should use the central server and reserve stock against a selected fulfillment branch.
- Choose an explicit overselling policy for long outages: block at zero, allow manager override, or permit a configured negative limit.

## API Surface

```text
POST /sync/push
GET  /sync/pull?cursor=...
POST /devices/register
POST /devices/heartbeat
GET  /branches/{branchId}/stock
POST /orders/{orderId}/payments
```

`POST /sync/push` should accept a batch, process it transactionally, and return accepted, duplicate, and conflicted event IDs. `GET /sync/pull` should return a deterministic cursor and ordered changes.

## Security and Operations

- TLS for every connection; never expose PostgreSQL directly to branches.
- Short-lived access tokens plus revocable device credentials.
- Role-based permissions enforced by the server, not only by the desktop UI.
- Encrypt sensitive local data and store secrets in the operating-system credential vault.
- Signed application updates, automated database backups, and tested restore procedures.
- Central monitoring for offline devices, sync lag, failed events, duplicate attempts, and clock drift.
- Use server timestamps for financial posting; keep device timestamps only as audit metadata.

## Practical Technology Choice

- Desktop shell: Tauri for a smaller installer, or Electron for the broadest JavaScript ecosystem.
- Local database: SQLite with migrations and an outbox table.
- Central API: Node.js/NestJS, .NET, Java/Spring, or another transactional backend.
- Central database: PostgreSQL.
- Live notifications: WebSocket or server-sent events only as a wake-up signal; correctness must still come from cursor-based sync.
- Hosting: a managed cloud service is simplest for geographically separated branches. A head-office server also works if all branches connect through a reliable VPN.

The current React project is the UI and local-demo foundation. The synchronization system requires the desktop wrapper, local database layer, central API, PostgreSQL schema, authentication, migrations, and deployment infrastructure described above.
