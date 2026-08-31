import { AppSettings } from '../types';
import { logger } from './logger';

const DEFAULT_SETTINGS: AppSettings = {
  downloadDir: 'C:/StreamGet/Downloads',
  downloadPath: 'C:/StreamGet/Downloads',
  concurrentDownloads: 3,
  maxConcurrentDownloads: 4,
  defaultFormat: 'mp4',
  defaultQuality: 'origin_4k',
  hardwareAcceleration: true,
  monitorCheckIntervalSeconds: 30,
  autoRemuxToMp4: true,
  deleteTsAfterRemux: true,
  proxyEnabled: false,
  proxyUrl: 'http://127.0.0.1:7890',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  ffmpegPath: 'ffmpeg',
  mediaMtxUrl: 'http://127.0.0.1:8889',
  livePollingIntervalSeconds: 30,
  enableSoundAlerts: true,
  theme: 'cyber',
  autoStartOnBoot: false,
  showDanmakuOverlay: true,
};

type SettingsListener = (settings: AppSettings) => void;

class SettingsService {
  private settings: AppSettings = DEFAULT_SETTINGS;
  private listeners: Set<SettingsListener> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('rilaget_settings');
      if (stored) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      this.settings = DEFAULT_SETTINGS;
    }
  }

  public getSettings(): AppSettings {
    return this.settings;
  }

  public updateSettings(updates: Partial<AppSettings>) {
    this.settings = { ...this.settings, ...updates };
    try {
      localStorage.setItem('rilaget_settings', JSON.stringify(this.settings));
    } catch (e) {}
    logger.addLog('info', 'DOWNLOADER', '系统配置参数已更新保存');
    this.notify();
  }

  public subscribe(listener: SettingsListener) {
    this.listeners.add(listener);
    listener(this.settings);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.settings));
  }

  // Generates Electron main.js template for cross-platform desktop wrapper
  public getElectronPackagingCode(): { filename: string; code: string }[] {
    return [
      {
        filename: 'electron/main.cjs',
        code: `const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    frame: false, // Frameless custom desktop titlebar
    titleBarStyle: 'hidden',
    backgroundColor: '#020617',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      webSecurity: false // Enables cross-origin stream inspection
    }
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Open external links in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Window control IPC handlers
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.close());

// Directory picker dialog
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });
  return result.filePaths[0];
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
`
      },
      {
        filename: 'src-tauri/tauri.conf.json',
        code: `{
  "package": {
    "productName": "StreamGet",
    "version": "1.0.0"
  },
  "build": {
    "distDir": "../dist",
    "devPath": "http://localhost:3000",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "tauri": {
    "bundle": {
      "active": true,
      "targets": "all",
      "identifier": "com.rilaget.desktop",
      "icon": ["icons/icon.png"]
    },
    "windows": [
      {
        "title": "StreamGet - 多平台视频直播录制客户端",
        "width": 1320,
        "height": 860,
        "resizable": true,
        "fullscreen": false,
        "decorations": false,
        "transparent": false
      }
    ]
  }
}`
      }
    ];
  }
}

export const settingsService = new SettingsService();
