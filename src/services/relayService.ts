import { RelayTask, RelayMode, PotPlayerConfig, RelayDestination } from '../types';
import { logger } from './logger';

type RelayListener = (task: RelayTask) => void;

class RelayService {
  private currentTask: RelayTask;
  private listeners: Set<RelayListener> = new Set();
  private statsTimer: any = null;

  constructor() {
    this.currentTask = {
      id: 'relay_single_task',
      name: '多平台流媒体转播任务',
      relayMode: 'mediamtx',
      sourceUrl: 'https://live.douyin.com/80017709309',
      sourcePlatform: 'douyin',
      anchorName: '东方甄选直播间',
      destinations: [
        {
          id: 'dst_1',
          name: 'MediaMTX 本地流服务器',
          protocol: 'mediamtx',
          targetUrl: 'rtmp://127.0.0.1:1935/live/rilaget_relay',
          streamKey: '',
          enabled: true,
        },
        {
          id: 'dst_2',
          name: 'B站第三方直播推流',
          protocol: 'rtmp',
          targetUrl: 'rtmp://live-push.bilivideo.com/live-bvc/',
          streamKey: '?streamname=live_xxx&key=yyy',
          enabled: false,
        }
      ],
      potplayerConfig: {
        windowTitle: 'StreamGet - 伴侣捕获视窗 [1080P60 无边框]',
        aspectRatio: '16:9',
        chromaKey: 'none',
        borderless: true,
        hideControlsOnIdle: true,
        hardwareDecoding: true,
        customPotPlayerPath: 'C:\\Program Files\\DAUM\\PotPlayer\\PotPlayerMini64.exe',
        autoTopmost: true,
        targetLiveCompanion: 'douyin_companion',
      },
      status: 'running',
      currentFps: 60,
      currentBitrateKbps: 4500,
      uptimeSeconds: 120,
      audioCodec: 'copy',
      videoCodec: 'copy',
      localPlaybackM3U8: 'http://127.0.0.1:8888/live/rilaget_relay/index.m3u8',
      localPlaybackWebRTC: 'http://127.0.0.1:8889/live/rilaget_relay',
      totalTransferredBytes: 1024 * 1024 * 65,
      droppedFrames: 0,
    };

    this.startStatsLoop();
  }

  private startStatsLoop() {
    this.statsTimer = setInterval(() => {
      if (this.currentTask.status === 'running') {
        const jitter = (Math.random() - 0.49) * 120;
        this.currentTask = {
          ...this.currentTask,
          uptimeSeconds: this.currentTask.uptimeSeconds + 2,
          currentBitrateKbps: Math.max(3200, Math.min(6500, Math.floor(this.currentTask.currentBitrateKbps + jitter))),
          currentFps: Math.random() > 0.1 ? 60 : 59,
          totalTransferredBytes: this.currentTask.totalTransferredBytes + (1024 * 1024 * 0.6),
        };
        this.notify();
      }
    }, 2000);
  }

  public getTask(): RelayTask {
    return this.currentTask;
  }

  public getTasks(): RelayTask[] {
    return [this.currentTask];
  }

  public switchRelayMode(mode: RelayMode) {
    if (this.currentTask.relayMode === mode) return;

    this.currentTask = {
      ...this.currentTask,
      relayMode: mode,
    };

    logger.addLog(
      'info',
      'RELAY',
      `切换转播方案为: ${mode === 'mediamtx' ? 'MediaMTX 流媒体推流' : 'PotPlayer 播放器 + 直播伴侣窗口捕获'}`
    );
    this.notify();
  }

  public updateTask(updates: Partial<RelayTask>) {
    this.currentTask = { ...this.currentTask, ...updates };
    this.notify();
  }

  public toggleRelay() {
    const isRunning = this.currentTask.status === 'running';
    const nextStatus = isRunning ? 'stopped' : 'running';

    this.currentTask = {
      ...this.currentTask,
      status: nextStatus,
      uptimeSeconds: nextStatus === 'running' ? 0 : this.currentTask.uptimeSeconds,
    };

    logger.addLog(
      nextStatus === 'running' ? 'success' : 'warn',
      'RELAY',
      nextStatus === 'running'
        ? `启动转播任务 [模式: ${this.currentTask.relayMode.toUpperCase()}]`
        : `停止转播任务 [模式: ${this.currentTask.relayMode.toUpperCase()}]`
    );
    this.notify();
  }

  public toggleDestination(dstId: string) {
    this.currentTask = {
      ...this.currentTask,
      destinations: this.currentTask.destinations.map((d) =>
        d.id === dstId ? { ...d, enabled: !d.enabled } : d
      ),
    };
    this.notify();
  }

  public addDestination(name: string, targetUrl: string, streamKey?: string) {
    const newDst: RelayDestination = {
      id: 'dst_' + Math.random().toString(36).substring(2, 7),
      name,
      protocol: 'rtmp',
      targetUrl,
      streamKey,
      enabled: true,
    };
    this.currentTask = {
      ...this.currentTask,
      destinations: [...this.currentTask.destinations, newDst],
    };
    logger.addLog('info', 'RELAY', `新增推流目标: ${name} (${targetUrl})`);
    this.notify();
  }

  public removeDestination(dstId: string) {
    this.currentTask = {
      ...this.currentTask,
      destinations: this.currentTask.destinations.filter((d) => d.id !== dstId),
    };
    this.notify();
  }

  public updatePotPlayerConfig(arg1: string | Partial<PotPlayerConfig>, arg2?: Partial<PotPlayerConfig>) {
    const updates = typeof arg1 === 'string' ? arg2 || {} : arg1;
    this.currentTask = {
      ...this.currentTask,
      potplayerConfig: {
        ...this.currentTask.potplayerConfig,
        ...updates,
      },
    };
    logger.addLog('info', 'RELAY', `更新 PotPlayer 捕获窗口参数: ${JSON.stringify(updates)}`);
    this.notify();
  }

  public generatePotPlayerCommand(taskArg?: RelayTask): string {
    const task = taskArg || this.currentTask;
    const streamUrl = task.sourceUrl.startsWith('http') || task.sourceUrl.startsWith('rtmp')
      ? task.sourceUrl
      : `rtmp://127.0.0.1:1935/live/${task.id}`;
    const potPath = task.potplayerConfig?.customPotPlayerPath || 'PotPlayerMini64.exe';
    const aspectParam = task.potplayerConfig?.aspectRatio === '9:16' ? '/aspect=9:16' : '/aspect=16:9';
    return `"${potPath}" "${streamUrl}" /title="${task.potplayerConfig?.windowTitle || 'StreamGet'}" /topmost /no-border ${aspectParam} /autoplay`;
  }

  public generatePotPlayerDeepLink(taskArg?: RelayTask): string {
    const task = taskArg || this.currentTask;
    const streamUrl = task.sourceUrl.startsWith('http') || task.sourceUrl.startsWith('rtmp')
      ? task.sourceUrl
      : `rtmp://127.0.0.1:1935/live/${task.id}`;
    return `potplayer://${encodeURIComponent(streamUrl)}`;
  }

  public subscribe(listener: RelayListener) {
    this.listeners.add(listener);
    listener(this.currentTask);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.currentTask));
  }
}

export const relayService = new RelayService();
