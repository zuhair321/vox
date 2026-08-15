// VOX Desktop — Electron Main Process (local-first, no deployment tooling)
//
// This build is for LOCAL testing/use only. It connects to a PostgreSQL
// database on the local machine (default 127.0.0.1:5433 / vox_dev) and runs
// the bundled backend on 127.0.0.1:4000. No hosted mode, no auto-updater,
// no packaging/deploy logic.

const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, globalShortcut, nativeImage, desktopCapturer, dialog } = require('electron');
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.join(__dirname);
const IS_PACKAGED = app.isPackaged;

// Module-level app config (resolved once at startup, read by createWindow()).
let appConfig = null;

// In packaged mode the backend lives as real files under process.resourcesPath
// (see electron-builder extraResources). Node can resolve node_modules from there
// but cannot from inside app.asar.
function getBackendPath(...segments) {
  const backendDir = IS_PACKAGED
    ? path.join(process.resourcesPath, 'backend')
    : path.join(PROJECT_ROOT, 'backend');
  return path.join(backendDir, ...segments);
}

function getPortableNode() {
  if (!IS_PACKAGED) return null;
  const portableNodeDir = path.join(process.resourcesPath, 'nodejs');
  const portableNode = path.join(portableNodeDir, 'node.exe');
  return fs.existsSync(portableNode) ? portableNode : null;
}

// ── Local PostgreSQL connection (local-first, no deployment tooling) ──
// VOX requires PostgreSQL. For LOCAL testing we use a PostgreSQL instance that
// is already running on this machine (default 127.0.0.1:5433). The connection
// string is resolved in this priority:
//   1. process.env.DATABASE_URL
//   2. VOX_DB_URL env
//   3. a vox-db.txt file (one URL per line) in %APPDATA%/VOX-Desktop
//   4. the default local dev URL below
// No embedded/bundled Postgres is started — keep Postgres running yourself
// (e.g. the "postgresql-x64-18" Windows service).
const DEFAULT_LOCAL_DB = 'postgresql://vox:vox@127.0.0.1:5433/vox_dev';

function resolveBackendDatabaseUrl() {
  const overrideFile = path.join(VOX_USER_DATA, 'vox-db.txt');
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.VOX_DB_URL) return process.env.VOX_DB_URL;
  if (fs.existsSync(overrideFile)) {
    const raw = fs.readFileSync(overrideFile, 'utf8').split('\n')[0].trim();
    if (raw) return raw;
  }
  return DEFAULT_LOCAL_DB;
}

function isPostgresDatabase(url) {
  return /^postgresql:\/\//i.test(url);
}

// ── Runtime server config (local-first) ────────────────────────────
// The frontend reads window.__VOX_CONFIG.apiBase. We compute it here. This
// local-only build always runs the bundled backend on 127.0.0.1:4000.
// Priority: VOX_API_BASE env  >  app-config.json  >  local default.
function loadAppConfig() {
  // Local-first only. Read the apiBase so the renderer knows where the
  // backend is, but always run in local mode (no hosted/deployment logic).
  let apiBase = 'http://127.0.0.1:4000';

  const configPath = IS_PACKAGED
    ? path.join(process.resourcesPath, 'app-config.json')
    : path.join(PROJECT_ROOT, 'frontend', 'public', 'app-config.json');

  try {
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (cfg.apiBase) apiBase = cfg.apiBase;
    }
  } catch (e) {
    console.error('[Config] failed to read app-config.json:', e.message);
  }

  if (process.env.VOX_API_BASE) apiBase = process.env.VOX_API_BASE;

  let mode = 'local';
  let lastSeenReachable = null;
  try {
    if (typeof readUserAppConfig === 'function') {
      const u = readUserAppConfig();
      if (u && u.mode) mode = u.mode;
      if (u && u.lastSeenReachable) lastSeenReachable = u.lastSeenReachable;
      if (mode === 'client' && u && u.apiBase) apiBase = u.apiBase;
    }
  } catch { /* ignore */ }
  try {
    const sp = IS_PACKAGED
      ? require('path').join(process.resourcesPath, 'app-config.json')
      : require('path').join(PROJECT_ROOT, 'frontend', 'public', 'app-config.json');
    if (fs.existsSync(sp)) {
      const sc = JSON.parse(fs.readFileSync(sp, 'utf8'));
      if (mode === 'local' && sc && sc.mode) mode = sc.mode;
    }
  } catch { /* ignore */ }
  if (process.env.VOX_API_BASE) {
    apiBase = process.env.VOX_API_BASE;
    mode = 'client';
  }
  if (mode !== 'local' && mode !== 'client') mode = 'client';
  return { apiBase, mode, hosted: mode === 'client', lastSeenReachable };
}

// ═══════════════════════════════════════════════════════════════════
// Client vs local mode gate; renderer is source of truth for WHICH server we talk to.
// In 'client' mode we skip Postgres + bundled-backend bootstrap so splash-to-chat
// takes ~few hundred ms instead of 2-3s.
function shouldRunLocalBackend(appCfg) {
  return appCfg && appCfg.mode === 'local';
}

//  AppData directories — all writable data lives in %APPDATA%/VOX-Desktop
// ═══════════════════════════════════════════════════════════════════

const VOX_USER_DATA  = path.join(app.getPath('appData'), 'VOX-Desktop');
const VOX_CACHE       = path.join(VOX_USER_DATA, 'Cache');
const VOX_GPU_CACHE   = path.join(VOX_USER_DATA, 'GPUCache');
const VOX_CRASH_DUMPS = path.join(VOX_USER_DATA, 'Crashpad');

app.setPath('userData',  VOX_USER_DATA);
app.setPath('cache',     VOX_CACHE);
app.setPath('crashDumps', VOX_CRASH_DUMPS);

// ─── Vox App Config (per-user w/ IPC bridge to renderer) ────────────────────────────────
// Writable per-user config lives at %APPDATA%/VOX-Desktop/app-config.json. The
// Renderer is the source of truth for WHICH server we talk to — it mutates
// this file via vox:get-config / vox:set-config / vox:reset-config IPC.
const DEFAULT_USER_CONFIG = Object.freeze({
  mode: 'local',
  apiBase: 'http://127.0.0.1:4000',
  lastSeenReachable: null,
  schemaVersion: 1,
});

function readUserAppConfig() {
  try {
    const p = path.join(VOX_USER_DATA, 'app-config.json');
    if (!fs.existsSync(p)) return { ...DEFAULT_USER_CONFIG };
    const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
    return { ...DEFAULT_USER_CONFIG, ...parsed };
  } catch { return { ...DEFAULT_USER_CONFIG }; }
}

function writeUserAppConfig(next) {
  try {
    const p = path.join(VOX_USER_DATA, 'app-config.json');
    const merged = { ...readUserAppConfig(), ...next, schemaVersion: 1 };
    fs.writeFileSync(p, JSON.stringify(merged, null, 2), 'utf8');
    return merged;
  } catch { return readUserAppConfig(); }
}

function safeJsonParse(s) { try { return JSON.parse(s); } catch { return null; } }

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function removeLockFiles(dir) {
  if (!fs.existsSync(dir)) return;
  try {
    for (const entry of fs.readdirSync(dir)) {
      if (entry.endsWith('.lock')) {
        try { fs.unlinkSync(path.join(dir, entry)); } catch { /* may be held */ }
      }
    }
  } catch { /* ignore */ }
}

ensureDir(VOX_USER_DATA);
ensureDir(VOX_CACHE);
ensureDir(VOX_GPU_CACHE);
ensureDir(VOX_CRASH_DUMPS);
removeLockFiles(VOX_CACHE);
removeLockFiles(VOX_GPU_CACHE);

// ═══════════════════════════════════════════════════════════════════
//  Chromium performance switches (MUST be before app.whenReady)
// ═══════════════════════════════════════════════════════════════════

app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-hardware-overlays', 'single-fullscreen,single-on-top,underlay');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-features', 'Quota,ServiceWorker,NetworkService,NetworkServiceInProcess,BlockThirdPartyCookies');
app.commandLine.appendSwitch('no-pings');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-crash-reporter');
app.commandLine.appendSwitch('disk-cache-dir',      VOX_CACHE);
app.commandLine.appendSwitch('gpu-disk-cache-dir',  VOX_GPU_CACHE);
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('log-level', '3');
app.commandLine.appendSwitch('v', '0');
app.commandLine.appendSwitch('disable-logging');

