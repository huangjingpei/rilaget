/**
 * Electron 渲染进程桥接工具：检测是否运行在 Electron 壳内，
 * 并提供对 preload 暴露的 `window.streamget` API 的类型安全访问。
 * 纯浏览器模式返回 null，调用方自行降级（HTTP / localStorage / 浏览器行为）。
 */

export type StreamgetApi = NonNullable<Window['streamget']>;

export function inElectron(): boolean {
  return typeof window !== 'undefined' && Boolean(window.streamget?.isElectron);
}

export function electronApi(): StreamgetApi | null {
  return window.streamget ?? null;
}
