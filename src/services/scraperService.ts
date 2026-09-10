import { DanmakuMessage, PlatformId, StreamScrapeData } from '../types';
import { logger } from './logger';
import { electronApi, inElectron } from './electronBridge';

type ScraperListener = (data: StreamScrapeData) => void;

class ScraperService {
  private data: StreamScrapeData;
  private listeners: Set<ScraperListener> = new Set();
  private sessionStartTime: number = Date.now();

  constructor() {
    this.data = {
      roomId: '',
      url: '',
      headless: false,
      platform: 'douyin',
      anchorName: '未选择房间',
      liveTitle: '请在上方选择或输入要采集弹幕的直播间',
      viewerCountHistory: [],
      totalLikes: 0,
      danmakuCount: 0,
      giftValueTotal: 0,
      peakViewers: 0,
      danmakuList: [],
      isScraping: false,
    };
    this.initDanmakuBridge();
  }

  private initDanmakuBridge() {
    const api = electronApi();
    const isElec = inElectron();
    const hasBridge = isElec && !!api?.sidecar?.onDanmaku;
    console.log('[ScraperService] initDanmakuBridge:', { isElec, hasApi: !!api, hasSidecar: !!api?.sidecar, hasOnDanmaku: !!api?.sidecar?.onDanmaku });
    // 延迟写日志，等 logger 单例就绪
    setTimeout(() => {
      if (hasBridge) {
        logger.addLog('debug', 'MONITOR', '[弹幕桥] IPC 监听器已注册 ✓（Electron 环境）');
      } else {
        logger.addLog('warn', 'MONITOR', `[弹幕桥] 未注册：isElectron=${isElec}，window.streamget=${typeof window !== 'undefined' ? !!window.streamget : 'N/A'}`);
      }
    }, 500);
    if (hasBridge) {
      api!.sidecar.onDanmaku((packet) => {
        console.log('[ScraperService] onDanmaku packet received:', packet);
        this.handleIncomingPacket(packet);
      });
    }
  }

  private handleIncomingPacket(packet: StreamgetDanmakuPacket) {
    if (!packet || !packet.data) return;
    const raw = packet.data;
    const rawType = String(raw.type || '');

    if (rawType === 'RoomMessage') {
      const cnt = parseInt(String(raw.count || 0), 10);
      if (!isNaN(cnt) && cnt > 0) {
        this.pushViewerMetric(cnt);
      }
      return;
    }

    if (rawType === 'SystemMessage') {
      const msg = String(raw.content || '');
      if (msg) {
        logger.addLog('info', 'MONITOR', `[采集器] ${msg}`);
      }
      return;
    }

    const norm = this.normalizeMessage(raw);
    if (norm) {
      this.pushDanmaku(norm);
    }
  }

