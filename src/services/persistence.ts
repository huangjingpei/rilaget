/**
 * 数据持久化：Electron 壳内走主进程 store IPC（userData/store/*.json），
 * 纯浏览器模式回退到 localStorage（key: rilaget_store_*）。
 * 两个通道的序列化结果一致，保证同一份业务代码可双端运行。
 */

import { inElectron } from './electronBridge';

export type StoreKey = 'settings' | 'tasks' | 'anchors' | 'cookies';

const LS_PREFIX = 'rilaget_store';

export async function loadStore<T>(key: StoreKey): Promise<T | null> {
  if (inElectron()) {
    try {
      const value = (await window.streamget!.store.load(key)) as T | null;
      return value ?? null;
    } catch {
      return null;
    }
  }
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}_${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function saveStore<T>(key: StoreKey, data: T): Promise<boolean> {
  if (inElectron()) {
    try {
      await window.streamget!.store.save(key, data);
      return true;
    } catch {
      /* Electron 主进程写盘失败时，仍回退到 localStorage 避免数据丢失。 */
    }
  }
  try {
    localStorage.setItem(`${LS_PREFIX}_${key}`, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export type Persister = {
  /** 合并多次变更，delay 毫秒内只写一次（尾随防抖） */
  schedule: () => void;
  /** 立即写盘并清空未执行的防抖定时器 */
  flushNow: () => void;
};

export function makePersister<T>(
  key: StoreKey,
  getData: () => T,
  delay = 1200
): Persister {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const write = () => {
    timer = null;
    void saveStore(key, getData());
  };
  return {
    schedule() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(write, delay);
    },
    flushNow() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      write();
    },
  };
}
