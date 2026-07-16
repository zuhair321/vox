const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, globalShortcut, nativeImage, desktopCapturer, dialog, autoUpdater } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.join(__dirname);
const IS_PACKAGED = app.isPackaged;

// In packaged mode the backend, its node_modules live as real files under
// process.resourcesPath (see electron-builder extraResources). Running the
// backend from a real directory lets Node resolve node_modules normally —
// it cannot do that from inside app.asar.
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

// ═══════════════════════════════════════════════════════════════════
//  Cache directory hygiene + console noise suppression
// ═══════════════════════════════════════════════════════════════════

// Force all Electron/Chromium data into a single writable dir under AppData.
const VOX_USER_DATA = path.join(app.getPath('appData'), 'VOX-Desktop');
const VOX_CACHE = path.join(VOX_USER_DATA, 'Cache');
const VOX_GPU_CACHE = path.join(VOX_USER_DATA, 'GPUCache');
const VOX_CRASH_DUMPS = path.join(VOX_USER_DATA, 'Crashpad');

app.setPath('userData', VOX_USER_DATA);
app.setPath('cache', VOX_CACHE);
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

// Chromium switches — MUST be before app.whenReady()
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-hardware-overlays', 'single-fullscreen,single-on-top,underlay');
app.disableHardwareAcceleration = false;

// Performance optimizations
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-features', 'Quota,ServiceWorker,NetworkService,NetworkServiceInProcess,VizDisplayCompositor');
app.commandLine.appendSwitch('no-pings');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-crash-reporter');
app.commandLine.appendSwitch('disable-features', 'AudioServiceOutOfProcess');
app.commandLine.appendSwitch('max_old_space_size', '4096'); // Increase memory limit for Node.js
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

// Memory and cache optimizations
app.commandLine.appendSwitch('disk-cache-dir', VOX_CACHE);
app.commandLine.appendSwitch('gpu-disk-cache-dir', VOX_GPU_CACHE);
app.commandLine.appendSwitch('media-cache-size', '65536'); // 64KB media cache
app.commandLine.appendSwitch('disable-features', 'PreferCompositingToLCDText');
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');

// Security and stability
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('log-level', '3');
app.commandLine.appendSwitch('v', '0');
app.commandLine.appendSwitch('disable-logging');
app.commandLine.appendSwitch('disable-http-cache'); // Disable HTTP cache to prevent stale content
app.commandLine.appendSwitch('aggressive-cache-discard'); // More aggressive cache discarding
app.commandLine.appendSwitch('disable-features', 'RendererCodeIntegrity'); // Disable code integrity checks for performance

// ── Global console noise filter ────────────────────────────────────
const NOISE_PATTERNS = [
  /cache_util_win\.cc/, /disk_cache\.cc/, /gpu_disk_cache\.cc/,
  /service_worker_storage\.cc/, /quota_database\.cc/,
  /Could not open the quota database/, /Failed to reset the quota database/,
  /Gpu Cache Creation failed/, /Unable to move the cache/,
  /Unable to create cache/, /Failed to delete the database/,
  /Failed to open the database/,
];
function isNoise(line) { return NOISE_PATTERNS.some((re) => re.test(line)); }

const _stdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = function (chunk, encoding, cb) {
  const text = typeof chunk === 'string' ? chunk : chunk.toString();
  if (isNoise(text)) return true;
  return _stdoutWrite(chunk, encoding, cb);
};
const _stderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = function (chunk, encoding, cb) {
  const text = typeof chunk === 'string' ? chunk : chunk.toString();
  if (isNoise(text)) return true;
  return _stderrWrite(chunk, encoding, cb);
};
const ORIGINAL_LOG = console.log.bind(console);
const ORIGINAL_ERR = console.error.bind(console);
console.log = (...args) => {
  const text = args.map(String).join(' ');
  if (isNoise(text)) return;
  ORIGINAL_LOG(...args);
};
console.error = (...args) => {
  const text = args.map(String).join(' ');
  if (isNoise(text)) return;
  ORIGINAL_ERR(...args);
};
// ═══════════════════════════════════════════════════════════════════

