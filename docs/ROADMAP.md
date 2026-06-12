# Enterprise Delivery Roadmap

## Implemented Foundation

- Cloud API and durable relational schema
- Real authentication and RBAC enforcement
- Transactional, idempotent orders
- Append-only stock movements
- Offline outbox and cursor sync contracts
- Optimistic conflict detection
- Audit logs, health checks, metrics, CI, and container packaging
- Ecommerce webhook boundary
- Tauri desktop shell and hardware adapter boundary
- Security, compliance, architecture, and recovery documentation

## Remaining Production Program

### Data Platform

- PostgreSQL adapter, migrations, row-level security, connection pooling, and replicas
- Automated backup, point-in-time recovery, data retention, and restore drills
- Background workers and a dead-letter queue

### Identity and Security

- Refresh-token rotation, MFA, SSO, SCIM, password recovery, device revocation, and gateway rate limiting
- Secret manager, encrypted desktop database, code signing, penetration testing, and security monitoring

### Commerce

- Certified payment terminal integrations
- Shopify, WooCommerce, and marketplace connectors with reconciliation
- Tax, invoicing, returns, promotions, loyalty, and accounting provider production workflows

### Hardware

- Tested ESC/POS printers, cash drawers, barcode scanners, scales, customer displays, and label printers
- Per-model diagnostics and fallback procedures

### Quality and Operations

- Load, soak, chaos, accessibility, localization, and disaster-recovery testing
- Production dashboards, alerts, SLOs, support tooling, and staged rollout
- Legal documents, compliance assessments, privacy workflows, and customer onboarding

The remaining work is a multi-month product and operations program, not a single coding task. The current repository is now an executable enterprise foundation rather than a production certification.
