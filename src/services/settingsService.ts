import { AppSettings } from '../types';
import { logger } from './logger';
import { loadStore, saveStore } from './persistence';
import { electronApi, inElectron } from './electronBridge';

const LS_SETTINGS_KEY = 'rilaget_settings';

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
  proxyEnabled: true,
  proxyUrl: 'http://127.0.0.1:10808',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  ffmpegPath: 'ffmpeg',
  mediaMtxUrl: 'http://127.0.0.1:8889',
  livePollingIntervalSeconds: 30,
  enableSoundAlerts: true,
  theme: 'cyber',
  autoStartOnBoot: false,
  minimizeToTray: true,
  showDanmakuOverlay: true,
};

type SettingsListener = (settings: AppSettings) => void;

class SettingsService {
  private settings: AppSettings = DEFAULT_SETTINGS;
  private listeners: Set<SettingsListener> = new Set();
  private hasLocalChanges = false;

  constructor() {
    this.loadFromLocalStorage();
    void this.hydrateFromStore();
  }

  private loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(LS_SETTINGS_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      this.settings = DEFAULT_SETTINGS;
    }
  }

  /** Electron 主进程在关闭窗口时需要读 settings（如 minimizeToTray），
   *  故启动时从主进程 store 回灌一次，避免 localStorage 与磁盘不一致。 */
  private async hydrateFromStore() {
    const stored = await loadStore<AppSettings>('settings');
    if (!stored || this.hasLocalChanges) return;
    this.settings = { ...this.settings, ...stored };
    this.notify();
  }

  public getSettings(): AppSettings {
    return this.settings;
  }

  public updateSettings(updates: Partial<AppSettings>) {
    this.hasLocalChanges = true;
    this.settings = { ...this.settings, ...updates };
    try {
      localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      /* ignore */
    }
    void saveStore('settings', this.settings);
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

  /** Electron 内弹出系统目录选择器；浏览器模式不可用返回 null */
  public async pickDownloadDirectory(): Promise<string | null> {
    const api = electronApi();
    if (!inElectron() || !api) return null;
    const dir = await api.dialog.selectDirectory();
    if (dir) {
      this.updateSettings({ downloadDir: dir, downloadPath: dir });
    }
    return dir;
  }

  public async getAutoStart(): Promise<boolean> {
    const api = electronApi();
    if (inElectron() && api) {
      try {
        return await api.app.getAutoStart();
      } catch {
        /* fallthrough */
      }
    }
    return Boolean(this.settings.autoStartOnBoot);
  }

  public async setAutoStart(enabled: boolean): Promise<boolean> {
    const api = electronApi();
    this.updateSettings({ autoStartOnBoot: enabled });
    if (inElectron() && api) {
      try {
        const applied = await api.app.setAutoStart(enabled);
        this.updateSettings({ autoStartOnBoot: applied });
        return applied;
      } catch (err: any) {
        logger.addLog('warn', 'DOWNLOADER', `设置开机自启失败: ${err?.message || '未知错误'}`);
        return enabled;
      }
    }
    return enabled;
  }

  public async openDownloadsFolder(): Promise<void> {
    const api = electronApi();
    const dir = this.settings.downloadDir || this.settings.downloadPath;
    if (inElectron() && api) {
      try {
        await api.app.openPath(dir);
        return;
      } catch {
        /* fallthrough */
      }
    }
    logger.addLog('warn', 'DOWNLOADER', `浏览器模式无法打开本地目录: ${dir}`);
  }
}

export const settingsService = new SettingsService();