const STATE_FILE = path.join(VOX_USER_DATA, 'vox-window-state.json');

// Auto-updater configuration
function setupAutoUpdater() {
  if (IS_PACKAGED) {
    autoUpdater.setFeedURL({
      url: 'https://update.vox.app/update/${process.platform}/${app.getVersion()}'
    });
    
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...');
    });
    
    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info.version);
      mainWindow.webContents.send('update-available', info);
    });
    
    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available:', info.version);
    });
    
    autoUpdater.on('error', (err) => {
      console.error('Error in auto-updater:', err);
    });
    
    autoUpdater.on('download-progress', (progressObj) => {
      let log_message = "Download speed: " + progressObj.bytesPerSecond;
      log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
      log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
      mainWindow.webContents.send('download-progress', progressObj);
    });
    
    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info.version);
      mainWindow.webContents.send('update-downloaded', info);
    });
    
    // Check for updates on app ready and every hour
    autoUpdater.checkForUpdates();
    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, 60 * 60 * 1000); // 1 hour
  }
}

let backendProc = null;
let frontendProc = null;
let frontendServer = null;
let mainWindow = null;
let tray = null;
let isQuitting = false;
let iSpawnedBackend = false;
let iSpawnedFrontend = false;
let pendingScreenCallback = null;
let pendingScreenTimeout = null;

// Minimal built-in static server used to serve the packaged frontend.
// Absolute asset paths in the built index.html (e.g. /assets/*.js) only
// resolve correctly when served over HTTP — loadFile from inside app.asar
// would turn them into filesystem-root paths and produce a white screen.
const STATIC_MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

function serveFrontendDir(rootDir, port = 3000, host = '127.0.0.1') {
  const http = require('http');
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const rawUrl = request.url || '/';
      let urlPath = decodeURIComponent(rawUrl.split('?')[0]);
      if (urlPath === '/') urlPath = '/index.html';
      const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
      const requestedPath = path.join(rootDir, safePath);
      if (!requestedPath.startsWith(rootDir)) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
      }
      fs.readFile(requestedPath, (readErr, data) => {
        if (readErr) {
          // SPA fallback: serve index.html for unknown routes.
          fs.readFile(path.join(rootDir, 'index.html'), (fbErr, fbData) => {
            if (fbErr) {
              response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
              response.end('Not found');
              return;
            }
            response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            response.end(fbData);
          });
          return;
        }
        const ext = path.extname(requestedPath).toLowerCase();
        response.writeHead(200, { 'Content-Type': STATIC_MIME[ext] || 'application/octet-stream' });
        response.end(data);
      });
    });
    server.on('error', reject);
    server.listen(port, host, () => resolve(server));
  });
}

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function resolveIconPath() {
  const distIcon = path.join(__dirname, 'frontend', 'dist', 'favicon.ico');
  const buildIcon = path.join(__dirname, 'frontend', 'build', 'favicon.ico');
  return fs.existsSync(distIcon) ? distIcon : buildIcon;
}

async function ensureViteBuild() {
  const indexPath = path.join(PROJECT_ROOT, 'frontend', 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log('[Frontend] Using existing dist build');
    return;
  }
  if (!app.isPackaged && (await isPortInUse(3000))) {
    console.log('[Frontend] Using dev server on port 3000');
    return;
  }
  console.log('[Frontend] Building frontend...');
  return new Promise((resolve, reject) => {
    const buildProc = spawn('npm', ['run', 'build'], {
      cwd: path.join(PROJECT_ROOT, 'frontend'),
      shell: true,
      windowsHide: true,
    });
    let hasError = false;
    buildProc.stdout.on('data', (data) => console.log('[Frontend Build]', data.toString().trim()));
    buildProc.stderr.on('data', (data) => {
      const text = data.toString().trim();
      if (text.toLowerCase().includes('error')) {
        hasError = true;
        console.error('[Frontend Build Error]', text);
      } else {
        console.log('[Frontend Build]', text);
      }
    });
    buildProc.on('exit', (code) => {
      if (code !== 0) hasError = true;
      if (hasError) reject(new Error('Frontend build failed'));
      else resolve();
    });
    buildProc.on('error', reject);
  });
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => { server.close(); resolve(false); });
    server.listen(port, '127.0.0.1');
  });
}

