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
    danmakuStart: (payload) => ipcRenderer.invoke('sidecar:danmakuStart', payload),
    danmakuStop: (payload) => ipcRenderer.invoke('sidecar:danmakuStop', payload),
    danmakuStatus: () => ipcRenderer.invoke('sidecar:danmakuStatus'),
    onDanmaku: (cb) => {
      const listener = (_event, data) => cb(data);
      ipcRenderer.on('sidecar:danmaku', listener);
      return () => ipcRenderer.removeListener('sidecar:danmaku', listener);
    },
  },
  store: {
    load: (key) => ipcRenderer.invoke('store:load', key),
    save: (key, data) => ipcRenderer.invoke('store:save', key, data),
  },
  dialog: {
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  },
  recorder: {
    start: (payload) => ipcRenderer.invoke('recorder:start', payload),
    pause: (taskId) => ipcRenderer.invoke('recorder:pause', taskId),
    stop: (taskId) => ipcRenderer.invoke('recorder:stop', taskId),
    onProgress: (cb) => {
      const listener = (_event, data) => cb(data);
      ipcRenderer.on('stream:progress', listener);
      return () => ipcRenderer.removeListener('stream:progress', listener);
    },
  },
  cookies: {
    openLoginSession: (payload) => ipcRenderer.invoke('cookies:openLoginSession', payload),
  },
  app: {
    setAutoStart: (enabled) => ipcRenderer.invoke('app:setAutoStart', enabled),
    getAutoStart: () => ipcRenderer.invoke('app:getAutoStart'),
    openPath: (target) => ipcRenderer.invoke('shell:openPath', target),
    showItemInFolder: (target) => ipcRenderer.invoke('shell:showItemInFolder', target),
    getUserData: () => ipcRenderer.invoke('app:getUserData'),
  },
});
