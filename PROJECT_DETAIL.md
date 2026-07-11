# VOX — Full Project Detail

> A Discord-inspired real-time communication platform: servers, channels, DMs, voice,
> friends, reactions, threads, webhooks, audit logs, 2FA, and a custom Electron desktop shell.
>
> This document is the single source of truth for the stack, the architecture, the data
> model, every API endpoint, every Socket.io event, the frontend state design, and the
> operational/deployment story.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Layout](#3-repository-layout)
4. [Runtime Topology](#4-runtime-topology)
5. [Backend Deep Dive](#5-backend-deep-dive)
   - 5.1 [Entry point & middleware pipeline](#51-entry-point--middleware-pipeline)
   - 5.2 [Environment & configuration](#52-environment--configuration)
   - 5.3 [Database (Prisma / PostgreSQL)](#53-database-prisma--PostgreSQL)
   - 5.4 [Authentication & security](#54-authentication--security)
   - 5.5 [REST API — full endpoint reference](#55-rest-api--full-endpoint-reference)
   - 5.6 [Socket.io — real-time layer](#56-socketio--real-time-layer)
   - 5.7 [Services & business logic](#57-services--business-logic)
   - 5.8 [Caching & horizontal scaling (Redis)](#58-caching--horizontal-scaling-redis)
6. [Frontend Deep Dive](#6-frontend-deep-dive)
   - 6.1 [App shell & routing](#61-app-shell--routing)
   - 6.2 [State management (Zustand stores)](#62-state-management-zustand-stores)
   - 6.3 [API client layer](#63-api-client-layer)
   - 6.4 [Component architecture](#64-component-architecture)
   - 6.5 [Theming & micro-interactions](#65-theming--micro-interactions)
7. [Electron Desktop Shell](#7-electron-desktop-shell)
8. [Real-time Voice / Video (WebRTC)](#8-real-time-voice--video-webrtc)
9. [Security Model](#9-security-model)
10. [Observability & Reliability](#10-observability--reliability)
11. [Build, Run & Deploy](#11-build-run--deploy)
12. [Glossary](#12-glossary)

---

## 1. Project Overview

**VOX** is a self-hosted, real-time chat and voice platform modeled on Discord, with a
dark, "void / cyberpunk" aesthetic. It is a full-stack application composed of:

- A **Node.js / Express 5** backend (`backend/`) exposing a REST API and a Socket.io
  gateway, persisted in **PostgreSQL via Prisma**, with optional **Redis** for caching and
  horizontal socket scaling.
- A **React 18 + TypeScript** frontend (`frontend/`) built with **Vite**, state managed
  by **Zustand**, animated by **Framer Motion**, real-time over **Socket.io-client**.
- An **Electron** desktop shell (`electron-main.js` + `preload.js`) that bundles PostgreSQL,
  the backend, and the frontend into a single double-clickable Windows desktop app.

The product surface includes:

| Domain | Capabilities |
|---|---|
| **Identity** | Register, login, JWT access + refresh, 2FA (TOTP), password reset, email verification, profile (avatar/banner/bio/status), account deletion |
| **Servers (Guilds)** | Create, update, delete, discover, join (public/invite), leave, member management, kick, ban, unban, roles, channels, categories, audit log, insights/analytics, webhooks, custom emojis |
| **Channels** | Text + voice, create/update/delete/reorder, per-role permission overrides, pinned messages, message threads |
| **Messaging** | Send/edit/delete (soft), reactions, attachments (image/video/file), mentions, replies, link previews, markdown rendering, search |
| **Direct Messages** | 1:1 DMs, attachments, typing, read receipts, edit/delete, block |
| **Friends** | Friend requests (send/accept/decline/cancel), block/unblock, online presence |
| **Voice** | WebRTC mesh voice/video, mute/deafen, speaking detection, screen sharing with source picker |
| **Notifications** | In-app notification center, browser/Electron native notifications, unread badges, mention pings |
| **UX** | 8 themes, keyboard shortcuts (Ctrl+K quick switcher, Ctrl+/ help), context menus, custom status, onboarding flow, splash screen |

---

## 2. Tech Stack

### Backend
| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | ≥ 18 (ESM) |
| Framework | **Express** | 5.2 |
| ORM | **Prisma** | 6.19 |
| Database | **PostgreSQL** | 8.0 (via `PostgreSQL2`) |
| Real-time | **Socket.io** | 4.8 |
| Cache / pub-sub | **Redis** (`ioredis` + `redis`) | optional |
| Auth | **jsonwebtoken**, **bcryptjs**, **otplib** | JWT + bcrypt + TOTP |
| Validation | **zod** | 4.x |
| Uploads | **multer** | 2.2 |
| Email | **Resend** | 6.x |
| HTML sanitization | **sanitize-html** | 2.x |
| Link preview | **cheerio** + **node-fetch** | OG parsing |
| HTTP security | **helmet**, **cors**, **cookie-parser**, **express-rate-limit** | |
| Process manager | **PM2** (cluster mode) | 7.x |
| Dev tooling | `tsx`, `prisma studio` | |

### Frontend
| Layer | Technology | Version |
|---|---|---|
| UI framework | **React** | 18.2 |
| Language | **TypeScript** | 5.2 |
| Build tool | **Vite** | 5.2 |
| Routing | **react-router-dom** | 6.22 |
| State | **Zustand** | 4.5 |
| Real-time | **socket.io-client** | 4.7 |
| Animation | **Framer Motion** | 12.x |
| Icons | **lucide-react** | 0.359 |
| Dates | **date-fns** | 4.x |

### Desktop
| Layer | Technology |
|---|---|
| Shell | **Electron** (frameless, custom title bar) |
| IPC bridge | `contextBridge` + `ipcRenderer` (`preload.js`) |
| Native features | tray icon, native notifications, frame flashing, screen capture (`desktopCapturer`), global hotkey (Ctrl+Shift+V) |
| Bundled services | spawns `PostgreSQLd.exe`, `node backend/server.js`, `node frontend/static-server.js` |

---

## 3. Repository Layout

```
vox/
├── backend/                      # Node.js / Express API + Socket.io
│   ├── package.json              # vox-backend 0.2.0
│   ├── .env.example              # template for env config
│   ├── ecosystem.config.json     # (root) PM2 cluster config
│   ├── prisma/
│   │   ├── schema.prisma         # data model
│   │   ├── seed.js               # (deleted in working tree)
│   │   └── migrations/           # SQL migration history
│   ├── uploads/                  # multer destination (served at /uploads)
│   ├── db-setup.js               # one-shot DB bootstrap helper
│   ├── smoke-edit-delete.mjs     # manual smoke test
│   └── src/
│       ├── server.js             # entrypoint — wires Express + sockets
│       ├── lib/
│       │   ├── env.js            # dotenv + required-var validation
│       │   ├── prisma.js         # shared PrismaClient singleton
│       │   ├── redis.js          # cache + pub/sub clients (optional)
│       │   ├── crypto.js         # AES-256-GCM for TOTP secrets at rest
│       │   └── mappers.js        # DB row → API shape converters
│       ├── middleware/
│       │   ├── auth.js           # requireAuth / optionalAuth (JWT)
│       │   ├── permissions.js    # role-based channel/server perms
│       │   ├── sanitize.js       # XSS sanitization (sanitize-html)
│       │   └── error.js          # HttpError, errorHandler, notFound
│       ├── routes/               # one router per domain (see §5.5)
│       ├── services/
│       │   ├── auth.service.js   # register/login/2FA/reset/verify
│       │   ├── chat.service.js   # state hydration, pagination
│       │   ├── tokens.js         # refresh-token mint/verify/revoke
│       │   ├── email.service.js  # Resend integration
│       │   └── webhook.service.js# outbound webhook delivery
│       └── sockets/
│           ├── index.js          # Server setup, auth middleware, Redis adapter
│           └── handlers.js       # all incoming socket events
│
├── frontend/                     # React + TS + Vite SPA
│   ├── package.json              # vox-frontend
│   ├── vite.config.ts            # port 3001, manual chunk splitting
│   ├── index.html
│   ├── static-server.js          # tiny static server for built dist
│   └── src/
│       ├── main.tsx              # entrypoint — BrowserRouter + SW register
│       ├── App.tsx               # root component, splash + routing
│       ├── api/                  # typed REST wrappers (see §6.3)
│       ├── stores/               # Zustand stores (see §6.2)
│       ├── components/
│       │   ├── chat/             # MessageArea, MessageBubble, Input, Threads, Pins
│       │   ├── server/           # ServerRail, CreateServer/Channel, Settings panels
│       │   ├── friends/          # FriendsPage, DMConversation
│       │   ├── voice/            # VoiceChannelPanel, ScreenShare overlay/picker
│       │   ├── ui/               # Sidebar, MemberPanel, Toasts, Modals, etc.
│       │   ├── settings/         # Profile avatar, toggles, rows
│       │   ├── layout/           # TitleBar
│       │   ├── onboarding/
│       │   ├── search/
│       │   ├── emoji/
│       │   └── void/             # branded "void"-themed primitives
│       ├── pages/                # Discover, Settings, Profile, ServerInsights
│       ├── hooks/                # useContextMenu, useRipple, usePresence, etc.
│       ├── styles/               # themes.css, polish.css, animations.css…
│       └── types.ts              # shared TS interfaces
│
├── electron-main.js              # Electron main process (boot, windows, IPC)
├── preload.js                    # contextBridge → window.electronAPI
├── ecosystem.config.json         # PM2 cluster definition
└── PROJECT_DETAIL.md             # ← this file
```

---

## 4. Runtime Topology

```
                 ┌─────────────────────────────────────────────┐
                 │            Electron Main Process            │
                 │  electron-main.js                           │
                 │  ┌────────────────────────────────────────┐ │
                 │  │ 1. startPostgreSQL()  → PostgreSQLd.exe :3306     │ │
                 │  │ 2. startBackend() → node server.js :4000│ │
                 │  │ 3. ensureViteBuild() + static-server    │ │
                 │  │                       → :3000           │ │
                 │  │ 4. BrowserWindow → loadURL(:3000)       │ │
                 │  │ 5. Tray + global hotkey                 │ │
                 │  └────────────────────────────────────────┘ │
                 └─────────────────────────────────────────────┘
                                      │
                                      ▼
   ┌──────────────────────────── Browser (renderer) ────────────────────────────┐
   │  React SPA (Vite bundle)                                                   │
   │   ┌────────────┐   fetch REST    ┌─────────────────────────────────────┐   │
   │   │ Zustand    │ ──────────────► │ Express 5  (port 4000)              │   │
   │   │ stores     │   WebSocket     │  helmet, cors, rate-limit, sanitize │   │
   │   │            │ ◄──────────────►│  /api/auth, /api/servers, /api/dm…  │   │
   │   │ socketStore│   Socket.io     │  Socket.io server (same HTTP srv)   │   │
   │   └────────────┘                 │   Redis adapter (optional)          │   │
   │                                  │   Prisma → PostgreSQL (:3306)            │   │
   │                                  │   Redis cache (:6379)               │   │
   │                                  │   /uploads → disk                   │   │
   │                                  └─────────────────────────────────────┘   │
   └───────────────────────────────────────────────────────────────────────────┘
```

In **dev**: Vite dev server on port 3001, backend on 4000, PostgreSQL on 3306.
In **Electron desktop**: a Node static server hosts the built `dist/` on port 3000; the
window loads `http://127.0.0.1:3000`. The backend port stays at 4000.
In **production / cluster**: PM2 spawns N backend workers (`instances: 'max'`) behind a
Redis adapter so socket events fan out across workers.

---

## 5. Backend Deep Dive

### 5.1 Entry point & middleware pipeline

`backend/src/server.js` is the single entrypoint. It:

1. Creates an Express app and an `http.createServer` (shared with Socket.io).
2. Mounts core middleware in order:
   - **helmet** (CSP disabled for local dev).
   - **cors** — origins from `env.corsOrigins`, credentials true.
   - **express.json** — 1 MB body limit.
   - **cookieParser** — for cookie-based JWT fallback.
3. Mounts a static `/uploads` route for avatar/banner/chat files, with
   `Cross-Origin-Resource-Policy: cross-origin` so the browser on port 3000/3001 can load
   images served from port 4000 without CORP blocking.
4. Exposes `/health` for boot diagnostics.
5. Mounts all routers under `/api` (see §5.5).
6. Finalizes with `notFound` (404) and `errorHandler` (uniform JSON errors).
7. Calls `await initSockets(server)` to bind Socket.io to the same HTTP server.
8. `server.listen(env.port)` and logs `VOX backend listening on http://127.0.0.1:4000`
   (Electron watches for the literal `'listening'` to know the backend is up).
9. Registers `SIGINT`/`SIGTERM` for graceful shutdown so Prisma disconnects cleanly.

### 5.2 Environment & configuration

`backend/src/lib/env.js` loads `backend/.env` and **fails fast at boot** if any of
`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `TWO_FACTOR_APP_NAME` are
missing — printing the exact missing keys and exiting.

The exported `env` object normalizes:

| Field | Source | Default |
|---|---|---|
| `port` | `PORT` | 4000 |
| `clientOrigin` | `CLIENT_ORIGIN` | `http://127.0.0.1:3000` |
| `corsOrigins` | localhost + `CLIENT_ORIGIN` + `EXTRA_CORS_ORIGINS` (csv) | dev set |
| `databaseUrl` | `DATABASE_URL` | — |
| `apiBase` | `API_BASE` | `http://127.0.0.1:4000` |
| `jwt.accessSecret/refreshSecret` | env | — |
| `jwt.accessTtl` | `JWT_ACCESS_TTL` | `15m` |
| `jwt.refreshTtl` | `JWT_REFRESH_TTL` | `7d` |
| `twoFactor.appName` | `TWO_FACTOR_APP_NAME` | `VOX` |
| `twoFactor.encryptionKey` | `TWO_FACTOR_ENCRYPTION_KEY` | dev zero key (warned) |
| `resend.apiKey` | `RESEND_API_KEY` | `dev` (console-log mode) |
| `resend.fromAddress` | `RESEND_FROM_ADDRESS` | `VOX <noreply@vox.app>` |

**Security note**: a previous version hardcoded a personal ngrok URL in CORS; this was
replaced with `EXTRA_CORS_ORIGINS` so tunnel URLs are config-only and don't leak.

### 5.3 Database (Prisma / PostgreSQL)

- Datasource: `PostgreSQL`, URL from `DATABASE_URL`.
- Generator: `prisma-client-js`.
- A single shared `PrismaClient` is exported from `src/lib/prisma.js`, cached on
  `globalThis.voxPrisma` in dev to survive HMR/supervisor reloads without exhausting
  connections.

**Models** (from `schema.prisma` and confirmed by route usage). The actual production
schema in code is expressed using these Prisma models — `Server`, `ServerMember`,
`Channel`, `Message`, `User`, `Friend`, `DMMessege`, `Reaction`, `Permission`, `Category`,
`Webhook`, `CustomEmoji`, `ServerBan`, `Invite`, `AuditLog`, `PasswordReset`,
`RefreshToken`, `Block`. The discord-named entities (`Guild`, `Role`, `VoiceState`, …)
in `schema.prisma` are an aspirational/extended model; what the running routes use today
is summarised below.

#### Core entities in active use

| Model | Key fields | Purpose |
|---|---|---|
| **User** | `id`, `username` (unique), `email` (unique), `passwordHash`, `displayName`, `role`, `color`, `status` (`ONLINE\|IDLE\|DND\|OFFLINE`), `avatarUrl`, `bannerUrl`, `bio`, `twoFactorEnabled`, `twoFactorSecret` (encrypted), `emailVerified` | Account identity |
| **Server** | `id`, `name`, `description`, `icon`, `banner`, `ownerId`, `category`, `isPublic` | A guild |
| **ServerMember** | `serverId`, `userId`, `role` (`FOUNDER\|ADMIN\|MODERATOR\|MEMBER`), `nick`, `joinedAt` | Membership join table; unique on `(serverId, userId)` |
| **Channel** | `id`, `serverId`, `name`, `type` (`TEXT\|VOICE`), `topic`, `position`, `categoryId` | Server channel |
| **Category** | `id`, `serverId`, `name`, `position` | Channel grouping |
| **Message** | `id`, `channelId`, `userId` (nullable), `authorOverride`, `body`, `edited`, `deleted`, `pinned`, `parentId`, `attachments` (JSON), `createdAt` | Channel message; `attachments` is a JSON column of `{url,kind,name,size,mime}[]` |
| **Reaction** | `id`, `messageId`, `userId`, `emoji`; unique on `(messageId, userId, emoji)` | Toggle-style reactions |
| **Permission** | `id`, `channelId`, `role`, `canRead`, `canWrite`, `canManage`, `canAdmin`; unique on `(channelId, role)` | Channel permission overrides |
| **Friend** | `id`, `userId`, `friendId`, `status` (`pending\|accepted\|blocked`) | Friend graph |
| **Block** | `userId`, `blockedId`, `reason`; unique on `(userId, blockedId)` | Hard block list |
| **DMMessege** | `id`, `dmId` (`<uidA>_<uidB>` sorted), `senderId`, `recipientId`, `content`, `attachments`, `read`, `edited`, `deleted` | DM history keyed by sorted participant ids |
| **ServerBan** | `serverId`, `userId`, `reason`, unique on `(serverId, userId)` | Ban list |
| **Invite** | `code` (unique), `serverId`, `creatorId`, `maxUses`, `uses`, `expiresAt` | Invite links |
| **Webhook** | `id`, `serverId`, `channelId`, `name`, `url`, `token` (UUID) | Outbound + inbound webhooks |
| **CustomEmoji** | `id`, `serverId`, `name`, `url` | Server-scoped emojis |
| **AuditLog** | `id`, `serverId`, `userId`, `action`, `targetId`, `details` (JSON) | Moderator action history |
| **RefreshToken** | `token` hash, `userId`, expiry | Rotating refresh tokens |
| **PasswordReset** | `userId`, `tokenHash`, `expiresAt` | Reset + email-verify tokens (shared table) |

Role hierarchy used everywhere: `FOUNDER (4) > ADMIN (3) > MODERATOR (2) > MEMBER (1)`.

### 5.4 Authentication & security

#### JWT model
- **Access token** — signed with `JWT_ACCESS_SECRET`, `sub` = user id, `username`/`role`
  in payload, TTL 15m (configurable). Sent by the client as
  `Authorization: Bearer <token>` or as cookie `vox_access`.
- **Refresh token** — signed with `JWT_REFRESH_SECRET`, stored **hashed** in
  `RefreshToken` table, rotated on every use (old token revoked, new pair issued).
- **2FA challenge temp token** — short-lived (5m) JWT marked
  `{ twoFactorChallenge: true }`. The auth middleware **rejects** these for normal API
  access; only `POST /api/auth/2fa/login` consumes them.

#### Middleware (`src/middleware/auth.js`)
- `extractToken(req)` — pulls from `Authorization: Bearer` header, else `vox_access` cookie.
- `loadUser(req)` — verifies JWT; **rejects 2FA challenge tokens**; sets `req.user =
  { id, username, role }` or `null`.
- `requireAuth` — 401 if `req.user` is null.
- `optionalAuth` — sets `req.user` if present, never blocks (used by `/api/state`,
  `/api/servers/discover`).

#### 2FA
- Setup: `POST /api/auth/2fa/setup` → generate TOTP secret via `otplib`, encrypt with
  **AES-256-GCM** (`src/lib/crypto.js`) before storing, return `otpauth://` URI + QR
  data URL.
- Confirm: `POST /api/auth/2fa/verify` with a 6-digit code → flips `twoFactorEnabled`.
- Login: if 2FA on, login returns `{ twoFactorRequired: true, tempToken }`;
  `POST /api/auth/2fa/login { tempToken, code }` verifies and issues real tokens.

#### Password reset & email verification
- `POST /api/auth/forgot-password` always returns `{ ok: true }` to prevent email
  enumeration; if the email exists, a 32-byte random token is generated, **SHA-256
  hashed** for storage, raw token sent via Resend email (15-min expiry).
- `POST /api/auth/reset-password { token, password }` — hashes the incoming token,
  verifies, rotates password, **invalidates all refresh tokens**.
- Email verification reuses the same flow with a 24-hour expiry.

#### Input hardening
- **`sanitize(input)`** (`middleware/sanitize.js`) wraps `sanitize-html` configured to
  strip **all** tags and attributes — applied to every user-generated string (messages,
  bios, usernames, server descriptions, channel topics). The frontend renders markdown on
  top of this safe base.
- **Rate limiting** (`express-rate-limit`): auth endpoints (20 / 15 min), refresh + reset
  (5 / min), messages (30 / min), reactions (60 / min), DMs (30 / min), uploads (10 /
  min), search (20 / min), friend ops (10 / min).
- **helmet** with CSP off (local dev); **CORS** with credentials, configurable origins.
- **Upload security** (`upload.routes.js`): strict MIME allowlists — images only for
  avatar/banner (5 MB), broader set (images + videos + documents, 100 MB) for chat.
  Filenames are sanitized of path separators and Windows-banned chars. Two **separate**
  multer instances per kind to avoid the previous race where shared `limits` were mutated
  per request.
- **Link preview SSRF guard** (`linkPreview.js`): rejects non-http(s), localhost,
  loopback, `.local`, raw IPv4; 2 MB body cap, 8 s timeout, 1 h in-memory cache.

#### Resilience: in-memory fallback
If PostgreSQL is unreachable, `auth.service.js` and `chat.service.js` transparently fall back
to in-memory demo data so the app keeps working. The auth module **re-probes** the DB
before every operation (`checkDatabase()`) — fixing a prior bug where a one-shot boot
probe latched `databaseAvailable=false` forever, causing synthetic `demo-<ts>` user ids
that then failed the `Message.userId` foreign key. Message sends now also retry once as
anonymous (`authorOverride`) on FK failure so they never silently 500.

### 5.5 REST API — full endpoint reference

All routes are mounted under `/api`. `🔒` = `requireAuth`; `🔓` = `optionalAuth`; `🌐` =
public.

#### Auth (`auth.routes.js`, mounted at `/api/auth`)
| Method | Path | Auth | Body / Query | Returns |
|---|---|---|---|---|
| POST | `/auth/register` | 🌐 | `{ email, username, password }` | `{ user, tokens: { access, refresh } }` (201) |
| POST | `/auth/login` | 🌐 | `{ emailOrUsername, password }` | `{ user, tokens }` or `{ twoFactorRequired, tempToken }` |
| POST | `/auth/2fa/login` | 🌐 | `{ tempToken, code }` | `{ user, tokens }` |
| POST | `/auth/refresh` | 🌐 | `{ refreshToken }` | `{ user, tokens }` (rotated) |
| POST | `/auth/logout` | 🌐 | `{ refreshToken }` | `{ ok: true }` |
| GET | `/auth/me` | 🔒 | — | `{ user: publicUser }` |
| PATCH | `/auth/me` | 🔒 | `{ displayName?, bio?, status? }` | `{ user }` |
| DELETE | `/auth/me` | 🔒 | — | `{ deleted: true }` |
| POST | `/auth/2fa/setup` | 🔒 | — | `{ secret, otpauth, qr }` |
| POST | `/auth/2fa/verify` | 🔒 | `{ code }` | `{ enabled: true }` |
| POST | `/auth/forgot-password` | 🌐 | `{ email }` | `{ ok: true }` |
| POST | `/auth/reset-password` | 🌐 | `{ token, password }` | `{ ok: true }` |
| POST | `/auth/change-password` | 🔒 | `{ currentPassword, newPassword }` | `{ ok: true }` |
| POST | `/auth/verify-email/request` | 🔒 | — | `{ ok: true }` |
| POST | `/auth/verify-email` | 🌐 | `{ token }` | `{ verified: true }` |

#### App state (`state.routes.js`)
| Method | Path | Auth | Returns |
|---|---|---|---|
| GET | `/state` | 🌐 | `{ ok, name, version, uptime, channels[], messages[], onlineMembers[], nitroClaimed }` |
| POST | `/nitro/claim` | 🌐 | demo nitro perks + broadcasts `nitro:claimed` |

#### Servers (`servers.js`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/servers` | 🔒 | servers the user is a member of, with channels + members |
| POST | `/servers` | 🔒 | create server; auto-adds caller as `FOUNDER`, creates `general` channel |
| GET | `/servers/discover` | 🔓 | public servers, filter by `category`, `search`, sorted by member count; includes `joined` flag |
| POST | `/servers/:id/join` | 🔒 | join a public server (idempotent) |
| POST | `/servers/:id/leave` | 🔒 | leave (owner cannot leave) |
| PATCH | `/servers/:id` | 🔒 (Founder/Admin) | name/description/icon/banner/category/isPublic |
| DELETE | `/servers/:id` | 🔒 (Owner) | delete server |
| POST | `/servers/:id/members` | 🔒 (Founder/Admin) | add member by username |
| POST | `/servers/:id/kick/:userId` | 🔒 (Mod+, role-hierarchy check) | kick |
| POST | `/servers/:id/bans` | 🔒 (Admin+) | ban; removes membership first |
| POST | `/servers/:id/channels` | 🔒 (Founder/Admin) | create channel |
| PATCH | `/servers/:id/channels/:channelId` | 🔒 (Founder/Admin) | name/type/position |
| PATCH | `/servers/:id/channels/reorder` | 🔒 (Founder/Admin) | `{ channelIds: [] }` |
| DELETE | `/servers/:id/channels/:channelId` | 🔒 (Owner) | delete channel |

#### Roles (`roles.routes.js`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/servers/:id/roles` | 🔒 (member) | list 4 fixed roles with member counts |
| POST | `/servers/:id/roles` | 🔒 (Admin) | **rejected** — schema uses fixed role enum |
| PATCH | `/servers/:id/roles/:roleId` | 🔒 (Admin) | **rejected** — same |
| DELETE | `/servers/:id/roles/:roleId` | 🔒 (Admin) | reassign members to `MEMBER` |
| POST | `/servers/:id/members/:userId/roles` | 🔒 (Admin) | assign role |
| DELETE | `/servers/:id/members/:userId/roles/:roleId` | 🔒 (Admin) | demote to `MEMBER` |

#### Permissions (`permissions.routes.js`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/channels/:channelId/permissions` | 🔒 (member) | list per-role overrides |
| POST | `/channels/:channelId/permissions` | 🔒 (Admin) | upsert `{ role, canRead, canWrite, canManage, canAdmin }` |
| DELETE | `/channels/:channelId/permissions/:id` | 🔒 (Admin) | delete override |

#### Categories (`categories.routes.js`)
| Method | Path | Auth |
|---|---|---|
| GET | `/servers/:id/categories` | 🔒 (member) |
| POST | `/servers/:id/categories` | 🔒 (Admin) `{ name, position? }` |
| PATCH | `/servers/:id/categories/:categoryId` | 🔒 (Admin) |
| DELETE | `/servers/:id/categories/:categoryId` | 🔒 (Admin) — nulls `categoryId` on children |

#### Messages & Channels (`message.routes.js`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/channels/:channelId/messages` | 🔒 + `read` perm | latest, or `?before=<cursorId>&limit=` for older |
| GET | `/channels/:channelId/messages/pinned` | 🔒 + `read` | pinned only |
| POST | `/channels/:channelId/messages` | 🔒 + `write` perm, rate-limited | send message + broadcast |
| POST | `/messages` | 🔒 | legacy send path |
| PATCH | `/messages/:id` | 🔒 | author OR server moderator (audit-logged if mod) |
| DELETE | `/messages/:id` | 🔒 | soft delete; same perm rules |
| POST | `/messages/:id/reactions` | 🔒 | toggle `{ emoji }` (verifies channel read access) |
| POST | `/messages/:id/pin` | 🔒 (Mod+) | toggle pin, broadcasts `message:pinned` |
| GET | `/messages/search` | 🔒 | `q`, `channelId?`, `serverId?`, `userId?`, `before?`, `after?` — scoped to user's accessible channels |

`edit.routes.js` adds duplicate PATCH/DELETE `/messages/:id` paths (author-only) used by
the legacy edit flow.

#### Friends (`friends.js`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/friends` | 🔒 | all relationships |
| POST | `/friends/request` | 🔒, rate-limited | `{ username }` |
| PUT | `/friends/:id/accept` | 🔒 | only recipient may accept |
| DELETE | `/friends/:id` | 🔒 | cancel / decline / unfriend |
| POST | `/friends/block` | 🔒 | `{ userId }` — replaces any existing relationship |
| DELETE | `/friends/block/:userId` | 🔒 | unblock |

#### Blocks (`blocks.routes.js`) — independent hard-block table
| Method | Path | Auth |
|---|---|---|
| POST | `/blocks` | 🔒 `{ userId, reason? }` |
| DELETE | `/blocks/:userId` | 🔒 |
| GET | `/blocks` | 🔒 — list with target user projection |
| GET | `/blocks/check/:userId` | 🔒 — `{ blocked, blockingMe }` |

#### DMs (`dm.js`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/dm/:dmId/messages` | 🔒 | verifies `dmId.split('_').includes(userId)` |
| POST | `/dm/:dmId/messages` | 🔒, rate-limited | HTTP fallback; emits `dm:new` to both rooms |
| PATCH | `/dm/:username/messages/:messageId` | 🔒 (sender) | edit |
| DELETE | `/dm/:username/messages/:messageId` | 🔒 (sender) | soft delete |

`dmId` is the two participant user ids joined by `_` in sorted order — recovered
defensively by dropping the caller's own id (not by string replace, which corrupted ids
that were substrings of each other).

#### Search (`search.js`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/search` | 🔒, rate-limited | `q`, `channelId?`, `serverId?`, `userId?`, `hasLink?`, `before?`, `after?`, `limit?` — `contains` + `mode: insensitive`; scoped to accessible channels |

#### Uploads (`upload.routes.js`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/upload/:kind` | 🔒, rate-limited | `kind` ∈ `{avatar, banner, chat, server-icon, server-banner}`; multer single `file`; writes to `backend/uploads/`, returns `/uploads/<filename>` |

#### Invites (`invites.js`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/servers/:id/invites` | 🔒 (member) | `{ expiresIn?, maxUses? }`; 6-char crypto code |
| GET | `/servers/:id/invites` | 🔒 (Admin) | list |
| GET | `/invites/:code` | 🌐 | resolve to server info; checks expiry + max uses |
| POST | `/invites/:code/join` | 🔒 | idempotent join, increments `uses` |
| DELETE | `/invites/:code` | 🔒 | creator or Admin |

Expiry options: `30min`, `1hour`, `6hours`, `1day`, `7days`. Max uses: `0,1,5,10,25,50,100`.

#### Bans (`bans.routes.js`)
| Method | Path | Auth |
|---|---|---|
| GET | `/servers/:id/bans` | 🔒 (Admin) |
| POST | `/servers/:id/bans` | 🔒 (Admin) `{ userId, reason?, expiresAt? }` |
| DELETE | `/servers/:id/bans/:userId` | 🔒 (Admin) |

#### Webhooks (`webhooks.routes.js`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/servers/:id/webhooks` | 🔒 (Admin) | list |
| POST | `/servers/:id/webhooks` | 🔒 (Admin) | `{ name, channelId, url? }`; mints UUID token |
| PATCH | `/servers/:id/webhooks/:webhookId` | 🔒 (Admin) | update name/url |
| DELETE | `/servers/:id/webhooks/:webhookId` | 🔒 (Admin) | delete |
| POST | `/webhooks/:token` | 🌐 | inbound webhook → posts as `authorOverride = webhook.name` |

Outbound delivery (`webhook.service.js`) fires in parallel, non-blocking, with
`AbortController` 5-s timeout and exponential backoff (1s, 2s, max 2 retries).

#### Custom emojis (`emoji.routes.js`)
| Method | Path | Auth |
|---|---|---|
| GET | `/servers/:id/emojis` | 🔒 (member) |
| POST | `/servers/:id/emojis` | 🔒 (Admin) `{ name, url }` |
| DELETE | `/servers/:id/emojis/:emojiId` | 🔒 (Admin) |

#### Audit log (`audit.routes.js`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/servers/:id/audit` | 🔒 (Admin) | `action?`, `page?`, `limit?` — paginated |

#### Insights / analytics (`insights.js`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/servers/:id/insights` | 🔒 (Admin) | `period=7d\|30d\|90d`; returns totals, active members, new joins, per-channel activity, top members |

#### Link preview (`linkPreview.js`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/link-preview` | 🌐 | `?url=`; SSRF-guarded OG parser, 1 h cache |

### 5.6 Socket.io — real-time layer

`sockets/index.js` creates the Socket.io `Server`, binds it to the same HTTP server,
applies the auth middleware (JWT from handshake `auth.token`; falls back to anonymous
guest), and optionally installs the **Redis adapter** for multi-worker fan-out.

On connect, the server emits `state:init` with channels, last 50 messages, online
members, nitro flag, and `hasMore` for pagination.

#### Rooms
- `user:<id>` — personal room for DMs and direct events.
- `server:<id>` — server-scoped voice presence.
- `channel:<id>` — channel chat.
- `dm:<dmId>` — DM conversation.
- `voice:<channelId>` — WebRTC signaling room.

#### Client → Server events (`handlers.js`)
| Event | Payload | Effect |
|---|---|---|
| `server:join` | `serverId` | join server room |
| `channel:join` / `channel:leave` | `channelId` | subscribe/unsubscribe to channel |
| `voice:join` | `{ channelId, serverId }` | join voice room, return existing peers + active screen sharers |
| `voice:leave` | — | leave voice, notify others |
| `voice:offer` | `{ to, offer }` | WebRTC offer relay |
| `voice:answer` | `{ to, answer }` | WebRTC answer relay |
| `voice:ice-candidate` | `{ to, candidate }` | ICE relay |
| `voice:mute` / `voice:deafen` / `voice:speaking` | `{ … }` | broadcast state |
| `voice:screen` | `{ screen }` | toggle screen share, broadcast |
| `voice:screen-request` | `{ to }` | late joiner asks sharer to renegotiate |
| `message:send` | `{ channelId, content, parentId?, attachments? }` | persist + `message:new`; FK-fail → anonymous retry; triggers webhooks |
| `message:edit` | `{ messageId, content }` | author OR moderator; audit-logs mod edits |
| `message:delete` | `{ messageId }` | soft delete; audit-logs mod deletes |
| `message:react` | `{ messageId, emoji }` | toggle reaction |
| `typing:start` / `typing:stop` | `{ channelId }` | relay to channel |
| `dm:send` | `{ recipientId, content, attachments? }` | persist + `dm:new` to both rooms |
| `dm:join` / `dm:leave` | `{ dmId }` | subscribe |
| `dm:typing:start` / `dm:typing:stop` | `{ recipientId }` | relay |
| `dm:read` | `{ dmId }` | mark received DMs as read, notify other party |
| `status:update` | `{ status }` | validate against enum, persist, broadcast `presence:update` |

#### Server → Client events
`state:init`, `message:new`, `message:updated`, `message:deleted`, `message:reactions`,
`message:pinned`, `nitro:claimed`, `presence:update`, `member:status`, `typing:start`,
`typing:stop`, `dm:new`, `dm:updated`, `dm:deleted`, `dm:read`, `voice:user-joined`,
`voice:user-left`, `voice:user-muted`, `voice:user-deafened`, `voice:user-speaking`,
`voice:screen`, `voice:existing-peers`, `voice:member-update`, `voice:offer`,
`voice:answer`, `voice:ice-candidate`, `voice:screen-request`.

On `disconnect`: voice leave is cleaned up, and if the user was authed, their status is
flipped to `OFFLINE` and `presence:update` is broadcast.

### 5.7 Services & business logic

- **`auth.service.js`** — register/login (2FA-aware), 2FA setup/verify, refresh, logout,
  password reset, email verification. Contains the **in-memory fallback** user store and
  the **self-healing DB probe** that re-checks PostgreSQL availability on every auth op.
  `publicUser()` strips secrets and returns the safe shape consumed by the client.
- **`chat.service.js`** — `getState()` (channels + online members + counts),
  `getRecentMessages(limit)`, `getMessagesBefore(cursorId, limit)` (cursor pagination),
  `createMessage()` (with fallback), `claimNitro()`. Caches channels + members in Redis
  (30 s TTL); messages always hit PostgreSQL.
- **`tokens.js`** — refresh-token mint/verify/revoke against the DB (hashed storage,
  rotation).
- **`email.service.js`** — Resend client; console-logs in dev mode; themed HTML
  templates for password reset (15-min) and email verification (24-h).
- **`webhook.service.js`** — non-blocking outbound delivery with retries + backoff.

### 5.8 Caching & horizontal scaling (Redis)

`src/lib/redis.js` lazily creates:
- a **cache client** (`getCache`) — JSON get/set with TTL, used by `chat.service.js`.
- a **pub/sub pair** (`getPubSub`) — fed to `@socket.io/redis-adapter` so PM2 cluster
  workers share socket rooms and events.

If `REDIS_URL` is unset, every helper no-ops and Socket.io runs in single-process mode —
the app stays fully functional in dev without Redis.

**PM2 cluster** (`ecosystem.config.json`): `instances: 'max'`, `exec_mode: 'cluster'`,
500 MB max memory restart, logs to `./logs/`. The Redis adapter is required for this mode
to keep socket events consistent across workers.

---

## 6. Frontend Deep Dive

### 6.1 App shell & routing

`main.tsx` mounts `<App/>` inside `<BrowserRouter>` and `<ErrorBoundary>`, registers the
service worker (`/sw.js`) for offline support + push, requests notification permission,
imports the full CSS bundle (`index.css`, `themes.css`, `polish.css`, `advanced.css`,
`micro-interactions.css`, `animations.css`, `settings.css`).

`App.tsx` shows a **`SplashScreen`** on cold boot, then routes:

| Route | Component(s) |
|---|---|
| `/login` | `LoginDummy` |
| `/register` | `RegisterPage` |
| `/friends` | `FriendsPage` |
| `/dm/:dmId` | `DMConversation` |
| `/profile` | `Profile` |
| `/settings`, `/settings/account`, `/settings/privacy`, `/settings/social`, `/settings/devices`, `/settings/apps`, `/settings/family`, `/settings/appearance`, `/settings/voice`, `/settings/notifications`, `/settings/chat` | lazy `Settings` + subpages |
| `/server-settings/:serverId` | `ServerSettings` |
| `/server-profile/:serverId` | `Sidebar` + `ServerProfile` + `MemberPanel` |
| `/channels/:serverId/:channelId` | `Sidebar` + `MainContent` + `VoiceChannelPanel` + `MemberPanel` |
| `/` | placeholder |

Layout primitives: `TitleBar` (custom frameless controls), `OfflineBanner`, `ServerRail`,
`ToastContainer`, `ProfilePopup`, `ScreenSourcePicker`, `ScreenShareOverlay`,
`CreateServerModal`, `CreateChannelModal`, `ThemeSwitcher`, `QuickSwitcher`,
`ShortcutsModal`, `Discover` (overlay), `InviteModal`, `CustomStatusModal`,
`NotificationCenter`, `OnboardingFlow`.

Bootstrap effect: reads `vox_token` from `localStorage`; if absent and not on `/login`,
redirects to `/login`. If present: hydrates `profileStore` from cached `vox_user`,
connects the socket, fetches servers + friends, and triggers onboarding if the user has
no servers yet.

Lazy-loaded routes are split into separate chunks via `React.lazy` + Vite's
`manualChunks` (vendor / motion / socket / router / store).

### 6.2 State management (Zustand stores)

All state lives in Zustand stores in `src/stores/`. Each store exposes a `reset()` for
clean teardown on logout.

| Store | Responsibility |
|---|---|
| **`socketStore`** | Owns the single `Socket` instance. Connect with token, exponential-backoff reconnect (max 10, cap 30 s). Emitters: `sendMessage`, `editMessage`, `deleteMessage`, `reactToMessage`, `start/stopTyping`, `sendDM`, `joinChannel`, `leaveChannel`, `updateStatus`. Listeners route `message:new/updated/deleted`, `typing`, `presence:update`, `dm:new` into the right stores and synthesize mention/DM notifications (browser native + Electron `flashFrame`). |
| **`serverStore`** | `servers[]`, `selectedServer`, `selectedChannel`. `fetchServers()` keeps selection in sync after refresh. `updateMemberStatus()` for live presence. |
| **`messageStore`** | `messages: Record<channelId, Message[]>`, `typingUsers`, `unread`, `replyingTo`. Smart `addMessage` only bumps unread when the channel is not active and the message isn't yours. |
| **`dmStore`** | `messages: Record<dmId, DMMessage[]>`, `unread`, `selectedDM`. |
| **`friendStore`** | friends / incoming / outgoing / blocked; wraps the friends API. |
| **`profileStore`** | identity (displayName, bio, avatar/banner, badges, connections, orbs); syncs status/bio via REST + socket. |
| **`voiceStore`** | WebRTC state: `localStream`, `peers: Map<socketId, RTCPeerConnection>`, `remoteStreams`, `voiceUsers`, mute/deafen/speaking, screen-share streams. |
| **`notificationStore`** | persisted to `localStorage` (`vox_notifications`); max 100, 7-day TTL; types `mention/dm/join/system/warning`. |
| **`uiStore`** | toast queue, modal toggles (create server/channel, profile popup, threads, pinned, search, invite, discover, custom status, emoji picker). |
| **`themeStore`** | 8 themes (`void`, `crimson-blood`, `ocean-abyss`, `toxic-matrix`, `gold-sovereign`, `specter-gray`, `sunset-inferno`, `midnight-cherry`); applies `data-theme` on `<html>` and persists to `vox_theme`. |
| **`settingsStore`** | user settings (notifications, voice, chat preferences). |

### 6.3 API client layer

`src/api/client.ts`:
- exports `API_BASE` (default `http://127.0.0.1:4000`, override with `VITE_API_BASE`).
- `api(path, options)` — wrapper around `fetch` that injects `Content-Type` and
  `Authorization: Bearer <token>`. On **401** it dynamically imports `utils/auth.logout`
  (avoids a cycle: stores import `client`, `auth` imports stores) and throws
  `"Session expired"`. On **429** it parses `Retry-After` and throws a tagged error.

Domain wrappers (all in `src/api/`):
- `servers.ts` — `fetchServers`, create/update/delete, channels, members, join/leave,
  kick/ban, discover.
- `messages.ts` — fetch (with pagination), send/edit/delete, react, pin, search.
- `dm.ts` — fetch/send/edit/delete DMs.
- `friends.ts` — requests, accept/decline, block/unblock.
- `uploads.ts` — `uploadFile(kind, file, serverId?)` via `FormData`.
- `invites.ts`, `insights.ts`, `search.ts`, `linkPreview.ts`, `discover.ts`.

### 6.4 Component architecture

Top-level layout: `ServerRail | Sidebar | MainContent | MemberPanel`, with a custom
`TitleBar` and overlays above.

- **chat/** — `MessageArea` (virtualized list, scroll restoration, date dividers),
  `MessageBubble` (markdown, mentions, reactions, attachments, edit-on-double-click),
  `MessageInput` (autocomplete, emoji picker, attachment previews, reply/thread UI),
  `AttachmentList`, `PinnedMessagesPanel`, `ThreadPanel`, `TypingIndicator`,
  `LinkPreviewCard`, `RichText`, `GifPicker`.
- **server/** — `ServerRail` (server icons, badges, hover tooltips), `CreateServerModal`,
  `CreateChannelModal`, `ServerSettings` (tabbed: overview, roles, channels, emojis,
  webhooks, bans, audit log, insights), `RolesPanel`, `CategoryManager`, `WebhookPanel`,
  `BanList`, `EmojiPanel`, `AuditLog`, `InviteModal`.
- **friends/** — `FriendsPage` (4 tabs: Online/All/Pending/Blocked), `DMConversation`.
- **voice/** — `VoiceChannelPanel` (join/leave, mute/deafen, screen share, audio
  visualizer, participant grid), `ScreenShareOverlay` (floating viewer),
  `ScreenSourcePicker` (Electron IPC).
- **ui/** — `Sidebar`, `MemberPanel`, `ContextMenu` (custom hook-backed), `ToastContainer`,
  `ProfilePopup`, `QuickSwitcher` (Ctrl+K), `ShortcutsModal` (Ctrl+/), `ThemeSwitcher`,
  `NotificationCenter`, `NotificationBell`, `CustomStatusModal`, `StatusPicker`,
  `ImageLightbox`, `LazyImage`, `Skeleton`, `RoleBadge`, `Waveform`, `AudioVisualizer`,
  `OfflineBanner`, `ErrorBoundary`, `SplashScreen`, `OnboardingFlow`, `EmojiPicker`.
- **void/** — branded primitives (`GlitchText`, `ParticleCanvas`, `ServerIcon`,
  `StatusDot`, `TypingIndicator`, `VoidButton`, `VoidInput`, `MessageBubble`) — the
  "void/cyberpunk" aesthetic layer.
- **settings/** — `Account`, `Privacy`, `Social`, `Devices`, `AuthorizedApps`,
  `FamilyCenter`, `Appearance`, `Voice`, `Notifications`, `Chat` (all lazy).
- **layout/TitleBar** — frameless window controls via `electronAPI.windowControls`.

### 6.5 Theming & micro-interactions

- 8 themes defined in `themeStore.ts`, applied as `data-theme="<id>"` on the root element.
  Each theme sets CSS custom properties (`--bg`, `--accent`, `--panel`, …) consumed by
  `themes.css`. The default theme (`void`) is applied at module load — **before** React
  mounts — to avoid a flash of the wrong theme.
- `micro-interactions.css` + `useRipple` hook deliver click ripples, hover glows, and
  spring-based modal transitions via Framer Motion.
- Keyboard: `useKeyboardShortcuts` registers Ctrl+K (quick switcher), Ctrl+/ (shortcuts
  help), and Escape (close everything).

---

## 7. Electron Desktop Shell

`electron-main.js` is the main process. On `app.whenReady()` it runs `start()`:

1. **`startPostgreSQL()`** — if `C:\Program Files\PostgreSQL\PostgreSQL Server 8.0\bin\PostgreSQLd.exe` exists,
   initializes a data dir under `<repo>/temp/PostgreSQL-data` (using `--initialize-insecure` on
   first run), then spawns PostgreSQLd bound to `127.0.0.1:3306` detached.
2. **`startBackend()`** — spawns `node backend/server.js`; resolves when stdout contains
   the literal `'listening'` (or 4 s fallback).
3. **`ensureViteBuild()`** — runs `npm run build` in `frontend/` if `dist/index.html`
   doesn't exist.
4. **`startFrontend()`** — spawns `node frontend/static-server.js` to serve the built
   dist on port 3000.
5. **`createWindow()`** — frameless `BrowserWindow`, loads `http://127.0.0.1:3000`,
   sets up screen-capture permission handlers, persists window bounds to
   `%APPDATA%/VOX-Desktop/vox-window-state.json`. Close minimizes to tray; only a tray
   "Quit" or `app.quit()` truly exits.
6. **`createTray()`** — system tray icon + context menu (Show / Quit), click toggles
   window visibility.
7. Registers the global hotkey **Ctrl+Shift+V** to summon the window.

**Cache hygiene**: forces all Electron/Chromium data into `%APPDATA%/VOX-Desktop/`
(`userData`, `Cache`, `GPUCache`, `Crashpad`), removes stale `.lock` files at boot, and
suppresses a large blocklist of noisy Chromium/PostgreSQL log lines via wrapped
`process.stdout/stderr.write` and `console.log/error`. This keeps the dev console
readable.

**`preload.js`** exposes `window.electronAPI` via `contextBridge`:
- `notify(title, body)`, `flashFrame()` — native notifications + taskbar flash.
- `onFocusChange`, `onMaximizeChange` — window events.
- `windowControls` — `minimize/maximize/close/isMaximized/platform`.
- `screenCapture` — `getSources/select/cancel/onRequest` — bridges the renderer to
  Electron's `desktopCapturer` for screen sharing.

---

## 8. Real-time Voice / Video (WebRTC)

Voice uses a **mesh** WebRTC topology brokered by Socket.io (fine for small rooms):

1. Client emits `voice:join { channelId, serverId }`.
2. Server replies with `voice:existing-peers` listing each peer's `socketId`, `userId`,
   `username`, and which are screen-sharing.
3. For each existing peer, the joiner creates an `RTCPeerConnection`, adds its local
   `getUserMedia` audio (and optionally video / `getDisplayMedia` screen track), creates
   an offer, and relays it via `voice:offer`.
4. Existing peers respond with `voice:answer`; ICE candidates flow both ways through
   `voice:ice-candidate`.
5. `voice:mute`, `voice:deafen`, `voice:speaking` broadcast UI state.
6. `voice:screen` toggles screen share; **late joiners** emit `voice:screen-request` so
   active sharers renegotiate to send them the screen track.

`voiceStore` (frontend) owns the `peers` Map and remote-stream Maps; the
`ScreenShareOverlay` renders the active screen stream as a floating draggable video, and
`ScreenSourcePicker` uses `electronAPI.screenCapture` to list screens/windows with
thumbnails and let the user pick one.

---

## 9. Security Model

| Concern | Mitigation |
|---|---|
| Password storage | bcrypt (cost 10) |
| Token theft | Short-lived access (15m) + rotated, hashed refresh tokens; refresh invalidation on password reset |
| 2FA | TOTP via `otplib`; secret encrypted at rest with AES-256-GCM |
| Brute force | per-endpoint rate limits (auth 20/15m, sensitive 5/min) |
| XSS | `sanitize-html` strips **all** tags server-side; markdown rendered client-side on a safe base |
| CSRF | JWT in `Authorization` header (not cookie-only); cookies available but not required |
| SQL injection | Prisma parameterized queries only |
| File upload abuse | strict MIME allowlists, size caps, sanitized filenames, separate multer instances per kind |
| SSRF (link preview) | reject loopback/`.local`/raw IPs, 2 MB cap, 8 s timeout |
| IDOR / horizontal priv. | every list/search scoped to memberships; explicit `serverId_userId` uniqueness checks; channel-read verification before reactions |
| Path traversal in uploads | filename character class stripping |
| Email enumeration | forgot-password always returns `{ ok: true }` |
| Permission escalation | role hierarchy enforced on kick/ban/role-assign (can't act on equal/higher rank) |
| Audit trail | moderator message edits/deletes logged to `AuditLog` |

---

## 10. Observability & Reliability

- **`/health`** endpoint returns `{ ok, service, uptime }` — used by Electron to detect
  boot readiness.
- **Self-healing DB**: `auth.service.checkDatabase()` re-probes PostgreSQL on every auth op;
  logs `[vox/auth] PostgreSQL recovered` / `unavailable` transitions.
- **Never-throw message sends**: channel + DM send paths catch FK violations and retry as
  anonymous so a message is never silently dropped.
- **Socket reconnection**: client exponential backoff (1 s → 30 s, max 10 attempts).
- **Graceful shutdown**: `SIGINT`/`SIGTERM` close the HTTP server, then `process.exit(0)`,
  letting Prisma disconnect cleanly.
- **PM2**: cluster mode with `max_memory_restart: 500M`, `max_restarts: 10`,
  `min_uptime: 10s`, `kill_timeout: 5000`, stdout/stderr to `./logs/`.
- **Electron log filtering**: noisy Chromium/PostgreSQL lines suppressed so the console stays
  readable; child-process stderr passes through a denylist regex.

---

## 11. Build, Run & Deploy

### One-shot (Electron desktop)
```bash
# from repo root — launches everything
npx electron electron-main.js
# → starts PostgreSQLd, backend, builds+serves frontend, opens window
```

### Development (3 terminals)
```bash
# 1. PostgreSQL (or use the bundled one)
# 2. Backend
cd backend
cp .env.example .env          # fill DATABASE_URL, JWT secrets, 2FA key
npm install
npm run db:setup              # prisma migrate dev --name init && db seed
npm run dev                   # http://127.0.0.1:4000

# 3. Frontend
cd frontend
npm install
npm run dev                   # http://127.0.0.1:3001
```

### Production (PM2 cluster)
```bash
# requires REDIS_URL for the socket adapter
cd backend
npm run cluster               # pm2 start ../ecosystem.config.json
npm run cluster:logs
```

### Build the frontend for Electron
```bash
cd frontend
npm run build                 # outputs dist/, chunk-split by vendor/motion/socket/router/store
npm run serve                 # node static-server.js → :3000
```

### Key npm scripts
| Where | Script | Effect |
|---|---|---|
| backend | `start` / `dev` | `node server.js` |
| backend | `prisma:generate` / `prisma:migrate` / `prisma:seed` / `prisma:studio` | Prisma tooling |
| backend | `db:setup` | migrate + seed |
| backend | `cluster[:restart\|:stop\|:logs]` | PM2 controls |
| frontend | `dev` | Vite dev server |
| frontend | `build` | Vite production build |
| frontend | `serve` | static server for dist |
| frontend | `lint` | ESLint |

---

## 12. Glossary

- **VOX** — the project name; the brand identity is "void / dark matter / cyberpunk".
- **Realm** — in-app flavor word for "server" / "guild" used in some UI copy.
- **Operative** — flavor word for "user" / "member".
- **dmId** — sorted `<uidA>_<uidB>` string identifying a 1:1 DM channel.
- **Nitro** — a demo perks flag preserved for compatibility with the original UI button.
- **Founder / Admin / Moderator / Member** — the four-role hierarchy; powers 4/3/2/1.
- **Fallback mode** — in-memory demo data used when PostgreSQL is unreachable, so the app
  never hard-fails on a user.
- **authorOverride** — display name stored on a `Message` when `userId` is null (anonymous
  guest or webhook), so the row always renders an attribution.

---

*This document reflects the working tree at the time of writing. The Discord-named
entities in `prisma/schema.prisma` (`Guild`, `Role`, `VoiceState`, `PermissionOverwrite`,
…) describe an extended/idealized data model; the actively-running routes today operate
against the `Server` / `ServerMember` / `Channel` / `Message` / `Permission` /
`ServerBan` / `AuditLog` / `Webhook` / `CustomEmoji` / `Invite` / `Friend` / `Block` /
`DMMessege` / `Reaction` / `Category` / `RefreshToken` / `PasswordReset` / `User` family
of models.*
