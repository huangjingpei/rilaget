import React, { useEffect, useState } from 'react';
import {
  Download,
  Terminal,
  Radio,
  Minimize2,
  Square,
  Minus,
  X,
  Search,
  Sparkles,
  Layers,
  Sun,
  Moon,
  Check,
  Bell
} from 'lucide-react';
import { downloadEngine } from '../../services/downloadEngine';
import { relayService } from '../../services/relayService';
import { themeService, ThemeMode } from '../../services/themeService';
import { inElectron } from '../../services/electronBridge';

interface HeaderBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onToggleLogs: () => void;
  isLogOpen: boolean;
  onQuickParse: (url: string) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeTab,
  setActiveTab,
  onToggleLogs,
  isLogOpen,
  onQuickParse,
}) => {
  const [totalSpeed, setTotalSpeed] = useState('0.0 KB/s');
  const [activeDownloadCount, setActiveDownloadCount] = useState(0);
  const [activeRelayCount, setActiveRelayCount] = useState(0);
  const [quickInput, setQuickInput] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(themeService.getTheme());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const isElectron = inElectron();

  useEffect(() => {
    const unsubDown = downloadEngine.subscribe((tasks) => {
      const active = tasks.filter((t) => t.status === 'downloading' || t.status === 'recording');
      setActiveDownloadCount(active.length);
      const speedSum = active.reduce((acc, curr) => acc + (curr.speedBytesPerSec || 0), 0);
      if (speedSum > 1024 * 1024) {
        setTotalSpeed(`${(speedSum / (1024 * 1024)).toFixed(1)} MB/s`);
      } else {
        setTotalSpeed(`${(speedSum / 1024).toFixed(0)} KB/s`);
      }
    });

    const unsubRelay = relayService.subscribe((task) => {
      setActiveRelayCount(task && task.status === 'running' ? 1 : 0);
    });

    const unsubTheme = themeService.subscribe((t) => {
      setTheme(t);
    });

    let unsubMaximized: (() => void) | undefined;
    if (isElectron && window.streamget) {
      window.streamget.window.isMaximized().then(setIsMaximized).catch(() => {});
      unsubMaximized = window.streamget.window.onMaximized(setIsMaximized);
    }

    return () => {
      unsubDown();
      unsubRelay();
      unsubTheme();
      unsubMaximized?.();
    };
  }, [isElectron]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickInput.trim()) {
      onQuickParse(quickInput.trim());
      setQuickInput('');
      setActiveTab('downloader');
    }
  };

  const handleToggleTheme = () => {
    const newTheme = themeService.toggleTheme();
    showToast(newTheme === 'dark' ? '已切换至深色暗黑主题 (Dark Mode)' : '已切换至极简浅色明亮主题 (Light Mode)');
  };

  const handleMinimize = () => {
    if (isElectron && window.streamget) {
      window.streamget.window.minimize();
      return;
    }
    showToast('StreamGet 已最小化至后台托盘（浏览器预览模式仅作提示）');
  };

  const handleMaximize = () => {
    if (isElectron && window.streamget) {
      window.streamget.window.maximize().then(setIsMaximized).catch(() => {});
      return;
    }
    const willBeMax = !isMaximized;
    setIsMaximized(willBeMax);
    if (willBeMax) {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      showToast('窗口已最大化全屏呈现');
    } else {
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      showToast('窗口已还原标准尺寸');
    }
  };

  const handleClose = () => {
    if (isElectron && window.streamget) {
      // 主进程按 settings.minimizeToTray 决定是隐藏到托盘还是真正退出
      window.streamget.window.close();
      return;
    }
    showToast('StreamGet 客户端已转入后台系统托盘静默运行（浏览器预览模式仅作提示）');
  };

  return (
    <header
      className="h-12 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-3 flex items-center justify-between z-30 select-none relative app-drag"
      onDoubleClick={(e) => {
        if (!isElectron || !window.streamget) return;
        const target = e.target as HTMLElement;
        if (target.closest('button, input, textarea, select, a')) return;
        window.streamget.window.maximize().then(setIsMaximized).catch(() => {});
      }}
    >
      {/* Toast Notification Banner for Window / Theme feedback */}
      {toastMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900/95 text-cyan-300 border border-cyan-500/40 rounded-xl shadow-xl backdrop-blur-md text-xs font-medium flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-2">
          <Bell className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Left: Brand Logo & Title */}
      <div className="flex items-center gap-2.5 app-no-drag">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20 shrink-0">
          <Layers className="w-4 h-4 text-white" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-bold text-sm tracking-tight text-white font-mono">StreamGet</span>
          <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            v2.5 Pro GUI
          </span>
        </div>
      </div>

      {/* Center: Quick Stream URL Input */}
      <div className="flex-1 max-w-lg mx-4 app-no-drag">
        <form onSubmit={handleQuickSubmit} className="relative">
          <input
            type="text"
            placeholder="粘贴任意直播/视频链接快速解析 (支持 抖音/B站/快手/虎牙/TikTok/YouTube等)..."
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            className="w-full h-8 pl-8 pr-16 text-xs bg-slate-950/70 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all font-mono"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <button
            type="submit"
            className="absolute right-1 top-1 h-6 px-2 text-[11px] font-medium bg-cyan-600 hover:bg-cyan-500 text-white rounded flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            解析
          </button>
        </form>
      </div>

      {/* Right: Telemetry + Theme Switcher + Window Control Buttons */}
      <div className="flex items-center gap-2 app-no-drag">
        {/* Speed Meter Badge */}
        <div
          onClick={() => setActiveTab('downloader')}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/60 text-xs cursor-pointer hover:bg-slate-800 transition-colors"
          title="当前下载总带宽速度"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-mono font-semibold text-slate-200">{totalSpeed}</span>
          {activeDownloadCount > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
              {activeDownloadCount} 任务
            </span>
          )}
        </div>

        {/* MediaMTX Relay Status */}
        <div
          onClick={() => setActiveTab('relay')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs cursor-pointer transition-colors ${
            activeRelayCount > 0
              ? 'bg-purple-950/40 border-purple-800/60 text-purple-300 hover:bg-purple-900/40'
              : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
          }`}
          title="MediaMTX 中继推流与窗口抓取状态"
        >
          <Radio className={`w-3.5 h-3.5 ${activeRelayCount > 0 ? 'text-purple-400 animate-live-dot' : 'text-slate-500'}`} />
          <span className="text-[11px] font-medium">转播中继</span>
          {activeRelayCount > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-purple-500/20 text-purple-300 font-mono">
              {activeRelayCount}
            </span>
          )}
        </div>

        {/* Engine Terminal Log Button */}
        <button
          onClick={onToggleLogs}
          className={`h-7 px-2.5 rounded-md border flex items-center gap-1.5 text-xs font-medium transition-all ${
            isLogOpen
              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
              : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="切换引擎内核实时日志终端"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>内核日志</span>
        </button>

        {/* Theme Switcher Button (Dark / Light Toggle) */}
        <button
          onClick={handleToggleTheme}
          className="h-7 px-2.5 rounded-md border border-slate-700/60 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-medium transition-all"
          title={theme === 'dark' ? '切换至明亮浅色主题 (Light Mode)' : '切换至暗黑深色主题 (Dark Mode)'}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline text-[11px]">浅色</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline text-[11px]">深色</span>
            </>
          )}
        </button>

        {/* Subtle Vertical Divider before Window Controls */}
        <div className="h-5 w-px bg-slate-700/60 mx-1" />

        {/* Standard Desktop Window Control Buttons (Rightmost Position: Minimize, Maximize/Restore, Close) */}
        <div className="flex items-center gap-1 -mr-1 app-no-drag">
          {/* Minimize Button */}
          <button
            onClick={handleMinimize}
            title="最小化窗口"
            className="w-8 h-7 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Maximize / Restore Button */}
          <button
            onClick={handleMaximize}
            title={isMaximized ? '还原窗口' : '最大化窗口'}
            className="w-8 h-7 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center"
          >
            {isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Close Button with standard Desktop Red Hover Highlight */}
          <button
            onClick={handleClose}
            title="关闭窗口 (转入后台运行)"
            className="w-8 h-7 rounded hover:bg-rose-600 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
