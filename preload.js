const { contextBridge, ipcRenderer } = require('electron');

// Expose the resolved backend URL to the renderer BEFORE app scripts run, so
// the frontend (window.__VOX_CONFIG.apiBase) reads the correct server whether
// running locally or against a hosted backend (Option 1).
const VOXXmlConfig = (() => {
  try {
    return JSON.parse(process.env.VOX_APP_CONFIG || 'null');
  } catch {
    return null;
  }
})();

// __VOX_CONFIG is a snapshot at preload time. Renderer can ask electronAPI.getVoxConfig()
// for the latest (and re-resolve lazily). The snapshot still works for cases
// that read .apiBase synchronously at module load (legacy fallbacks).
// __VOX_CONFIG is a snapshot at preload time. Renderer can ask electronAPI.getVoxConfig()
// for the latest (and re-resolve lazily). The snapshot still works for cases
// that read .apiBase synchronously at module load (legacy fallbacks).
contextBridge.exposeInMainWorld('__VOX_CONFIG', VOXXmlConfig || { apiBase: 'http://127.0.0.1:4000', mode: 'local' });

contextBridge.exposeInMainWorld('electronAPI', {
  notify: (title, body) => ipcRenderer.send('notify', { title, body }),
  // Open the OS-level privacy settings for a device (microphone/camera).
  // Returns the URL that was opened (or null if the OS doesn't support it).
  openDeviceSettings: (kind) => ipcRenderer.invoke('open-device-settings', kind),
  flashFrame: () => ipcRenderer.send('flash-frame'),
  flashFrame: () => ipcRenderer.send('flash-frame'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  onFocusChange: (callback) => {
    ipcRenderer.on('focus-change', (_event, focused) => callback(focused));
  },
  onMaximizeChange: (callback) => {
    ipcRenderer.on('maximize-change', (_event, isMaximized) => callback(isMaximized));
  },
  windowControls: {
    minimize: () => ipcRenderer.send('minimize'),
    maximize: () => ipcRenderer.send('maximize'),
    close: () => ipcRenderer.send('close'),
    platform: process.platform,
    isMaximized: () => ipcRenderer.invoke('is-maximized'),
  },
  screenCapture: {
    getSources: () => ipcRenderer.invoke('screen-capture:get-sources'),
    select: (sourceId) => ipcRenderer.invoke('screen-capture:select', sourceId),
    cancel: () => ipcRenderer.invoke('screen-capture:cancel'),
    onRequest: (handler) => {
      const wrapped = () => handler();
      ipcRenderer.on('screen-capture:request', wrapped);
      return () => ipcRenderer.off('screen-capture:request', wrapped);
    },
    capture: (sourceId) => ipcRenderer.invoke('screen-capture:start-direct', sourceId),
  },
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    quitAndInstall: () => ipcRenderer.invoke('updater:quit-and-install'),
    getState: () => ipcRenderer.invoke('updater:state'),
    onState: (callback) => {
      const wrapped = (_event, state) => callback(state);
      ipcRenderer.on('updater:state', wrapped);
      return () => ipcRenderer.off('updater:state', wrapped);
    },
  },
  // Vox app config — the source of truth for "which server am I talking to?".
  voxConfig: {
    get: () => ipcRenderer.invoke('vox:get-config').then(normalizeConfig),
    set: (next) => ipcRenderer.invoke('vox:set-config', next).then((r) => ({ ...r, config: r.config ? normalizeConfig(r.config) : null })),
    reset: () => ipcRenderer.invoke('vox:reset-config').then((r) => ({ ...r, config: r.config ? normalizeConfig(r.config) : null })),
    testReachability: (url) => ipcRenderer.invoke('vox:test-reachability', url),
    onChanged: (callback) => {
      const wrapped = (_event, next) => callback(normalizeConfig(next));
      ipcRenderer.on('vox:config-changed', wrapped);
      return () => ipcRenderer.off('vox:config-changed', wrapped);
    },
  },
});

// Strip trailing slashes and coerce any error shape the main process returns.
function normalizeConfig(c) {
  if (!c || typeof c !== 'object') return null;
  const out = { ...c };
  if (typeof out.apiBase === 'string') out.apiBase = out.apiBase.replace(/\/$/, '');
  return out;
}