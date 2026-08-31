import React, { useState, useEffect } from 'react';
import {
  Settings,
  FolderOpen,
  Sliders,
  Shield,
  Cpu,
  Package,
  Terminal,
  Copy,
  Check,
  Download,
  ExternalLink,
  Code2,
  HardDrive,
  Radio,
  FileCode,
  Sun,
  Moon,
  Palette
} from 'lucide-react';
import { AppSettings } from '../../types';
import { settingsService } from '../../services/settingsService';
import { themeService, ThemeMode } from '../../services/themeService';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(settingsService.getSettings());
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(themeService.getTheme());
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'package'>('general');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activePackageTab, setActivePackageTab] = useState<'electron' | 'tauri' | 'scripts'>('electron');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const unsub = settingsService.subscribe((s) => {
      setSettings(s);
    });
    const unsubTheme = themeService.subscribe((t) => {
      setCurrentTheme(t);
    });
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

  const packageFiles = settingsService.getElectronPackagingCode();
  const electronMainCode = packageFiles[0].code;
  const tauriConfCode = packageFiles[1].code;

  const packageJsonScripts = `{
  "name": "rilaget-desktop",
  "version": "1.0.0",
  "main": "electron/main.cjs",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "electron:dev": "concurrently \\"vite\\" \\"wait-on http://localhost:3000 && electron .\\"",
    "electron:build:win": "vite build && electron-builder --win --x64",
    "electron:build:mac": "vite build && electron-builder --mac",
    "tauri:dev": "cargo tauri dev",
    "tauri:build": "cargo tauri build"
  }
}`;

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
                    <input
                      type="text"
                      value={settings.downloadPath}
                      onChange={(e) => handleUpdate({ downloadPath: e.target.value })}
                      className="w-full h-8 mt-1 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-[11px] focus:outline-none"
                    />
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
                    <span className="font-mono text-cyan-400 font-bold">{settings.monitorCheckIntervalSeconds} 秒</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <div>
                      <div className="text-slate-200 font-semibold">最大同时录制并发任务数</div>
                      <div className="text-[10px] text-slate-400">防止占用过高带宽与CPU</div>
                    </div>
                    <span className="font-mono text-cyan-400 font-bold">{settings.maxConcurrentDownloads} 路并发</span>
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
                    <span className="text-emerald-400 font-bold text-xs">已启用</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-slate-200 font-semibold">开机自动启动后台监控</div>
                      <div className="text-[10px] text-slate-400">Windows/macOS 自启录制守护</div>
                    </div>
                    <span className="text-cyan-400 font-bold text-xs">开机静默常驻</span>
                  </div>
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
            <div className="p-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => setActivePackageTab('electron')}
                  className={`px-2.5 py-1 rounded ${activePackageTab === 'electron' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
                >
                  Electron 主进程
                </button>
                <button
                  onClick={() => setActivePackageTab('tauri')}
                  className={`px-2.5 py-1 rounded ${activePackageTab === 'tauri' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
                >
                  Tauri 配置 (Rust)
                </button>
                <button
                  onClick={() => setActivePackageTab('scripts')}
                  className={`px-2.5 py-1 rounded ${activePackageTab === 'scripts' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
                >
                  package.json 脚本
                </button>
              </div>

              <button
                onClick={() =>
                  handleCopy(
                    'pkg',
                    activePackageTab === 'electron'
                      ? electronMainCode
                      : activePackageTab === 'tauri'
                      ? tauriConfCode
                      : packageJsonScripts
                  )
                }
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 border border-slate-700"
              >
                {copiedKey === 'pkg' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>复制当前代码</span>
              </button>
            </div>

            <div className="flex-1 p-3 bg-slate-950 font-mono text-[11px] text-slate-300 overflow-y-auto select-text">
              <pre className="whitespace-pre">
                {activePackageTab === 'electron'
                  ? electronMainCode
                  : activePackageTab === 'tauri'
                  ? tauriConfCode
                  : packageJsonScripts}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
