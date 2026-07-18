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

contextBridge.exposeInMainWorld('__VOX_CONFIG', VOXXmlConfig || { apiBase: 'http://127.0.0.1:4000', mode: 'local' });

contextBridge.exposeInMainWorld('electronAPI', {
  notify: (title, body) => ipcRenderer.send('notify', { title, body }),
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
});