function rejectPendingScreenRequest() {
  if (!pendingScreenCallback) return;
  const cb = pendingScreenCallback;
  pendingScreenCallback = null;
  if (pendingScreenTimeout) { clearTimeout(pendingScreenTimeout); pendingScreenTimeout = null; }
  try { cb({}); } catch { /* noop */ }
}

function setupScreenCapture(mainWindow) {
  mainWindow.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
    rejectPendingScreenRequest();
    pendingScreenCallback = callback;
    pendingScreenTimeout = setTimeout(() => { rejectPendingScreenRequest(); }, 60000);
    mainWindow.webContents.send('screen-capture:request');
  });
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(['media', 'mediaKeySystem', 'notifications', 'fullscreen', 'display-capture'].includes(permission));
  });
}

async function startFrontend() {
  if (app.isPackaged) {
    // Serve the bundled frontend over HTTP so absolute asset paths resolve
    // correctly (loadFile from app.asar would break them and white-screen).
    const distDir = path.join(__dirname, 'frontend', 'dist');
    const rootDir = fs.existsSync(path.join(distDir, 'index.html'))
      ? distDir
      : path.join(__dirname, 'frontend', 'build');
    console.log('[Frontend] Serving packaged build from', rootDir);
    try {
      frontendServer = await serveFrontendDir(rootDir, 3000);
      iSpawnedFrontend = true;
      console.log('[Frontend] Packaged frontend listening on http://127.0.0.1:3000');
    } catch (err) {
      console.error('[Frontend] Failed to start packaged server:', err.message);
    }
    return;
  }
  if (await isPortInUse(3000)) {
    console.log('[Frontend] Port 3000 already in use — reusing existing frontend');
    iSpawnedFrontend = false;
    return;
  }
  iSpawnedFrontend = true;
  return new Promise((resolve) => {
    frontendProc = spawn('node', ['frontend/static-server.js'], {
      cwd: PROJECT_ROOT, windowsHide: true,
    });
    let started = false;
    frontendProc.stdout.on('data', (data) => {
      const text = data.toString();
      console.log('[Frontend]', text.trim());
      if (text.includes('listening') && !started) { started = true; setTimeout(() => resolve(), 300); }
    });
    frontendProc.stderr.on('data', (data) => {
      const text = data.toString().trim();
      if (shouldSuppressStderr(text)) return;
      console.error('[Frontend Error]', text);
    });
    frontendProc.on('error', (err) => console.error('[Frontend Spawn Error]', err.message));
    frontendProc.on('exit', (code) => console.log(`[Frontend] exited with code ${code}`));
    setTimeout(() => { if (!started) { started = true; resolve(); } }, 5000);
  });
}

function loadWindowState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { width: 1280, height: 800, x: undefined, y: undefined, maximized: false }; }
}

function saveWindowState() {
  if (!mainWindow) return;
  const bounds = mainWindow.getBounds();
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      width: bounds.width, height: bounds.height,
      x: bounds.x, y: bounds.y, maximized: mainWindow.isMaximized(),
    }));
  } catch (err) { console.error('Failed to save window state:', err.message); }
}

