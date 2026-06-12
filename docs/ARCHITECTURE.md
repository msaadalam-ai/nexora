# Enterprise Architecture

## Runtime Topology

```text
Web browser / Tauri desktop
  |-- IndexedDB or desktop SQLite cache
  |-- durable outbox
  |-- hardware adapter
  |
  +---- HTTPS ----> Nexora API
                    |-- authentication and RBAC
                    |-- tenant and branch isolation
                    |-- transactional sales
                    |-- sync push/pull
                    |-- ecommerce webhooks
                    |-- audit and metrics
                    |
                    +---- production PostgreSQL
```

The repository currently runs the central API against SQLite for a self-contained development and evaluation environment. A managed PostgreSQL adapter and migration are required before horizontally scaling the API.

The production Node service also serves the compiled React application and SPA route fallback from `dist`, allowing one container and origin for the first deployment. Larger deployments can move static assets to a CDN without changing API paths.

## Invariants

- Every business record is scoped by `organization_id`.
- Every physical stock movement is append-only and scoped by branch.
- Order creation requires an idempotency key.
- Offline events have globally unique event IDs and idempotency keys.
- Mutable entities use optimistic versions.
- Conflicts are returned to the client and never silently overwritten.
- Server timestamps are authoritative for posting; device timestamps are retained for audit.
- Card data is never stored by Nexora; a payment provider token is stored instead.

## Reliability Model

The branch application commits the local business change and outbox event together. The central API applies event batches transactionally and records processed event IDs. Pull synchronization uses an ordered sequence cursor. WebSocket notifications may later wake clients, but cursor-based pull remains the correctness mechanism.

## Current API

- `POST /api/v1/auth/login`
- `GET /api/v1/session`
- `GET /api/v1/catalog/products`
- `PUT /api/v1/catalog/products/:id`
- `GET /api/v1/orders`
- `POST /api/v1/orders`
- `POST /api/v1/devices/register`
- `POST /api/v1/sync/push`
- `GET /api/v1/sync/pull`
- `GET /api/v1/audit-logs`
- `POST /api/v1/webhooks/ecommerce/:provider`
- `GET /health/live`
- `GET /health/ready`
- `GET /metrics`

## Scaling Path

1. Replace the single-node SQLite adapter with PostgreSQL.
2. Put the API behind a managed load balancer and TLS termination.
3. Add Redis for distributed login throttling, ephemeral locks, and WebSocket fan-out.
4. Run background integration and report jobs in a separate worker service.
5. Store exports and backups in encrypted object storage.
6. Add multi-region read replicas only after recovery objectives justify the complexity.
