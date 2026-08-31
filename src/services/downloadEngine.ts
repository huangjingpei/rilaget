import { DownloadStatus, DownloadTask, ParsedStreamResult, StreamQuality } from '../types';
import { logger } from './logger';
import confetti from 'canvas-confetti';

type TaskListener = (tasks: DownloadTask[]) => void;

class DownloadEngine {
  private tasks: DownloadTask[] = [];
  private listeners: Set<TaskListener> = new Set();
  private intervalId: any = null;

  constructor() {
    this.initInitialTasks();
    this.startLoop();
  }

  private initInitialTasks() {
    // Seed with realistic demo active & completed tasks so UI is vibrant right away
    const now = Date.now();
    this.tasks = [
      {
        id: 'task_douyin_01',
        url: 'https://live.douyin.com/80017709309',
        platform: 'douyin',
        platformName: '抖音',
        anchorName: '东方甄选直播间',
        anchorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        title: '【官方正品】全品类专场直播，点击右下角小黄车！',
        coverUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
        isLiveStream: true,
        quality: {
          id: 'origin_4k',
          name: '原画 (4K / 1080P60 极清)',
          resolution: '3840x2160',
          bitrate: '8500 kbps',
          fps: 60,
          format: 'flv',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        },
        status: 'recording',
        progress: 68,
        downloadedBytes: 1024 * 1024 * 780, // 780MB
        totalBytes: 1024 * 1024 * 1150, // 1.15GB
        speedBytesPerSec: 1024 * 1024 * 4.2, // 4.2 MB/s
        elapsedSeconds: 185,
        etaSeconds: 88,
        startTime: now - 185000,
        filePath: 'C:/StreamGet/Downloads/抖音_东方甄选_20260831_162000.flv',
        fileSizeFormatted: '780.0 MB / 1.15 GB',
        streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        segmentDurationMinutes: 60,
        segmentsCount: 1,
      },
      {
        id: 'task_bilibili_02',
        url: 'https://live.bilibili.com/5440',
        platform: 'bilibili',
        platformName: '哔哩哔哩',
        anchorName: '虚拟偶像Official',
        anchorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
        title: '【新歌歌回】周一晚间电台互动&全新原创曲首播！',
        coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
        isLiveStream: true,
        quality: {
          id: 'hd_1080p',
          name: '超清 (1080P 高码率)',
          resolution: '1920x1080',
          bitrate: '4500 kbps',
          fps: 60,
          format: 'flv',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        },
        status: 'completed',
        progress: 100,
        downloadedBytes: 1024 * 1024 * 1420,
        totalBytes: 1024 * 1024 * 1420,
        speedBytesPerSec: 0,
        elapsedSeconds: 340,
        etaSeconds: 0,
        startTime: now - 3600000,
        endTime: now - 3260000,
        filePath: 'C:/StreamGet/Downloads/B站_虚拟偶像Official_歌回录播.mp4',
        fileSizeFormatted: '1.42 GB',
        streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        segmentDurationMinutes: 60,
        segmentsCount: 1,
      },
      {
        id: 'task_huya_03',
        url: 'https://www.huya.com/99999',
        platform: 'huya',
        platformName: '虎牙直播',
        anchorName: 'LPL官方赛事直播',
        anchorAvatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
        title: '【2026职业联赛】春季常规赛第一轮淘汰焦点对决',
        coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
        isLiveStream: true,
        quality: {
          id: 'origin_4k',
          name: '原画 (4K / 1080P60 极清)',
          resolution: '3840x2160',
          bitrate: '8500 kbps',
          fps: 60,
          format: 'flv',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        },
        status: 'recording',
        progress: 34,
        downloadedBytes: 1024 * 1024 * 310,
        totalBytes: 1024 * 1024 * 910,
        speedBytesPerSec: 1024 * 1024 * 6.8, // 6.8 MB/s
        elapsedSeconds: 45,
        etaSeconds: 88,
        startTime: now - 45000,
        filePath: 'C:/StreamGet/Downloads/虎牙_LPL官方赛事_20260831.flv',
        fileSizeFormatted: '310.0 MB / 910 MB',
        streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        segmentDurationMinutes: 30,
        segmentsCount: 1,
      }
    ];
  }