const STDERR_NOISE = [
  /cache_util_win\.cc/, /disk_cache\.cc/, /gpu_disk_cache\.cc/,
  /service_worker_storage\.cc/, /quota_database\.cc/,
  /Could not open the quota database/, /Failed to reset the quota database/,
  /Gpu Cache Creation failed/, /Unable to move the cache/,
  /Unable to create cache/, /Failed to delete the database/,
];
function shouldSuppressStderr(line) { return STDERR_NOISE.some((re) => re.test(line)); }

function waitForServer(url, timeout = 10000) {
  return new Promise((resolve) => {
    const http = require('http');
    const start = Date.now();
    function tryConnect() {
      const req = http.get(url, () => { resolve(); });
      req.on('error', () => {
        if (Date.now() - start > timeout) resolve();
        else setTimeout(tryConnect, 200);
      });
      req.end();
    }
    tryConnect();
  });
}

// ── First-run database bootstrap ────────────────────────────────
// The packaged app ships an empty SQLite file in AppData. This applies the
// bundled Prisma schema to it exactly once so VOX works with zero setup.
const DB_PATH = path.join(VOX_USER_DATA, 'vox.db');

async function runDbBootstrap() {
  const scriptPath = getBackendPath('src', 'db', 'ensure-schema.mjs');
  if (!fs.existsSync(scriptPath)) {
    console.warn('[Bootstrap] ensure-schema.mjs not found — skipping first-run setup.');
    return;
  }
  const portableNode = getPortableNode();
  const nodeBin = portableNode || 'node';
  const nodeDir = portableNode ? path.join(process.resourcesPath, 'nodejs') : null;
  console.log('[Bootstrap] Initializing local database (first run only)...');
  await new Promise((resolve) => {
    const child = spawn(nodeBin, [scriptPath], {
      cwd: getBackendPath(),
      windowsHide: true,
      env: {
        ...process.env,
        DATABASE_URL: 'file:' + DB_PATH,
        NODE_PATH: nodeDir ? path.join(nodeDir, 'node_modules') : (process.env.NODE_PATH || ''),
        PATH: nodeDir ? nodeDir + ';' + (process.env.PATH || '') : (process.env.PATH || ''),
      },
    });
    child.stdout.on('data', (d) => console.log('[db-bootstrap]', d.toString().trim()));
    child.stderr.on('data', (d) => console.error('[db-bootstrap]', d.toString().trim()));
    child.on('exit', (code) => {
      if (code !== 0) console.warn(`[db-bootstrap] exited with code ${code} (continuing)`);
      resolve();
    });
    child.on('error', (err) => { console.error('[db-bootstrap] spawn error', err.message); resolve(); });
  });
}

