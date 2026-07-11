const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, globalShortcut, nativeImage } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.join(__dirname);
const ADMIN_PORT = 5173;
const BACKEND_PORT = 4000;

// ═══════════════════════════════════════════════════════════════════
//  Cache directory hygiene
// ═══════════════════════════════════════════════════════════════════
const VOX_ADMIN_USER_DATA = path.join(app.getPath('appData'), 'VOX-Admin');
const VOX_ADMIN_CACHE = path.join(VOX_ADMIN_USER_DATA, 'Cache');
const VOX_ADMIN_GPU_CACHE = path.join(VOX_ADMIN_USER_DATA, 'GPUCache');
const VOX_ADMIN_CRASH_DUMPS = path.join(VOX_ADMIN_USER_DATA, 'Crashpad');

app.setPath('userData', VOX_ADMIN_USER_DATA);
app.setPath('cache', VOX_ADMIN_CACHE);
app.setPath('crashDumps', VOX_ADMIN_CRASH_DUMPS);

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

ensureDir(VOX_ADMIN_USER_DATA);
ensureDir(VOX_ADMIN_CACHE);
ensureDir(VOX_ADMIN_GPU_CACHE);
ensureDir(VOX_ADMIN_CRASH_DUMPS);
removeLockFiles(VOX_ADMIN_CACHE);
removeLockFiles(VOX_ADMIN_GPU_CACHE);

// Chromium switches
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-features', 'Quota,ServiceWorker,NetworkService,NetworkServiceInProcess');
app.commandLine.appendSwitch('no-pings');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-crash-reporter');
app.commandLine.appendSwitch('disk-cache-dir', VOX_ADMIN_CACHE);
app.commandLine.appendSwitch('gpu-disk-cache-dir', VOX_ADMIN_GPU_CACHE);
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('disable-web-security');

// ── Console noise filter ──────────────────────────────────────────
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

const STATE_FILE = path.join(VOX_ADMIN_USER_DATA, 'admin-window-state.json');

let frontendProc = null;
let mainWindow = null;
let tray = null;
let isQuitting = false;
let iSpawnedFrontend = false;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveIconPath() {
  const candidates = [
    path.join(__dirname, 'public', 'vox-icon.svg'),
    path.join(__dirname, 'dist', 'vox-icon.svg'),
    path.join(__dirname, '..', 'frontend', 'public', 'favicon.ico'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { width: 1400, height: 900, x: undefined, y: undefined, maximized: false };
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

// Check if a TCP port is already in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => { server.close(); resolve(false); });
    server.listen(port, '127.0.0.1');
  });
}

async function ensureViteBuild() {
  const indexPath = path.join(PROJECT_ROOT, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) return Promise.resolve();

  return new Promise((resolve) => {
    console.log('[Admin] Building frontend...');
    const buildProc = spawn('npm', ['run', 'build'], {
      cwd: PROJECT_ROOT,
      shell: true,
      windowsHide: true,
    });
    buildProc.stdout.on('data', (data) => console.log('[Admin Build]', data.toString().trim()));
    buildProc.stderr.on('data', (data) => console.error('[Admin Build Error]', data.toString().trim()));
    buildProc.on('exit', () => resolve());
    buildProc.on('error', () => resolve());
  });
}

async function startFrontend() {
  // If port is already in use (dev server), reuse it
  if (await isPortInUse(ADMIN_PORT)) {
    console.log(`[Admin] Port ${ADMIN_PORT} already in use — reusing existing server`);
    iSpawnedFrontend = false;
    return;
  }

  iSpawnedFrontend = true;
  return new Promise((resolve) => {
    // Use static server for built dist
    frontendProc = spawn('node', ['static-server.cjs'], {
      cwd: PROJECT_ROOT,
      windowsHide: true,
    });
    let started = false;
    frontendProc.stdout.on('data', (data) => {
      const text = data.toString();
      console.log('[Admin Frontend]', text.trim());
      if (text.includes('listening') && !started) {
        started = true;
        setTimeout(() => resolve(), 300);
      }
    });
    frontendProc.stderr.on('data', (data) => {
      const text = data.toString().trim();
      if (isNoise(text)) return;
      console.error('[Admin Frontend Error]', text);
    });
    frontendProc.on('error', (err) => console.error('[Admin Frontend Spawn Error]', err.message));
    frontendProc.on('exit', (code) => console.log(`[Admin Frontend] exited with code ${code}`));
    setTimeout(() => { if (!started) { started = true; resolve(); } }, 5000);
  });
}

