const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, globalShortcut, nativeImage, desktopCapturer } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.join(__dirname);

// ═══════════════════════════════════════════════════════════════════
//  Cache directory hygiene + console noise suppression
// ═══════════════════════════════════════════════════════════════════

// Force all Electron/Chromium data into a single writable dir under AppData.
// Without this the renderer + GPU helper processes race to create the same
// cache dir and log `cache_util_win.cc(20) Unable to move the cache`.
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

// Aggressive cache / disk / GPU / quota / crashpad noise suppression
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-features', 'Quota,ServiceWorker,NetworkService,NetworkServiceInProcess');
app.commandLine.appendSwitch('no-pings');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-crash-reporter');
app.commandLine.appendSwitch('disk-cache-dir', VOX_CACHE);
app.commandLine.appendSwitch('gpu-disk-cache-dir', VOX_GPU_CACHE);
app.commandLine.appendSwitch('disable-site-isolation-trials');
// Note: webSecurity is controlled via webPreferences, not command line

// ── Global console noise filter ────────────────────────────────────
// Catches noise from Electron's own renderer/GPU/crashpad processes
// (not just child-process stderr).
const NOISE_PATTERNS = [
  /cache_util_win\.cc/,
  /disk_cache\.cc/,
  /gpu_disk_cache\.cc/,
  /service_worker_storage\.cc/,
  /quota_database\.cc/,
  /Could not open the quota database/,
  /Failed to reset the quota database/,
  /Gpu Cache Creation failed/,
  /Unable to move the cache/,
  /Unable to create cache/,
  /Failed to delete the database/,
  /Failed to open the database/,
];
function isNoise(line) {
  return NOISE_PATTERNS.some((re) => re.test(line));
}

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

let backendProc = null;
let frontendProc = null;
let mainWindow = null;
let tray = null;
let isQuitting = false;
let iSpawnedBackend = false;
let iSpawnedFrontend = false;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
      if (code !== 0) {
        hasError = true;
        console.error(`[Frontend] Build failed with exit code ${code}`);
      }
      if (hasError) {
        reject(new Error('Frontend build failed'));
      } else {
        resolve(undefined);
      }
    });
    buildProc.on('error', (err) => {
      console.error('[Frontend Build Spawn Error]', err);
      reject(err);
    });
  });
}

async function ensurePostgres() {
  if (!await isPortInUse(5432)) {
    console.warn('[PostgreSQL] No database detected on port 5432; backend will report DB errors until PostgreSQL is started.');
    return;
  }
  console.log('[PostgreSQL] Database detected on port 5432');
}

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { width: 1280, height: 800, x: undefined, y: undefined, maximized: false };
  }
}

function saveWindowState() {
  if (!mainWindow) return;
  const bounds = mainWindow.getBounds();
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      maximized: mainWindow.isMaximized(),
    }));
  } catch (err) {
    console.error('Failed to save window state:', err.message);
  }
}

// ── Child-process stderr filter ──────────────────────────────────
const STDERR_NOISE = [
  /cache_util_win\.cc/,
  /disk_cache\.cc/,
  /gpu_disk_cache\.cc/,
  /service_worker_storage\.cc/,
  /quota_database\.cc/,
  /Could not open the quota database/,
  /Failed to reset the quota database/,
  /Gpu Cache Creation failed/,
  /Unable to move the cache/,
  /Unable to create cache/,
  /Failed to delete the database/,
];
function shouldSuppressStderr(line) {
  return STDERR_NOISE.some((re) => re.test(line));
}

async function startBackend() {
  // If another process already owns port 4000 (e.g. web dev server), verify backend is actually running
  if (await isPortInUse(4000)) {
    console.log('[Backend] Port 4000 already in use — checking if backend is responding...');
    try {
      await waitForServer('http://127.0.0.1:4000/health', 2000);
      console.log('[Backend] Backend is healthy, reusing existing instance');
      iSpawnedBackend = false;
      return;
    } catch {
      console.error('[Backend] Port 4000 in use but backend not responding — may have crashed');
      console.log('[Backend] Attempting to spawn new backend...');
    }
  }
  
  iSpawnedBackend = true;
  return new Promise((resolve) => {
    backendProc = spawn('node', ['backend/server.js'], {
      cwd: PROJECT_ROOT,
      windowsHide: true,
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

function waitForServer(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const http = require('http');
    const start = Date.now();
    function tryConnect() {
      const req = http.get(url, (res) => {
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeout) {
          resolve(); // fallback: just proceed
        } else {
          setTimeout(tryConnect, 200);
        }
      });
      req.end();
    }
    tryConnect();
  });
}

// Check if a TCP port is already in use (meaning another process owns it).
function isPortInUse(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    server.once('error', () => resolve(true));  // port taken
    server.once('listening', () => { server.close(); resolve(false); }); // port free
    server.listen(port, '127.0.0.1');
  });
}

