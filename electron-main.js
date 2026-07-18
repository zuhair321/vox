// VOX Desktop — Electron Main Process
// No auto-updater: bundled for offline use, client delivers a fresh installer.

const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, globalShortcut, nativeImage, desktopCapturer, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.join(__dirname);
const IS_PACKAGED = app.isPackaged;

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

// ── Runtime server config (Option 1: hosted SaaS EXE) ──────────────
// The frontend reads window.__VOX_CONFIG.apiBase. We compute it here so the
// same packaged bundle can either:
//   • run a local backend (default, SQLite)  → apiBase = http://127.0.0.1:4000
//   • connect to a hosted backend            → apiBase = your server URL
// Priority: VOX_API_BASE env  >  app-config.json (extraResources)  >  local default.
// When the apiBase is NOT localhost, we skip spawning the bundled backend.
function loadAppConfig() {
  let apiBase = 'http://127.0.0.1:4000';
  let mode = 'local';

  const configPath = IS_PACKAGED
    ? path.join(process.resourcesPath, 'app-config.json')
    : path.join(PROJECT_ROOT, 'frontend', 'public', 'app-config.json');

  try {
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (cfg.apiBase) apiBase = cfg.apiBase;
      if (cfg.mode) mode = cfg.mode;
    }
  } catch (e) {
    console.error('[Config] failed to read app-config.json:', e.message);
  }

  if (process.env.VOX_API_BASE) {
    apiBase = process.env.VOX_API_BASE;
    mode = 'hosted';
  }

  const isLocal = /(^|\/\/)127\.0\.0\.1[:\/]/.test(apiBase) ||
                  /(^|\/\/)localhost[:\/]/.test(apiBase);
  const hosted = mode === 'hosted' || !isLocal;
  return { apiBase, mode: hosted ? 'hosted' : 'local', hosted };
}

// ═══════════════════════════════════════════════════════════════════
//  AppData directories — all writable data lives in %APPDATA%/VOX-Desktop
// ═══════════════════════════════════════════════════════════════════

const VOX_USER_DATA  = path.join(app.getPath('appData'), 'VOX-Desktop');
const VOX_CACHE       = path.join(VOX_USER_DATA, 'Cache');
const VOX_GPU_CACHE   = path.join(VOX_USER_DATA, 'GPUCache');
const VOX_CRASH_DUMPS = path.join(VOX_USER_DATA, 'Crashpad');

app.setPath('userData',  VOX_USER_DATA);
app.setPath('cache',     VOX_CACHE);
app.setPath('crashDumps', VOX_CRASH_DUMPS);

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
app.commandLine.appendSwitch('disable-features', 'Quota,ServiceWorker,NetworkService,NetworkServiceInProcess');
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

function waitForServer(url, timeout = 15000) {
  return new Promise((resolve) => {
    const http = require('http');
    const start = Date.now();
    function tryIt() {
      const req = http.get(url, () => resolve(true));
      req.on('error', () => {
        if (Date.now() - start > timeout) resolve(false);
        else setTimeout(tryIt, 300);
      });
      req.end();
    }
    tryIt();
  });
}

