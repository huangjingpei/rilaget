import React, { useState, useEffect } from 'react';
import {
  Settings,
  FolderOpen,
  FolderSearch,
  Shield,
  Cpu,
  HardDrive,
  Palette,
  Copy,
  Check,
  Sun,
  Moon,
  Code2,
  Power
} from 'lucide-react';
import { AppSettings } from '../../types';
import { settingsService } from '../../services/settingsService';
import { themeService, ThemeMode } from '../../services/themeService';
import { inElectron } from '../../services/electronBridge';

// 打包发布页内联展示真实工程文件（?raw 在构建时打包成文本，避免与磁盘文件脱节）
import electronMainRaw from '../../../electron/main.cjs?raw';
import electronPreloadRaw from '../../../electron/preload.cjs?raw';
import sidecarProcessRaw from '../../../server/sidecar-process.mjs?raw';
import sidecarServerRaw from '../../../server/sidecar-server.mjs?raw';
import bridgePyRaw from '../../../sidecar/bridge.py?raw';
import packageJsonRaw from '../../../package.json?raw';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(settingsService.getSettings());
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(themeService.getTheme());
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'package'>('general');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activePackageTab, setActivePackageTab] = useState<string>('main');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const isElectron = inElectron();

  useEffect(() => {
    const unsub = settingsService.subscribe((s) => {
      setSettings(s);
    });
    const unsubTheme = themeService.subscribe((t) => {
      setCurrentTheme(t);
    });
    settingsService.getAutoStart().then((v) => setAutoStart(Boolean(v)));
    return () => {
      unsub();
      unsubTheme();
    };
  }, []);

  const handleUpdate = (updates: Partial<AppSettings>) => {
    settingsService.updateSettings(updates);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleThemeChange = (theme: ThemeMode) => {
    themeService.setTheme(theme);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handlePickDirectory = async () => {
    const dir = await settingsService.pickDownloadDirectory();
    if (dir) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  const handleToggleAutoStart = async (enabled: boolean) => {
    const applied = await settingsService.setAutoStart(enabled);
    setAutoStart(applied);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const sourceFiles: { id: string; label: string; file: string; code: string }[] = [
    { id: 'main', label: 'Electron 主进程', file: 'electron/main.cjs', code: electronMainRaw },
    { id: 'preload', label: 'Electron Preload', file: 'electron/preload.cjs', code: electronPreloadRaw },
    { id: 'process', label: 'Sidecar 进程宿主', file: 'server/sidecar-process.mjs', code: sidecarProcessRaw },
    { id: 'server', label: 'Sidecar HTTP (开发)', file: 'server/sidecar-server.mjs', code: sidecarServerRaw },
    { id: 'bridge', label: 'Python Sidecar 桥', file: 'sidecar/bridge.py', code: bridgePyRaw },
    { id: 'pkg', label: 'package.json', file: 'package.json', code: packageJsonRaw },
  ];
  const activeFile = sourceFiles.find((f) => f.id === activePackageTab) || sourceFiles[0];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 space-y-3">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-white">系统核心参数与桌面端打包配置</h2>
              {savedSuccess && (
                <span className="px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 animate-pulse">
                  ✓ 设置已自动保存
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-3 py-1 rounded-md font-semibold transition-colors ${
              activeTab === 'general' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            通用与下载
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`px-3 py-1 rounded-md font-semibold transition-colors ${
              activeTab === 'appearance' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            界面与主题
          </button>
          <button
            onClick={() => setActiveTab('package')}
            className={`px-3 py-1 rounded-md font-semibold transition-colors ${
              activeTab === 'package' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            桌面端打包发布
          </button>
        </div>
      </div>

      {/* Tab Content Panels (Fixed Height) */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'general' && (
          <div className="grid grid-cols-2 gap-3 h-full">
            {/* Storage & Path */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 pb-2 border-b border-slate-800">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  <span>本地文件存储与格式配置</span>
                </span>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-400">录制文件存放目录</label>
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="text"
                        value={settings.downloadPath}
                        onChange={(e) =>
                          handleUpdate({ downloadPath: e.target.value, downloadDir: e.target.value })
                        }
                        className="flex-1 h-8 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-[11px] focus:outline-none min-w-0"
                      />
                      {isElectron ? (
                        <>
                          <button
                            onClick={handlePickDirectory}
                            title="弹出系统目录选择器"
                            className="h-8 px-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-medium flex items-center gap-1 shrink-0"
                          >
                            <FolderSearch className="w-3.5 h-3.5" />
                            选择
                          </button>
                          <button
                            onClick={() => settingsService.openDownloadsFolder()}
                            title="在资源管理器中打开该目录"
                            className="h-8 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium flex items-center gap-1 border border-slate-700 shrink-0"
                          >
                            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                            打开
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono shrink-0" title="Electron 桌面壳内可弹系统目录选择器">
                          浏览器模式
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400">默认封装输出容器</label>
                    <select
                      value={settings.defaultFormat}
                      onChange={(e) => handleUpdate({ defaultFormat: e.target.value as any })}
                      className="w-full h-8 mt-1 px-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                    >
                      <option value="mp4">MP4 (通用硬件加速标准容器)</option>
                      <option value="ts">TS (直播切片抗中断无损容器)</option>
                      <option value="flv">FLV (低延时流媒体原画)</option>
                      <option value="mkv">MKV (全轨道字幕无损合并)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400">优先录制清晰度</label>
                    <select
                      value={settings.defaultQuality}
                      onChange={(e) => handleUpdate({ defaultQuality: e.target.value as any })}
                      className="w-full h-8 mt-1 px-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                    >
                      <option value="origin_4k">原画 4K/2K 超高清优先</option>
                      <option value="1080p60">1080P 60FPS 蓝光优先</option>
                      <option value="720p">720P 高清 (节省磁盘)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-800">
                支持断点自动重连与自动命名模板生成
              </div>
            </div>

            {/* Performance & Network */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 pb-2 border-b border-slate-800">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span>性能加速与开播轮询策略</span>
                </span>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <div>
                      <div className="text-slate-200 font-semibold">硬件编解码加速 (GPU)</div>
                      <div className="text-[10px] text-slate-400">调用 NVENC / QSV / VideoToolbox</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.hardwareAcceleration}
                      onChange={(e) => handleUpdate({ hardwareAcceleration: e.target.checked })}
                      className="w-4 h-4 rounded text-cyan-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <div>
                      <div className="text-slate-200 font-semibold">开播轮询扫描间隔</div>
                      <div className="text-[10px] text-slate-400">后台自动检测主播上线频率</div>
                    </div>
                    <select
                      value={settings.monitorCheckIntervalSeconds}
                      onChange={(e) =>
                        handleUpdate({
                          monitorCheckIntervalSeconds: Number(e.target.value),
                          livePollingIntervalSeconds: Number(e.target.value),
                        })
                      }
                      className="h-7 px-1.5 bg-slate-900 border border-slate-700 rounded-md text-slate-200 font-mono text-xs focus:outline-none"
                    >
                      <option value={15}>15 秒</option>
                      <option value={30}>30 秒</option>
                      <option value={60}>60 秒</option>
                      <option value={120}>120 秒</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <div>
                      <div className="text-slate-200 font-semibold">最大同时录制并发任务数</div>
                      <div className="text-[10px] text-slate-400">防止占用过高带宽与CPU</div>
                    </div>
                    <select
                      value={settings.maxConcurrentDownloads}
                      onChange={(e) =>
                        handleUpdate({
                          maxConcurrentDownloads: Number(e.target.value),
                          concurrentDownloads: Number(e.target.value),
                        })
                      }
                      className="h-7 px-1.5 bg-slate-900 border border-slate-700 rounded-md text-slate-200 font-mono text-xs focus:outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 8].map((n) => (
                        <option key={n} value={n}>
                          {n} 路并发
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-800">
                支持后台静默运行与 Windows 托盘常驻
              </div>
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="grid grid-cols-2 gap-3 h-full">
            {/* Theme Selector */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 pb-2 border-b border-slate-800">
                  <Palette className="w-4 h-4 text-cyan-400" />
                  <span>全局视觉与主题风格切换</span>
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                      currentTheme === 'dark'
                        ? 'bg-slate-950 border-cyan-500 text-cyan-300 ring-1 ring-cyan-500/50'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Moon className="w-6 h-6 text-cyan-400" />
                    <span className="text-xs font-bold">深色极客暗黑 (Dark)</span>
                    <span className="text-[10px] text-slate-500">专业夜间录制监控</span>
                  </button>

                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                      currentTheme === 'light'
                        ? 'bg-white text-slate-900 border-cyan-500 ring-1 ring-cyan-500/50'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sun className="w-6 h-6 text-amber-500" />
                    <span className="text-xs font-bold">明亮纯净浅色 (Light)</span>
                    <span className="text-[10px] text-slate-500">高对比清晰办公模式</span>
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-800">
                主题状态已持久化，也可随时在顶部导航栏右上角一键切换
              </div>
            </div>

            {/* Window & Desktop Behavior */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 pb-2 border-b border-slate-800">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>桌面客户端视窗与托盘行为</span>
                </span>

                <div className="space-y-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-slate-200 font-semibold">关闭窗口时最小化至托盘</div>
                      <div className="text-[10px] text-slate-400">保持后台持续录制，不中断任务</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.minimizeToTray !== false}
                      onChange={(e) => handleUpdate({ minimizeToTray: e.target.checked })}
                      className="w-4 h-4 rounded text-cyan-500"
                      title="关闭窗口时隐藏到托盘，而非退出应用"
                    />
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-slate-200 font-semibold">开机自动启动后台监控</div>
                      <div className="text-[10px] text-slate-400">
                        {isElectron
                          ? '通过系统登录项注册，随系统启动静默常驻'
                          : '浏览器模式下仅保存偏好，Electron 壳内生效'}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoStart}
                      onChange={(e) => handleToggleAutoStart(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-500"
                      title="开机自动启动 StreamGet"
                    />
                  </div>

                  {isElectron && (
                    <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-[10px] text-slate-500">
                      <Power className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>
                        托盘菜单支持“显示主窗口 / 退出”；退出托盘项会真正结束进程并停止 sidecar。
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-800">
                右上角视窗控制按钮已适配桌面操作系统快捷标准
              </div>
            </div>
          </div>
        )}

        {activeTab === 'package' && (
          <div className="h-full flex flex-col rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden">
            <div className="p-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0 gap-2">
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg text-xs overflow-x-auto">
                {sourceFiles.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActivePackageTab(f.id)}
                    className={`px-2.5 py-1 rounded whitespace-nowrap transition-colors ${
                      activePackageTab === f.id ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono text-slate-500 hidden md:inline">{activeFile.file}</span>
                <button
                  onClick={() => handleCopy('pkg', activeFile.code)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 border border-slate-700"
                >
                  {copiedKey === 'pkg' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>复制文件内容</span>
                </button>
              </div>
            </div>

            <div className="px-2.5 pb-1.5 pt-1.5 bg-slate-950 border-b border-slate-800 text-[10px] text-slate-500 flex items-center gap-1.5 shrink-0">
              <Code2 className="w-3 h-3 text-cyan-500" />
              <span>已随工程落盘的真实文件（?raw 内联展示，与磁盘内容一致）</span>
            </div>

            <div className="flex-1 p-3 bg-slate-950 font-mono text-[11px] text-slate-300 overflow-y-auto select-text">
              <pre className="whitespace-pre">{activeFile.code}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
