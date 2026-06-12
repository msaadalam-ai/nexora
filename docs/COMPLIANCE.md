# Compliance Readiness

This codebase provides controls that support compliance work; it does not by itself certify the product.

## PCI DSS

- Use a PCI-compliant provider's hosted fields or certified terminal SDK.
- Never send or store PAN, CVV, magnetic-stripe, or PIN data in Nexora databases or logs.
- Store only provider tokens, payment intent IDs, last four digits, card brand, amount, and settlement status.
- Segment payment terminals from ordinary branch networks.
- Complete the applicable SAQ with a qualified compliance adviser.

## Privacy

- Maintain a data inventory and lawful processing basis.
- Add retention schedules for customers, audit logs, invoices, and backups.
- Provide access, correction, export, and deletion workflows where legally permitted.
- Financial and fraud records may require retention despite deletion requests.
- Sign data-processing agreements with cloud, email, analytics, and payment vendors.
- Configure region-specific storage where required.

## SOC 2 / ISO 27001 Preparation

- Enforce reviewed production access and least privilege.
- Record deployment, administrative, and security events.
- Establish change approval, incident response, business continuity, vendor review, and annual risk assessment.
- Collect evidence automatically from CI, cloud audit logs, backups, and monitoring.

## Accessibility

Target WCAG 2.2 AA for the web application. Add automated accessibility checks plus keyboard, screen-reader, contrast, zoom, and touch-target testing before release.
