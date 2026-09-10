import { MonitoredAnchor, PlatformId } from '../types';
import { logger } from './logger';
import { loadStore, makePersister } from './persistence';
import { parseStreamUrl } from './streamParser';
import { cookieService } from './cookieService';
import { downloadEngine } from './downloadEngine';
import { settingsService } from './settingsService';

type AnchorListener = (anchors: MonitoredAnchor[]) => void;

function generateDefaultAvatar(name: string): string {
  const initial = (name || '主').slice(0, 1).toUpperCase();
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="%231e293b"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="48" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-weight="bold" fill="%2338bdf8">${encodeURIComponent(initial)}</text></svg>`;
}

function generateDefaultCover(): string {
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="%23090d16"/><circle cx="320" cy="180" r="40" fill="%231e293b"/><path d="M312 165 L335 180 L312 195 Z" fill="%2306b6d4"/></svg>`;
}

class AnchorService {
  private anchors: MonitoredAnchor[] = [];
  private listeners: Set<AnchorListener> = new Set();
  private timer: any = null;
  private isChecking = false;
  private hasLocalChanges = false;
  private persister = makePersister('anchors', () => this.anchors, 800);

  constructor() {
    this.initDefaultAnchors();
    void this.hydrate();
    this.startPolling();
  }

  private async hydrate() {
    const stored = await loadStore<MonitoredAnchor[]>('anchors');
    if (this.hasLocalChanges || !Array.isArray(stored)) return;
    // 过滤掉历史残留的原型假主播
    this.anchors = stored.filter(
      (a) =>
        !a.id.startsWith('anc_douyin_01') &&
        !a.id.startsWith('anc_bilibili_02') &&
        !a.id.startsWith('anc_kuaishou_03') &&
        !a.id.startsWith('anc_huya_04') &&
        !a.id.startsWith('anc_tiktok_05')
    );
    if (this.anchors.length > 0) {
      logger.addLog('info', 'MONITOR', `已从本地存储恢复 ${this.anchors.length} 位关注主播`);
    }
    this.notify();
  }

  private initDefaultAnchors() {
    this.anchors = [];
  }

  /** 启动后台真实开播轮询定时器 */
  private startPolling() {
    if (this.timer) clearInterval(this.timer);
    const intervalSec = Math.max(10, settingsService.getSettings().monitorCheckIntervalSeconds || 30);
    this.timer = setInterval(() => {
      void this.checkAllNow();
    }, intervalSec * 1000);
  }

  /** 对所有关注的主播执行真实开播状态检测与自动录制触发 */
  public async checkAllNow(): Promise<void> {
    if (this.isChecking || this.anchors.length === 0) return;
    this.isChecking = true;

    try {
      for (const anchor of [...this.anchors]) {
        await this.checkSingleAnchor(anchor);
      }
    } finally {
      this.isChecking = false;
    }
  }

  /** 检测单个主播的真实直播状态 */
  public async checkSingleAnchor(anchor: MonitoredAnchor): Promise<boolean> {
    const cookie = cookieService.getCookieForPlatform(anchor.platform);
    try {
      const parsed = await parseStreamUrl(anchor.url, cookie);
      const wasLive = anchor.isLive;
      const isNowLive = Boolean(parsed.isLive);

      let updatedAvatar = anchor.avatar;
      if (parsed.anchorAvatar && !parsed.anchorAvatar.includes('unsplash.com')) {
        updatedAvatar = parsed.anchorAvatar;
      }
      let updatedCover = anchor.coverUrl;
      if (parsed.coverUrl && !parsed.coverUrl.includes('unsplash.com')) {
        updatedCover = parsed.coverUrl;
      }

      const updatedName = parsed.anchorName && parsed.anchorName !== '直播间' && anchor.name.startsWith('主播_')
        ? parsed.anchorName
        : anchor.name;

      const updatedTitle = parsed.title || anchor.currentTitle;

      this.anchors = this.anchors.map((a) => {
        if (a.id === anchor.id) {
          return {
            ...a,
            name: updatedName,
            avatar: updatedAvatar,
            coverUrl: updatedCover,
            currentTitle: updatedTitle,
            isLive: isNowLive,
            lastCheckedAt: Date.now(),
            lastLiveTime: isNowLive ? '正在直播' : wasLive ? '刚刚下播' : a.lastLiveTime,
          };
        }
        return a;
      });

      // 状态变动事件处理
      if (!wasLive && isNowLive) {
        logger.addLog('success', 'MONITOR', `关注主播 [${updatedName}] 已经开播: ${updatedTitle}`);

        // 自动录制逻辑
        if (anchor.autoRecord && parsed.qualities.length > 0) {
          const isAlreadyRecording = downloadEngine.getTasks().some(
            (t) => t.url === anchor.url && (t.status === 'recording' || t.status === 'downloading')
          );

          if (!isAlreadyRecording) {
            const targetQuality =
              parsed.qualities.find((q) => q.id === anchor.qualityPreference) || parsed.qualities[0];
            downloadEngine.addTask(parsed, targetQuality);
            logger.addLog('info', 'MONITOR', `已为 [${updatedName}] 自动触发录制: ${targetQuality.name}`);

            this.anchors = this.anchors.map((a) =>
              a.id === anchor.id ? { ...a, totalRecordingsCount: (a.totalRecordingsCount || 0) + 1 } : a
            );
          }
        }
      } else if (wasLive && !isNowLive) {
        logger.addLog('warn', 'MONITOR', `主播 [${updatedName}] 直播已结束`);
      }

      this.persister.schedule();
      this.notify();
      return isNowLive;
    } catch (err: any) {
      // 解析失败可能为网络闪断或房间不存在，不抛出异常破坏轮询队列
      this.anchors = this.anchors.map((a) =>
        a.id === anchor.id ? { ...a, lastCheckedAt: Date.now() } : a
      );
      this.notify();
      return anchor.isLive;
    }
  }

