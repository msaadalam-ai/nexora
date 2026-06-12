# Deploy the Nexora Frontend on Vercel

Nexora uses a persistent Node.js API and SQLite database. Deploy the API on
Railway and use Vercel only for the React frontend.

## 1. Deploy the backend

Follow [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md). Generate a Railway
domain and verify:

```text
https://YOUR-RAILWAY-DOMAIN/health/ready
```

## 2. Configure Vercel

Open the Vercel project and go to `Settings` -> `Environment Variables`.

Add:

```env
VITE_API_URL=https://YOUR-RAILWAY-DOMAIN
```

Add it to Production and Preview if both environments should use the backend.
Do not include a trailing slash.

Redeploy the Vercel project after adding the variable. Vite embeds this value
during the build, so changing it does not affect an already-built deployment.

The included `vercel.json` configures the `dist` output and React Router SPA
fallback.

## 3. Configure Railway CORS

Set this variable on the Railway service:

```env
ALLOWED_ORIGIN=https://YOUR-VERCEL-PRODUCTION-DOMAIN
```

For the current deployment, that is:

```env
ALLOWED_ORIGIN=https://nexora-tau-pink.vercel.app
```

Redeploy Railway after changing the variable.

## 4. Verify

1. Open the Railway health endpoint and confirm it returns HTTP 200.
2. Open the Vercel site.
3. Sign in with `admin@nexorapos.com` / `admin123`.

Vercel Functions are not used for Nexora's SQLite API because their filesystem
is read-only except for temporary scratch storage. The Railway volume preserves
sales, inventory, users, and synchronization data across deployments.
