# VOX — VS Code Workspace Guide

This is a **multi-root VS Code workspace** for the entire VOX monorepo. The JSON
that VS Code consumes lives in `vox.code-workspace`. This file is the human
guide.

## Open it

```
code vox.code-workspace
```

…or **File ▸ Open Workspace…** → pick `vox.code-workspace`.

When VS Code asks, click **"Yes, I trust the authors"** — required for the
Launch / Tasks configurations to actually run.

## Three roots

| Name         | Path        | What lives here                                                                |
| ------------ | ----------- | ------------------------------------------------------------------------------ |
| VOX (root)   | `.`         | Electron shell: `electron-main.js`, `preload.js`, top-level `package.json`, `scripts/` (bump, NSIS, secret-gen) |
| backend      | `backend`   | Express + Prisma + Socket.IO API (JS / ESM). Entry: `backend/server.js` → `backend/src/server.js` |
| frontend     | `frontend`  | Vite + React 18 + Tailwind + Framer Motion. Entry: `frontend/src/main.tsx` → `frontend/index.html` |

You get **one Explorer** with all three trees merged, a single shared terminal
palette, and shared search across everything.

## What's hidden by default

The workspace excludes the landfill out of the box — you won't see any of
this unless you toggle the filter off:

- `node_modules/`, `dist/`, `dist2/`, `dist-final/`, `dist-temp/`, `dist-v2/`, `dist-hosted/`, `build/`, `out/`
- packaged-app debris: `vx/`, `win-unpacked/`, `app.asar`, `app.asar.unpacked`, `resources/elevate.exe`
- embedded Postgres: `postgres/`, `tools/`, `resources/postgres/`
- debug scratch: `.freebuff/`, `probe-app/`, `probe-*.cjs|js`, `smoke-*.cjs`,
  `carrom-preview/`, `queries/`, `test-*.mjs`, `test-loader.js`,
  `pg-start.{out,err}`, `_backend.{log,err}`, `buildfailed.txt`,
  `app_check/`, `config/`, `logs/`, `*.bak`, `*.tmp`

To unhide something for one session: **View ▸ Appearance ▸ Toggle Excluded Files**,
or right-click the file and **Add to `files.exclude`** to permanently
re-include.

## One-click tasks

Hit **Ctrl/Cmd+Shift+P** → "**Tasks: Run Task**" and pick one:

| Group     | Task                                | What it does                                       |
| --------- | ----------------------------------- | -------------------------------------------------- |
| vox-dev   | Dev: backend only                   | Express + Prisma on `:4000` (logs to dedicated panel) |
| vox-dev   | Dev: frontend (Vite)                | Vite dev server with HMR                            |
| vox-dev   | Dev: full stack (concurrently)      | Both of the above, with prefixed logs               |
| vox-dev   | Dev: Electron desktop               | `electron .` — boots the desktop shell              |
| vox-build | Build: frontend bundle              | Production bundle into `frontend/dist/`             |
| vox-build | Build: Windows installer (.exe)     | `electron-builder --win` → `dist/VOX Setup …exe`    |
| vox-check | Lint: frontend (ESLint)             | `eslint . --max-warnings 0`                          |
| vox-check | Typecheck: frontend (tsc --noEmit)  | Catches TS errors without emitting                  |
| vox-check | Typecheck: backend (node --check)   | Syntax check across `backend/src/**/*.js`           |
| vox-check | Test: backend (vitest)              | Runs the vitest suite                               |
| vox-db    | Prisma: generate client             | Regenerate `@prisma/client` after schema edits      |
| vox-db    | Prisma: studio (DB GUI)             | Browser DB explorer at `localhost:5555`             |
| vox-db    | Prisma: migrate dev                 | Author + apply a migration during development       |
| vox-db    | Prisma: push schema (no migration)  | Synchronize DB without writing a migration          |

## Debugging

The **Run and Debug** panel (Ctrl/Cmd+Shift+D) has three launch configs:

- **Electron: VOX desktop** — launches the packaged-style app with remote
  debugging on port 9222. Sourcemaps wired for both `frontend/dist` and
  `backend/**/*.js`.
- **Electron: renderer only (Chrome DevTools)** — attaches a Chrome debugger
  to the already-running Electron's renderer.
- **Backend: Node attach (port 9229)** — attaches Node's inspector to the
  backend. Start the backend with `node --inspect=127.0.0.1:9229 backend/server.js`,
  or via the **Dev: backend only** task + a one-line override, then press F5.

**Compound: "Full stack debug (Electron + backend)"** starts the backend task
first, then launches Electron — both attached to inspectors.

## Recommended extensions

VS Code will offer to install these on first open (you can also force-install
via the Extensions panel → filter `@recommended`):

- **ESLint** + **Prettier** — lint & format on save
- **Tailwind CSS IntelliSense** — class name completions
- **Prisma** — syntax highlighting + formatting for `schema.prisma`
- **ES7 React/Redux/GraphQL Snippets** — `rfce`, `useS`, etc.
- **Auto Rename Tag**, **Path Intellisense** — frontend QoL
- **Error Lens** — inline error squiggles
- **GitLens** — blame/history inline
- **Material Icon Theme** — file icons
- **EditorConfig**, **Code Spell Checker** — hygiene
- Optional: **Playwright** (browser E2E), **SQLite Viewer** (peek at `.db` files)

## Settings worth knowing

- `editor.formatOnSave: true` and `editor.defaultFormatter: esbenp.prettier-vscode` everywhere
- ESLint reads from both `frontend` and `backend`
- `audioCues.volume: 0` so errors don't ding you while you debug
- `git.autofetch: interval` fetches every few minutes

## Tips

- **Search across all three roots** with one click: `Ctrl/Cmd+Shift+F` ignores
  `files.exclude` so dist/node_modules/etc. are skipped automatically.
- **Debug hot-reload**: `frontend/dist/` is the bundle the Electron shell reads
  from `resources/frontend/dist/`. After you run **Build: frontend bundle**, copy
  it over to see the new code live: `cp -r frontend/dist vx/resources/frontend/dist/`
  (or use the VOX Repack script).
- **When the bundled Postgres won't start**: open **Dev: backend only** task's
  terminal output and look for `pg_ctl: no such file or directory`. The bundled
  binary lives under `resources/postgres/`; the source-rebuild path is `tools/`.
