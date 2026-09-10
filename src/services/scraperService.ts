import { DanmakuMessage, PlatformId, StreamScrapeData } from '../types';
import { logger } from './logger';

type ScraperListener = (data: StreamScrapeData) => void;

class ScraperService {
  private data: StreamScrapeData;
  private listeners: Set<ScraperListener> = new Set();
  private sessionStartTime: number = Date.now();

  constructor() {
    this.data = {
      roomId: '',
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

  public setTargetRoom(platform: PlatformId, roomId: string, anchorName: string, title: string) {
    this.data = {
      ...this.data,
      platform,
      roomId,
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

  public toggleScraping() {
    this.data.isScraping = !this.data.isScraping;
    if (this.data.isScraping) {
      this.sessionStartTime = Date.now();
    }
    logger.addLog(
      this.data.isScraping ? 'success' : 'warn',
      'MONITOR',
      `弹幕与数据采集器已${this.data.isScraping ? '启动' : '暂停'}`
    );
    this.notify();
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
