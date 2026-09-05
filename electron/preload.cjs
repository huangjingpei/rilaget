const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('streamget', {
  isElectron: true,
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximized: (cb) => {
      const listener = (_event, value) => cb(value);
      ipcRenderer.on('window:maximized', listener);
      return () => ipcRenderer.removeListener('window:maximized', listener);
    },
  },
  sidecar: {
    status: () => ipcRenderer.invoke('sidecar:status'),
    platforms: () => ipcRenderer.invoke('sidecar:platforms'),
    parse: (payload) => ipcRenderer.invoke('sidecar:parse', payload),
    onLog: (cb) => {
      const listener = (_event, data) => cb(data);
      ipcRenderer.on('sidecar:log', listener);
      return () => ipcRenderer.removeListener('sidecar:log', listener);
    },
  },
  store: {
    load: (key) => ipcRenderer.invoke('store:load', key),
    save: (key, data) => ipcRenderer.invoke('store:save', key, data),
  },
  dialog: {
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  },
  app: {
    setAutoStart: (enabled) => ipcRenderer.invoke('app:setAutoStart', enabled),
    getAutoStart: () => ipcRenderer.invoke('app:getAutoStart'),
    openPath: (target) => ipcRenderer.invoke('shell:openPath', target),
    getUserData: () => ipcRenderer.invoke('app:getUserData'),
  },
});
