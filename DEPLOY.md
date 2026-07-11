# VOX Deployment Guide — Render (All-in-One)

## Prerequisites
- A [Render](https://render.com) account (free tier works)
- This repo pushed to GitHub (already done: `zuhair321/vox`)

## One-Click Deploy

Click the buttons below to deploy each service:

1. **Database**: Render will auto-create `vox-db` from `render.yaml`
2. **Redis**: Render will auto-create `vox-redis` from `render.yaml`
3. **Backend**: Render will auto-create `vox-backend` from `render.yaml`
4. **Frontend**: Render will auto-create `vox-frontend` from `render.yaml`

## Manual Deploy (if Blueprint isn't available)

### 1. Create PostgreSQL Database
- Render → New → PostgreSQL
- Name: `vox-db`
- Plan: Free
- Copy the `Internal Database URL` (Render sets `DATABASE_URL` automatically for linked services)

### 2. Create Redis Instance
- Render → New → Redis
- Name: `vox-redis`
- Plan: Free
- Copy the `Internal Redis URL`

### 3. Deploy Backend
- Render → New → Web Service
- Connect repo: `zuhair321/vox`
- Runtime: `Node`
- Build Command: `cd backend && npm install && npx prisma migrate deploy`
- Start Command: `cd backend && npm start`
- Add Environment Variables:
  - `DATABASE_URL` → your PostgreSQL connection string
  - `REDIS_URL` → your Redis connection string
  - `JWT_ACCESS_SECRET` → random secret
  - `JWT_REFRESH_SECRET` → random secret
  - `TWO_FACTOR_APP_NAME` → `VOX`
  - `TWO_FACTOR_ENCRYPTION_KEY` → 64-char hex
  - `PORT` → `4000`
  - `CLIENT_ORIGIN` → your frontend URL (e.g. `https://vox-frontend.onrender.com`)
  - `EXTRA_CORS_ORIGINS` → your frontend URL
  - `RESEND_API_KEY` → `dev` (for console logging) or your Resend key
  - `RESEND_FROM_ADDRESS` → `VOX <noreply@vox.app>`

### 4. Deploy Frontend
- Render → New → Static Site
- Connect repo: `zuhair321/vox`
- Build Command: `cd frontend && npm install && npm run build`
- Publish Directory: `frontend/dist`
- Add Environment Variable:
  - `VITE_API_BASE` → your backend URL (e.g. `https://vox-backend.onrender.com`)

## Important Notes

- **PostgreSQL**: Render provides managed PostgreSQL. The schema is auto-migrated via `npx prisma migrate deploy`.
- **Redis**: Render provides managed Redis. Used for Socket.io scaling and caching.
- **Free Tier Limits**: Render free services spin down after 15 minutes of inactivity. First request after spin-down takes ~30s.
- **CORS**: Make sure `CLIENT_ORIGIN` and `EXTRA_CORS_ORIGINS` in the backend match your frontend URL.
- **Migrations**: `npx prisma migrate deploy` runs automatically during backend build.

## Custom Domains

Both frontend and backend support custom domains in Render settings.
