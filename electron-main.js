const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, globalShortcut, nativeImage } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.join(__dirname);
const STATE_FILE = path.join(app.getPath('userData'), 'vox-window-state.json');
const MYSQLD_PATH = 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqld.exe';
const MYSQL_DATA_DIR = path.join(PROJECT_ROOT, 'temp', 'mysql-data');

app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

let backendProc = null;
let frontendProc = null;
let mainWindow = null;
let tray = null;
let isQuitting = false;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Resolve the app icon. Vite outputs public/ assets to frontend/dist/; the old
// CRA 'build' directory is kept as a fallback for legacy builds.
function resolveIconPath() {
  const distIcon = path.join(__dirname, 'frontend', 'dist', 'favicon.ico');
  const buildIcon = path.join(__dirname, 'frontend', 'build', 'favicon.ico');
  return fs.existsSync(distIcon) ? distIcon : buildIcon;
}

function ensureViteBuild() {
  const indexPath = path.join(PROJECT_ROOT, 'frontend', 'dist', 'index.html');
  if (fs.existsSync(indexPath)) return Promise.resolve();

  return new Promise((resolve) => {
    const buildProc = spawn('npm', ['run', 'build'], {
      cwd: path.join(PROJECT_ROOT, 'frontend'),
      shell: true,
      windowsHide: true,
    });

    buildProc.stdout.on('data', (data) => console.log('[Frontend Build]', data.toString().trim()));
    buildProc.stderr.on('data', (data) => console.error('[Frontend Build Error]', data.toString().trim()));
    buildProc.on('exit', () => resolve());
    buildProc.on('error', () => resolve());
  });
}

async function startMySQL() {
  if (!fs.existsSync(MYSQLD_PATH)) {
    console.warn('[MySQL] mysqld.exe not found; backend will report DB errors until MySQL is started.');
    return;
  }

  if (!fs.existsSync(MYSQL_DATA_DIR)) {
    fs.mkdirSync(MYSQL_DATA_DIR, { recursive: true });
    await new Promise((resolve) => {
      const initProc = spawn(MYSQLD_PATH, ['--initialize-insecure', `--datadir=${MYSQL_DATA_DIR}`, '--console'], {
        windowsHide: true,
      });
      initProc.on('exit', () => resolve());
      initProc.on('error', () => resolve());
    });
  }

  const mysqlProc = spawn(MYSQLD_PATH, [`--datadir=${MYSQL_DATA_DIR}`, '--port=3306', '--bind-address=127.0.0.1', '--console'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  mysqlProc.unref();
  await wait(2500);
}

function loadWindowState() {
  try {
    const data = fs.readFileSync(STATE_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return { width: 1280, height: 800, x: undefined, y: undefined, maximized: false };
  }
}

function saveWindowState() {
  if (!mainWindow) return;
  const bounds = mainWindow.getBounds();
  const state = {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    maximized: mainWindow.isMaximized(),
  };
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save window state:', err.message);
  }
}

function startBackend() {
  return new Promise((resolve) => {
    backendProc = spawn('node', ['backend/server.js'], {
      cwd: PROJECT_ROOT,
      windowsHide: true,
    });

    let started = false;
    backendProc.stdout.on('data', (data) => {
      const text = data.toString();
      console.log('[Backend]', text.trim());
      if (text.includes('listening') && !started) {
        started = true;
        resolve();
      }
    });

    backendProc.stderr.on('data', (data) => {
      console.error('[Backend Error]', data.toString().trim());
    });

    backendProc.on('error', (err) => {
      console.error('[Backend Spawn Error]', err.message);
    });

    backendProc.on('exit', (code) => {
      console.log(`[Backend] exited with code ${code}`);
    });

    setTimeout(() => {
      if (!started) {
        started = true;
        resolve();
      }
    }, 4000);
  });
}

function startFrontend() {
  return new Promise((resolve) => {
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
        resolve();
      }
    });

    frontendProc.stderr.on('data', (data) => {
      console.error('[Frontend Error]', data.toString().trim());
    });

    frontendProc.on('error', (err) => {
      console.error('[Frontend Spawn Error]', err.message);
    });

    frontendProc.on('exit', (code) => {
      console.log(`[Frontend] exited with code ${code}`);
    });

    setTimeout(() => {
      if (!started) {
        started = true;
        resolve();
      }
    }, 4000);
  });
}

function createTray() {
  // Try to use the favicon as tray icon; fallback to a simple native image.
  let iconPath = resolveIconPath();
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      throw new Error('Empty tray icon');
    }
  } catch {
    // Create a 16x16 colored square as fallback
    const size = { width: 16, height: 16 };
    const canvas = require('electron').nativeImage.createEmpty();
    // Actually createFromNamedImage is not available, let's use a buffer
    // For simplicity, create a tiny 1x1 PNG buffer and scale it up
    // A valid minimal 1x1 PNG (transparent):
    const png1x1 = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    trayIcon = nativeImage.createFromBuffer(png1x1).resize({ width: 16, height: 16 });
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('VOX Desktop');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Show VOX',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ])
  );

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    frame: false,
    titleBarStyle: 'hidden',
    title: 'VOX',
    icon: resolveIconPath(),
    show: false,
  });

  if (state.maximized) {
    mainWindow.maximize();
  }

  mainWindow.loadURL('http://127.0.0.1:3000');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('resize', () => saveWindowState());
  mainWindow.on('move', () => saveWindowState());
  mainWindow.on('maximize', () => saveWindowState());
  mainWindow.on('unmaximize', () => saveWindowState());

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return;
    }
    saveWindowState();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('focus', () => {
    if (mainWindow) {
      mainWindow.webContents.send('focus-change', true);
      mainWindow.flashFrame(false);
    }
  });

  mainWindow.on('blur', () => {
    if (mainWindow) {
      mainWindow.webContents.send('focus-change', false);
    }
  });
}

async function start() {
  console.log('Starting VOX Desktop...');
  await startMySQL();
  await startBackend();
  await ensureViteBuild();
  await startFrontend();
  console.log('Servers ready. Opening window...');
  createWindow();
  createTray();

  // Global shortcut to show window
  globalShortcut.register('CommandOrControl+Shift+V', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

app.whenReady().then(start);

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (backendProc) backendProc.kill();
  if (frontendProc) frontendProc.kill();
  globalShortcut.unregisterAll();
  if (tray) tray.destroy();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else if (mainWindow) {
    mainWindow.show();
  }
});

// IPC handlers
ipcMain.on('notify', (_event, { title, body }) => {
  if (Notification.isSupported()) {
    const notif = new Notification({ title, body, icon: resolveIconPath() });
    notif.show();
  }
});

ipcMain.on('flash-frame', () => {
  if (mainWindow && !mainWindow.isFocused()) {
    mainWindow.flashFrame(true);
  }
});

ipcMain.on('minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('close', () => {
  if (mainWindow) mainWindow.close();
});
