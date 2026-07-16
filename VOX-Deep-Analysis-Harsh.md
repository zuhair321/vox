# VOX — Deep Analysis (Unfiltered / Brutal Edition)

**Date:** 2026-07-16
**Reviewer verdict:** ⛔ **Does not run. Not shippable. "Feature-complete" on paper, dead on arrival in practice.**
**Repo:** `D:\Vox` — Electron desktop + Express/Prisma backend + React/Vite frontend + React Native mobile

> This is a harsh, evidence-first review. Every claim below is backed by a file path and line number from the actual code, not vibes. If you want the polite version, read the *other* `VOX-Deep-Analysis.md`. This one tells you the truth.

---

## TL;DR

You have ~36k lines of application code (10.6k backend, 25.5k frontend), 46 route files, 199 frontend components, an Electron shell, and a mobile app. It *looks* like a serious Discord clone.

It is not. **The backend entrypoint does not parse as valid JavaScript.** The server literally cannot boot. Everything downstream of that — the 46 routes, the sockets, the "feature-complete" claim — is theater until the front door compiles.

On top of that: secrets are hard-coded in a checked-in-on-disk `.env`, the database story contradicts itself in three places, and the repo floor is covered in debug logs, `.bak` files, `tmp` scripts, and **four** build-output folders.

This is a prototype cosplaying as a 1.0 release.

---

## 🔴 Showstopper #1 — The backend cannot start. At all.

`backend/src/server.js` — the actual application entrypoint — uses invalid import syntax on **17 separate lines**:

```js
// backend/src/server.js:5-20
import { fileURLToPath } = from 'node:url';   // ❌ SyntaxError
import express = from 'express';              // ❌
import cors = from 'cors';                    // ❌
import cookieParser = from 'cookie-parser';   // ❌
import helmet = from 'helmet';                // ❌
import { env } = from './lib/env.js';         // ❌
...
```

`import X = from 'Y'` is not a thing in JavaScript. The `=` doesn't belong there. Proof from `node --check`:

```
D:\Vox\backend\src\server.js:5
import { fileURLToPath } = from 'node:url';
                         ^
SyntaxError: Unexpected token '='
```

**Consequence:** `node backend/server.js` spawns `src/server.js`, which throws a `SyntaxError` before a single line executes. The HTTP port never opens. The Electron app's backend child process dies instantly. Nothing works.

This isn't a subtle bug — it's the single most important file in the backend, and it doesn't even parse. Whatever tool or find-and-replace produced this corrupted every top-level import and nobody ran the file afterward. That tells you the "working" status in the existing report was never actually verified against a fresh boot.

**Severity:** Critical. This alone makes the entire "What's Working / Backend ✅" section of the sibling report a lie.

---

## 🔴 Showstopper #2 — Hard-coded secrets sitting in `backend/.env`

`backend/.env` (on disk in the repo working tree):

```
# backend/.env:16-17
JWT_ACCESS_SECRET=9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
JWT_REFRESH_SECRET=5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8
```

Problems, in order of embarrassment:

1. **These are not random.** `5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8` is the SHA-256 of the literal string `"password"`. `9f86d081...` is the SHA-256 of `"test"`. Anyone can regenerate them in five seconds and forge valid JWTs for any user, including admins. Your auth is cryptographically equivalent to having no auth.
2. `RESEND_API_KEY=re_1234567890abcdef...` and a full spread of `S3_SECRET_KEY`, `LIVEKIT_API_SECRET`, `SMTP_PASS` placeholders — the file screams "someone will paste real keys here and commit them."
3. The header of this same file says `# DO NOT commit .env to version control` while... being a committed-shaped artifact in the working tree with real-looking values in it.

`.gitignore` does exclude `.env` (line 13-15), so it's *currently* untracked — good, barely. But the fact that predictable "hash of a common word" secrets are baked in as defaults means every dev running this is trivially exploitable, and the odds someone force-adds it are high.

**Severity:** Critical. Rotate everything, generate real 256-bit secrets, and never ship known-hash values.

---

## 🔴 Showstopper #3 — The database story is incoherent

Three sources, three different answers:

| Source | Claim |
|---|---|
| `backend/package.json:4` (description) | "Express + Prisma (**PostgreSQL**)" |
| `backend/.env.example` (tracked) | `DATABASE_URL="postgresql://vox:...@localhost:5432/..."` |
| `backend/.env` (real, on disk) | `DATABASE_URL=file:./vox.db` (SQLite) |
| `backend/prisma/schema.prisma:8` | `provider = "sqlite"` |
| `backend/src/server.js:90-91` | warns and "defaults to SQLite at ./vox.db" |