// ── Discord-style splash (shown during first-run setup) ─────────
const SPLASH_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  html,body{margin:0;height:100%;background:#1e1f22;display:flex;flex-direction:column;
    align-items:center;justify-content:center;font-family:'Segoe UI',system-ui,sans-serif;color:#fff;overflow:hidden}
  .logo{font-size:42px;font-weight:800;letter-spacing:1px;
    background:linear-gradient(90deg,#5865f2,#7983f5);-webkit-background-clip:text;background-clip:text;color:transparent}
  .tag{margin-top:4px;font-size:13px;color:#949ba4;letter-spacing:.5px}
  .spin{margin-top:34px;width:34px;height:34px;border-radius:50%;
    border:3px solid #2b2d31;border-top-color:#5865f2;animation:r 1s linear infinite}
  .status{margin-top:16px;font-size:12px;color:#80848e}
  @keyframes r{to{transform:rotate(360deg)}}
</style></head><body>
  <div class="logo">VOX</div><div class="tag">Your space to talk</div>
  <div class="spin"></div><div class="status">Preparing your app…</div>
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
  try { splash.close(); } catch { /* noop */ }
  splash = null;
}

async function startBackend() {
  const portableNode = getPortableNode();

  if (portableNode) {
    console.log('[Backend] Using portable Node.js:', portableNode);
    const backendNodeModules = getBackendPath('node_modules');
    if (!fs.existsSync(backendNodeModules)) {
      console.warn('[Backend] Dependencies not found. Backend may not work.');
    }
    return new Promise((resolve) => {
      const serverPath = getBackendPath('server.js');
      const portableNodeDir = path.join(process.resourcesPath, 'nodejs');
      const backendCwd = getBackendPath();
      backendProc = spawn(portableNode, [serverPath], {
        cwd: backendCwd,
        windowsHide: true,
        env: {
          ...process.env,
          // SQLite stores data in AppData so it's writable. Prisma resolves the
          // path relative to the backend cwd (resources/backend/), so we use an
          // absolute path to the user's AppData folder.
          DATABASE_URL: 'file:' + path.join(VOX_USER_DATA, 'vox.db'),
          NODE_PATH: path.join(portableNodeDir, 'node_modules'),
          NODE_ENV: 'production',
          PATH: portableNodeDir + ';' + (process.env.PATH || ''),
        },
      });
      let started = false;
      backendProc.stdout.on('data', (data) => {
        const text = data.toString();
        console.log('[Backend]', text.trim());
        if (text.includes('listening') && !started) { started = true; resolve(); }
      });
      backendProc.stderr.on('data', (data) => {
        const text = data.toString().trim();
        if (shouldSuppressStderr(text)) return;
        console.error('[Backend Error]', text);
      });
      backendProc.on('error', (err) => {
        console.error('[Backend Spawn Error]', err.message);
        if (!started) { started = true; resolve(); }
      });
      backendProc.on('exit', (code) => console.log(`[Backend] exited with code ${code}`));
      setTimeout(() => { if (!started) { started = true; resolve(); } }, 8000);
    });
  }

  // Dev mode: use system node
  if (await isPortInUse(4000)) {
    console.log('[Backend] Port 4000 already in use — checking if backend is responding...');
    try {
      await waitForServer('http://127.0.0.1:4000/health', 2000);
      console.log('[Backend] Backend is healthy, reusing existing instance');
      iSpawnedBackend = false;
      return;
    } catch {
      console.error('[Backend] Port 4000 in use but backend not responding');
      console.log('[Backend] Attempting to spawn new backend...');
    }
  }

  iSpawnedBackend = true;
  return new Promise((resolve) => {
    backendProc = spawn('node', [getBackendPath('server.js')], {
      cwd: PROJECT_ROOT, windowsHide: true,
    });
    let started = false;
    backendProc.stdout.on('data', (data) => {
      const text = data.toString();
      console.log('[Backend]', text.trim());
      if (text.includes('listening') && !started) { started = true; resolve(); }
    });
    backendProc.stderr.on('data', (data) => {
      const text = data.toString().trim();
      if (shouldSuppressStderr(text)) return;
      console.error('[Backend Error]', text);
    });
    backendProc.on('error', (err) => {
      console.error('[Backend Spawn Error]', err.message);
      if (!started) { started = true; resolve(); }
    });
    backendProc.on('exit', (code) => console.log(`[Backend] exited with code ${code}`));
    setTimeout(() => { if (!started) { started = true; resolve(); } }, 5000);
  });
}

function createWindow() {
  const state = loadWindowState();
  mainWindow = new BrowserWindow({
    width: state.width, height: state.height, x: state.x, y: state.y,
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      backgroundThrottling: false,
      devTools: !IS_PACKAGED,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
      disableBlinkFeatures: 'Auxclick',
      // Performance optimizations
      offscreen: false, // Disable offscreen rendering when not needed
      enablePreferredSizeMode: true, // Enable preferred size mode for better performance
    },
    frame: false, titleBarStyle: 'hidden', title: 'VOX',
    icon: resolveIconPath(), show: false,
    // Window performance optimizations
    backgroundColor: '#1e1f22', // Match splash screen color to prevent flash
    hasShadow: true, // Enable native window shadows for better appearance
    transparent: false, // Disable transparency for better performance
    resizable: true, // Allow resizing
    minimizable: true, // Allow minimizing
    maximizable: true, // Allow maximizing
    closable: true, // Allow closing
    focusable: true, // Allow window to receive focus
    skipTaskbar: false, // Show in taskbar
  });
  if (state.maximized) mainWindow.maximize();

  if (app.isPackaged) {
    // Load via the local HTTP server (started in startFrontend) so absolute
    // asset paths resolve. Fall back to loadFile if the server isn't up.
    mainWindow.loadURL('http://127.0.0.1:3000').catch(() => {
      try { mainWindow.loadFile(path.join(__dirname, 'frontend', 'dist', 'index.html')); }
      catch { /* nothing else we can do */ }
    });
  } else {
    mainWindow.loadURL('http://127.0.0.1:3000');
  }

  setupScreenCapture(mainWindow);
  
  // Handle window events
  mainWindow.on('resize', () => saveWindowState());
  mainWindow.on('move', () => saveWindowState());
  mainWindow.on('maximize', () => { saveWindowState(); mainWindow.webContents.send('maximize-change', true); });
  mainWindow.on('unmaximize', () => { saveWindowState(); mainWindow.webContents.send('maximize-change', false); });
  mainWindow.on('close', (event) => {
    if (!isQuitting) { event.preventDefault(); mainWindow.hide(); return; }
    saveWindowState();
  });
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.on('focus', () => { if (mainWindow) { mainWindow.webContents.send('focus-change', true); mainWindow.flashFrame(false); } });
  mainWindow.on('blur', () => { if (mainWindow) mainWindow.webContents.send('focus-change', false); });

  // Handle renderer process errors to prevent white screens
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Main window failed to load:', errorCode, errorDescription);
    // Try to load the local file as fallback
    if (app.isPackaged) {
      mainWindow.loadFile(path.join(__dirname, 'frontend', 'dist', 'index.html'))
        .catch(err => console.error('Failed to load fallback:', err));
    }
  });

  mainWindow.webContents.on('did-frame-finish-load', () => {
    // Ensure window is visible after frame loads
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
  });

  // Show window and hide splash when ready
  mainWindow.once('ready-to-show', () => {
    // Small delay to ensure everything is properly initialized
    setTimeout(() => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
        closeSplash();
      }
    }, 100);
  });
  
  // Fallback: if ready-to-show doesn't fire within 5 seconds, show window anyway
  const showWindowTimeout = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      console.warn('Window did not become ready-to-show within timeout, showing anyway');
      mainWindow.show();
      mainWindow.focus();
      closeSplash();
    }
  }, 5000);
  
  // Clean up timeout when window is closed
  mainWindow.on('closed', () => {
    clearTimeout(showWindowTimeout);
  });
}