// ── Suppress Chromium internal noise from console ───────────────────
const NOISE_PATTERNS = [
  /cache_util_win\.cc/, /disk_cache\.cc/, /gpu_disk_cache\.cc/,
  /service_worker_storage\.cc/, /quota_database\.cc/,
  /Could not open the quota database/, /Failed to reset the quota database/,
  /Gpu Cache Creation failed/, /Unable to move the cache/,
  /Unable to create cache/, /Failed to delete the database/,
  /Failed to open the database/,
];
function isNoise(line) {
  return NOISE_PATTERNS.some((re) => re.test(line));
}
function patchStream(stream) {
  const orig = stream.write.bind(stream);
  stream.write = (chunk, enc, cb) =>
    !isNoise(typeof chunk === 'string' ? chunk : chunk.toString()) && orig(chunk, enc, cb);
}
patchStream(process.stdout);
patchStream(process.stderr);

// ═══════════════════════════════════════════════════════════════════
//  State
// ═══════════════════════════════════════════════════════════════════

const STATE_FILE = path.join(VOX_USER_DATA, 'vox-window-state.json');

let backendProc = null;
let mainWindow  = null;
let tray        = null;
let isQuitting  = false;

function loadWindowState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { width: 1280, height: 800, x: undefined, y: undefined, maximized: false }; }
}

function saveWindowState() {
  if (!mainWindow) return;
  const b = mainWindow.getBounds();
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      width: b.width, height: b.height,
      x: b.x, y: b.y, maximized: mainWindow.isMaximized(),
    }));
  } catch (err) { console.error('[WindowState] save failed:', err.message); }
}

function resolveIconPath() {
  // Prefer the branded coat icon (build-resources) — used for the window,
  // tray and notifications. Fall back to the web favicon in dev trees.
  const branded = [
    path.join(process.resourcesPath || '', 'build-resources', 'icon-256.png'),
    path.join(__dirname, 'build-resources', 'icon-256.png'),
    path.join(PROJECT_ROOT, 'build-resources', 'icon-256.png'),
  ];
  for (const p of branded) {
    if (p && fs.existsSync(p)) return p;
  }
  const d = path.join(__dirname, 'frontend', 'dist', 'favicon.ico');
  const b = path.join(__dirname, 'frontend', 'build', 'favicon.ico');
  return fs.existsSync(d) ? d : fs.existsSync(b) ? b : null;
}

// ═══════════════════════════════════════════════════════════════════
//  Utilities
// ═══════════════════════════════════════════════════════════════════

function isPortInUse(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const s = net.createServer();
    s.once('error', () => resolve(true));
    s.once('listening', () => { s.close(); resolve(false); });
    s.listen(port, '127.0.0.1');
  });
}

// Kill whatever process is listening on `port` (Windows). Used to clear a
// stale/half-broken VOX backend that is up but can't reach the database, so a
// fresh backend can bind the port instead of hitting EADDRINUSE and exiting.
function killProcessOnPort(port) {
  return new Promise((resolve) => {
    try {
      const out = spawnSync('cmd', ['/c', `netstat -ano -p tcp | findstr LISTENING | findstr :${port}`], {
        windowsHide: true, encoding: 'utf8',
      });
      const pids = new Set();
      (out.stdout || '').split(/\r?\n/).forEach((line) => {
        const m = line.trim().match(/\s(\d+)$/);
        if (m && m[1] !== '0') pids.add(m[1]);
      });
      if (!pids.size) return resolve(false);
      for (const pid of pids) {
        console.log(`[Backend] Killing stale process ${pid} on port ${port}`);
        try { spawnSync('taskkill', ['/F', '/PID', pid], { windowsHide: true }); } catch { /* ignore */ }
      }
      // Give the OS a beat to release the port.
      setTimeout(() => resolve(true), 500);
    } catch (e) {
      console.warn('[Backend] killProcessOnPort failed:', e.message);
      resolve(false);
    }
  });
}

// If a backend already holds port 4000, reuse it only when it is genuinely
// healthy (2xx from /health). If it is up but unhealthy (e.g. 503 — DB
// unreachable, the classic "internal server error on login" cause), kill it so
// we can start a fresh, working backend. Returns true when an existing healthy
// backend can be reused.
async function reuseOrClearBackendPort() {
  if (!(await isPortInUse(4000))) return false;
  const healthy = await waitForServer('http://127.0.0.1:4000/health', 1500);
  if (healthy) {
    console.log('[Backend] Reusing existing healthy instance on port 4000');
    return true;
  }
  console.warn('[Backend] Existing backend on port 4000 is unhealthy — clearing it.');
  await killProcessOnPort(4000);
  return false;
}

// Quick TCP reachability probe for the configured database. Used to skip the
// (slow) service-query + bundled pg_ctl dance when Postgres is already up on
// the port the app actually connects to.
function isTcpOpen(host, port, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    let settled = false;
    const done = (ok) => { if (!settled) { settled = true; socket.destroy(); resolve(ok); } };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

function waitForServer(url, timeout = 15000) {
  return new Promise((resolve) => {
    const http = require('http');
    const start = Date.now();
    function retryOrFail() {
      if (Date.now() - start > timeout) resolve(false);
      else setTimeout(tryIt, 300);
    }
    function tryIt() {
      const req = http.get(url, (res) => {
        // Only treat a genuinely healthy response (2xx) as "ready". A backend
        // that is up but can't reach the database answers /health with 503 —
        // reusing it would surface as "internal server error" on login. Keep
        // polling until it turns healthy (or the timeout elapses).
        const ok = res.statusCode >= 200 && res.statusCode < 300;
        res.resume(); // drain so the socket can be reused/closed
        if (ok) resolve(true);
        else retryOrFail();
      });
      req.on('error', retryOrFail);
      req.end();
    }
    tryIt();
  });
}

// Wait for the backend's own readiness signal on stdout ("VOX backend
// listening") instead of blindly sleeping or hammering /health (which runs a
// DB query every 300ms). Resolves as soon as the process is actually serving,
// or after `timeout` so startup never deadlocks.
function waitForBackendReady(proc, timeout = 35000) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (up) => { if (!done) { done = true; resolve(up); } };
    const timer = setTimeout(() => finish(false), timeout);
    timer.unref?.();
    if (!proc) return finish(false);
    const onData = (d) => {
      if (/VOX backend listening/.test(d.toString())) {
        clearTimeout(timer);
        finish(true);
      }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('exit', () => finish(false));
  });
}

function shouldSuppressStderr(line) {
  return NOISE_PATTERNS.some((re) => re.test(line));
}

// ═══════════════════════════════════════════════════════════════════
//  Screen capture helpers
// ═══════════════════════════════════════════════════════════════════

let pendingScreenCallback = null;
let pendingScreenTimeout  = null;

function rejectPendingScreenRequest() {
  if (!pendingScreenCallback) return;
  const cb = pendingScreenCallback;
  pendingScreenCallback = null;
  if (pendingScreenTimeout) { clearTimeout(pendingScreenTimeout); pendingScreenTimeout = null; }
  try { cb({}); } catch {}
}

function setupScreenCapture(win) {
  win.webContents.session.setDisplayMediaRequestHandler((_request, callback) => {
    rejectPendingScreenRequest();
    pendingScreenCallback = callback;
    pendingScreenTimeout = setTimeout(rejectPendingScreenRequest, 60000);
    win.webContents.send('screen-capture:request');
  });
  win.webContents.session.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(['media', 'mediaKeySystem', 'notifications', 'fullscreen', 'display-capture'].includes(permission));
  });
}

// ═══════════════════════════════════════════════════════════════════
//  Database bootstrap (first run — applies Prisma migrations)
// ═══════════════════════════════════════════════════════════════════

