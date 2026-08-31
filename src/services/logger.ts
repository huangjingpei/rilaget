import { EngineLog } from '../types';

type LogListener = (logs: EngineLog[]) => void;

class LoggerService {
  private logs: EngineLog[] = [];
  private listeners: Set<LogListener> = new Set();
  private maxLogs = 500;

  constructor() {
    this.addLog('info', 'DOWNLOADER', 'StreamGet JS Client Engine 初始化完成，等待任务指令...');
    this.addLog('debug', 'PARSER', '40+ 平台解析器规则库 (Douyin, TikTok, Bilibili, Huya, Douyu, etc.) 已就绪');
    this.addLog('info', 'RELAY', 'MediaMTX 转发中继子系统就绪，默认监听 rtmp://127.0.0.1:1935');
  }

  public addLog(
    level: EngineLog['level'],
    category: EngineLog['category'],
    message: string
  ) {
    const newLog: EngineLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }) + '.' + String(new Date().getMilliseconds()).padStart(3, '0'),
      level,
      category,
      message,
    };

    this.logs = [newLog, ...this.logs.slice(0, this.maxLogs - 1)];
    this.notify();
  }

  public getLogs(): EngineLog[] {
    return this.logs;
  }

  public clearLogs() {
    this.logs = [];
    this.notify();
  }

  public subscribe(listener: LogListener) {
    this.listeners.add(listener);
    listener(this.logs);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.logs));
  }
}

export const logger = new LoggerService();