function createTray() {
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(resolveIconPath());
    if (trayIcon.isEmpty()) throw new Error('Empty');
  } catch {
    const png1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    trayIcon = nativeImage.createFromBuffer(png1x1).resize({ width: 16, height: 16 });
  }
  tray = new Tray(trayIcon);
  tray.setToolTip('VOX Desktop');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show VOX', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit(); } },
  ]));
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) mainWindow.hide();
      else { mainWindow.show(); mainWindow.focus(); }
    }
  });
}

async function start() {
  console.log('Starting VOX Desktop...');
  createSplash();

  // VOX now uses SQLite — zero setup, no database server to install.
  console.log('[Startup] Using SQLite (built-in, no setup required)');

  // One-time local database setup (creates tables on a fresh install).
  try {
    await runDbBootstrap();
  } catch (err) {
    console.error('[Startup] Database bootstrap failed:', err.message);
  }

  try {
    await startBackend();
  } catch (err) {
    console.error('[Startup] Backend startup failed:', err.message);
  }

  // Open the window as soon as the backend is listening — don't block the whole
  // UI on a full DB health check. The frontend loads in parallel and its first
  // request warms Prisma on demand (the backend initialises the DB in the
  // background right after opening the port). We still probe health so a
  // genuinely broken backend is surfaced early, but it no longer gates startup.
  waitForServer('http://127.0.0.1:4000/health', 3000).then((backendReady) => {
    if (!backendReady) console.warn('[Startup] Backend health check pending — VOX will retry on first request.');
    else console.log('[Startup] Backend ready.');
  });

  try {
    await ensureViteBuild();
  } catch (err) {
    console.error('[Startup CRITICAL] Frontend build failed:', err.message);
    closeSplash();
    app.quit();
    return;
  }

  try {
    await startFrontend();
  } catch (err) {
    console.error('[Startup CRITICAL] Frontend startup failed:', err.message);
    closeSplash();
    app.quit();
    return;
  }

  console.log('Servers ready. Opening window...');
  createWindow();
  createTray();
  setupAutoUpdater();
  globalShortcut.register('CommandOrControl+Shift+V', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) mainWindow.focus();
      else { mainWindow.show(); mainWindow.focus(); }
    }
  });
}

