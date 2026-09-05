import { inElectron, electronApi } from './electronBridge';
import { logger } from './logger';

export type SidecarQuality = {
  id: string;
  name: string;
  format: string;
  url: string;
};

export type SidecarParseData = {
  platformKey: string;
  platform: string;
  anchorName: string;
  title: string;
  isLive: boolean;
  liveUrl: string;
  qualities: SidecarQuality[];
  newCookies?: string | null;
};

export type SidecarPlatform = {
  key: string;
  label: string;
  class: string;
  available: boolean;
};

export type SidecarStatus = {
  ok: boolean;
  running: boolean;
  pong: { pong?: boolean; version?: string; python?: string; platforms?: number } | null;
  python?: string;
  bridge?: string;
  startedAt?: number | null;
  error?: string;
};

type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

async function readJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || `HTTP ${res.status}`);
  }
}

function sidecarUnavailableMessage(cause: string): string {
  return (
    `Python 边车不可用（${cause}）。请先启动：npm run sidecar 或 npm run dev:full` +
    `（需本机 Python 3.10+，见仓库根目录 requirements.txt）`
  );
}

/**
 * Electron：由主进程托管的 SidecarProcess（stdio JSON Lines）经 IPC 直达；
 * 浏览器：走 Vite 代理到 sidecar-server.mjs 的 HTTP 接口。两种宿主共用同一返回值契约。
 */

export async function fetchSidecarStatus(): Promise<SidecarStatus> {
  const api = electronApi();
  if (inElectron() && api) {
    try {
      const body = await api.sidecar.status();
      return { ok: true, running: Boolean(body.running), pong: body.pong ?? null, python: body.python, bridge: body.bridge, startedAt: body.startedAt };
    } catch (err: any) {
      return {
        ok: false,
        running: false,
        pong: null,
        error: sidecarUnavailableMessage(err?.message || 'IPC 调用失败'),
      };
    }
  }

  try {
    const res = await fetch('/api/status');
    const body = await readJson(res);
    if (!res.ok) {
      return { ok: false, running: false, pong: null, error: body.error || `HTTP ${res.status}` };
    }
    return body as SidecarStatus;
  } catch (err: any) {
    return {
      ok: false,
      running: false,
      pong: null,
      error: sidecarUnavailableMessage(err?.message || '网络错误'),
    };
  }
}

export async function fetchSidecarPlatforms(): Promise<SidecarPlatform[]> {
  const api = electronApi();
  if (inElectron() && api) {
    try {
      return (await api.sidecar.platforms()) as unknown as SidecarPlatform[];
    } catch (err: any) {
      throw new Error(sidecarUnavailableMessage(err?.message || 'IPC 调用失败'));
    }
  }

  const res = await fetch('/api/platforms');
  const body = await readJson(res);
  if (!res.ok || !body.ok) {
    throw new Error(body.error || sidecarUnavailableMessage(`HTTP ${res.status}`));
  }
  return body.data as SidecarPlatform[];
}

export async function parseViaSidecar(params: {
  url: string;
  cookies?: string | null;
  proxy?: string | null;
}): Promise<SidecarParseData> {
  const api = electronApi();
  if (inElectron() && api) {
    try {
      const data = await api.sidecar.parse({
        url: params.url,
        cookies: params.cookies || null,
        proxy: params.proxy || null,
      });
      return data as unknown as SidecarParseData;
    } catch (err: any) {
      // Electron IPC 错误消息形如 "Error invoking remote method 'sidecar:parse': <原因>"
      const msg = String(err?.message || '解析失败');
      throw new Error(msg.replace(/^Error invoking remote method '[^']+':\s*/, ''));
    }
  }

  let res: Response;
  try {
    res = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: params.url,
        cookies: params.cookies || null,
        proxy: params.proxy || null,
      }),
    });
  } catch (err: any) {
    throw new Error(sidecarUnavailableMessage(err?.message || '无法连接本地 API'));
  }

  const body = await readJson(res);
  if (!res.ok || !body.ok) {
    const msg = String(body.error || `解析失败 (HTTP ${res.status})`);
    if (res.status === 502 || res.status === 503) {
      throw new Error(msg);
    }
    throw new Error(msg);
  }
  return body.data as SidecarParseData;
}

let eventsStarted = false;

export function connectSidecarEvents(): () => void {
  const api = electronApi();

  if (inElectron() && api) {
    if (eventsStarted) return () => {};
    eventsStarted = true;
    const unsubscribe = api.sidecar.onLog(({ level, message }) => {
      const safeLevel = (['info', 'warn', 'error', 'success', 'debug'] as LogLevel[]).includes(
        level as LogLevel
      )
        ? (level as LogLevel)
        : 'info';
      if (message) {
        logger.addLog(safeLevel, 'PARSER', `[sidecar] ${message}`);
      }
    });
    return () => {
      unsubscribe();
      eventsStarted = false;
    };
  }

  if (eventsStarted || typeof EventSource === 'undefined') {
    return () => {};
  }
  eventsStarted = true;

  const es = new EventSource('/api/events');
  const onLog = (ev: MessageEvent) => {
    try {
      const data = JSON.parse(ev.data) as { level?: string; message?: string };
      const level = (data.level || 'info') as LogLevel;
      if (data.message) {
        logger.addLog(level, 'PARSER', `[sidecar] ${data.message}`);
      }
    } catch {
      /* ignore malformed sse */
    }
  };
  es.addEventListener('log', onLog);
  es.onerror = () => {
    // EventSource 会自动重连；避免刷屏
  };

  return () => {
    es.removeEventListener('log', onLog);
    es.close();
    eventsStarted = false;
  };
}
