import { MonitoredAnchor, PlatformId } from '../types';
import { logger } from './logger';

type AnchorListener = (anchors: MonitoredAnchor[]) => void;

class AnchorService {
  private anchors: MonitoredAnchor[] = [];
  private listeners: Set<AnchorListener> = new Set();
  private timer: any = null;

  constructor() {
    this.initDefaultAnchors();
    this.startPolling();
  }

  private initDefaultAnchors() {
    this.anchors = [
      {
        id: 'anc_douyin_01',
        platform: 'douyin',
        roomId: '80017709309',
        url: 'https://live.douyin.com/80017709309',
        name: '东方甄选直播间',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        coverUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
        category: '电商带货',
        tags: ['重点关注', '全天轮播', '自动切片'],
        isLive: true,
        currentTitle: '【官方正品】全品类专场直播，点击右下角小黄车！',
        viewerCount: 48290,
        lastLiveTime: '2026-08-31 08:00',
        autoRecord: true,
        qualityPreference: 'origin_4k',
        recordFormat: 'flv',
        totalRecordingsCount: 14,
        checkIntervalSeconds: 30,
        lastCheckedAt: Date.now(),
      },
      {
        id: 'anc_bilibili_02',
        platform: 'bilibili',
        roomId: '5440',
        url: 'https://live.bilibili.com/5440',
        name: '虚拟偶像Official',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
        coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
        category: '虚拟主播',
        tags: ['音乐歌回', '深夜电台'],
        isLive: true,
        currentTitle: '【新歌歌回】周一晚间电台互动&全新原创曲首播！',
        viewerCount: 124500,
        lastLiveTime: '2026-08-31 19:30',
        autoRecord: true,
        qualityPreference: 'hd_1080p',
        recordFormat: 'mp4',
        totalRecordingsCount: 28,
        checkIntervalSeconds: 60,
        lastCheckedAt: Date.now(),
      },
      {
        id: 'anc_kuaishou_03',
        platform: 'kuaishou',
        roomId: '3x59rwycquq8e4k',
        url: 'https://live.kuaishou.com/u/3x59rwycquq8e4k',
        name: '户外大强哥',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
        category: '户外生活',
        tags: ['野钓', '生存挑战'],
        isLive: false,
        currentTitle: '深山野钓连竿挑战（已下播）',
        viewerCount: 0,
        lastLiveTime: '2026-08-30 22:15',
        autoRecord: false,
        qualityPreference: 'hd_1080p',
        recordFormat: 'ts',
        totalRecordingsCount: 6,
        checkIntervalSeconds: 45,
        lastCheckedAt: Date.now(),
      },
      {
        id: 'anc_huya_04',
        platform: 'huya',
        roomId: '99999',
        url: 'https://www.huya.com/99999',
        name: 'LPL官方赛事直播',
        avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
        coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
        category: '电子竞技',
        tags: ['官方赛事', '4K原画'],
        isLive: true,
        currentTitle: '【2026职业联赛】春季常规赛第一轮淘汰焦点对决',
        viewerCount: 389000,
        lastLiveTime: '2026-08-31 15:00',
        autoRecord: true,
        qualityPreference: 'origin_4k',
        recordFormat: 'flv',
        totalRecordingsCount: 52,
        checkIntervalSeconds: 30,
        lastCheckedAt: Date.now(),
      },
      {
        id: 'anc_tiktok_05',
        platform: 'tiktok',
        roomId: 'gameonlive',
        url: 'https://www.tiktok.com/@gameonlive/live',
        name: 'GamingMaster_Official',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
        category: 'Gaming',
        tags: ['Esports', 'Global'],
        isLive: true,
        currentTitle: '🏆 World Championship Finals Live Stream',
        viewerCount: 32410,
        lastLiveTime: '2026-08-31 12:00',
        autoRecord: false,
        qualityPreference: 'hd_1080p',
        recordFormat: 'flv',
        totalRecordingsCount: 3,
        checkIntervalSeconds: 60,
        lastCheckedAt: Date.now(),
      }
    ];
  }

  private startPolling() {
    this.timer = setInterval(() => {
      this.anchors = this.anchors.map((a) => ({
        ...a,
        lastCheckedAt: Date.now(),
        viewerCount: a.isLive ? Math.max(100, Math.floor(a.viewerCount + (Math.random() - 0.48) * 150)) : 0,
      }));
      this.notify();
    }, 15000);
  }

  public addAnchor(data: Partial<MonitoredAnchor> & { url: string; name: string; platform: PlatformId }): MonitoredAnchor {
    const newAnchor: MonitoredAnchor = {
      id: 'anc_' + Math.random().toString(36).substring(2, 9),
      platform: data.platform,
      roomId: data.roomId || 'room_' + Math.floor(Math.random() * 900000 + 100000),
      url: data.url,
      name: data.name,
      avatar: data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      coverUrl: data.coverUrl || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
      category: data.category || '综合',
      tags: data.tags || ['新增主播'],
      isLive: true,
      currentTitle: data.currentTitle || '精彩直播正在进行中...',
      viewerCount: Math.floor(2000 + Math.random() * 20000),
      lastLiveTime: '刚刚',
      autoRecord: data.autoRecord ?? true,
      qualityPreference: data.qualityPreference || 'origin_4k',
      recordFormat: data.recordFormat || 'flv',
      totalRecordingsCount: 0,
      checkIntervalSeconds: 30,
      lastCheckedAt: Date.now(),
    };

    this.anchors = [newAnchor, ...this.anchors];
    logger.addLog('info', 'MONITOR', `新增关注主播: [${newAnchor.platform.toUpperCase()}] ${newAnchor.name} (自动录制: ${newAnchor.autoRecord ? '开启' : '关闭'})`);
    this.notify();
    return newAnchor;
  }

  public toggleAutoRecord(id: string) {
    this.anchors = this.anchors.map((a) => {
      if (a.id === id) {
        const next = !a.autoRecord;
        logger.addLog('info', 'MONITOR', `主播 [${a.name}] 自动录制状态已切换为: ${next ? '开启' : '关闭'}`);
        return { ...a, autoRecord: next };
      }
      return a;
    });
    this.notify();
  }

  public toggleLiveStatus(id: string) {
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
          viewerCount: nextLive ? Math.floor(5000 + Math.random() * 25000) : 0,
          lastLiveTime: nextLive ? '刚刚' : a.lastLiveTime,
        };
      }
      return a;
    });
    this.notify();
  }

  public deleteAnchor(id: string) {
    const anchor = this.anchors.find((a) => a.id === id);
    if (anchor) {
      logger.addLog('info', 'MONITOR', `取消关注主播: ${anchor.name}`);
    }
    this.anchors = this.anchors.filter((a) => a.id !== id);
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
