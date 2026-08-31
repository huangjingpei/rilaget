import React, { useState, useEffect, useRef } from 'react';
import {
  Monitor,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Tv,
  Eye,
  EyeOff,
  ExternalLink,
  Layers,
  Settings,
  HelpCircle,
  Sparkles,
  Smartphone,
  Shield,
  Play,
  Volume2,
  VolumeX,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Terminal,
  Share2
} from 'lucide-react';
import { RelayTask, PotPlayerConfig } from '../../types';
import { relayService } from '../../services/relayService';

interface PotPlayerCaptureWindowProps {
  task: RelayTask;
  onClose: () => void;
}

export const PotPlayerCaptureWindow: React.FC<PotPlayerCaptureWindowProps> = ({
  task,
  onClose,
}) => {
  const [config, setConfig] = useState<PotPlayerConfig>(task.potplayerConfig);
  const [isCleanMode, setIsCleanMode] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [activeGuideTab, setActiveGuideTab] = useState<'douyin' | 'kuaishou' | 'obs' | 'wechat'>('douyin');
  const [showGuide, setShowGuide] = useState(false);
  const [showCliModal, setShowCliModal] = useState(false);
  const [pipActive, setPipActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setConfig(task.potplayerConfig);
  }, [task]);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleConfigChange = (newValues: Partial<PotPlayerConfig>) => {
    const updated = { ...config, ...newValues };
    setConfig(updated);
    relayService.updatePotPlayerConfig(task.id, newValues);
  };

  const handleLaunchDeepLink = () => {
    const link = relayService.generatePotPlayerDeepLink(task);
    window.location.href = link;
    handleCopy('deeplink', link);
  };

  const handleOpenDetached = () => {
    const streamUrl = task.sourceUrl.startsWith('http')
      ? task.sourceUrl
      : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    const win = window.open(
      '',
      config.windowTitle,
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    );
    if (win) {
      win.document.title = config.windowTitle;
      win.document.body.style.margin = '0';
      win.document.body.style.backgroundColor = config.chromaKey === 'green' ? '#00FF00' : config.chromaKey === 'blue' ? '#0000FF' : '#000000';
      win.document.body.style.overflow = 'hidden';
      win.document.body.innerHTML = `
        <div style="width:100vw; height:100vh; display:flex; align-items:center; justify-content:center; background:${config.chromaKey === 'green' ? '#00FF00' : config.chromaKey === 'blue' ? '#0000FF' : '#000'};">
          <video autoplay loop muted playsinline style="max-width:100%; max-height:100%; object-fit:${config.aspectRatio === 'fill' ? 'fill' : 'contain'};" src="${streamUrl}"></video>
        </div>
      `;
    }
  };

  const potCommand = relayService.generatePotPlayerCommand(task);

  // Background style based on chromaKey
  const getBackdropBg = () => {
    switch (config.chromaKey) {
      case 'green':
        return 'bg-[#00FF00]';
      case 'blue':
        return 'bg-[#0000FF]';
      case 'black':
        return 'bg-black';
      default:
        return 'bg-slate-950';
    }
  };

  const getAspectClass = () => {
    switch (config.aspectRatio) {
      case '9:16':
        return 'aspect-[9/16] max-h-[70vh] w-auto mx-auto shadow-2xl rounded-lg overflow-hidden border border-slate-700/50';
      case '4:3':
        return 'aspect-[4/3] max-w-2xl w-full mx-auto shadow-2xl rounded-lg overflow-hidden border border-slate-700/50';
      case 'fill':
        return 'w-full h-full object-fill';
      case '16:9':
      default:
        return 'aspect-[16/9] w-full max-w-4xl mx-auto shadow-2xl rounded-lg overflow-hidden border border-slate-700/50';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col">
      {/* Top Studio Control Bar (Hidden when in pure clean capture mode) */}
      {!isCleanMode && (
        <div className="h-14 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0 shadow-md">
          {/* Left Title & Status */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  PotPlayer 演播室纯净呈现视窗
                  <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono border border-purple-500/30">
                    直播伴侣专用
                  </span>
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] text-emerald-400 font-mono">捕获流就绪 60FPS</span>
              </div>
              <div className="text-[11px] text-slate-400 truncate max-w-md font-mono flex items-center gap-1.5">
                <span>窗口名:</span>
                <strong className="text-cyan-300 bg-slate-950 px-1 rounded">{config.windowTitle}</strong>
                <button
                  onClick={() => handleCopy('winTitle', config.windowTitle)}
                  className="hover:text-white"
                  title="复制窗口标题供直播伴侣快速搜索"
                >
                  {copiedKey === 'winTitle' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Studio Controls */}
          <div className="flex items-center gap-2">
            {/* Aspect Ratio Selector */}
            <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800 text-xs font-mono">
              <button
                onClick={() => handleConfigChange({ aspectRatio: '16:9' })}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  config.aspectRatio === '16:9'
                    ? 'bg-purple-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="16:9 横屏标准直播画面"
              >
                16:9 横屏
              </button>
              <button
                onClick={() => handleConfigChange({ aspectRatio: '9:16' })}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                  config.aspectRatio === '9:16'
                    ? 'bg-purple-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="9:16 抖音/快手竖屏直播伴侣专享比例"
              >
                <Smartphone className="w-3 h-3" />
                <span>9:16 竖屏</span>
              </button>
              <button
                onClick={() => handleConfigChange({ aspectRatio: '4:3' })}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  config.aspectRatio === '4:3'
                    ? 'bg-purple-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                4:3
              </button>
            </div>

            {/* Chroma Key Selector */}
            <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-500 px-1.5 font-mono">底色:</span>
              <button
                onClick={() => handleConfigChange({ chromaKey: 'none' })}
                className={`px-2 py-1 rounded-lg text-[11px] ${
                  config.chromaKey === 'none' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                默认黑
              </button>
              <button
                onClick={() => handleConfigChange({ chromaKey: 'green' })}
                className={`px-2 py-1 rounded-lg text-[11px] flex items-center gap-1 ${
                  config.chromaKey === 'green' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-400 hover:bg-emerald-950/30'
                }`}
                title="绿幕底色 (方便直播伴侣一键色度抠图)"
              >
                <span className="w-2 h-2 rounded-full bg-[#00FF00]" />
                <span>绿幕</span>
              </button>
              <button
                onClick={() => handleConfigChange({ chromaKey: 'blue' })}
                className={`px-2 py-1 rounded-lg text-[11px] flex items-center gap-1 ${
                  config.chromaKey === 'blue' ? 'bg-blue-600 text-white font-bold' : 'text-blue-400 hover:bg-blue-950/30'
                }`}
                title="蓝幕底色"
              >
                <span className="w-2 h-2 rounded-full bg-[#0000FF]" />
                <span>蓝幕</span>
              </button>
            </div>

            {/* Action Buttons */}
            <button
              onClick={() => setIsCleanMode(true)}
              className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              title="隐藏全部边框和控制条，进入纯净捕获状态 (按 ESC 退出)"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>纯净捕获模式</span>
            </button>

            <button
              onClick={handleOpenDetached}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5"
              title="弹出独立无边框视窗供直播伴侣选择"
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span>独立视窗</span>
            </button>

            <button
              onClick={() => setShowGuide(!showGuide)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                showGuide
                  ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>伴侣抓取教程</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-900/50 hover:text-rose-300 text-slate-400 flex items-center justify-center border border-slate-700 text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Viewport Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* The Capture Canvas Container */}
        <div
          className={`flex-1 flex flex-col items-center justify-center p-4 relative ${getBackdropBg()} transition-colors duration-300 select-none`}
        >
          {/* Floating Exit Clean Mode Button (Shown when in clean mode) */}
          {isCleanMode && (
            <div className="absolute top-4 right-4 z-40 flex items-center gap-2 group opacity-20 hover:opacity-100 transition-opacity">
              <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-xs text-slate-300 flex items-center gap-2 shadow-2xl">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>纯净捕获视窗工作中 (按 ESC 退出)</span>
                <button
                  onClick={() => setIsCleanMode(false)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                >
                  恢复面板
                </button>
              </div>
            </div>
          )}

          {/* Video Stage Frame */}
          <div className={`relative bg-black flex items-center justify-center ${getAspectClass()}`}>
            <video
              ref={videoRef}
              src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
              autoPlay
              loop
              muted={isMuted}
              playsInline
              className={`w-full h-full ${config.aspectRatio === 'fill' ? 'object-fill' : 'object-contain'}`}
            />

            {/* In-Video Overlay (Watermark/Telemetry) only when NOT in pure clean mode */}
            {!isCleanMode && (
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[10px] font-mono text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>画质: 1080P60 原画硬解</span>
                  <span className="text-slate-600">|</span>
                  <span>比例: {config.aspectRatio}</span>
                  <span className="text-slate-600">|</span>
                  <span>伴侣抓取窗口: [{config.windowTitle.substring(0, 18)}...]</span>
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1.5 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 text-slate-300 hover:text-white"
                    title={isMuted ? '取消静音' : '静音'}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Companion Capture Tutorial Drawer */}
        {showGuide && !isCleanMode && (
          <div className="w-96 bg-slate-900 border-l border-slate-800 p-5 flex flex-col space-y-4 overflow-y-auto shrink-0 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                <span>直播伴侣窗口捕获实战指南</span>
              </h4>
              <button onClick={() => setShowGuide(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            {/* Guide Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-center">
              <button
                onClick={() => setActiveGuideTab('douyin')}
                className={`py-1 rounded-lg ${
                  activeGuideTab === 'douyin' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                抖音伴侣
              </button>
              <button
                onClick={() => setActiveGuideTab('kuaishou')}
                className={`py-1 rounded-lg ${
                  activeGuideTab === 'kuaishou' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                快手伴侣
              </button>
              <button
                onClick={() => setActiveGuideTab('obs')}
                className={`py-1 rounded-lg ${
                  activeGuideTab === 'obs' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                OBS Studio
              </button>
              <button
                onClick={() => setActiveGuideTab('wechat')}
                className={`py-1 rounded-lg ${
                  activeGuideTab === 'wechat' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                视频号助手
              </button>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 text-[11px] flex items-center justify-center font-mono">
                    1
                  </span>
                  <span>准备转播呈现窗口</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  保持当前窗口为【纯净捕获模式】或点击【独立视窗】，也可点击【唤起本地 PotPlayer】启动播放。
                </p>
                <div className="pt-1">
                  <button
                    onClick={() => handleCopy('winTitleStep', config.windowTitle)}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-cyan-300 flex items-center justify-between font-mono"
                  >
                    <span className="truncate">{config.windowTitle}</span>
                    <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1">
                      {copiedKey === 'winTitleStep' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      复制窗口名
                    </span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 text-[11px] flex items-center justify-center font-mono">
                    2
                  </span>
                  <span>在直播伴侣中添加【窗口】素材</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  打开{activeGuideTab === 'douyin' ? '抖音直播伴侣' : activeGuideTab === 'kuaishou' ? '快手直播伴侣' : 'OBS Studio'}，在下方素材面板点击【+ 添加素材】→ 选择【窗口】或【应用窗口】。
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 text-[11px] flex items-center justify-center font-mono">
                    3
                  </span>
                  <span>选择该捕获窗口</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  在窗口下拉列表中直接搜索或点击匹配带有 <strong className="text-white">StreamGet</strong> 或 <strong className="text-white">PotPlayer</strong> 的窗口即可！画面即可完美实时同屏呈现。
                </p>
                {config.chromaKey === 'green' && (
                  <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/30 text-[10px] text-emerald-300">
                    💡 提示：当前已开启绿幕底色，在伴侣中右键素材选择【色度抠图/绿幕抠像】即可实现透明画中画！
                  </div>
                )}
              </div>
            </div>

            {/* External PotPlayer Launcher Box */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 space-y-2">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>直接调用本地 PotPlayer 软件</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                如果您电脑已安装 PotPlayer 播放器，可直接一键协议唤起或复制 Windows 命令行：
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleLaunchDeepLink}
                  className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1 shadow"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>唤起 PotPlayer</span>
                </button>
                <button
                  onClick={() => setShowCliModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-mono"
                >
                  命令行
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status Bar (Hidden in Clean Mode) */}
      {!isCleanMode && (
        <div className="h-12 px-6 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>当前模式: PotPlayer 伴侣窗口捕获 (与 MediaMTX 推流互斥生效)</span>
            </span>
            <span className="text-slate-700">|</span>
            <span>源地址: <strong className="text-slate-300">{task.sourceUrl}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleCopy('cli', potCommand)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] flex items-center gap-1.5"
            >
              {copiedKey === 'cli' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>复制 PotPlayer 启动命令</span>
            </button>
          </div>
        </div>
      )}

      {/* CLI Command Modal */}
      {showCliModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-purple-400" />
                <span>PotPlayer 本地命令行启动参数</span>
              </h3>
              <button onClick={() => setShowCliModal(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              在 Windows 终端 (CMD / PowerShell) 或快捷方式中运行以下命令，即可一键以无边框置顶方式启动该直播流：
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-cyan-300 break-all select-all">
              {potCommand}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => handleCopy('cli_modal', potCommand)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
              >
                {copiedKey === 'cli_modal' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                <span>复制命令</span>
              </button>
              <button
                onClick={() => setShowCliModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