So the project *describes itself* as PostgreSQL, ships an example config for PostgreSQL, but actually runs SQLite. The `@socket.io/redis-adapter` + Redis + PM2 cluster setup (`ecosystem.config.cjs`, `redis/` dir) implies horizontal scaling — which is architecturally **incompatible** with a single-file SQLite database. You cannot cluster stateless Node processes across a local SQLite file and expect coherent writes. The scaling story and the persistence story directly contradict each other.

Meanwhile `backend/package.json:25` declares the Prisma seed as `tsx prisma/seed.js`, but the actual seed file is `prisma/seed.mjs`. Another path that points at a file that isn't there.

**Severity:** High. Pick one database. Make the description, example, schema, and runtime agree. Decide whether you're a local desktop app (SQLite is fine) or a scalable service (then it's Postgres + Redis and SQLite has to go).

---

## 🟠 Major — The repository is a landfill

A serious repo does not look like this. Actual junk files sitting in the tree:

**Root:**
- `dir` (a file literally named `dir` — someone typed `ls > dir` or `dir` on Windows and redirected)
- `frontend.log`, `test.txt`
- **Four** overlapping build-output dirs: `dist-final/`, `dist-temp/`, `dist-v2/`, `win-unpacked/` — plus `.blackbox/`. Only one of these should exist and it shouldn't be committed.

**Backend:**
- Debug spew: `backend.log`, `berr.txt`, `bout.txt`, `boot.err`, `boot.log`, `stderr.log`, `stdout.log`, `test-boot.log`, `_t_err.log`, `_t_out.log`, `_test_stderr.log`, `_test_stdout.log`
- Abandoned code: `delete-user.js.bak`, `profile-tmp.mjs`, `env_temp.txt`
- Duplicate one-off scripts: `check-tables.cjs` **and** `check-tables.mjs`, `test-db.js` **and** `test-db.mjs`, `create-*.mjs`, `list-users.js`, `db-setup.js` — all loose in the root instead of a `scripts/` folder (which *also* exists, so the discipline is inconsistent).

`.gitignore` ignores `*.log`, but not `berr.txt` / `bout.txt` / `boot.err` / `test.txt` / `dir` / `env_temp.txt` / the `.bak`. So half the debris is still trackable.

**Severity:** Medium, but it's a giant tell. This is what a repo looks like when someone debugs by `node x.js > out.txt 2> err.txt` over and over and never cleans up. It signals no CI, no review gate, no one ever ran `git status` and cared.

---

## 🟠 Major — Crash-hiding as an architecture

`backend/src/server.js:28-34`:

```js
process.on('unhandledRejection', (reason) => { console.error('[unhandledRejection]', ...); });
process.on('uncaughtException', (err) => { console.error('[uncaughtException]', ...); });
```

The comment proudly explains this keeps the server up "instead of crashing." That's not resilience — that's **swallowing corruption**. After an `uncaughtException`, the Node process is in an undefined state; the correct move is to log, alert, and exit so a supervisor (PM2, which you already have) restarts a clean process. Leaving it running means you serve requests from a process whose invariants may already be broken. This is an anti-pattern that turns hard crashes into silent, intermittent data bugs.

---

## 🟡 Notable — Auth and route design smells

Not all bad, but several things a real review would block:

1. **`GET /api/auth/me` invents a fake user on DB failure** (`auth.routes.js:116-131`). If the DB is down it fabricates `{ role: 'MEMBER', ... }` from the token and returns 200. So "database unavailable" becomes "you're logged in as a made-up member." Failures should surface, not be masked with fiction.

2. **`PATCH /api/auth/me` returns 200 on DB error** (`auth.routes.js:161-164`) with `{ ok: false }`. Mixing HTTP 200 with an application-level failure flag means clients that check status codes think it succeeded. Pick a contract.

3. **Password hashing cost is inconsistent.** Registration hashing lives in the service, but `change-password` re-hashes at `bcrypt.hash(newPassword, 10)` (`auth.routes.js:264`). If the service uses a different cost factor, you now have two hash strengths in one users table.

4. **`DELETE /api/auth/me` is a raw `prisma.user.delete`** (`auth.routes.js:273`) with no confirmation, no soft-delete, no cascade audit. One request nukes the account. Also relies on DB cascade behavior that isn't visible here.

5. **CORS allows `null` origin** (`env.js:52`) to support native apps. Understandable, but `Origin: null` is also what sandboxed iframes and some CSRF vectors send. Combined with `credentials: true` cookies, that's a footgun worth a second look.

