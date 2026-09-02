import { EngineLog } from '../types';

type LogListener = (logs: EngineLog[]) => void;

class LoggerService {
  private logs: EngineLog[] = [];
  private listeners: Set<LogListener> = new Set();
  private maxLogs = 500;

  constructor() {
    this.addLog('info', 'PARSER', '前端已就绪。真实解析走 Python sidecar（npm run sidecar / npm run dev:full）');
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
