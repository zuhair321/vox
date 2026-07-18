# VOX Desktop Build Modes

The desktop EXE is built from one codebase that supports two modes. The user
never configures anything — the mode is decided at build time.

## Local mode (default) — standalone, SQLite

Builds a **self-contained** app: it bundles a portable Node.js + the backend
and runs everything locally on `http://127.0.0.1:4000`, with a local SQLite DB
in `%APPDATA%/VOX-Desktop/vox.db`. Best for a single-user / offline app.

```bash
npm run build:local      # = electron-builder --win
```

## Hosted mode (Option 1 — Discord-style SaaS) — connects to your backend

Builds a thin client that points at your **hosted backend** (the Postgres +
Redis + R2 stack in `backend/MIGRATION.md`). No backend is bundled; the EXE
just connects over the network. Users download, install, and it works.

```bash
VOX_SERVER_URL=https://vox-backend.up.railway.app npm run build:hosted
```

`scripts/prepare-hosted-config.js` rewrites `frontend/dist/app-config.json`
to `{ "apiBase": "<VOX_SERVER_URL>", "mode": "hosted" }`, and
`electron-main.js` skips spawning the local backend when `mode=hosted`.

The frontend resolves its server URL at runtime via `window.__VOX_CONFIG`
(injected by `preload.js` from the packaged `app-config.json`), falling back to
`VITE_API_BASE` then `http://127.0.0.1:4000`.

## How the client finds the server (summary)

| Source | Used when |
|--------|-----------|
| `app-config.json` (`mode: hosted`) | Packaged hosted EXE |
| `VOX_API_BASE` env | Overrides everything (testing) |
| `VITE_API_BASE` | Web/Railway build |
| `http://127.0.0.1:4000` | Local dev / local EXE default |