  private startLoop() {
    this.intervalId = setInterval(() => {
      let changed = false;

      this.tasks = this.tasks.map((task) => {
        if (task.status === 'recording' || task.status === 'downloading') {
          changed = true;
          // Fluctuate speed realistically
          const speedVariance = (Math.random() - 0.5) * 1024 * 512;
          const currentSpeed = Math.max(1024 * 800, task.speedBytesPerSec + speedVariance);
          const addedBytes = currentSpeed;
          const newDownloaded = task.downloadedBytes + addedBytes;
          const newElapsed = task.elapsedSeconds + 1;

          if (task.isLiveStream) {
            // Live streams keep growing
            const newTotal = Math.max(newDownloaded + 1024 * 1024 * 400, task.totalBytes);
            const progress = Math.min(99, Math.floor((newDownloaded / newTotal) * 100));

            return {
              ...task,
              downloadedBytes: newDownloaded,
              totalBytes: newTotal,
              progress: progress,
              speedBytesPerSec: currentSpeed,
              elapsedSeconds: newElapsed,
              etaSeconds: 120,
              fileSizeFormatted: `${(newDownloaded / (1024 * 1024)).toFixed(1)} MB (录制中)`,
            };
          } else {
            // VOD download completes at 100%
            if (newDownloaded >= task.totalBytes) {
              logger.addLog('success', 'DOWNLOADER', `任务 [${task.title}] 下载完成!`);
              try {
                confetti({
                  particleCount: 50,
                  spread: 60,
                  origin: { y: 0.8 }
                });
              } catch (e) {}

              return {
                ...task,
                status: 'completed' as DownloadStatus,
                progress: 100,
                downloadedBytes: task.totalBytes,
                speedBytesPerSec: 0,
                elapsedSeconds: newElapsed,
                etaSeconds: 0,
                endTime: Date.now(),
                fileSizeFormatted: `${(task.totalBytes / (1024 * 1024)).toFixed(1)} MB`,
              };
            }

            const progress = Math.floor((newDownloaded / task.totalBytes) * 100);
            const remainingBytes = task.totalBytes - newDownloaded;
            const eta = Math.ceil(remainingBytes / (currentSpeed || 1));

            return {
              ...task,
              downloadedBytes: newDownloaded,
              progress: progress,
              speedBytesPerSec: currentSpeed,
              elapsedSeconds: newElapsed,
              etaSeconds: eta,
              fileSizeFormatted: `${(newDownloaded / (1024 * 1024)).toFixed(1)} MB / ${(task.totalBytes / (1024 * 1024)).toFixed(1)} MB`,
            };
          }
        }
        return task;
      });

      if (changed) {
        this.notify();
      }
    }, 1000);
  }

  public addTask(parsed: ParsedStreamResult, quality: StreamQuality): DownloadTask {
    const isLive = parsed.isLive;
    const initialTotal = isLive ? 1024 * 1024 * 800 : 1024 * 1024 * 350;
    const cleanTitle = parsed.title.replace(/[\\/:*?"<>|]/g, '_').substring(0, 30);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const ext = quality.format === 'm3u8' ? 'ts' : quality.format;
    const filename = `${parsed.platformName}_${parsed.anchorName}_${cleanTitle}_${dateStr}.${ext}`;

    const newTask: DownloadTask = {
      id: 'task_' + Math.random().toString(36).substring(2, 9),
      url: parsed.url,
      platform: parsed.platform,
      platformName: parsed.platformName,
      anchorName: parsed.anchorName,
      anchorAvatar: parsed.anchorAvatar,
      title: parsed.title,
      coverUrl: parsed.coverUrl,
      isLiveStream: isLive,
      quality: quality,
      status: isLive ? 'recording' : 'downloading',
      progress: 1,
      downloadedBytes: 1024 * 1024 * 5,
      totalBytes: initialTotal,
      speedBytesPerSec: 1024 * 1024 * 3.5,
      elapsedSeconds: 1,
      etaSeconds: 120,
      startTime: Date.now(),
      filePath: `C:/StreamGet/Downloads/${filename}`,
      fileSizeFormatted: '5.0 MB (初始化...)',
      streamUrl: quality.url,
      segmentDurationMinutes: 60,
      segmentsCount: 1,
    };

    this.tasks = [newTask, ...this.tasks];
    logger.addLog(
      'info',
      'DOWNLOADER',
      `创建并启动下载任务: [${parsed.platformName}] ${parsed.anchorName} - ${quality.name}`
    );
    this.notify();
    return newTask;
  }

  public pauseTask(id: string) {
    this.tasks = this.tasks.map((t) => {
      if (t.id === id) {
        logger.addLog('warn', 'DOWNLOADER', `暂停下载任务: ${t.title}`);
        return { ...t, status: 'paused' as DownloadStatus, speedBytesPerSec: 0 };
      }
      return t;
    });
    this.notify();
  }

  public resumeTask(id: string) {
    this.tasks = this.tasks.map((t) => {
      if (t.id === id) {
        logger.addLog('info', 'DOWNLOADER', `恢复下载任务: ${t.title}`);
        return {
          ...t,
          status: t.isLiveStream ? ('recording' as DownloadStatus) : ('downloading' as DownloadStatus),
          speedBytesPerSec: 1024 * 1024 * 3.2,
        };
      }
      return t;
    });
    this.notify();
  }

  public stopAndFinishTask(id: string) {
    this.tasks = this.tasks.map((t) => {
      if (t.id === id) {
        logger.addLog('success', 'DOWNLOADER', `手动保存并停止录制: ${t.title}`);
        return {
          ...t,
          status: 'completed' as DownloadStatus,
          progress: 100,
          speedBytesPerSec: 0,
          endTime: Date.now(),
          fileSizeFormatted: `${(t.downloadedBytes / (1024 * 1024)).toFixed(1)} MB (录制完成)`,
        };
      }
      return t;
    });
    this.notify();
  }

  public togglePauseTask(id: string) {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      if (task.status === 'paused') {
        this.resumeTask(id);
      } else {
        this.pauseTask(id);
      }
    }
  }

  public deleteTask(id: string) {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      logger.addLog('info', 'DOWNLOADER', `移除下载任务: ${task.title}`);
    }
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.notify();
  }

  public removeTask(id: string) {
    this.deleteTask(id);
  }

  public clearCompleted() {
    const count = this.tasks.filter((t) => t.status === 'completed').length;
    this.tasks = this.tasks.filter((t) => t.status !== 'completed');
    logger.addLog('info', 'DOWNLOADER', `清理了 ${count} 个已完成任务`);
    this.notify();
  }

  public getTasks(): DownloadTask[] {
    return this.tasks;
  }

  public subscribe(listener: TaskListener) {
    this.listeners.add(listener);
    listener(this.tasks);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.tasks));
  }
}

export const downloadEngine = new DownloadEngine();
