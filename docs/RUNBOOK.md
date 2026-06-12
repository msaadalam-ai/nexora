# Operations Runbook

## Health and Monitoring

- Liveness: `GET /health/live`
- Readiness: `GET /health/ready`
- Prometheus metrics: `GET /metrics`
- Alert on readiness failures, HTTP 5xx rate, sync conflicts, rejected events, sync backlog, and devices unseen for a configured interval.

## Backup

Development SQLite:

1. Pause writes or use SQLite's online backup API.
2. Copy the database and verify `PRAGMA integrity_check`.
3. Encrypt and upload the backup to separate storage.
4. Test restoration monthly.

Production PostgreSQL:

- Enable point-in-time recovery.
- Keep encrypted daily snapshots in a second account or project.
- Define and test RPO/RTO with the business.
- Run quarterly full disaster-recovery exercises.

## Incident Priorities

- P1: payment corruption, cross-tenant exposure, lost sales, unavailable checkout across branches.
- P2: delayed synchronization, ecommerce backlog, reporting unavailable.
- P3: isolated device or non-critical integration issue.

For P1, freeze deployments, preserve logs, assign incident command, notify security/legal as appropriate, and communicate at a fixed cadence.

## Sync Recovery

1. Do not delete a branch outbox during an outage.
2. Check API readiness and device credentials.
3. Inspect rejected and conflicted events.
4. Retry idempotently.
5. Resolve mutable-entity conflicts with an authorized manager.
6. Reconcile central order totals against branch closing reports.
