import { DownloadStatus, DownloadTask, ParsedStreamResult, StreamQuality } from '../types';
import { logger } from './logger';
import { loadStore, makePersister } from './persistence';
import { settingsService } from './settingsService';
import { electronApi, inElectron } from './electronBridge';
import { parseStreamUrl } from './streamParser';
import { cookieService } from './cookieService';
import confetti from 'canvas-confetti';

type TaskListener = (tasks: DownloadTask[]) => void;

class DownloadEngine {
  private tasks: DownloadTask[] = [];
  private listeners: Set<TaskListener> = new Set();
  private hasLocalChanges = false;
  private persister = makePersister('tasks', () => this.tasks, 800);

  constructor() {
    this.initInitialTasks();
    void this.hydrate();
    this.initRecorderBridge();
  }

  /** 从主进程 store / localStorage 回灌任务列表 */
  private async hydrate() {
    const stored = await loadStore<DownloadTask[]>('tasks');
    if (this.hasLocalChanges || !Array.isArray(stored)) return;
    // 过滤掉历史残留的原型假任务
    const realTasks = stored.filter(
      (t) => !t.id.startsWith('task_douyin_01') && !t.id.startsWith('task_bilibili_02') && !t.id.startsWith('task_huya_03')
    );
    this.tasks = realTasks.map((t) => {
      if (t.status === 'recording' || t.status === 'downloading') {
        return { ...t, status: 'paused' as DownloadStatus, speedBytesPerSec: 0 };
      }
      return t;
    });
    if (this.tasks.length > 0) {
      logger.addLog('info', 'DOWNLOADER', `已从本地存储恢复 ${this.tasks.length} 条任务记录`);
    }
    this.notify();
  }

  private initInitialTasks() {
    this.tasks = [];
  }

  /** 监听来自 Electron 主进程的真实文件写盘与下载速度事件 */
  private initRecorderBridge() {
    const api = electronApi();
    if (inElectron() && api?.recorder) {
      api.recorder.onProgress((data) => {
        this.handleProgressUpdate(data);
      });
    }
  }

  private handleProgressUpdate(data: StreamRecorderProgressPayload) {
    let changed = false;
    this.tasks = this.tasks.map((task) => {
      if (task.id !== data.taskId) return task;
      changed = true;
      const isLive = task.isLiveStream;
      let progress = task.progress;
      if (!isLive && data.totalBytes > 0) {
        progress = Math.min(100, Math.floor((data.downloadedBytes / data.totalBytes) * 100));
      } else if (isLive && data.status === 'completed') {
        progress = 100;
      }

      const mb = (data.downloadedBytes / (1024 * 1024)).toFixed(1);
      let fileSizeFormatted = `${mb} MB`;
      if (isLive) {
        fileSizeFormatted = data.status === 'completed' ? `${mb} MB (录制完成)` : `${mb} MB (录制中)`;
      } else if (data.totalBytes > 0) {
        const totalMb = (data.totalBytes / (1024 * 1024)).toFixed(1);
        fileSizeFormatted = `${mb} MB / ${totalMb} MB`;
      }

      if (data.status === 'completed' && task.status !== 'completed') {
        logger.addLog('success', 'DOWNLOADER', `任务 [${task.title}] 录制/下载完成!`);
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
        } catch {}
      } else if (data.status === 'failed' && task.status !== 'failed') {
        logger.addLog('error', 'DOWNLOADER', `任务 [${task.title}] 录制失败: ${data.error || '网络异常'}`);
      }

      return {
        ...task,
        status: data.status as DownloadStatus,
        downloadedBytes: data.downloadedBytes,
        totalBytes: data.totalBytes || task.totalBytes,
        speedBytesPerSec: data.speedBytesPerSec,
        elapsedSeconds: data.elapsedSeconds,
        progress,
        fileSizeFormatted,
        endTime: data.status === 'completed' ? Date.now() : task.endTime,
      };
    });

