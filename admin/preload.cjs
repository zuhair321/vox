const { contextBridge, ipcRenderer } = require('electron');

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
});
