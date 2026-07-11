# VOX Deployment Guide — Render (All-in-One)

## Prerequisites
- A [Render](https://render.com) account (free tier works)
- This repo pushed to GitHub (already done: `zuhair321/vox`)

## One-Click Deploy via render.yaml

Render automatically syncs from `render.yaml`. Just push to GitHub and Render will detect changes!

### Deploy Order
1. **Database** (vox-db) - Creates PostgreSQL
2. **Redis** (vox-redis) - Creates Redis for Socket.io
3. **Backend** (vox-backend) - Node.js API
4. **Frontend** (vox-frontend) - Static site

## Manual Deploy (if needed)

### 1. Create PostgreSQL Database
- Render → New → PostgreSQL
- Name: `vox-db`
- Plan: Free

### 2. Create Redis Instance
- Render → New → Redis
- Name: `vox-redis`
- Plan: Free

### 3. Deploy Backend (Web Service)
- Connect repo: `zuhair321/vox`
- Root Directory: `backend`
- Build Command: `npm install && npx prisma migrate deploy`
- Start Command: `npm start`

### 4. Deploy Frontend (Static Site)
- Connect repo: `zuhair321/vox`
- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Environment Variable: `VITE_API_BASE` = backend URL

## Environment Variables (Backend)

| Variable | Value | Notes |
|----------|-------|-------|
| DATABASE_URL | From Render PostgreSQL | Auto-set when linked |
| REDIS_URL | From Render Redis | Auto-set when linked |
| PORT | 4000 | |
| CLIENT_ORIGIN | Frontend URL | e.g. `https://your-frontend.onrender.com` |
| EXTRA_CORS_ORIGINS | Frontend URL | Same as above |
| JWT_ACCESS_SECRET | Generate random | 32+ chars |
| JWT_REFRESH_SECRET | Generate random | 32+ chars |
| TWO_FACTOR_ENCRYPTION_KEY | Generate random | 64-char hex |
| RESEND_API_KEY | `dev` or Resend key | `dev` logs to console |

Generate secrets:
```bash
node -e "console.log(Array.from({length:64},()=>Math.floor(Math.random()*16).toString(16)).join(''))"
```

## Mobile App Configuration

For React Native (Android/iOS):
```bash
# In vox-mobile/
cp .env.example .env
# Edit .env and set:
EXPO_PUBLIC_API_URL=https://your-backend.onrender.com
```

Then build:
```bash
# Android
eas build --platform android

# iOS
eas build --platform ios
```

## Desktop App (Electron)

The `electron-main.js` is configured for local development. For production desktop builds, update `API_BASE` in `frontend/src/api/client.ts` to point to your production backend.

## Important Notes

- **Free Tier**: Services spin down after 15min idle. First request ~30s cold start.
- **CORS**: Already configured for all platforms (web, mobile, desktop).
- **Migrations**: Run automatically on backend deploy.
- **Redis**: Required for Socket.io horizontal scaling.

## Custom Domains

Add custom domains in Render dashboard for both frontend and backend services.
