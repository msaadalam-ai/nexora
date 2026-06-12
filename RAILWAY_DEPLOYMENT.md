# Deploy Nexora POS on Railway

## Deploy from GitHub

1. Open Railway and create a new project.
2. Choose `Deploy from GitHub repo`.
3. Select the Nexora repository.
4. Railway reads `railway.json` and builds the included `Dockerfile`.

## Variables

Add these to the Nexora service:

```env
NODE_ENV=production
HOST=0.0.0.0
STATIC_ROOT=dist
TOKEN_SECRET=GENERATE_A_LONG_RANDOM_SECRET
TOKEN_TTL_SECONDS=3600
WEBHOOK_SECRET=GENERATE_ANOTHER_LONG_RANDOM_SECRET
ALLOWED_ORIGIN=https://YOUR-RAILWAY-DOMAIN
```

Do not set `PORT`; Railway injects it automatically.

Generate secrets in PowerShell:

```powershell
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

## Persistent SQLite data

Add a volume to the Nexora service and mount it at:

```text
/app/data
```

Then add:

```env
DATABASE_PATH=/app/data/nexora.db
RAILWAY_RUN_UID=0
```

`RAILWAY_RUN_UID=0` is required because Railway volumes are mounted as root
while the Docker image normally runs Nexora as a non-root user.

Keep the service at one replica while using SQLite.

## Public domain

1. Open the service `Settings`.
2. Under `Networking`, click `Generate Domain`.
3. Copy the generated HTTPS domain.
4. Set `ALLOWED_ORIGIN` to that exact domain without a trailing slash.
5. Redeploy.

## Verify

Open:

- `https://YOUR-RAILWAY-DOMAIN/`
- `https://YOUR-RAILWAY-DOMAIN/health/ready`

The health endpoint should return:

```json
{"status":"ready","database":"connected"}
```
