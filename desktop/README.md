# Nexora POS Desktop

This Tauri 2 shell packages the React application as a Windows MSI/NSIS installer.

It provides:

- A hardened desktop webview with an explicit content-security policy.
- SQLite plugin support for the production local cache/outbox migration.
- Signed updater hooks.
- Single-instance enforcement.
- Native command boundaries for receipt printers and cash drawers.

Rust and the Tauri CLI are required to build installers. Hardware commands are intentionally adapter boundaries: each supported printer/drawer model needs a tested driver implementation before production deployment.