  private normalizeMessage(raw: any): DanmakuMessage | null {
    const rawType = String(raw.type || '');
    const id = `dm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = Date.now();
    const senderName = String(raw.name || raw.senderName || '热心观众').trim();
    const content = String(raw.content || '').trim();

    if (rawType === 'ChatMessage' || rawType === 'chat') {
      if (!content) return null;
      return { id, timestamp, senderName, content, type: 'chat' };
    }

    if (rawType === 'GiftMessage' || rawType === 'gift') {
      const giftName = String(raw.gift_name || raw.giftName || '礼物');
      const giftCount = parseInt(String(raw.gift_count || raw.giftCount || 1), 10) || 1;
      return {
        id,
        timestamp,
        senderName,
        content: content || `${giftName} x${giftCount}`,
        type: 'gift',
        giftName,
        giftCount,
      };
    }

    if (rawType === 'LikeMessage' || rawType === 'like') {
      const count = parseInt(String(raw.count || 1), 10) || 1;
      return {
        id,
        timestamp,
        senderName,
        content: content || `为直播间点赞了 ${count} 次`,
        type: 'like',
      };
    }

    if (rawType === 'MemberMessage' || rawType === 'enter') {
      return {
        id,
        timestamp,
        senderName,
        content: content || '进入直播间',
        type: 'enter',
      };
    }

    if (rawType === 'SocialMessage' || rawType === 'follow') {
      return {
        id,
        timestamp,
        senderName,
        content: content || '关注了直播间',
        type: 'follow',
      };
    }

    if (content) {
      return { id, timestamp, senderName, content, type: 'chat' };
    }

    return null;
  }

  public pushDanmaku(msg: DanmakuMessage) {
    this.data.danmakuList = [msg, ...this.data.danmakuList.slice(0, 300)];
    this.data.danmakuCount += 1;
    if (msg.type === 'gift') {
      this.data.giftValueTotal += (msg.giftCount || 1) * 10;
    } else if (msg.type === 'like') {
      this.data.totalLikes += 1;
    }
    this.notify();
  }

  public pushViewerMetric(count: number, likes?: number) {
    const timeStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.data.viewerCountHistory = [
      ...this.data.viewerCountHistory.slice(-15),
      { time: timeStr, count },
    ];
    this.data.peakViewers = Math.max(this.data.peakViewers, count);
    if (typeof likes === 'number') {
      this.data.totalLikes = likes;
    }
    this.notify();
  }

  public setTargetRoom(platform: PlatformId, roomId: string, anchorName: string, title: string, url?: string) {
    const targetUrl = url || (roomId.startsWith('http') ? roomId : this.data.url || '');
    this.data = {
      ...this.data,
      platform,
      roomId,
      url: targetUrl,
      anchorName,
      liveTitle: title,
      danmakuCount: 0,
      totalLikes: 0,
      danmakuList: [],
      viewerCountHistory: [],
    };
    this.sessionStartTime = Date.now();
    logger.addLog('info', 'MONITOR', `信息采集器切换目标直播间: [${platform}] ${anchorName} (${roomId})`);
    this.notify();
  }

  public setHeadless(headless: boolean) {
    this.data.headless = headless;
    this.notify();
  }

  public async toggleScraping() {
    if (!this.data.isScraping) {
      // 启动采集
      const targetUrl = this.data.url || (this.data.roomId.startsWith('http') ? this.data.roomId : '');
      console.log('[ScraperService] toggleScraping START — targetUrl:', targetUrl, 'data.url:', this.data.url, 'roomId:', this.data.roomId);
      if (!targetUrl) {
        logger.addLog('warn', 'MONITOR', '请先配置或选择包含有效直播间 URL 的目标');
        return;
      }

      this.data.isScraping = true;
      this.sessionStartTime = Date.now();
      this.notify();

      const api = electronApi();
      console.log('[ScraperService] toggleScraping — inElectron:', inElectron(), 'hasDanmakuStart:', !!api?.sidecar?.danmakuStart);
      if (inElectron() && api?.sidecar?.danmakuStart) {
        logger.addLog('info', 'MONITOR', `正在启动浏览器弹幕捕获: [${this.data.platform}] ${targetUrl}`);
        try {
          const result = await api.sidecar.danmakuStart({
            platform: this.data.platform,
            url: targetUrl,
            roomId: this.data.roomId,
            headless: this.data.headless !== false,
          });
          console.log('[ScraperService] danmakuStart result:', result);
          logger.addLog('success', 'MONITOR', `弹幕捕获引擎已就绪并开始实时监听`);
        } catch (err: any) {
          console.error('[ScraperService] danmakuStart error:', err);
          logger.addLog('error', 'MONITOR', `启动弹幕采集失败: ${err?.message || err}`);
          this.data.isScraping = false;
          this.notify();
        }
      } else {
        logger.addLog('warn', 'MONITOR', '当前在纯浏览器环境运行，真实弹幕包捕获需在客户端中运行');
      }
    } else {
      // 停止采集
      this.data.isScraping = false;
      this.notify();

      const api = electronApi();
      if (inElectron() && api?.sidecar?.danmakuStop) {
        try {
          await api.sidecar.danmakuStop({ roomId: this.data.roomId });
          logger.addLog('info', 'MONITOR', '弹幕采集器已停止');
        } catch {}
      }
    }
  }

  public clearDanmaku() {
    this.data.danmakuList = [];
    this.data.danmakuCount = 0;
    this.notify();
  }

  public exportDanmaku(format: 'json' | 'csv' | 'ass') {
    const list = this.data.danmakuList;
    let content = '';
    let mimeType = 'text/plain';
    const cleanAnchor = this.data.anchorName.replace(/[\\/:*?"<>|]/g, '_');
    let filename = `danmaku_${cleanAnchor}_${Date.now()}`;

    if (format === 'json') {
      content = JSON.stringify(list, null, 2);
      mimeType = 'application/json';
      filename += '.json';
    } else if (format === 'csv') {
      content = 'ID,Timestamp,Sender,Level,Type,Content\n' +
        list.map((m) => `"${m.id}","${new Date(m.timestamp).toISOString()}","${m.senderName}",${m.senderLevel || 0},"${m.type}","${m.content.replace(/"/g, '""')}"`).join('\n');
      mimeType = 'text/csv';
      filename += '.csv';
    } else if (format === 'ass') {
      const baseTime = list.length > 0 ? list[list.length - 1].timestamp : this.sessionStartTime;
      content = `[Script Info]
Title: StreamGet Danmaku Subtitles - ${cleanAnchor}
ScriptType: v4.00+
Collisions: Normal
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Danmaku,Microsoft YaHei,38,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,2,0,2,20,20,20,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
` + list.map((m, idx) => {
        const offsetSec = Math.max(0, Math.floor((m.timestamp - baseTime) / 1000));
        const startSec = offsetSec;
        const endSec = startSec + 8;
        const formatTime = (s: number) => `0:${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}.00`;
        return `Dialogue: 0,${formatTime(startSec)},${formatTime(endSec)},Danmaku,,0000,0000,0000,,{\\move(1920,${100 + (idx % 8) * 60},-200,${100 + (idx % 8) * 60})}${m.content}`;
      }).join('\n');
      mimeType = 'text/plain';
      filename += '.ass';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    logger.addLog('success', 'MONITOR', `成功导出 ${list.length} 条弹幕数据为 [${format.toUpperCase()}] 格式`);
  }

  public getData(): StreamScrapeData {
    return this.data;
  }

  public subscribe(listener: ScraperListener) {
    this.listeners.add(listener);
    listener(this.data);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.data));
  }
}

export const scraperService = new ScraperService();