    if (changed) {
      this.persister.schedule();
      this.notify();
    }
  }

  public addTask(parsed: ParsedStreamResult, quality: StreamQuality): DownloadTask {
    this.hasLocalChanges = true;
    const isLive = parsed.isLive;
    const initialTotal = isLive ? 0 : 0;
    const cleanTitle = parsed.title.replace(/[\\/:*?"<>|]/g, '_').substring(0, 30);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const ext = quality.format === 'm3u8' ? 'ts' : quality.format;
    const filename = `${parsed.platformName}_${parsed.anchorName}_${cleanTitle}_${dateStr}.${ext}`;
    const settings = settingsService.getSettings();
    const downloadDir = settings.downloadDir || settings.downloadPath || 'C:/StreamGet/Downloads';

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
      progress: 0,
      downloadedBytes: 0,
      totalBytes: initialTotal,
      speedBytesPerSec: 0,
      elapsedSeconds: 0,
      etaSeconds: 0,
      startTime: Date.now(),
      filePath: `${downloadDir}/${filename}`,
      fileSizeFormatted: '0.0 MB (就绪)',
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
    this.persister.schedule();
    this.notify();

    // 触发 Electron 主进程真实磁盘文件分块写入
    const api = electronApi();
    if (inElectron() && api?.recorder) {
      api.recorder.start({
        taskId: newTask.id,
        url: newTask.streamUrl,
        filePath: newTask.filePath,
      }).catch((err: any) => {
        logger.addLog('error', 'DOWNLOADER', `启动录制引擎失败: ${err?.message || err}`);
      });
    } else {
      logger.addLog('warn', 'DOWNLOADER', '当前运行于浏览器环境，完整录制文件落盘请在客户端中运行');
    }

    return newTask;
  }

  public pauseTask(id: string) {
    this.hasLocalChanges = true;
    this.tasks = this.tasks.map((t) => {
      if (t.id === id) {
        logger.addLog('warn', 'DOWNLOADER', `暂停下载任务: ${t.title}`);
        return { ...t, status: 'paused' as DownloadStatus, speedBytesPerSec: 0 };
      }
      return t;
    });

    const api = electronApi();
    if (inElectron() && api?.recorder) {
      api.recorder.pause(id).catch(() => {});
    }

    this.persister.schedule();
    this.notify();
  }

  public async resumeTask(id: string) {
    this.hasLocalChanges = true;
    const existing = this.tasks.find((t) => t.id === id);
    if (!existing) return;

    let targetTask: DownloadTask = existing;

    // 针对直播流任务，由于 CDN 鉴权 Token (wsSecret/wsTime/auth) 具有时效性，
    // 在恢复或重启时先执行一次 JIT 快速探测，获取最新有效推流地址
    if (targetTask.isLiveStream && targetTask.url) {
      logger.addLog('info', 'DOWNLOADER', `正在 JIT 刷新直播推流鉴权: [${targetTask.platformName}] ${targetTask.anchorName}`);
      try {
        const cookie = cookieService.getCookieForPlatform(targetTask.platform);
        const freshParsed = await parseStreamUrl(targetTask.url, cookie);
        if (!freshParsed.isLive || freshParsed.qualities.length === 0) {
          logger.addLog('warn', 'DOWNLOADER', `恢复录制失败：[${targetTask.anchorName}] 当前已下播`);
          this.tasks = this.tasks.map((t) =>
            t.id === id ? { ...t, status: 'completed' as DownloadStatus, speedBytesPerSec: 0 } : t
          );
          this.persister.schedule();
          this.notify();
          return;
        }

        const freshQuality =
          freshParsed.qualities.find((q) => q.id === targetTask.quality.id) || freshParsed.qualities[0];

        targetTask = {
          ...targetTask,
          streamUrl: freshQuality.url,
          quality: freshQuality,
          status: 'recording' as DownloadStatus,
        };
        logger.addLog('success', 'DOWNLOADER', `已为任务 [${targetTask.title}] 刷新有效推流地址 (${freshQuality.name})`);
      } catch (err: any) {
        logger.addLog('warn', 'DOWNLOADER', `推流地址刷新遇到异常，尝试使用原地址继续: ${err?.message || err}`);
      }
    }

    this.tasks = this.tasks.map((t) => {
      if (t.id === id) {
        logger.addLog('info', 'DOWNLOADER', `恢复下载任务: ${t.title}`);
        return {
          ...t,
          streamUrl: targetTask.streamUrl,
          quality: targetTask.quality,
          status: t.isLiveStream ? ('recording' as DownloadStatus) : ('downloading' as DownloadStatus),
        };
      }
      return t;
    });

    const api = electronApi();
    if (inElectron() && api?.recorder) {
      api.recorder.start({
        taskId: targetTask.id,
        url: targetTask.streamUrl,
        filePath: targetTask.filePath,
      }).catch((err: any) => {
        logger.addLog('error', 'DOWNLOADER', `启动录制器失败: ${err?.message || err}`);
      });
    }

    this.persister.schedule();
    this.notify();
  }

  public stopAndFinishTask(id: string) {
    this.hasLocalChanges = true;
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

    const api = electronApi();
    if (inElectron() && api?.recorder) {
      api.recorder.stop(id).catch(() => {});
    }

    this.persister.schedule();
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
    this.hasLocalChanges = true;
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      logger.addLog('info', 'DOWNLOADER', `移除下载任务: ${task.title}`);
    }

    const api = electronApi();
    if (inElectron() && api?.recorder) {
      api.recorder.stop(id).catch(() => {});
    }

    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.persister.schedule();
    this.notify();
  }

  public removeTask(id: string) {
    this.deleteTask(id);
  }

  public clearCompleted() {
    this.hasLocalChanges = true;
    const count = this.tasks.filter((t) => t.status === 'completed').length;
    this.tasks = this.tasks.filter((t) => t.status !== 'completed');
    logger.addLog('info', 'DOWNLOADER', `清理了 ${count} 个已完成任务`);
    this.persister.schedule();
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
