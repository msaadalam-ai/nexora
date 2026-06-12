# Nexora POS

An offline-capable, multi-industry point-of-sale platform with a React client, authenticated cloud API, relational data model, conflict-aware synchronization, and a Tauri desktop foundation.

## Included

- Secure-looking email/password and PIN sign-in
- Responsive dashboard with live charts and business KPIs
- Touch-friendly POS register with products, cart, discounts, tax, held carts, payment methods, receipts, and stock updates
- Omnichannel order list and order detail timeline
- Product, inventory, customer, supplier, purchasing, accounting, staff, and administration modules
- CRUD record dialogs, searching, status display, and export-ready interfaces
- Loyalty, promotions, returns, barcode labels, stock transfers/counts, audit log, and integrations
- Detailed report library with chart drill-down
- Industry profiles for retail, ecommerce, gym, and services
- Dark mode and local browser persistence
- Offline-selling configuration and sync status UI

## Run

```bash
npm install
npm run dev
```

This starts:

- Web client: `http://127.0.0.1:5173`
- Cloud API: `http://127.0.0.1:8787`
- API readiness: `http://127.0.0.1:8787/health/ready`
- Metrics: `http://127.0.0.1:8787/metrics`

Demo credentials are prefilled: `admin@nexorapos.com` / `admin123`.

## Verification

```bash
npm run verify
```

Server tests use isolated in-memory databases. UI verification starts isolated API and web processes and exercises the cloud login and main workflows in Chrome.

## Enterprise Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Security](./docs/SECURITY.md)
- [Compliance readiness](./docs/COMPLIANCE.md)
- [Operations runbook](./docs/RUNBOOK.md)
- [Delivery roadmap](./docs/ROADMAP.md)
- [API contract](./docs/openapi.yaml)
- [Desktop shell](./desktop/README.md)

## Production notes

The repository is an executable enterprise foundation. It is not yet certified for production payment processing. Complete the remaining program in the roadmap, especially PostgreSQL, payment-provider certification, hardened identity, production hardware drivers, security testing, and compliance assessment.

For GitHub deployment to Hostinger Node.js hosting, follow
[HOSTINGER_DEPLOYMENT.md](./HOSTINGER_DEPLOYMENT.md).

For Railway deployment, follow [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md).

For a Vercel frontend connected to a Railway backend, follow
[VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md).

For an offline-first three-branch desktop deployment, see [SYNC_ARCHITECTURE.md](./SYNC_ARCHITECTURE.md).
