import { DanmakuMessage, PlatformId, StreamScrapeData } from '../types';
import { logger } from './logger';

type ScraperListener = (data: StreamScrapeData) => void;

class ScraperService {
  private data: StreamScrapeData;
  private listeners: Set<ScraperListener> = new Set();
  private intervalId: any = null;

  constructor() {
    this.data = {
      roomId: '80017709309',
      platform: 'douyin',
      anchorName: '东方甄选直播间',
      liveTitle: '【官方正品】全品类专场直播，点击右下角小黄车！',
      viewerCountHistory: [
        { time: '16:00', count: 42100 },
        { time: '16:05', count: 44300 },
        { time: '16:10', count: 46800 },
        { time: '16:15', count: 48900 },
        { time: '16:20', count: 48290 },
      ],
      totalLikes: 1592000,
      danmakuCount: 1420,
      giftValueTotal: 3480,
      peakViewers: 52400,
      danmakuList: this.generateInitialDanmaku(),
      isScraping: true,
    };

    this.startLoop();
  }

  private generateInitialDanmaku(): DanmakuMessage[] {
    const now = Date.now();
    return [
      {
        id: 'msg_1',
        timestamp: now - 15000,
        senderName: '科技小迷弟',
        senderLevel: 12,
        senderBadge: '铁粉',
        content: '主播今天推荐的坚果礼盒还有货吗？',
        type: 'chat',
        color: '#ffffff',
      },
      {
        id: 'msg_2',
        timestamp: now - 12000,
        senderName: '追风少年99',
        senderLevel: 25,
        senderBadge: '榜3',
        content: '送出了 抖音一号 x1',
        type: 'gift',
        giftName: '抖音一号',
        giftCount: 1,
        color: '#f59e0b',
      },
      {
        id: 'msg_3',
        timestamp: now - 8000,
        senderName: '爱吃西瓜的猫',
        senderLevel: 8,
        content: '点赞了直播间 (连击 x50)',
        type: 'like',
        color: '#ec4899',
      },
      {
        id: 'msg_4',
        timestamp: now - 5000,
        senderName: '晴天小雨',
        senderLevel: 16,
        content: '音质画质都很清晰，StreamGet 直接录下来保存了！',
        type: 'chat',
        color: '#38bdf8',
      },
    ];
  }

  private startLoop() {
    this.intervalId = setInterval(() => {
      if (!this.data.isScraping) return;

      const randomTypes: DanmakuMessage['type'][] = ['chat', 'chat', 'chat', 'like', 'gift'];
      const chosenType = randomTypes[Math.floor(Math.random() * randomTypes.length)];
      const sampleSenders = ['星空漫步者', '流光溢彩', '前端狂热粉', '橙子气泡水', '北方有佳人', '极客张工', 'CyberRunner', '萌面大侠'];
      const sampleChats = [
        '666666 太给力了！',
        '主播这个背景音乐叫什么？',
        '已下单！支持主播！',
        '画面延迟好低，用的什么推流器？',
        '卡了刷新一下就好了',
        '期待明天的歌回专场',
        '弹幕采集功能真香，支持导出 ASS 字幕',
        '给主播点点关注不迷路'
      ];
      const sampleGifts = ['小心心', '棒棒糖', '嘉年华', '跑车', '火箭', '荧光棒'];

      const sender = sampleSenders[Math.floor(Math.random() * sampleSenders.length)];
      const now = Date.now();

      let newMsg: DanmakuMessage;

      if (chosenType === 'gift') {
        const gift = sampleGifts[Math.floor(Math.random() * sampleGifts.length)];
        newMsg = {
          id: 'msg_' + Math.random().toString(36).substring(2, 8),
          timestamp: now,
          senderName: sender,
          senderLevel: Math.floor(10 + Math.random() * 30),
          senderBadge: 'VIP',
          content: `送出了 ${gift} x${Math.floor(1 + Math.random() * 10)}`,
          type: 'gift',
          giftName: gift,
          giftCount: 1,
          color: '#fbbf24',
        };
        this.data.giftValueTotal += 20;
      } else if (chosenType === 'like') {
        newMsg = {
          id: 'msg_' + Math.random().toString(36).substring(2, 8),
          timestamp: now,
          senderName: sender,
          senderLevel: Math.floor(1 + Math.random() * 15),
          content: `为主播点了赞 👍`,
          type: 'like',
          color: '#f43f5e',
        };
        this.data.totalLikes += 15;
      } else {
        const chat = sampleChats[Math.floor(Math.random() * sampleChats.length)];
        newMsg = {
          id: 'msg_' + Math.random().toString(36).substring(2, 8),
          timestamp: now,
          senderName: sender,
          senderLevel: Math.floor(1 + Math.random() * 20),
          content: chat,
          type: 'chat',
          color: '#ffffff',
        };
      }

      this.data.danmakuList = [newMsg, ...this.data.danmakuList.slice(0, 150)];
      this.data.danmakuCount += 1;

      // Update viewer history every few ticks
      if (Math.random() > 0.7) {
        const timeStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const currentCount = Math.floor(45000 + (Math.random() - 0.4) * 8000);
        this.data.viewerCountHistory = [
          ...this.data.viewerCountHistory.slice(-9),
          { time: timeStr, count: currentCount },
        ];
        this.data.peakViewers = Math.max(this.data.peakViewers, currentCount);
      }

      this.notify();
    }, 1800);
  }

  public setTargetRoom(platform: PlatformId, roomId: string, anchorName: string, title: string) {
    this.data = {
      ...this.data,
      platform,
      roomId,
      anchorName,
      liveTitle: title,
      danmakuCount: 0,
      totalLikes: 10000,
      danmakuList: [],
      viewerCountHistory: [],
    };
    logger.addLog('info', 'MONITOR', `信息采集器切换目标直播间: [${platform}] ${anchorName} (${roomId})`);
    this.notify();
  }

  public toggleScraping() {
    this.data.isScraping = !this.data.isScraping;
    logger.addLog(
      this.data.isScraping ? 'success' : 'warn',
      'MONITOR',
      `弹幕与数据采集器已${this.data.isScraping ? '启动' : '暂停'}`
    );
    this.notify();
  }

  public clearDanmaku() {
    this.data.danmakuList = [];
    this.notify();
  }

  public exportDanmaku(format: 'json' | 'csv' | 'ass') {
    const list = this.data.danmakuList;
    let content = '';
    let mimeType = 'text/plain';
    let filename = `danmaku_${this.data.anchorName}_${Date.now()}`;

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
      content = `[Script Info]
Title: StreamGet Danmaku Subtitles - ${this.data.anchorName}
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
        const startSec = idx * 2;
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