function shouldSuppressStderr(line) {
  return [
    /cache_util_win\.cc/, /disk_cache\.cc/, /gpu_disk_cache\.cc/,
    /service_worker_storage\.cc/, /quota_database\.cc/,
    /Could not open the quota database/, /Failed to reset the quota database/,
    /Gpu Cache Creation failed/, /Unable to move the cache/,
    /Unable to create cache/, /Failed to delete the database/,
  ].some((re) => re.test(line));
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
//  Database bootstrap (first run — creates SQLite tables)
// ═══════════════════════════════════════════════════════════════════

async function runDbBootstrap() {
  const scriptPath = getBackendPath('src', 'db', 'ensure-schema.mjs');
  if (!fs.existsSync(scriptPath)) {
    console.log('[Bootstrap] ensure-schema.mjs not found — skipping');
    return;
  }
  const portableNode = getPortableNode();
  const nodeBin = portableNode || 'node';
  const nodeDir = portableNode ? path.join(process.resourcesPath, 'nodejs') : null;
  const dbPath = path.join(VOX_USER_DATA, 'vox.db');
  console.log('[Bootstrap] Running first-run database setup...');
  await new Promise((resolve) => {
    const child = spawn(nodeBin, [scriptPath], {
      cwd: getBackendPath(),
      windowsHide: true,
      env: {
        ...process.env,
        DATABASE_URL: 'file:' + dbPath,
        NODE_PATH: nodeDir
          ? path.join(nodeDir, 'node_modules') + ';' + path.join(process.resourcesPath, 'backend', 'node_modules')
          : path.join(process.resourcesPath, 'backend', 'node_modules'),
        PATH: nodeDir ? nodeDir + ';' + (process.env.PATH || '') : process.env.PATH || '',
      },
    });
    child.stdout.on('data', (d) => console.log('[Bootstrap]', d.toString().trim()));
    child.stderr.on('data', (d) => { const t = d.toString().trim(); if (!shouldSuppressStderr(t)) console.error('[Bootstrap]', t); });
    child.on('exit', (code) => { if (code !== 0) console.warn('[Bootstrap] exited code', code); resolve(); });
    child.on('error', (err) => { console.error('[Bootstrap] spawn error:', err.message); resolve(); });
  });
}

// ═══════════════════════════════════════════════════════════════════
//  Animated splash screen (data URI — no external file needed)
// ═══════════════════════════════════════════════════════════════════

const SPLASH_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  :root{--c:#d84a5a;--c2:#7d1f2b;--v:#030304;--vp:#3b0a12;--a:#c7ced8}
  *{box-sizing:border-box}
  html,body{margin:0;height:100%;background:radial-gradient(circle at 50% 38%,#0a0a0d 0%,var(--v) 70%);
    display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;
    font-family:'Segoe UI',system-ui,sans-serif;color:#fff}
  .stage{position:relative;width:160px;height:160px;display:flex;align-items:center;justify-content:center}
  .ring{position:absolute;inset:0;border-radius:50%;border:1px solid rgba(216,74,90,.22)}
  .ring.r1{animation:spin 6s linear infinite}
  .ring.r2{inset:22px;border-color:rgba(216,74,90,.35);animation:spin 4s linear infinite reverse}
  .ring.r3{inset:44px;border-color:rgba(216,74,90,.5);animation:spin 3s linear infinite}
  .ring::before{content:"";position:absolute;top:-3px;left:50%;width:6px;height:6px;margin-left:-3px;
    border-radius:50%;background:var(--c);box-shadow:0 0 10px var(--c),0 0 20px var(--c)}
  @keyframes spin{to{transform:rotate(360deg)}}
  .core{width:74px;height:74px;display:flex;align-items:center;justify-content:center;
    clip-path:polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%);
    background:linear-gradient(135deg,var(--vp),var(--c2));
    box-shadow:0 0 26px rgba(216,74,90,.45),inset 0 0 14px rgba(0,0,0,.6);
    animation:corepulse 2.4s ease-in-out infinite}
  @keyframes corepulse{0%,100%{box-shadow:0 0 18px rgba(216,74,90,.3),inset 0 0 14px rgba(0,0,0,.6)}
    50%{box-shadow:0 0 40px rgba(216,74,90,.7),inset 0 0 14px rgba(0,0,0,.6)}}
  .vox{font-family:'Arial Black',system-ui,sans-serif;font-weight:900;font-size:30px;letter-spacing:3px;
    color:#fff;text-shadow:0 0 14px rgba(216,74,90,.8);animation:flick 2.4s ease-in-out infinite}
  @keyframes flick{0%,100%{opacity:1}50%{opacity:.78}}
  .wave{display:flex;align-items:flex-end;gap:3px;height:18px;margin-top:26px}
  .wave span{width:3px;border-radius:2px;background:linear-gradient(180deg,var(--c),var(--c2));
    animation:bounce 1.1s ease-in-out infinite;box-shadow:0 0 5px rgba(216,74,90,.5)}
  .wave span:nth-child(1){animation-delay:0s;height:8px}
  .wave span:nth-child(2){animation-delay:.12s;height:16px}
  .wave span:nth-child(3){animation-delay:.24s;height:11px}
  .wave span:nth-child(4){animation-delay:.36s;height:18px}
  .wave span:nth-child(5){animation-delay:.48s;height:9px}
  .wave span:nth-child(6){animation-delay:.6s;height:14px}
  .wave span:nth-child(7){animation-delay:.72s;height:7px}
  @keyframes bounce{0%,100%{transform:scaleY(.5)}50%{transform:scaleY(1)}}
  .status{margin-top:18px;font-size:12px;letter-spacing:1px;color:var(--a);
    text-transform:uppercase;opacity:.8}
</style></head><body>
  <div class="stage">
    <div class="ring r1"></div><div class="ring r2"></div><div class="ring r3"></div>
    <div class="core"><div class="vox">VOX</div></div>
  </div>
  <div class="wave"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
  <div class="status">Booting VOX…</div>
</body></html>`;

let splash = null;
function createSplash() {
  if (splash) return;
  splash = new BrowserWindow({
    width: 340, height: 420, frame: false, resizable: false,
    center: true, alwaysOnTop: true, skipTaskbar: true,
    backgroundColor: '#1e1f22',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  splash.loadURL('data:text/html,' + encodeURIComponent(SPLASH_HTML));
}
function closeSplash() {
  if (!splash) return;
  try { splash.close(); } catch {}
  splash = null;
}

// ═══════════════════════════════════════════════════════════════════
//  Backend (Node.js — bundled SQLite, zero setup)
// ═══════════════════════════════════════════════════════════════════

async function startBackend() {
  const portableNode = getPortableNode();
  if (!portableNode) {
    // Dev mode
    if (await isPortInUse(4000)) {
      const ok = await waitForServer('http://127.0.0.1:4000/health', 3000);
      if (ok) { console.log('[Backend] Reusing existing instance on port 4000'); return; }
    }
    console.log('[Backend] Starting with system Node.js...');
    backendProc = spawn('node', [getBackendPath('server.js')], {
      cwd: PROJECT_ROOT, windowsHide: true,
    });
    backendProc.stdout.on('data', (d) => { const t = d.toString().trim(); if (t) console.log('[Backend]', t); });
    backendProc.stderr.on('data', (d) => { const t = d.toString().trim(); if (t && !shouldSuppressStderr(t)) console.error('[Backend]', t); });
    backendProc.on('error', (e) => console.error('[Backend]', e.message));
    backendProc.on('exit', (c) => console.log('[Backend] exited:', c));
    await new Promise((r) => setTimeout(r, 3000));
    return;
  }

  console.log('[Backend] Using bundled Node.js:', portableNode);
  const nodeDir = path.join(process.resourcesPath, 'nodejs');
  backendProc = spawn(portableNode, [getBackendPath('server.js')], {
    cwd: getBackendPath(),
    windowsHide: true,
    env: {
      ...process.env,
      DATABASE_URL: 'file:' + path.join(VOX_USER_DATA, 'vox.db'),
      NODE_PATH: path.join(nodeDir, 'node_modules') + ';' + path.join(process.resourcesPath, 'backend', 'node_modules'),
      PATH: nodeDir + ';' + (process.env.PATH || ''),
      NODE_ENV: 'production',
    },
  });
  backendProc.stdout.on('data', (d) => { const t = d.toString().trim(); if (t) console.log('[Backend]', t); });
  backendProc.stderr.on('data', (d) => { const t = d.toString().trim(); if (t && !shouldSuppressStderr(t)) console.error('[Backend]', t); });
  backendProc.on('error', (e) => console.error('[Backend]', e.message));
  backendProc.on('exit', (c) => console.log('[Backend] exited:', c));
  await new Promise((r) => setTimeout(r, 5000));
}

// ═══════════════════════════════════════════════════════════════════
//  Main window
// ═══════════════════════════════════════════════════════════════════

function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width, height: state.height,
    x: state.x, y: state.y,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js'),
      devTools: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
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
    rendererLog.flush();
  } catch (e) { console.error('[RendererLog]', e.message); }

  function writeRenderer(msg) {
    if (!rendererLog) return;
    try { rendererLog.write(msg + '\n'); rendererLog.flush(); } catch {}
  }

  const mainLogPath = path.join(VOX_USER_DATA, 'main.log');
  let mainLog = null;
  try { mainLog = fs.createWriteStream(mainLogPath, { flags: 'a', encoding: 'utf8' }); } catch {}
  function writeMain(msg) {
    const line = `[${new Date().toISOString()}] ${msg}`;
    if (mainLog) { try { mainLog.write(line + '\n'); mainLog.flush(); } catch {} }
    console.log(line);
  }

  writeMain('VOX starting. isPackaged=' + IS_PACKAGED);

  if (IS_PACKAGED) {
    const indexPath = path.join(__dirname, 'frontend', 'dist', 'index.html');
    writeMain('Loading: ' + indexPath);
    mainWindow.loadFile(indexPath)
      .then(() => writeMain('loadFile succeeded'))
      .catch((e) => writeMain('loadFile FAILED: ' + e.message));
  } else {
    mainWindow.loadURL('http://127.0.0.1:3000');
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
    const iconPath = resolveIconPath();
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

  const appConfig = loadAppConfig();
  // Expose the resolved server URL to the renderer (window.__VOX_CONFIG.apiBase).
  process.env.VOX_APP_CONFIG = JSON.stringify({ apiBase: appConfig.apiBase, mode: appConfig.mode });
  console.log(`[Config] mode=${appConfig.mode} apiBase=${appConfig.apiBase}`);

  if (appConfig.hosted) {
    // Hosted SaaS mode: connect to the remote backend, do NOT spawn a local
    // backend or bootstrap a local SQLite database.
    console.log('[Startup] Hosted mode — skipping local backend & DB bootstrap.');
  } else {
    try {
      await runDbBootstrap();
    } catch (err) {
      console.error('[Startup] DB bootstrap error:', err.message);
    }

    try {
      await startBackend();
    } catch (err) {
      console.error('[Startup] Backend error:', err.message);
    }

    // Backend should be up — if not, it will lazy-connect on first request
    const backendUp = await waitForServer('http://127.0.0.1:4000/health', 12000);
    console.log(backendUp ? '[Startup] Backend ready.' : '[Startup] Backend not yet responding — will retry on first request.');
  }

  createWindow();
  closeSplash();
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

app.on('window-all-closed', () => {
  if (backendProc) backendProc.kill();
  globalShortcut.unregisterAll();
  if (tray) tray.destroy();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else if (mainWindow) mainWindow.show();
});