  public addAnchor(data: Partial<MonitoredAnchor> & { url: string; name: string; platform: PlatformId }): MonitoredAnchor {
    this.hasLocalChanges = true;
    const defaultAvatar = generateDefaultAvatar(data.name);
    const defaultCover = generateDefaultCover();

    const newAnchor: MonitoredAnchor = {
      id: 'anc_' + Math.random().toString(36).substring(2, 9),
      platform: data.platform,
      roomId: data.roomId || 'room_' + Math.floor(Math.random() * 900000 + 100000),
      url: data.url,
      name: data.name,
      avatar: data.avatar || defaultAvatar,
      coverUrl: data.coverUrl || defaultCover,
      category: data.category || '综合',
      tags: data.tags || ['新关注'],
      isLive: false,
      currentTitle: data.currentTitle || '等待开播中...',
      viewerCount: 0,
      lastLiveTime: '未开播',
      autoRecord: data.autoRecord ?? true,
      qualityPreference: data.qualityPreference || 'origin_4k',
      recordFormat: data.recordFormat || 'flv',
      totalRecordingsCount: 0,
      checkIntervalSeconds: 30,
      lastCheckedAt: Date.now(),
    };

    this.anchors = [newAnchor, ...this.anchors];
    logger.addLog(
      'info',
      'MONITOR',
      `新增关注主播: [${newAnchor.platform.toUpperCase()}] ${newAnchor.name} (自动录制: ${newAnchor.autoRecord ? '开启' : '关闭'})`
    );
    this.persister.schedule();
    this.notify();

    // 异步在后台立即探测真实状态并刷新信息
    void this.checkSingleAnchor(newAnchor);

    return newAnchor;
  }

  public toggleAutoRecord(id: string) {
    this.hasLocalChanges = true;
    this.anchors = this.anchors.map((a) => {
      if (a.id === id) {
        const next = !a.autoRecord;
        logger.addLog('info', 'MONITOR', `主播 [${a.name}] 自动录制状态已切换为: ${next ? '开启' : '关闭'}`);
        return { ...a, autoRecord: next };
      }
      return a;
    });
    this.persister.schedule();
    this.notify();
  }

  public toggleLiveStatus(id: string) {
    this.hasLocalChanges = true;
    this.anchors = this.anchors.map((a) => {
      if (a.id === id) {
        const nextLive = !a.isLive;
        logger.addLog(
          nextLive ? 'success' : 'warn',
          'MONITOR',
          `主播 [${a.name}] 状态变更为: ${nextLive ? '🔴 开播中' : '⚪ 已下播'}`
        );
        return {
          ...a,
          isLive: nextLive,
          lastLiveTime: nextLive ? '刚刚开播' : '已下播',
        };
      }
      return a;
    });
    this.persister.schedule();
    this.notify();
  }

  public deleteAnchor(id: string) {
    this.hasLocalChanges = true;
    const anchor = this.anchors.find((a) => a.id === id);
    if (anchor) {
      logger.addLog('info', 'MONITOR', `取消关注主播: ${anchor.name}`);
    }
    this.anchors = this.anchors.filter((a) => a.id !== id);
    this.persister.schedule();
    this.notify();
  }

  public removeAnchor(id: string) {
    this.deleteAnchor(id);
  }

  public getAnchors(): MonitoredAnchor[] {
    return this.anchors;
  }

  public subscribe(listener: AnchorListener) {
    this.listeners.add(listener);
    listener(this.anchors);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.anchors));
  }
}

export const anchorService = new AnchorService();