6. **46 routers, all mounted under `/api`** with a lazy-mount registry (`server.js:42-86`). The ambition is enormous (forums, stages, soundboard, stickers, badges, webhooks, automod, turbo, insights...). None of it matters while the file it lives in doesn't parse — but even once fixed, 46 feature routers with the quality signals seen here means a large, under-tested surface.

---

## 🟡 Notable — Frontend / build

- Frontend is the healthiest part: 199 `.tsx/.ts` files, ~25.5k LOC, React 18 + Vite 5 + Zustand + Framer Motion. Reasonable stack.
- But `frontend/` contains a stray `nul` file (a Windows reserved device name accidentally created — these are a nightmare to delete and to check out on other machines), `stats.html` (bundle-analyzer output committed), and both a `build/` and `dist/` directory.
- The sibling `VOX-Deep-Analysis.md` documents a "white screen on launch" caused by a **stale `app.asar` shipping an old broken bundle** with a service-worker registration pointing at a nonexistent `/sw.js`. So even the packaged desktop artifact has a known white-screen failure mode.

---

## 🟢 What's actually fine (credit where due)

- The **Electron main process** (`electron-main.js`, 822 lines) is genuinely careful: dedicated userData/cache paths, lock-file cleanup, portable-Node bundling for packaged builds, sensible `asarUnpack` for native `.node` modules. Someone who knew Electron wrote this part.
- **Frontend architecture** is conventional and modern; the component count and structure suggest real UI work happened.
- The **dependency choices** are sane and current (Prisma 6, Express 5, socket.io 4.8, helmet 8, zod 4).
- Auth *intent* is good: rate limiting on login/refresh, 2FA challenge tokens explicitly rejected for API access (`auth.js:59`), API-key auth path, session revocation, GDPR export, login history. The **design** of auth is more mature than the **execution**.

The tragedy is that competent pieces are welded to a backend entrypoint that doesn't compile.

---

## Priority fix list (do these in order)

1. **Fix `backend/src/server.js` imports.** Replace all `import X = from 'Y'` with `import X from 'Y'` (17 lines). Then `node --check` it, then actually boot it. Nothing else counts until this passes. *(Critical, ~10 min)*
2. **Rotate every secret.** Generate real 32-byte random JWT secrets; purge the SHA-256-of-"password" values. Verify `.env` is untracked and scrub history if it was ever committed. *(Critical)*
3. **Pick ONE database** and make description + `.env.example` + `schema.prisma` + runtime agree. If SQLite: delete the Redis-cluster scaling pretense. If Postgres: delete SQLite and fix the schema provider. *(High)*
4. **Fix the seed path** (`package.json` → `seed.mjs`) or rename the file. *(Low, but it's a lie right now)*
5. **Stop swallowing `uncaughtException`.** Log + exit; let PM2 restart. *(High)*
6. **Delete the landfill.** Remove all `.log/.txt/.bak/_t_*/boot*/*tmp*` debris, the `dir` file, the `nul` file, `stats.html`, and consolidate to one dist folder. Expand `.gitignore` to cover them. *(Medium)*
7. **Fix the fake-user-on-DB-failure auth fallbacks.** Fail loudly, return correct status codes. *(Medium)*
8. **Add a CI gate** that at minimum runs `node --check` on every backend file and `vite build` + `eslint --max-warnings 0` on the frontend. This bug class should be impossible to merge. *(High — process fix)*

---

## Final grade

| Area | Grade | Note |
|---|---|---|
| Backend runs? | **F** | Entrypoint is not valid JS. |
| Security | **F** | Known-hash JWT secrets = forgeable auth. |
| Data architecture | **D** | SQLite vs Postgres vs Redis-cluster contradiction. |
| Repo hygiene | **D-** | Debug logs, `.bak`, `dir`, `nul`, 4 dist folders. |
| Frontend | **B-** | Solid stack, but ships a known white-screen build. |
| Electron shell | **B** | Actually thoughtful. |
| Ambition vs reality | **F** | 46 routes and a mobile app on a backend that won't boot. |

**Overall: F.** Not because the ideas are bad — the surface area and the Electron work show real capability — but because it is currently a non-running program that markets itself as a finished 1.0. The gap between the confident sibling report ("✅ Backend working") and `node --check` failing on line 5 of the main server file is the whole story. Fix Showstopper #1 first; you may be surprised how much of the rest actually works once the door opens. Until then, this is a demo of good intentions, not software.
