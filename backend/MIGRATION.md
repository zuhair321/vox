# VOX — Production Setup (Postgres + Redis + Object Storage)

This guide wires VOX for a real deployment (the "Discord-style" path) so it can
comfortably serve ~100 concurrent users. **Users download only the frontend
(web/desktop app) — none of this runs on their machines.** The database,
cache, and file storage all live on your server.

## 1. Database — PostgreSQL (replaces SQLite)

The Prisma schema (`prisma/schema.prisma`) now uses `provider = "postgresql"`.
SQLite still works for zero-setup local dev (switch the provider back to
`sqlite` and set `DATABASE_URL="file:./vox.db"`).

Free Postgres options:
- **Supabase** (free tier) — postgres + auth UI
- **Neon** (free tier) — serverless Postgres
- **Railway** (free trial credit, see `railway.json`) — recommended: Postgres
  + Redis are one-click add-ons and the service does NOT sleep
- Local: `brew install postgresql` / `apt install postgresql`

Apply the schema:

```bash
# One-time, creates the migration history:
npx prisma migrate dev --name init

# Production (no interactive prompt):
npx prisma migrate deploy

# Or quick start without migration history:
npx prisma db push
```

`better-sqlite3` is now an `optionalDependency`; `pg` is used for Postgres.

## 2. Cache / Rate limiting / Sockets — Redis (required for scaling)

The rate limiter (`src/middleware/security.js`) is now Redis-backed
(sliding-window via `src/lib/redis.js#isRateLimited`), so limits are enforced
**consistently across all PM2 workers**. The old per-process in-memory limiter
silently multiplied the limit under cluster mode.

- **Free tier:** Railway Redis add-on (one click in the Railway dashboard;
  auto-injects `REDIS_URL` into the backend service). Alternatively
  [Upstash](https://upstash.com) (free serverless Redis) — paste its
  `REDIS_URL` into the backend service variables.
- Set `REDIS_URL` in `backend/.env` (Railway injects it automatically). Leave it
  blank only for single-process dev.
- Also powers: presence, raid protection, per-channel write budgets, and the
  Socket.io Redis adapter (horizontal scaling — already wired in
  `src/sockets/index.js`).

## 3. Uploads — S3 / Cloudflare R2 (multi-instance safe)

`src/lib/storage.js` already supports S3-compatible storage. Local disk
(`/uploads`) is single-instance only and **not** shared across workers.

- **Free tier:** [Cloudflare R2](https://r2.cloudflare.com) — 10GB storage,
  10M requests/mo, **no egress fees** (cheaper than AWS S3 for this use case).
- Set in `backend/.env`:
  ```
  AWS_S3_BUCKET=...
  AWS_REGION=auto
  AWS_ACCESS_KEY_ID=...
  AWS_SECRET_ACCESS_KEY=...
  AWS_S3_ENDPOINT=https://<id>.r2.cloudflarestorage.com   # R2
  AWS_S3_PUBLIC_URL=https://cdn.yourdomain.com            # custom domain / CDN
  ```
- When all are set, `STORAGE_MODE` becomes `s3` automatically.

## 4. Security hardening applied

- `TWO_FACTOR_ENCRYPTION_KEY` **fails fast at boot in production** if missing or
  still the dev zero-key (`src/lib/env.js`). Previously it silently encrypted
  TOTP secrets with a publicly-known key.
- Passwords remain bcrypt-hashed; refresh/reset tokens are SHA-256 hashed;
  2FA secrets are AES-256-GCM encrypted at rest. Credentials are **never** sent
  to or stored on the client.

## 5. Deploy (Railway — recommended)

Railway is the recommended host: no sleep, Postgres + Redis as one-click
add-ons, and a `$5` free trial credit (no card to start). The repo includes
`railway.json`, which builds the backend, runs `prisma migrate deploy`, and
starts the server.

Steps:
1. Push the repo to GitHub (`.env` is gitignored — secrets stay local).
2. In Railway: *New Project* → *Deploy from GitHub repo* → select the repo.
   Railway auto-detects the Node service via `railway.json` (root `backend/`).
3. Add the **PostgreSQL** and **Redis** add-ons. Railway auto-injects
   `DATABASE_URL` and `REDIS_URL` into the backend service.
4. Add the three secrets as service variables (generate with
   `node ../scripts/generate-secrets.js`):
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `TWO_FACTOR_ENCRYPTION_KEY`
   - `NODE_ENV=production`
5. Deploy. Railway gives you a backend URL, e.g. `https://vox-backend.up.railway.app`.
6. Build the client EXE against it:
   ```
   VOX_SERVER_URL=https://vox-backend.up.railway.app npm run build:hosted
   ```
7. Share `dist2/VOX Setup 1.0.2.exe`.

When traffic grows, Railway scales with usage; the free trial converts to
pay-as-you-go (a small backend is typically a few dollars/month).

## 6. Still recommended before launch

- Run a load test (k6 / Artillery) simulating 100 concurrent WebSocket + HTTP
  users.
- Add automated tests (currently none in the repo).
- Enable performance monitoring in production
  (`src/middleware/performance.js` is disabled by default).
- Replace raw `ILIKE` message search with Postgres full-text search
  (`tsvector`) as message volume grows.