function waitForServer(url, timeout = 10000) {
  return new Promise((resolve) => {
    const http = require('http');
    const start = Date.now();
    function tryConnect() {
      const req = http.get(url, (res) => { resolve(); });
      req.on('error', () => {
        if (Date.now() - start > timeout) resolve();
        else setTimeout(tryConnect, 200);
      });
      req.end();
    }
    tryConnect();
  });
}

function createTray() {
  let trayIcon;
  const iconPath = resolveIconPath();
  try {
    if (iconPath) {
      trayIcon = nativeImage.createFromPath(iconPath);
      if (trayIcon.isEmpty()) throw new Error('Empty');
    } else {
      throw new Error('No icon');
    }
  } catch {
    const png1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    trayIcon = nativeImage.createFromBuffer(png1x1).resize({ width: 16, height: 16 });
  }
  tray = new Tray(trayIcon);
  tray.setToolTip('VOX Admin Portal');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show Admin Portal', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
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

function createWindow() {
  const state = loadWindowState();
  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false,
      allowRunningInsecureContent: true,
      disableBlinkFeatures: 'Auxclick',
    },
    frame: false,
    titleBarStyle: 'hidden',
    title: 'VOX Admin Portal',
    icon: resolveIconPath(),
    show: false,
    backgroundColor: '#0a0a14',
  });

  if (state.maximized) mainWindow.maximize();

  // Load the admin portal
  mainWindow.loadURL(`http://127.0.0.1:${ADMIN_PORT}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('resize', () => saveWindowState());
  mainWindow.on('move', () => saveWindowState());
  mainWindow.on('maximize', () => {
    saveWindowState();
    mainWindow.webContents.send('maximize-change', true);
  });
  mainWindow.on('unmaximize', () => {
    saveWindowState();
    mainWindow.webContents.send('maximize-change', false);
  });
  mainWindow.on('close', (event) => {
    if (!isQuitting) { event.preventDefault(); mainWindow.hide(); return; }
    saveWindowState();
  });
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.on('focus', () => {
    if (mainWindow) {
      mainWindow.webContents.send('focus-change', true);
      mainWindow.flashFrame(false);
    }
  });
  mainWindow.on('blur', () => {
    if (mainWindow) mainWindow.webContents.send('focus-change', false);
  });
}

async function start() {
  console.log('Starting VOX Admin Portal...');
  await ensureViteBuild();
  await startFrontend();
  console.log('Admin server ready. Opening window...');
  createWindow();
  createTray();
  globalShortcut.register('CommandOrControl+Shift+A', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) mainWindow.focus();
      else { mainWindow.show(); mainWindow.focus(); }
    }
  });
}

app.whenReady().then(start);
app.on('before-quit', () => { isQuitting = true; });
app.on('window-all-closed', () => {
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
ipcMain.on('flash-frame', () => { if (mainWindow && !mainWindow.isFocused()) mainWindow.flashFrame(true); });
ipcMain.on('open-external', (_event, url) => { require('electron').shell.openExternal(url).catch(() => {}); });
ipcMain.on('minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('maximize', () => { if (mainWindow) { if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); } });
ipcMain.handle('is-maximized', () => mainWindow ? mainWindow.isMaximized() : false);
ipcMain.on('close', () => { if (mainWindow) mainWindow.close(); });
