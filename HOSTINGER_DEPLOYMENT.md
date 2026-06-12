# Deploy Nexora POS from GitHub to Hostinger

## Connect the repository

1. In Hostinger hPanel, open `Websites` and add a Node.js application.
2. Choose deployment from GitHub and authorize access to the Nexora repository.
3. Select the production branch, normally `main`.

## Application settings

- Framework: `Other`
- Node.js version: `24.x`
- Application root: `/`
- Build command: `npm run build`
- Start command: `npm start`
- Entry file, if requested: `server/index.js`
- Output directory, if requested: `dist`

One Node.js process serves both the React application and `/api`.

## Environment variables

Add these in Hostinger:

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DATABASE_PATH=data/nexora.db
STATIC_ROOT=dist
TOKEN_SECRET=GENERATE_A_LONG_RANDOM_SECRET
TOKEN_TTL_SECONDS=3600
ALLOWED_ORIGIN=https://your-domain.example
WEBHOOK_SECRET=GENERATE_ANOTHER_LONG_RANDOM_SECRET
```

Use the final HTTPS domain for `ALLOWED_ORIGIN`, without a trailing slash.
Do not set `VITE_API_URL`; the web client and API use the same domain.

Generate a secret in PowerShell:

```powershell
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

## Verify deployment

Open:

- `https://your-domain.example/`
- `https://your-domain.example/health/ready`

The health endpoint must report that the application and database are ready.

## Production database note

The included SQLite database supports a single Node.js instance. Before running
multiple application instances or a larger multi-branch deployment, migrate to
a shared PostgreSQL or MySQL database and configure automated backups.