async function startFrontend() {
  // If another process already owns port 3000 (e.g. vite dev server), reuse it.
  if (await isPortInUse(3000)) {
    console.log('[Frontend] Port 3000 already in use — reusing existing frontend');
    iSpawnedFrontend = false;
    return;
  }
  iSpawnedFrontend = true;
  return new Promise((resolve) => {
    // Use static server for the built dist (faster startup, reliable)
    frontendProc = spawn('node', ['frontend/static-server.js'], {
      cwd: PROJECT_ROOT,
      windowsHide: true,
    });
    let started = false;
    frontendProc.stdout.on('data', (data) => {
      const text = data.toString();
      console.log('[Frontend]', text.trim());
      if (text.includes('listening') && !started) {
        started = true;
        setTimeout(() => resolve(), 300);
      }
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

let pendingScreenCallback = null;
let pendingScreenTimeout = null;

function rejectPendingScreenRequest() {
  if (!pendingScreenCallback) return;
  const cb = pendingScreenCallback;
  pendingScreenCallback = null;
  if (pendingScreenTimeout) {
    clearTimeout(pendingScreenTimeout);
    pendingScreenTimeout = null;
  }
  try { cb({}); } catch { /* noop */ }
}

function setupScreenCapture(mainWindow) {
  mainWindow.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
    console.log('[SC] handler fired, stashing callback');
    rejectPendingScreenRequest(); // Clean up any previous orphaned request
    pendingScreenCallback = callback;
    // Auto-reject after 60 seconds if user doesn't pick a source
    pendingScreenTimeout = setTimeout(() => {
      console.warn('[SC] Screen capture request timed out after 60s');
      rejectPendingScreenRequest();
    }, 60000);
    mainWindow.webContents.send('screen-capture:request');
  });
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(['media', 'mediaKeySystem', 'notifications', 'fullscreen', 'display-capture'].includes(permission));
  });
}

function createWindow() {
  const state = loadWindowState();
  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,                     // Enable web security for production
      allowRunningInsecureContent: false,    // Disallow HTTP content in production
      disableBlinkFeatures: 'Auxclick',
    },
    frame: false,
    titleBarStyle: 'hidden',
    title: 'VOX',
    icon: resolveIconPath(),
    show: false,
  });
  if (state.maximized) mainWindow.maximize();
  mainWindow.loadURL('http://127.0.0.1:3000');
  setupScreenCapture(mainWindow);
  mainWindow.once('ready-to-show', () => { mainWindow.show(); mainWindow.focus(); });
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
}

async function start() {
  console.log('Starting VOX Desktop...');
  
  try {
    await ensurePostgres();
  } catch (err) {
    console.error('[Startup] PostgreSQL startup failed:', err.message);
    console.warn('[Startup] Continuing without database (demo mode only)');
  }
  
  try {
    await startBackend();
  } catch (err) {
    console.error('[Startup] Backend startup failed:', err.message);
    console.warn('[Startup] Continuing without backend');
  }
  
  try {
    await ensureViteBuild();
  } catch (err) {
    console.error('[Startup CRITICAL] Frontend build failed:', err.message);
    console.error('[Startup] Cannot proceed without frontend');
    // Show error to user
    app.quit();
    return;
  }
  
  try {
    await startFrontend();
  } catch (err) {
    console.error('[Startup] Frontend startup failed:', err.message);
    console.warn('[Startup] Continuing...');
  }
  
  console.log('Servers ready. Opening window...');
  createWindow();
  createTray();
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
  // Only kill processes we spawned — don't kill shared services (e.g. vite dev server).
  if (backendProc && iSpawnedBackend) backendProc.kill();
  if (frontendProc && iSpawnedFrontend) frontendProc.kill();
  globalShortcut.unregisterAll();
  if (tray) tray.destroy();
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else if (mainWindow) mainWindow.show();
});

// IPC handlers
ipcMain.on('notify', (_event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body, icon: resolveIconPath() }).show();
  }
});
ipcMain.handle('screen-capture:get-sources', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 320, height: 180 } });
  return sources.map((s) => ({ id: s.id, name: s.name, thumbnail: s.thumbnail.toDataURL() }));
});
ipcMain.handle('screen-capture:select', async (_event, sourceId) => {
  console.log('[SC] select called with sourceId:', sourceId);
  console.log('[SC] pendingScreenCallback exists:', !!pendingScreenCallback);
  if (!pendingScreenCallback) {
    console.warn('[SC] No pending callback to handle selection');
    return false;
  }
  const cb = pendingScreenCallback;
  pendingScreenCallback = null;
  if (pendingScreenTimeout) {
    clearTimeout(pendingScreenTimeout);
    pendingScreenTimeout = null;
  }
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
    console.log('[SC] available sources:', sources.map(s => s.id));
    const source = sources.find((s) => s.id === sourceId);
    if (source) {
      console.log('[SC] found source, calling callback');
      cb({ video: source });
      return true;
    }
    console.log('[SC] source NOT found');
  } catch (err) {
    console.error('[SC] error:', err.message);
  }
  cb({});
  return false;
});

ipcMain.handle('screen-capture:cancel', () => {
  console.log('[SC] User cancelled screen capture');
  rejectPendingScreenRequest();
});

// Direct screen capture: creates a MediaStream from a desktopCapturer source
// and sends it to the renderer via a MessagePort pair.
ipcMain.handle('screen-capture:start-direct', async (_event, sourceId) => {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
    const source = sources.find((s) => s.id === sourceId);
    if (!source) return { error: 'Source not found' };

    // Create a stream from the source using getUserMedia with chromeMediaSourceId
    const stream = await mainWindow.webContents.session.getMediaRequestHandler()
      ? null : null; // fallback

    // Use the older but reliable approach: send source info back and let
    // the renderer create the stream via getDisplayMedia with the source constraint
    return { sourceId: source.id, name: source.name };
  } catch (err) {
    console.error('[screen-capture] start-direct failed:', err);
    return { error: err.message };
  }
});

ipcMain.on('flash-frame', () => { if (mainWindow && !mainWindow.isFocused()) mainWindow.flashFrame(true); });
ipcMain.on('open-external', (_event, url) => { require('electron').shell.openExternal(url).catch(() => {}); });
ipcMain.on('minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('maximize', () => { if (mainWindow) { if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); } });
ipcMain.handle('is-maximized', () => mainWindow ? mainWindow.isMaximized() : false);
ipcMain.on('close', () => { if (mainWindow) mainWindow.close(); });
