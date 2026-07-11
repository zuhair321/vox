# VOX Deployment Guide

## Frontend (Vercel)

### Prerequisites
- A [Vercel](https://vercel.com) account
- Your backend deployed somewhere with a public URL (Render, Railway, Fly.io, etc.)

### Deploy to Vercel

1. Push this repo to GitHub (already done).
2. In Vercel, click **"Add New..." → Project**.
3. Import the `vox` repo.
4. Set **Root Directory** to `frontend/`.
5. Add Environment Variable:
   - `VITE_API_BASE` → your backend URL (e.g. `https://vox-backend.onrender.com`)
   - Leave empty if using Vercel rewrite proxy (see below).
6. Click **Deploy**.

### Vercel Rewrite Proxy (Recommended)

If you want the frontend and API on the same domain, add this to `frontend/vercel.json`:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://your-backend-url.com/api/$1" }
  ]
}
```

Then leave `VITE_API_BASE` empty in Vercel env vars.

## Backend (Separate Host)

The backend requires MySQL, Redis, and Socket.io. It cannot run on Vercel.

### Recommended: Render / Railway / Fly.io

1. Deploy `backend/` as a Node.js service.
2. Set environment variables:
   - `DATABASE_URL` → your MySQL connection string
   - `JWT_ACCESS_SECRET` → random secret
   - `JWT_REFRESH_SECRET` → random secret
   - `TWO_FACTOR_APP_NAME` → VOX
   - `TWO_FACTOR_ENCRYPTION_KEY` → 64-char hex
   - `PORT` → 4000 (or let host assign)
   - `CLIENT_ORIGIN` → your Vercel frontend URL
   - `EXTRA_CORS_ORIGINS` → your Vercel frontend URL
   - `REDIS_URL` → your Redis URL (Upstash, etc.)
   - `RESEND_API_KEY` → your Resend key (optional)
3. Run migrations: `npx prisma migrate deploy`

### Database

- Use a managed MySQL (PlanetScale, AWS RDS, Render PostgreSQL with MySQL adapter, etc.)
- Run `npx prisma migrate deploy` after setting `DATABASE_URL`.

## Quick Start

```bash
# Frontend (Vercel)
vercel --prod

# Backend (local)
cd backend && npm install && npx prisma migrate dev && npm start
```