async function ensureDatabaseExists(dbUrl) {
  try {
    const pgCandidates = (() => {
      const bundled = (() => {
        const candidates = [
          path.join(process.resourcesPath || '', 'postgres', 'pgsql', 'bin'),
          path.join(__dirname, 'vx', 'resources', 'postgres', 'pgsql', 'bin'),
          path.join(PROJECT_ROOT, 'vx', 'resources', 'postgres', 'pgsql', 'bin'),
          path.join(PROJECT_ROOT, 'resources', 'postgres', 'pgsql', 'bin'),
        ];
        for (const c of candidates) {
          if (fs.existsSync(path.join(c, 'createdb.exe'))) return c;
        }
        return null;
      })();
      if (bundled) return [bundled];
      const versions = ['18', '17', '16', '15', '14'];
      const sysBins = versions.map(v => `C:\\Program Files\\PostgreSQL\\${v}\\bin`);
      sysBins.push(path.join(PROJECT_ROOT, 'tools', 'postgres', 'pgsql', 'bin'));
      return sysBins;
    })();
    let pgBin = null;
    for (const candidate of pgCandidates) {
      if (fs.existsSync(path.join(candidate, 'createdb.exe'))) {
        pgBin = candidate;
        break;
      }
    }
    if (!pgBin) return;
    const createdb = path.join(pgBin, 'createdb.exe');
    if (!fs.existsSync(createdb)) return;
    const parsedUrl = new URL(dbUrl);
    const host = parsedUrl.hostname || '127.0.0.1';
    const port = parsedUrl.port || '5433';
    const user = parsedUrl.username || 'vox';
    const dbName = parsedUrl.pathname.replace(/^\//, '') || 'vox_dev';
    await new Promise((resolve) => {
      const child = spawn(createdb, ['-h', host, '-p', port, '-U', user, dbName], {
        windowsHide: true,
        env: { ...process.env, PGPASSWORD: parsedUrl.password || '' },
      });
      child.on('close', () => resolve());
      child.on('error', () => resolve());
    });
  } catch (e) {
    console.warn('[Bootstrap] Could not ensure database exists:', e.message);
  }
}

async function ensurePostgresRunning() {
  const serviceNames = [
    'postgresql-x64-18',
    'postgresql-x64-17',
    'postgresql-x64-16',
    'postgresql-x64-15',
    'postgresql-x64-14',
    'postgresql',
    'postgresql-18',
    'postgresql-17',
    'postgresql-16',
  ];
  try {
    for (const svc of serviceNames) {
      const sc = spawn('sc', ['query', svc], { windowsHide: true });
      let output = '';
      sc.stdout.on('data', (d) => { output += d.toString(); });
      await new Promise((resolve) => sc.on('close', resolve));
      if (output.includes('RUNNING')) {
        console.log(`[Bootstrap] PostgreSQL service "${svc}" is already running.`);
        return true;
      }
    }
    console.log('[Bootstrap] PostgreSQL service not running — attempting to start it...');
    for (const svc of serviceNames) {
      const start = spawn('sc', ['start', svc], { windowsHide: true });
      await new Promise((resolve) => start.on('close', resolve));
      await new Promise((r) => setTimeout(r, 2000));
      const check = spawn('sc', ['query', svc], { windowsHide: true });
      let output = '';
      check.stdout.on('data', (d) => { output += d.toString(); });
      await new Promise((resolve) => check.on('close', resolve));
      if (output.includes('RUNNING')) {
        console.log(`[Bootstrap] Started PostgreSQL service "${svc}".`);
        return true;
      }
    }
    return false;
  } catch (e) {
    console.warn('[Bootstrap] Could not ensure PostgreSQL is running:', e.message);
    return false;
  }
}

async function startBundledPostgres() {
  const pgBin = (() => {
    const candidates = [
      path.join(process.resourcesPath || '', 'postgres', 'pgsql', 'bin'),
      path.join(__dirname, 'vx', 'resources', 'postgres', 'pgsql', 'bin'),
      path.join(PROJECT_ROOT, 'vx', 'resources', 'postgres', 'pgsql', 'bin'),
      path.join(PROJECT_ROOT, 'resources', 'postgres', 'pgsql', 'bin'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(path.join(c, 'pg_ctl.exe'))) return c;
    }
    return null;
  })();
  if (!pgBin) {
    console.log('[Bootstrap] Bundled PostgreSQL binaries not found.');
    return null;
  }
  const pgCtl = path.join(pgBin, 'pg_ctl.exe');
  const initDb = path.join(pgBin, 'initdb.exe');

  const dataDir = path.join(VOX_USER_DATA, 'pgdata');
  const logFile = path.join(VOX_USER_DATA, 'pgdata.log');
  const port = '5433';

  if (!fs.existsSync(path.join(dataDir, 'PG_VERSION'))) {
    console.log('[Bootstrap] Initialising bundled PostgreSQL data directory...');
    try {
      await new Promise((resolve, reject) => {
        const child = spawn(initDb, ['-D', dataDir, '-U', 'postgres', '--auth=trust', '-A', 'trust'], {
          windowsHide: true,
          stdio: 'pipe'
        });
        let stderr = '';
        child.stderr.on('data', (d) => { stderr += d.toString(); });
        child.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`initdb failed (code ${code}): ${stderr}`));
        });
        child.on('error', (err) => reject(err));
      });
    } catch (e) {
      console.warn('[Bootstrap] initdb failed:', e.message);
      return null;
    }
  }

  console.log('[Bootstrap] Starting bundled PostgreSQL...');
  try {
    await new Promise((resolve, reject) => {
      // IMPORTANT: use stdio:'ignore' (not 'pipe') — pg_ctl spawns postgres as a
      // child that inherits the pipe handles. With 'pipe', Node's 'close' event
      // only fires once EVERY handle is closed, i.e. when postgres itself exits,
      // so this promise would never resolve while the DB runs and boot would
      // hang forever on the splash screen. Logs go to -l logFile anyway.
      const child = spawn(pgCtl, ['-D', dataDir, '-l', logFile, '-o', `-p ${port} -h 127.0.0.1`, 'start'], {
        windowsHide: true,
        stdio: 'ignore'
      });
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`pg_ctl start failed (code ${code}) — see ${logFile}`));
      });
      child.on('error', (err) => reject(err));
    });
  } catch (e) {
    console.warn('[Bootstrap] pg_ctl start failed:', e.message);
    return null;
  }

  const start = Date.now();
  const timeout = 15000;
  while (Date.now() - start < timeout) {
    try {
      const net = require('net');
      await new Promise((resolve, reject) => {
        const socket = net.createConnection(port, '127.0.0.1');
        socket.once('connect', () => { socket.end(); resolve(); });
        socket.once('error', () => reject());
        setTimeout(() => { socket.destroy(); reject(); }, 1000);
      });
      console.log(`[Bootstrap] Bundled PostgreSQL ready on port ${port}`);
      return `postgresql://postgres@127.0.0.1:${port}/vox_dev`;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.warn('[Bootstrap] Bundled PostgreSQL did not become ready in time.');
  return null;
}

function stopBundledPostgres() {
  const pgBin = (() => {
    const candidates = [
      path.join(process.resourcesPath || '', 'postgres', 'pgsql', 'bin'),
      path.join(__dirname, 'vx', 'resources', 'postgres', 'pgsql', 'bin'),
      path.join(PROJECT_ROOT, 'vx', 'resources', 'postgres', 'pgsql', 'bin'),
      path.join(PROJECT_ROOT, 'resources', 'postgres', 'pgsql', 'bin'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(path.join(c, 'pg_ctl.exe'))) return c;
    }
    return null;
  })();
  if (!pgBin) return;
  const pgCtl = path.join(pgBin, 'pg_ctl.exe');
  const dataDir = path.join(VOX_USER_DATA, 'pgdata');
  if (!fs.existsSync(path.join(dataDir, 'PG_VERSION'))) return;
  try {
    spawnSync(pgCtl, ['-D', dataDir, 'stop'], { windowsHide: true, timeout: 10000 });
  } catch {}
}

async function runDbBootstrap() {
  let dbUrl = resolveBackendDatabaseUrl();
  if (!isPostgresDatabase(dbUrl)) {
    console.error('[Bootstrap] Only PostgreSQL is supported. Configured URL: ' + dbUrl);
    return;
  }
  const migrationsDir = getBackendPath('prisma', 'migrations');
  const bootstrappedMarker = path.join(VOX_USER_DATA, '.db-bootstrapped');
  const alreadyBootstrapped = fs.existsSync(bootstrappedMarker);

  let bundled = false;
  // Fast path: if the configured DB (vox-db.txt / backend .env / default) is
  // ALREADY answering on its port, skip all service/bundled orchestration.
  // This is the common case — a prior launch left the bundled Postgres
  // running, or the user points at their own instance — and it boots in
  // milliseconds instead of seconds.
  const url = new URL(dbUrl);
  const dbHost = url.hostname || '127.0.0.1';
  const dbPort = parseInt(url.port || '5433', 10);
  if (await isTcpOpen(dbHost, dbPort, 1200)) {
    console.log(`[Bootstrap] PostgreSQL already reachable at ${dbHost}:${dbPort} — using it.`);
  } else {
    // A running Windows PG service (usually on 5432) does NOT mean the
    // configured DB port (e.g. the bundled 5433 instance) is up — trusting it
    // blindly made boot stall ~60s on a dead port. Start/verify the service,
    // then re-probe the port the app actually connects to before falling back
    // to the bundled Postgres.
    if (await ensurePostgresRunning()) {
      console.log('[Bootstrap] PostgreSQL service started/confirmed — verifying configured port...');
      if (await isTcpOpen(dbHost, dbPort, 2000)) {
        console.log(`[Bootstrap] PostgreSQL now reachable at ${dbHost}:${dbPort} — using it.`);
      }
    }
    if (!(await isTcpOpen(dbHost, dbPort, 800))) {
      const bundledUrl = await startBundledPostgres();
      if (bundledUrl) {
        // Keep the CONFIGURED credentials (vox:vox from vox-db.txt / backend
        // .env) and only take host/port from the bundled instance. The bundled
        // data dir may have been initialised with a different superuser name
        // than 'postgres', so blindly adopting the bundled URL's user used to
        // yield "role does not exist" and a backend that exits 1.
        try {
          const conf = new URL(dbUrl);
          const bnd = new URL(bundledUrl);
          conf.hostname = bnd.hostname;
          conf.port = bnd.port;
          dbUrl = conf.toString();
        } catch {
          dbUrl = bundledUrl;
        }
        bundled = true;
        process.env.DATABASE_URL = dbUrl;
        console.log('[Bootstrap] Using bundled PostgreSQL: ' + dbUrl);
      }
    }
  }
  await ensureDatabaseExists(dbUrl);

  if (!fs.existsSync(migrationsDir)) {
    console.log('[Bootstrap] No prisma/migrations bundled — skipping schema apply.');
    return;
  }

  const portableNode = getPortableNode();
  const nodeBin = portableNode || 'node';
  const nodeDir = portableNode ? path.join(process.resourcesPath, 'nodejs') : null;
  const prismaBin = portableNode
    ? path.join(getBackendPath('node_modules', '.bin', 'prisma'))
    : path.join(getBackendPath('node_modules', '.bin', 'prisma'));

  if (alreadyBootstrapped) {
    console.log('[Bootstrap] Database already initialised — skipping migrations.');
    if (!fs.existsSync(prismaBin)) {
      try {
        const { getPrisma } = await import('file:///' + getBackendPath('src', 'lib', 'prisma.js').replace(/\\/g, '/'));
        const client = await getPrisma();
        if (client) {
          await client.$queryRaw`SELECT 1`;
          console.log('[Bootstrap] Database reachable and already bootstrapped.');
          return;
        }
      } catch {}
      console.warn('[Bootstrap] Database not reachable but migrations already applied.');
    }
    return;
  }

  if (!fs.existsSync(prismaBin)) {
    console.log('[Bootstrap] prisma CLI not found at', prismaBin, '— checking if DB is already initialised...');
    try {
      const { getPrisma } = await import('file:///' + getBackendPath('src', 'lib', 'prisma.js').replace(/\\/g, '/'));
      const client = await getPrisma();
      if (client) {
        await client.$queryRaw`SELECT 1`;
        console.log('[Bootstrap] Database is already reachable — marking as bootstrapped.');
        try { fs.writeFileSync(bootstrappedMarker, new Date().toISOString()); } catch {}
        return;
      }
    } catch {
      // DB not ready yet — fall through and try migrate deploy below
    }
    console.log('[Bootstrap] prisma CLI not found — skipping schema apply.');
    return;
  }
  console.log('[Bootstrap] Applying database migrations (first run)...');
  await new Promise((resolve) => {
    const child = spawn(
      portableNode ? prismaBin : nodeBin,
      portableNode ? ['migrate', 'deploy'] : [prismaBin, 'migrate', 'deploy'],
      {
        cwd: getBackendPath(),
        windowsHide: true,
        env: {
          ...process.env,
          DATABASE_URL: dbUrl,
          NODE_PATH: portableNode
            ? path.join(process.resourcesPath, 'backend', 'node_modules')
            : path.join(process.resourcesPath, 'backend', 'node_modules'),
          PATH: nodeDir ? nodeDir + ';' + (process.env.PATH || '') : process.env.PATH || '',
          NODE_ENV: 'production',
        },
      },
    );
    child.stdout.on('data', (d) => { const t = d.toString().trim(); if (t) console.log('[Bootstrap]', t); });
    child.stderr.on('data', (d) => { const t = d.toString().trim(); if (t && !shouldSuppressStderr(t)) console.error('[Bootstrap]', t); });
    child.on('exit', (code) => {
      if (code !== 0) { console.warn('[Bootstrap] migrate deploy exited code', code); }
      else {
        try { fs.writeFileSync(bootstrappedMarker, new Date().toISOString()); } catch {}
        console.log('[Bootstrap] Database initialised.');
      }
      resolve();
    });
    child.on('error', (err) => { console.error('[Bootstrap] spawn error:', err.message); resolve(); });
  });
}

// ═══════════════════════════════════════════════════════════════════
//  Boot terminal — VOX Secure Boot
//  (data URI — no external file needed)
// ═══════════════════════════════════════════════════════════════════

const SPLASH_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  *{box-sizing:border-box}
  html,body{margin:0;height:100%;overflow:hidden;user-select:none;
    background:radial-gradient(ellipse 120% 80% at 50% -10%, #101319 0%, #05060a 55%, #030407 100%);
    font-family:'Cascadia Code','Consolas','SF Mono',Menlo,monospace;color:#c8d3d0}
  .term{position:relative;height:100%;padding:26px 24px 20px;display:flex;flex-direction:column;
    background:linear-gradient(180deg, rgba(255,255,255,0.025), transparent 30%);
    border:1px solid rgba(140,170,164,0.14);border-radius:14px;
    box-shadow:0 0 60px rgba(0,0,0,.6), inset 0 0 80px rgba(0,0,0,.45)}
  .term::before{content:"";position:absolute;inset:0;border-radius:14px;pointer-events:none;
    background:repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,.18) 2px 4px);
    opacity:.5}
  .head{display:flex;justify-content:space-between;align-items:center;padding-bottom:12px;
    border-bottom:1px solid rgba(140,170,164,0.14);font-size:10px;letter-spacing:.24em;
    text-transform:uppercase;color:#7fa69e}
  .head b{color:#d7a94a;font-weight:600}
  .dot{display:inline-flex;gap:5px;margin-right:10px}
  .dot i{width:8px;height:8px;border-radius:50%;background:#3a4650}
  .dot i:nth-child(1){background:#c0523e}
  .dot i:nth-child(2){background:#c9a23e}
  .dot i:nth-child(3){background:#58a06b}
  .body{flex:1;overflow:hidden;padding-top:16px;font-size:12.5px;line-height:1.75}
  .ln{white-space:pre-wrap;opacity:0;transform:translateY(3px);animation:lin .22s ease forwards}
  @keyframes lin{to{opacity:1;transform:none}}
  .ln .p{color:#d7a94a}
  .ln .ok{color:#58a06b}
  .cursor{display:inline-block;width:7px;height:13px;margin-left:2px;vertical-align:-2px;
    background:#d7a94a;animation:blink 1.1s steps(1) infinite}
  @keyframes blink{50%{opacity:0}}
  .prog{margin-top:16px}
  .prog .track{height:3px;border-radius:2px;background:rgba(140,170,164,0.14);overflow:hidden}
  .prog .fill{height:100%;width:0%;border-radius:2px;
    background:linear-gradient(90deg,#8a6a2a,#d7a94a,#f2d489);
    box-shadow:0 0 8px rgba(215,169,74,.5);transition:width .5s ease}
  .prog .meta{display:flex;justify-content:space-between;margin-top:8px;font-size:10px;
    letter-spacing:.2em;text-transform:uppercase;color:#5d6f6b}
  .prog .meta .st{color:#a8c3bb}
  .prog .meta .pc{color:#d7a94a}
  @media (prefers-reduced-motion: reduce){
    .ln{opacity:1;transform:none;animation:none}
    .cursor{animation:none}
  }
</style></head><body>
<div class="term">
  <div class="head">
    <span><span class="dot"><i></i><i></i><i></i></span>VOX SECURE BOOT</span>
    <span>v1.0 <b>ENCRYPTED</b></span>
  </div>
  <div class="body" id="log"></div>
  <div class="prog">
    <div class="track"><div class="fill" id="fill"></div></div>
    <div class="meta"><span class="st" id="st">Booting kernel…</span><span class="pc" id="pc">0%</span></div>
  </div>
</div>
<script>
  const log = document.getElementById('log');
  const fill = document.getElementById('fill');
  const st = document.getElementById('st');
  const pc = document.getElementById('pc');
  const PER = { 'Booting kernel…': 12, 'Connecting vault…': 42, 'Waking backend…': 74, 'Opening interface…': 92 };
  const STEPS = {
    'Booting kernel…': [
      '> initialising secure kernel', '  [ ok ] memory regions locked', '  [ ok ] integrity verified'
    ],
    'Connecting vault…': [
      '> connecting data vault', '  [ ok ] vault unlocked · 127.0.0.1:5433', '  [ ok ] schema ready'
    ],
    'Waking backend…': [
      '> waking backend services', '  [ ok ] api listening · :4000', '  [ ok ] socket mesh active'
    ],
    'Opening interface…': [
      '> opening interface', '  [ ok ] handshake complete', '  [ ok ] welcome back'
    ]
  };
  function typeLine(text, cls, delay) {
    setTimeout(() => {
      const div = document.createElement('div');
      div.className = 'ln';
      div.innerHTML = text.replace(/^(>|&gt;|\s*\[.*?\])/, function (m) { return '<span class="' + cls + '">' + m + '</span>'; });
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
      addCursor();
    }, delay);
  }
  function addCursor() {
    const prev = log.querySelector('.cursor');
    if (prev) prev.remove();
    const c = document.createElement('span');
    c.className = 'cursor';
    log.lastChild && log.lastChild.appendChild(c);
  }
  window.__boot = function (text) {
    const pct = PER[text] || 0;
    fill.style.width = pct + '%';
    pc.textContent = pct + '%';
    st.textContent = text;
    const steps = STEPS[text] || [];
    let delay = 60;
    steps.forEach((s, i) => {
      const cls = s.startsWith('>') ? 'p' : s.includes('[ ok ]') ? 'ok' : 'dim';
      typeLine(s.replace(/</g, '&lt;'), cls, delay);
      delay += 240;
    });
    if (text === 'Opening interface…') {
      setTimeout(() => { fill.style.width = '100%'; pc.textContent = '100%'; }, delay + 200);
    }
  };
  // The main process drives every phase via window.__boot — no auto-run here,
  // otherwise the pending 'Booting kernel…' flush on did-finish-load would
  // render the first phase twice.
</script>
</body></html>`;

let splash = null;
let splashReady = false;
let splashPendingStatus = null;
function createSplash() {
  if (splash) return;
  splash = new BrowserWindow({
    width: 400, height: 300, frame: false, resizable: false,
    center: true, alwaysOnTop: true, skipTaskbar: true,
    backgroundColor: '#05060a',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  splash.webContents.once('did-finish-load', () => {
    splashReady = true;
    if (splashPendingStatus) {
      const t = splashPendingStatus;
      splashPendingStatus = null;
      setSplashStatus(t);
    }
  });
  splash.loadURL('data:text/html,' + encodeURIComponent(SPLASH_HTML));
}
function closeSplash() {
  if (!splash) return;
  try { splash.close(); } catch {}
  splash = null;
  splashReady = false;
  splashPendingStatus = null;
}
function setSplashStatus(text) {
  if (!splash || splash.isDestroyed()) return;
  if (!splashReady) { splashPendingStatus = text; return; }
  try {
    splash.webContents.executeJavaScript(
      `window.__boot(${JSON.stringify(text)})`
    ).catch(() => {});
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════
//  Backend (Node.js — requires a PostgreSQL database)
// ═══════════════════════════════════════════════════════════════════

async function startBackend() {
  const portableNode = getPortableNode();
  if (!portableNode) {
    const dbUrl = resolveBackendDatabaseUrl();
    if (!process.env.DATABASE_URL) process.env.DATABASE_URL = dbUrl;
    if (await reuseOrClearBackendPort()) return true;
    console.log('[Backend] Starting with system Node.js...');
    const devFrontendDist = path.join(PROJECT_ROOT, 'frontend', 'dist');
    backendProc = spawn('node', [getBackendPath('server.js')], {
      cwd: PROJECT_ROOT, windowsHide: true,
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
        // Pin the API port explicitly: a stray PORT in the inherited env
        // (e.g. an orchestrator/CI wrapper exporting its own port) would
        // otherwise make the backend bind the wrong port and the window —
        // which always loads http://127.0.0.1:4000 — never connects.
        PORT: '4000',
        NODE_ENV: 'production',
        SERVE_FRONTEND: '1',
        FRONTEND_DIST: devFrontendDist,
        VOX_REQUIRE_DB: isPostgresDatabase(dbUrl) ? '1' : undefined,
      },
    });
    let backendStderr = '';
    const stderrHandler = (d) => {
      const t = d.toString().trim();
      if (t && !shouldSuppressStderr(t)) {
        console.error('[Backend]', t);
        backendStderr += t + '\n';
      }
    };
    backendProc.stdout.on('data', (d) => { const t = d.toString().trim(); if (t) console.log('[Backend]', t); });
    backendProc.stderr.on('data', stderrHandler);
    backendProc.on('error', (e) => console.error('[Backend]', e.message));
    backendProc.on('exit', (c) => console.log('[Backend] exited:', c));
    const ready = await waitForBackendReady(backendProc);
    if (!ready) {
      return { ready: false, stderr: backendStderr.slice(-500) };
    }
    return { ready: true };
  }

  console.log('[Backend] Using bundled Node.js:', portableNode);
  const nodeDir = path.join(process.resourcesPath, 'nodejs');
  const dbUrl = resolveBackendDatabaseUrl();
  if (!process.env.DATABASE_URL) process.env.DATABASE_URL = dbUrl;
  const env2 = {
    ...process.env,
    DATABASE_URL: dbUrl,
    // See the system-node spawn above — always bind the canonical API port.
    PORT: '4000',
    NODE_PATH: path.join(nodeDir, 'node_modules') + ';' + path.join(process.resourcesPath, 'backend', 'node_modules'),
    PATH: nodeDir + ';' + (process.env.PATH || ''),
    NODE_ENV: 'production',
    SERVE_FRONTEND: '1',
    FRONTEND_DIST: fs.existsSync(path.join(process.resourcesPath, 'frontend', 'dist'))
      ? path.join(process.resourcesPath, 'frontend', 'dist')
      : path.join(__dirname, 'frontend', 'dist'),
  };
  if (isPostgresDatabase(dbUrl)) {
    env2.VOX_REQUIRE_DB = '1';
  }
  if (await reuseOrClearBackendPort()) return { ready: true };
  backendProc = spawn(portableNode, [getBackendPath('server.js')], {
    cwd: getBackendPath(),
    windowsHide: true,
    env: env2,
  });
  let backendStderr = '';
  const stderrHandler = (d) => {
    const t = d.toString().trim();
    if (t && !shouldSuppressStderr(t)) {
      console.error('[Backend]', t);
      backendStderr += t + '\n';
    }
  };
  backendProc.stdout.on('data', (d) => { const t = d.toString().trim(); if (t) console.log('[Backend]', t); });
  backendProc.stderr.on('data', stderrHandler);
  backendProc.on('error', (e) => console.error('[Backend]', e.message));
  backendProc.on('exit', (c) => console.log('[Backend] exited:', c));
  const ready = await waitForBackendReady(backendProc);
  if (!ready) {
    return { ready: false, stderr: backendStderr.slice(-500) };
  }
  return { ready: true };
}

// ═══════════════════════════════════════════════════════════════════
//  Main window
// ═══════════════════════════════════════════════════════════════════

function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width, height: state.height,
    minWidth: 940, minHeight: 560,
    x: state.x, y: state.y,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js'),
      devTools: false,
      // The packaged app loads the SPA from inside app.asar (file://), so
      // the renderer origin is file:// while the backend is http://127.0.0.1:4000.
      // Disable web security so SameSite cookies attach on these cross-site
      // fetches. Without this, auth cookies are silently dropped and login 401s.
      webSecurity: false,
      disableBlinkFeatures: 'Auxclick',
    },
    frame: false, titleBarStyle: 'hidden', title: 'VOX',
    icon: resolveIconPath(),
    show: false,
    backgroundColor: '#1e1f22',
  });

  if (state.maximized) mainWindow.maximize();

  const rendererLogPath = path.join(VOX_USER_DATA, 'renderer.log');
  let rendererLog = null;
  try {
    rendererLog = fs.createWriteStream(rendererLogPath, { flags: 'w', encoding: 'utf8' });
    rendererLog.write('[LOG] Renderer started\n');
  } catch (e) { console.error('[RendererLog]', e.message); }

  function writeRenderer(msg) {
    if (!rendererLog) return;
    try { rendererLog.write(msg + '\n'); } catch {}
  }

  const mainLogPath = path.join(VOX_USER_DATA, 'main.log');
  let mainLog = null;
  try { mainLog = fs.createWriteStream(mainLogPath, { flags: 'a', encoding: 'utf8' }); } catch {}
  function writeMain(msg) {
    const line = `[${new Date().toISOString()}] ${msg}`;
    if (mainLog) { try { mainLog.write(line + '\n'); } catch {} }
    console.log(line);
  }

  writeMain('VOX starting. isPackaged=' + IS_PACKAGED);

  if (IS_PACKAGED) {
    // Load via http://127.0.0.1:4000/ (same origin as the backend). Cookies
    // the backend sets (HttpOnly, SameSite=Lax) MUST go back to a same-origin
    // page; a file:// page is treated as a different origin and the cookies
    // are silently dropped, which made every authenticated fetch 401 and
    // bounced the user back to /login mid-action. Loading the SPA from the
    // backend over HTTP keeps cookies in scope. The backend serves the SPA
    // from /api/spa when SERVE_FRONTEND=1 (set by the packaged boot path).
    //
    // As a fallback for installations where the bundled backend failed to
    // bind 4000, fall back to resources/frontend/dist/index.html (file://) so
    // the window still shows something while we surface the error.
    const appUrl = appConfig.apiBase + '/';
    writeMain('Loading (HTTP origin): ' + appUrl);
    mainWindow.loadURL(appUrl)
      .then(() => writeMain('loadURL succeeded'))
      .catch((e) => {
        writeMain('loadURL FAILED, falling back to file://: ' + e.message);
        const unpackedDist = path.join(process.resourcesPath, 'frontend', 'dist', 'index.html');
        const packedAsarDist = path.join(__dirname, 'frontend', 'dist', 'index.html');
        const fallback = fs.existsSync(unpackedDist) ? unpackedDist
          : fs.existsSync(packedAsarDist) ? packedAsarDist : null;
        if (fallback) {
          mainWindow.loadFile(fallback)
            .then(() => writeMain('loadFile fallback succeeded'))
            .catch((err) => writeMain('loadFile fallback FAILED: ' + err.message));
        }
      });
  } else {
    const appUrl = appConfig.apiBase + '/';
    writeMain('Loading: ' + appUrl);
    // Dev mode: the backend is still booting when the window opens. If the
    // first load refuses the connection, retry with backoff until it answers
    // instead of leaving the user stuck on an ERR_CONNECTION_REFUSED page.
    let loadAttempts = 0;
    const loadAppUrl = () => {
      if (isQuitting || !mainWindow) return;
      mainWindow.loadURL(appUrl).catch(() => {});
    };
    mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
      // -102 = ERR_CONNECTION_REFUSED. Keep retrying while the backend comes
      // up (rare now that the window is created after readiness), then give up
      // and let the user retry.
      if (code === -102 && !isQuitting && loadAttempts < 60) {
        loadAttempts += 1;
        writeMain(`Retrying load (${loadAttempts}): ${desc}`);
        setTimeout(loadAppUrl, 500);
      }
    });
    loadAppUrl();
  }

  mainWindow.webContents.on('console-message', (_e, level, msg, line, src) => {
    writeRenderer(`[L${level}] ${src}:${line} → ${msg}`);
  });
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    writeRenderer('[RENDERER GONE] ' + JSON.stringify(details));
  });
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    writeRenderer(`[FAIL] code=${code} desc=${desc} url=${url}`);
  });
  mainWindow.webContents.on('did-finish-load', () => writeRenderer('[DID-FINISH]'));
  mainWindow.webContents.on('crashed', () => writeRenderer('[CRASH]'));
  mainWindow.webContents.on('unresponsive', () => writeRenderer('[UNRESP]'));

  setupScreenCapture(mainWindow);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    closeSplash();
  });

  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move',   saveWindowState);
  mainWindow.on('maximize', () => { saveWindowState(); mainWindow.webContents.send('maximize-change', true); });
  mainWindow.on('unmaximize', () => { saveWindowState(); mainWindow.webContents.send('maximize-change', false); });
  mainWindow.on('close', (e) => {
    if (!isQuitting) { e.preventDefault(); mainWindow.hide(); return; }
    saveWindowState();
  });
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.on('focus', () => { if (mainWindow) { mainWindow.webContents.send('focus-change', true); mainWindow.flashFrame(false); } });
  mainWindow.on('blur',  () => { if (mainWindow) mainWindow.webContents.send('focus-change', false); });
}

// ═══════════════════════════════════════════════════════════════════
//  System tray
// ═══════════════════════════════════════════════════════════════════

function createTray() {
  let trayIcon;
  try {
    // Use a small dedicated tray size for a crisp system-tray glyph.
    let iconPath = null;
    for (const p of [
      path.join(process.resourcesPath || '', 'build-resources', 'icon-32.png'),
      path.join(__dirname, 'build-resources', 'icon-32.png'),
      path.join(PROJECT_ROOT, 'build-resources', 'icon-32.png'),
    ]) {
      if (p && fs.existsSync(p)) { iconPath = p; break; }
    }
    if (!iconPath) iconPath = resolveIconPath();
    trayIcon = iconPath ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
    if (trayIcon.isEmpty()) throw new Error('empty');
  } catch {
    // 1×1 transparent PNG fallback
    trayIcon = nativeImage.createFromBuffer(
      Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
    ).resize({ width: 16, height: 16 });
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('VOX Desktop');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show VOX', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
    { type: 'separator' },
    { label: 'Quit',     click: () => { isQuitting = true; app.quit(); } },
  ]));
  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) mainWindow.hide();
    else { mainWindow.show(); mainWindow.focus(); }
  });
}

// ═══════════════════════════════════════════════════════════════════
//  IPC handlers
// ═══════════════════════════════════════════════════════════════════

ipcMain.on('notify', (_e, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body, icon: resolveIconPath() }).show();
  }
});

ipcMain.on('flash-frame', () => {
  if (mainWindow && !mainWindow.isFocused()) mainWindow.flashFrame(true);
});

ipcMain.on('open-external', (_e, url) => {
  require('electron').shell.openExternal(url).catch(() => {});
});

ipcMain.on('minimize', () => { if (mainWindow) mainWindow.minimize(); });

ipcMain.on('maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize();
});

ipcMain.handle('is-maximized', () => mainWindow ? mainWindow.isMaximized() : false);

ipcMain.on('close', () => { if (mainWindow) mainWindow.close(); });

ipcMain.handle('screen-capture:get-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 320, height: 180 },
  });
  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    thumbnail: s.thumbnail.toDataURL(),
  }));
});

ipcMain.handle('screen-capture:select', async (_e, sourceId) => {
  if (!pendingScreenCallback) { console.warn('[SC] No pending request'); return false; }
  const cb = pendingScreenCallback;
  pendingScreenCallback = null;
  if (pendingScreenTimeout) { clearTimeout(pendingScreenTimeout); pendingScreenTimeout = null; }
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
    const src = sources.find((s) => s.id === sourceId);
    if (src) { cb({ video: src }); return true; }
  } catch (err) { console.error('[SC]', err.message); }
  cb({});
  return false;
});

ipcMain.handle('screen-capture:cancel', () => { rejectPendingScreenRequest(); });

// Open the OS-level privacy/settings page for a particular device kind so
// users can flip a blocked permission toggle without leaving VOX. Supported
// kinds: 'microphone' | 'camera'. Returns the URL that was opened (or null
// if the OS doesn't support a deep link).
ipcMain.handle('open-device-settings', async (_event, kind) => {
  let url = null;
  if (process.platform === 'win32') {
    if (kind === 'microphone') url = 'ms-settings:privacy-microphone';
    else if (kind === 'camera') url = 'ms-settings:privacy-webcam';
  } else if (process.platform === 'darwin') {
    if (kind === 'microphone') url = 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone';
    else if (kind === 'camera') url = 'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera';
  } else {
    // Linux: best-effort gnome-control-center; if it's missing this opens nothing.
    if (kind === 'microphone') url = 'gnome-control-center:sound';
    else if (kind === 'camera') url = 'gnome-control-center:camera';
  }
  if (!url) return null;
  try {
    await shell.openExternal(url);
    return url;
  } catch (err) {
    console.warn('[DeviceSettings] openExternal failed:', err && err.message);
    return null;
  }
});

ipcMain.handle('screen-capture:start-direct', async (_e, sourceId) => {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
    const src = sources.find((s) => s.id === sourceId);
    if (!src) return { error: 'Source not found' };
    return { sourceId: src.id, name: src.name };
  } catch (err) { return { error: err.message }; }
});

// ═══════════════════════════════════════════════════════════════════
//  Startup
// ═══════════════════════════════════════════════════════════════════

async function start() {
  console.log('Starting VOX Desktop...');
  createSplash();
  setSplashStatus('Booting kernel…');

  appConfig = loadAppConfig();
  // Expose the resolved server URL to the renderer (window.__VOX_CONFIG.apiBase).
  process.env.VOX_APP_CONFIG = JSON.stringify({ apiBase: appConfig.apiBase, mode: appConfig.mode });
  console.log(`[Config] mode=${appConfig.mode} apiBase=${appConfig.apiBase}`);

  // Local-first startup: apply Prisma migrations once against the local
  // PostgreSQL database, then spawn the bundled backend. The splash screen
  // covers this boot; the window is created AFTER the backend answers so its
  // first load succeeds immediately instead of staring at ERR_CONNECTION_REFUSED
  // retries for seconds (which read as "stuck on a black screen").
  setSplashStatus(shouldRunLocalBackend(appConfig) ? 'Connecting vault…' : 'Probing server…');

  if (shouldRunLocalBackend(appConfig)) {
    try {
      await runDbBootstrap();
    } catch (err) {
      console.error('[Startup] DB bootstrap error:', err.message);
    }

    try {
      setSplashStatus('Waking backend…');
      const result = await startBackend();
    if (result.ready) {
      console.log('[Startup] Backend ready.');
    } else {
      console.error('[Startup] Backend exited before becoming ready — check the error output below.');
      if (!isQuitting) {
        const stderrSnippet = result.stderr || 'No additional output captured.';
        dialog.showErrorBox(
          'VOX could not start',
          'The VOX backend failed to start. VOX requires a running PostgreSQL ' +
          'database (default: postgresql://vox:vox@127.0.0.1:5433/vox_dev).\n\n' +
          'To fix this:\n' +
          '• Make sure PostgreSQL is running — e.g. start the local\n' +
          '  "postgresql-x64-18" Windows service (Services app), or run:\n' +
          '  docker compose up -d\n' +
          '• Or run the backend dev script directly to see full errors:\n' +
          '  cd backend && npm run start\n' +
          '• Advanced: point VOX at any PostgreSQL by creating:\n' +
          `  ${path.join(VOX_USER_DATA, 'vox-db.txt')}\n` +
          '  with a single line: postgresql://user:pass@host:5433/dbname\n\n' +
          'Backend error output (last lines):\n' + stderrSnippet
        );
      }
    }
    } catch (err) {
      console.error('[Startup] Backend error:', err.message);
    }
  } else {
    console.log('[Startup] Client mode — skipping local backend bootstrap.');
    // Best-effort reachability probe so the splash shows honest status before
    // the window loads.
    try {
      const probeUrl = String(appConfig.apiBase || '').replace(/\/$/, '') + '/api/health';
      const u = new URL(probeUrl);
      const lib = u.protocol === 'https:' ? require('https') : require('http');
      await new Promise((resolve) => {
        const req = lib.get(probeUrl, { timeout: 2000 }, (res) => { res.resume(); resolve(); });
        req.on('error', () => resolve());
        req.on('timeout', () => { req.destroy(); resolve(); });
      });
    } catch { /* ignore — we still create the window so the renderer can show its own error UI */ }
  }

  // Window + tray come after the backend is listening so the first paint is
  // the real app — no blank-window retry phase.
  setSplashStatus('Opening interface…');
  createWindow();
  createTray();

  // Global shortcuts
  globalShortcut.register('CommandOrControl+Shift+V', () => {
    if (!mainWindow) return;
    if (!mainWindow.isVisible()) { mainWindow.show(); mainWindow.focus(); }
    else mainWindow.focus();
  });

  globalShortcut.register('CommandOrControl+Shift+R', () => {
    if (!mainWindow) return;
    if (!mainWindow.isVisible()) { mainWindow.show(); mainWindow.focus(); }
    mainWindow.webContents.executeJavaScript('(window.__voxVoiceToggle && window.__voxVoiceToggle()) || true').catch(() => {});
  });
}

// ── Uncaught exception safety net ──────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[Fatal]', err && err.stack ? err.stack : err);
  try {
    dialog.showErrorBox('VOX Error', 'An unexpected error occurred. Please restart VOX.\n\n' + (err && err.message || String(err)));
  } catch {}
});

// ═══════════════════════════════════════════════════════════════════
//  App lifecycle
// ═══════════════════════════════════════════════════════════════════

app.whenReady().then(start);
app.on('before-quit', () => { isQuitting = true; });


// ─── Vox App Config IPC (renderer ↔ main) ─────────────────────────────────────
// Surface for the renderer to read / mutate %APPDATA%/VOX-Desktop/app-config.json
// and to reachability-probe an arbitrary URL (no auth, no rate-limit).
ipcMain.handle('vox:get-config', () => readUserAppConfig());
ipcMain.handle('vox:is-first-run', () => {
  try {
    const p = path.join(VOX_USER_DATA, 'app-config.json');
    return !fs.existsSync(p);
  } catch { return false; }
});
ipcMain.handle('vox:set-config', (_e, next) => {
  const s = (next && typeof next === 'object') ? next : {};
  if (typeof s.apiBase === 'string' && s.apiBase.length) {
    try {
      const u = new URL(s.apiBase);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, reason: 'apiBase must be http(s)' };
      s.apiBase = u.toString().replace(/\/$/, '');
    } catch { return { ok: false, reason: 'apiBase is not a valid URL' }; }
  }
  if (s.mode && !['client', 'local'].includes(s.mode)) return { ok: false, reason: 'mode must be client or local' };
  const merged = writeUserAppConfig(s);
  if (mainWindow && !mainWindow.isDestroyed()) {
    process.env.VOX_APP_CONFIG = JSON.stringify({ apiBase: merged.apiBase, mode: merged.mode });
    mainWindow.webContents.send('vox:config-changed', merged);
  }
  return { ok: true, config: merged };
});
ipcMain.handle('vox:reset-config', () => {
  try { const p = path.join(VOX_USER_DATA, 'app-config.json'); if (fs.existsSync(p)) fs.unlinkSync(p); } catch {}
  const def = { ...DEFAULT_USER_CONFIG };
  if (mainWindow && !mainWindow.isDestroyed()) {
    process.env.VOX_APP_CONFIG = JSON.stringify({ apiBase: def.apiBase, mode: def.mode });
    mainWindow.webContents.send('vox:config-changed', def);
  }
  return { ok: true, config: def };
});
ipcMain.handle('vox:test-reachability', async (_e, url) => {
  if (typeof url !== 'string' || !url) return { ok: false, reason: 'no-url', latencyMs: null };
  let target;
  try { target = new URL(url.replace(/\/$/, '') + '/api/server-info').toString(); } catch { return { ok: false, reason: 'bad-url', latencyMs: null }; }
  const lib = target.startsWith('https:') ? require('https') : require('http');
  const start = Date.now();
  return new Promise((resolve) => {
    const req = lib.get(target, { timeout: 5000 }, (res) => {
      const latencyMs = Date.now() - start;
      let body = '';
      res.on('data', (c) => { body += c.toString(); });
      res.on('end', () => {
        const ok = res.statusCode >= 200 && res.statusCode < 400;
        if (ok) writeUserAppConfig({ lastSeenReachable: new Date().toISOString() });
        resolve({ ok, status: res.statusCode, latencyMs, info: ok ? safeJsonParse(body) : null, reason: ok ? null : 'http-' + res.statusCode });
      });
    });
    req.on('error', (e) => resolve({ ok: false, reason: e.code || e.message, latencyMs: null }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, reason: 'timeout', latencyMs: null }); });
  });
});

// ─── Auto-updater (electron-updater) ───────────────────────────────────
// Lazy-loaded: only paid for when an actual update is requested. The
// IPC handlers in preload.js (`updater:check`, `updater:download`,
// `updater:quit-and-install`, `updater:state`) ride on these.
let _autoUpdater = null;
async function getAutoUpdater() {
  if (_autoUpdater !== null) return _autoUpdater;
  try {
    // CJS-friendly require; available when bundled by electron-builder.
    _autoUpdater = require('electron-updater').autoUpdater;
  } catch (err) {
    console.warn('[updater] electron-updater not available (' + (err && err.message) + '). Update pipeline disabled.');
    _autoUpdater = false;
  }
  return _autoUpdater || null;
}

function broadcastUpdaterState(state) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('updater:state', state);
}

ipcMain.handle('updater:check', async () => {
  if (!app.isPackaged) return { ok: true, status: 'dev' };
  const updater = await getAutoUpdater();
  if (!updater) return { ok: false, status: 'unavailable', error: 'electron-updater not bundled' };
  try { await updater.checkForUpdates(); return { ok: true, status: 'ready' }; }
  catch (e) { return { ok: false, status: 'error', error: e && e.message ? String(e.message) : 'unknown' }; }
});
ipcMain.handle('updater:download', async () => {
  if (!app.isPackaged) return { ok: true, status: 'dev' };
  const updater = await getAutoUpdater();
  if (!updater) return { ok: false, status: 'unavailable', error: 'electron-updater not bundled' };
  try { await updater.downloadUpdate(); return { ok: true, status: 'downloading' }; }
  catch (e) { return { ok: false, status: 'error', error: e && e.message ? String(e.message) : 'unknown' }; }
});
ipcMain.handle('updater:quit-and-install', async () => {
  const updater = await getAutoUpdater();
  if (!updater) return { ok: false };
  try { updater.quitAndInstall(); return { ok: true }; }
  catch (e) { return { ok: false, reason: e && e.message }; }
});
ipcMain.handle('updater:state', async () => {
  // F2: tell the renderer explicitly whether we're packaged. UpdateModal
  // uses this to decide between showing the real notice and the 'Updates
  // are available in the desktop build' toast in dev / unpackaged runs.
  if (!app.isPackaged) return { status: 'dev', available: false, downloaded: false, version: null, progress: 0, error: null };
  const updater = await getAutoUpdater();
  if (!updater) return { status: 'unavailable', available: false, downloaded: false, version: null, progress: 0, error: 'electron-updater not bundled' };
  try {
    return { status: 'ready', available: false, downloaded: false, version: updater.currentVersion ? String(updater.currentVersion) : null, progress: 0, error: null };
  } catch (_) { return { status: 'unavailable', available: false, downloaded: false, version: null, progress: 0, error: null }; }
});

// Wire the autoUpdater lifecycle events to the renderer so the UI can show progress.
async function wireUpdaterEvents() {
  const updater = await getAutoUpdater();
  if (!updater) return;
  // F2: align the broadcast shape with frontend/src/types/electron.ts'
  // UpdaterState. The renderer's useUpdateStore and UpdateModal.tsx both
  // read { available, downloaded, version, progress, error } directly —
  // so we forward each event translated to that shape.
  updater.on('checking-for-update', () =>
    broadcastUpdaterState({ available: false, downloaded: false, version: null, progress: 0, error: null, phase: 'CHECKING' })
  );
  updater.on('update-available', (info) =>
    broadcastUpdaterState({
      available: true, downloaded: false, progress: 0, error: null,
      version: info && info.version ? String(info.version) : null,
      releaseNotes: info && (info.releaseNotes || info.releaseNotesHTML) ? String(info.releaseNotes || info.releaseNotesHTML) : null,
      phase: 'AVAILABLE',
    })
  );
  updater.on('download-progress', (p) =>
    broadcastUpdaterState({
      available: true, downloaded: false,
      progress: Math.round((p && p.percent) || 0),
      error: null,
      phase: 'DOWNLOADING',
    })
  );
  updater.on('update-downloaded', (info) =>
    broadcastUpdaterState({
      available: true, downloaded: true, progress: 100, error: null,
      version: info && info.version ? String(info.version) : null,
      phase: 'READY',
    })
  );
  updater.on('update-not-available', () =>
    broadcastUpdaterState({ available: false, downloaded: false, version: null, progress: 0, error: null, phase: 'IDLE' })
  );
  updater.on('error', (err) =>
    broadcastUpdaterState({
      available: false, downloaded: false, version: null, progress: 0,
      error: err && err.message ? String(err.message) : 'Update error',
      phase: 'ERROR',
    })
  );
}

app.whenReady().then(() => {
  wireUpdaterEvents();
  // Kick an initial check shortly after boot (10s gives the window time to
  // mount and the user a chance to see the result).
  setTimeout(() => {
    ipcMain.emit('updater:autoCheck');
  }, 10_000);
  // …then poll every 6h so a long-lived desktop session eventually
  // catches up to a release without a manual restart.
  setInterval(() => {
    ipcMain.emit('updater:autoCheck');
  }, 6 * 60 * 60 * 1000);
});

// shared autoCheck — used by both initial 10s kick and the 6h poll.
ipcMain.on('updater:autoCheck', async () => {
  const updater = await getAutoUpdater();
  if (!updater) return;
  try {
    const result = await updater.checkForUpdates();
    // electron-updater doesn't log when update-not-available fires if the
    // current and remote are the same; swallow nothing here.
    if (result && result.updateInfo) {
      console.log('[updater] check complete:', result.updateInfo.version);
    }
  } catch (e) {
    // Don't crash the app on a transient network blip — the next poll retries.
    console.warn('[updater] auto check failed:', e && e.message);
  }
});

app.on('window-all-closed', () => {
  if (backendProc) backendProc.kill();
  stopBundledPostgres();
  globalShortcut.unregisterAll();
  if (tray) tray.destroy();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else if (mainWindow) mainWindow.show();
});
