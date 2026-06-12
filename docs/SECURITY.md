# Security Baseline

## Implemented

- Scrypt password hashing with unique salts.
- Signed, expiring access tokens.
- Server-enforced role permissions.
- Organization and branch scoping in data queries.
- Idempotency enforcement for orders and sync events.
- HMAC validation for ecommerce webhooks.
- Structured audit logging.
- Request IDs and security response headers.
- Desktop content-security policy and signed-updater configuration points.
- Production startup refusal when the development token secret is still configured.

## Required Before Public Production

- Replace local credentials with an identity provider or add refresh-token rotation, MFA, password reset, lockout, and breached-password checks.
- Move secrets into a cloud secret manager.
- Use PostgreSQL row-level security as defense in depth.
- Add distributed rate limiting at the gateway and application layer.
- Terminate TLS 1.2+ at a managed load balancer and enable HSTS.
- Encrypt local desktop databases and use the operating-system credential vault.
- Complete dependency, SAST, DAST, container, and infrastructure scans in CI.
- Commission penetration testing before handling customer production data.
- Define vulnerability disclosure and incident response processes.

## Threat Model Highlights

| Threat | Primary control |
| --- | --- |
| Cross-tenant access | Server tenant filters, RBAC, future PostgreSQL RLS |
| Duplicate offline sale | Event ID and idempotency uniqueness |
| Stale catalog overwrite | Optimistic entity versions |
| Forged ecommerce event | HMAC signature verification |
| Lost branch device | Revocable device identity and encrypted local storage |
| Malicious desktop update | Tauri signed updates |
| Card data exposure | Hosted/tokenized payment provider integration |
| Audit tampering | Append-only central logs and restricted database role |