app.whenReady().then(start);
app.on('before-quit', () => { isQuitting = true; });

app.on('window-all-closed', () => {
  if (backendProc && iSpawnedBackend) backendProc.kill();
  if (frontendProc && iSpawnedFrontend) frontendProc.kill();
  if (frontendServer) { try { frontendServer.close(); } catch { /* noop */ } }
  globalShortcut.unregisterAll();
  if (tray) tray.destroy();
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else if (mainWindow) mainWindow.show();
});

// ── IPC handlers ───────────────────────────────────────────────────
ipcMain.on('notify', (_event, { title, body }) => {
  if (Notification.isSupported()) new Notification({ title, body, icon: resolveIconPath() }).show();
});

ipcMain.handle('screen-capture:get-sources', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 320, height: 180 } });
  return sources.map((s) => ({ id: s.id, name: s.name, thumbnail: s.thumbnail.toDataURL() }));
});

ipcMain.handle('screen-capture:select', async (_event, sourceId) => {
  if (!pendingScreenCallback) { console.warn('[SC] No pending callback'); return false; }
  const cb = pendingScreenCallback;
  pendingScreenCallback = null;
  if (pendingScreenTimeout) { clearTimeout(pendingScreenTimeout); pendingScreenTimeout = null; }
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
    const source = sources.find((s) => s.id === sourceId);
    if (source) { cb({ video: source }); return true; }
  } catch (err) { console.error('[SC] error:', err.message); }
  cb({});
  return false;
});

ipcMain.handle('screen-capture:cancel', () => { rejectPendingScreenRequest(); });

ipcMain.handle('screen-capture:start-direct', async (_event, sourceId) => {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
    const source = sources.find((s) => s.id === sourceId);
    if (!source) return { error: 'Source not found' };
    return { sourceId: source.id, name: source.name };
  } catch (err) { return { error: err.message }; }
});

ipcMain.on('flash-frame', () => { if (mainWindow && !mainWindow.isFocused()) mainWindow.flashFrame(true); });
ipcMain.on('open-external', (_event, url) => { require('electron').shell.openExternal(url).catch(() => {}); });
ipcMain.on('minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('maximize', () => { if (mainWindow) { if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); } });
ipcMain.handle('is-maximized', () => mainWindow ? mainWindow.isMaximized() : false);
ipcMain.on('close', () => { if (mainWindow) mainWindow.close(); });

// Auto-updater IPC handlers
ipcMain.on('check-for-update', () => {
  if (IS_PACKAGED) {
    autoUpdater.checkForUpdates();
  }
});

ipcMain.on('quit-and-install', () => {
  autoUpdater.quitAndInstall();
});

