const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  notify: (title, body) => ipcRenderer.send('notify', { title, body }),
  flashFrame: () => ipcRenderer.send('flash-frame'),
  onFocusChange: (callback) => {
    ipcRenderer.on('focus-change', (_event, focused) => callback(focused));
  },
  windowControls: {
    minimize: () => ipcRenderer.send('minimize'),
    maximize: () => ipcRenderer.send('maximize'),
    close: () => ipcRenderer.send('close'),
    platform: process.platform,
  }
});
