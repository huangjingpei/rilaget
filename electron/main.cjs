const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage, session } = require('electron');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const { StreamRecorderManager } = require('./streamRecorder.cjs');

const STORE_KEYS = new Set(['settings', 'tasks', 'anchors', 'cookies']);

/* ------------------------------------------------------------------ */
/* 运行时生成托盘图标 PNG（cyan 圆角底 + 白色播放三角），避免依赖静态资源  */
/* ------------------------------------------------------------------ */
let _crcTable = null;
function crc32(buf) {
  if (!_crcTable) {
    _crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      _crcTable[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = _crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // raw scanlines with filter byte 0
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

function buildTrayPng() {
  const S = 16;
  const rgba = Buffer.alloc(S * S * 4); // 全透明
  const put = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= S || y >= S) return;
    const i = (y * S + x) * 4;
    rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = a;
  };
  // 圆形底（cyan #06b6d4），留 1px 边距
  const c = (S - 1) / 2;
  const R = S / 2 - 1;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = x - c;
      const dy = y - c;
      if (dx * dx + dy * dy <= R * R) put(x, y, 6, 182, 212);
    }
  }
  // 白色播放三角
  const t0 = { x: 6, y: 5 };
  const t1 = { x: 6, y: 10 };
  const t2 = { x: 11, y: 7.5 };
  const inTri = (px, py, a, b, d) => {
    const sign = (p1, p2, p3) => (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    const s1 = sign({ x: px + 0.5, y: py + 0.5 }, a, b);
    const s2 = sign({ x: px + 0.5, y: py + 0.5 }, b, d);
    const s3 = sign({ x: px + 0.5, y: py + 0.5 }, d, a);
    const neg = (s1 < 0) || (s2 < 0) || (s3 < 0);
    const pos = (s1 > 0) || (s2 > 0) || (s3 > 0);
    return !(neg && pos);
  };
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (inTri(x, y, t0, t1, t2)) put(x, y, 255, 255, 255);
    }
  }
  return encodePng(S, rgba);
}

let mainWindow = null;
let tray = null;
let sidecar = null;
let recorder = null;
let isQuitting = false;

function projectRoot() {
  // Python 无法从 app.asar 中执行 bridge.py；打包时 sidecar/** 会被解压到这里。
  return app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked')
    : path.join(__dirname, '..');
}

function storeDir() {
  const dir = path.join(app.getPath('userData'), 'store');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function storePath(key) {
  return path.join(storeDir(), `${key}.json`);
}

function readStore(key) {
  try {
    return JSON.parse(fs.readFileSync(storePath(key), 'utf8'));
  } catch {
    return null;
  }
}

function writeStore(key, data) {
  fs.writeFileSync(storePath(key), JSON.stringify(data, null, 2), 'utf8');
}

function readSettings() {
  return readStore('settings') || {};
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    title: 'StreamGet',
    titleBarStyle: 'hidden',
    backgroundColor: '#020617',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL || 'http://127.0.0.1:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('maximize', () => mainWindow.webContents.send('window:maximized', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window:maximized', false));

  mainWindow.on('close', (event) => {
    const settings = readSettings();
    const hideToTray = settings.minimizeToTray !== false;
    if (!isQuitting && hideToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createTray() {
  const icon = nativeImage.createFromBuffer(buildTrayPng());
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip('StreamGet');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ])
  );
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function registerIpc() {
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize();
  });
  ipcMain.handle('window:maximize', () => {
    if (!mainWindow) return false;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
    return mainWindow.isMaximized();
  });
  ipcMain.handle('window:close', () => {
    mainWindow?.close();
  });
  ipcMain.handle('window:isMaximized', () => Boolean(mainWindow?.isMaximized()));

  ipcMain.handle('sidecar:status', async () => {
    let pong = null;
    try {
      pong = await sidecar?.request('ping', {}, 4000);
    } catch {
      /* offline */
    }
    return { ok: true, pong, ...(sidecar?.snapshot() || { running: false }) };
  });
  ipcMain.handle('sidecar:platforms', async () => sidecar.request('platforms', {}, 8000));
  ipcMain.handle('sidecar:parse', async (_event, payload) => {
    const url = payload?.url;
    if (!url || typeof url !== 'string') {
      throw new Error('缺少 url 参数');
    }
    return sidecar.request('parse', {
      url,
      cookies: payload.cookies || null,
      proxy: payload.proxy || null,
    });
  });

  ipcMain.handle('store:load', (_event, key) => {
    if (!STORE_KEYS.has(key)) throw new Error('非法存储键');
    return readStore(key);
  });
  ipcMain.handle('store:save', (_event, key, data) => {
    if (!STORE_KEYS.has(key)) throw new Error('非法存储键');
    writeStore(key, data);
  });

  ipcMain.handle('dialog:selectDirectory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('app:setAutoStart', (_event, enabled) => {
    app.setLoginItemSettings({ openAtLogin: Boolean(enabled), openAsHidden: true });
    return app.getLoginItemSettings().openAtLogin;
  });
  ipcMain.handle('app:getAutoStart', () => app.getLoginItemSettings().openAtLogin);
  ipcMain.handle('shell:openPath', (_event, target) => {
    if (!target || typeof target !== 'string') return;
    return shell.openPath(target);
  });
  ipcMain.handle('app:getUserData', () => app.getPath('userData'));
  ipcMain.handle('shell:showItemInFolder', (_event, target) => {
    if (!target || typeof target !== 'string') return;
    shell.showItemInFolder(target);
  });

  ipcMain.handle('recorder:start', (_event, payload) => {
    return recorder?.start(payload);
  });
  ipcMain.handle('recorder:pause', (_event, taskId) => {
    return recorder?.pause(taskId);
  });
  ipcMain.handle('recorder:stop', (_event, taskId) => {
    return recorder?.stop(taskId);
  });

  ipcMain.handle('cookies:openLoginSession', async (_event, { url, domain }) => {
    return new Promise((resolve) => {
      const loginWin = new BrowserWindow({
        width: 960,
        height: 720,
        title: '登录以捕获平台 Cookie - StreamGet',
        parent: mainWindow || undefined,
        modal: true,
        webPreferences: {
          partition: 'persist:streamget_auth',
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      loginWin.loadURL(url);

      loginWin.on('closed', async () => {
        try {
          const authSession = session.fromPartition('persist:streamget_auth');
          const cookies = await authSession.cookies.get(domain ? { domain } : {});
          const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
          resolve({ ok: true, cookieString: cookieStr, count: cookies.length });
        } catch (e) {
          resolve({ ok: false, error: e.message });
        }
      });
    });
  });
}

async function startSidecar() {
  const { SidecarProcess } = await import('../server/sidecar-process.mjs');
  sidecar = new SidecarProcess({ root: projectRoot() });
  sidecar.on('log', (payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('sidecar:log', payload);
    }
    if (payload?.message) {
      console.log(`[sidecar:${payload.level || 'info'}] ${payload.message}`);
    }
  });
  sidecar.start();
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    registerIpc();
    await startSidecar();
    createWindow();
    recorder = new StreamRecorderManager(() => mainWindow);
    createTray();
  });

  app.on('before-quit', () => {
    isQuitting = true;
    sidecar?.stop();
    recorder?.destroy();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
}
