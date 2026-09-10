/**
 * electron/preload.cjs 暴露到渲染进程的 `window.streamget` API 类型声明。
 * 纯浏览器模式（Vite dev / 静态部署）下该对象不存在，调用前用 inElectron() 判断。
 */

type StreamgetSidecarLogPayload = {
  level: 'info' | 'warn' | 'error' | 'success' | 'debug';
  message: string;
  ts?: number;
};

type StreamgetSidecarParsePayload = {
  url: string;
  cookies?: string | null;
  proxy?: string | null;
};

type StreamgetSidecarStatus = {
  ok: boolean;
  running: boolean;
  pong: { pong?: boolean; version?: string; python?: string; platforms?: number } | null;
  python?: string;
  bridge?: string;
  startedAt?: number | null;
  error?: string;
};

type StreamRecorderProgressPayload = {
  taskId: string;
  downloadedBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  status: 'recording' | 'downloading' | 'completed' | 'paused' | 'failed';
  elapsedSeconds: number;
  filePath: string;
  error?: string;
};

interface Window {
  streamget?: {
    isElectron: true;
    window: {
      minimize: () => Promise<void>;
      maximize: () => Promise<boolean>;
      close: () => Promise<void>;
      isMaximized: () => Promise<boolean>;
      onMaximized: (cb: (maximized: boolean) => void) => () => void;
    };
    sidecar: {
      status: () => Promise<StreamgetSidecarStatus>;
      platforms: () => Promise<{ key: string; label: string; class: string; available: boolean }[]>;
      parse: (payload: StreamgetSidecarParsePayload) => Promise<Record<string, unknown>>;
      onLog: (cb: (data: StreamgetSidecarLogPayload) => void) => () => void;
    };
    store: {
      load: (key: 'settings' | 'tasks' | 'anchors' | 'cookies') => Promise<unknown | null>;
      save: (key: 'settings' | 'tasks' | 'anchors' | 'cookies', data: unknown) => Promise<void>;
    };
    dialog: {
      selectDirectory: () => Promise<string | null>;
    };
    recorder: {
      start: (payload: { taskId: string; url: string; filePath: string; headers?: Record<string, string> }) => Promise<{ ok: boolean; error?: string }>;
      pause: (taskId: string) => Promise<{ ok: boolean; error?: string }>;
      stop: (taskId: string) => Promise<{ ok: boolean; error?: string }>;
      onProgress: (cb: (data: StreamRecorderProgressPayload) => void) => () => void;
    };
    cookies: {
      openLoginSession: (payload: { url: string; domain?: string }) => Promise<{ ok: boolean; cookieString?: string; count?: number; error?: string }>;
    };
    app: {
      setAutoStart: (enabled: boolean) => Promise<boolean>;
      getAutoStart: () => Promise<boolean>;
      openPath: (target: string) => Promise<void>;
      showItemInFolder: (target: string) => Promise<void>;
      getUserData: () => Promise<string>;
    };
  };
}

/** Vite ?raw 文本导入（用于“打包发布”页内联展示真实工程文件） */
declare module '*.cjs?raw' {
  const content: string;
  export default content;
}
declare module '*.mjs?raw' {
  const content: string;
  export default content;
}
declare module '*.py?raw' {
  const content: string;
  export default content;
}
