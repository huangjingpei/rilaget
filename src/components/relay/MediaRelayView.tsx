import React, { useState, useEffect } from 'react';
import {
  Radio,
  Play,
  Pause,
  Tv,
  Activity,
  Copy,
  Check,
  Server,
  Zap,
  Layers,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Monitor,
  Smartphone,
  ExternalLink,
  Sparkles,
  Sliders,
  Terminal,
  RotateCw,
  Eye,
  Maximize2
} from 'lucide-react';
import { RelayTask, RelayMode, PlatformId } from '../../types';
import { relayService } from '../../services/relayService';
import { SUPPORTED_PLATFORMS, detectPlatformFromUrl } from '../../data/platforms';
import { PotPlayerCaptureWindow } from './PotPlayerCaptureWindow';

interface MediaRelayViewProps {
  onOpenPlayer: (url: string, title: string, isLive?: boolean) => void;
}

export const MediaRelayView: React.FC<MediaRelayViewProps> = ({ onOpenPlayer }) => {
  const [task, setTask] = useState<RelayTask>(relayService.getTask());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isCapturingOpen, setIsCapturingOpen] = useState(false);

  // Form local state
  const [sourceUrl, setSourceUrl] = useState(task.sourceUrl);
  const [anchorName, setAnchorName] = useState(task.anchorName);
  const [targetRtmpUrl, setTargetRtmpUrl] = useState(task.destinations[0]?.targetUrl || 'rtmp://127.0.0.1:1935/live/stream');
  const [windowTitle, setWindowTitle] = useState(task.potplayerConfig.windowTitle);
  const [aspectRatio, setAspectRatio] = useState(task.potplayerConfig.aspectRatio);
  const [chromaKey, setChromaKey] = useState(task.potplayerConfig.chromaKey);
  const [targetCompanion, setTargetCompanion] = useState(task.potplayerConfig.targetLiveCompanion);

  useEffect(() => {
    const unsub = relayService.subscribe((t: RelayTask) => {
      if (t) {
        setTask({ ...t });
      }
    });
    return unsub;
  }, []);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleModeSwitch = (newMode: RelayMode) => {
    relayService.switchRelayMode(newMode);
  };

  const handleSourceUrlChange = (url: string) => {
    setSourceUrl(url);
    const platform = detectPlatformFromUrl(url);
    relayService.updateTask({
      sourceUrl: url,
      sourcePlatform: platform.id,
    });
  };

  const handleSaveConfig = () => {
    relayService.updateTask({
      sourceUrl,
      anchorName,
      destinations: [
        {
          id: 'dest_master',
          name: '主推流中继',
          protocol: 'rtmp',
          targetUrl: targetRtmpUrl,
          enabled: task.relayMode === 'mediamtx',
        },
      ],
      potplayerConfig: {
        ...task.potplayerConfig,
        windowTitle,
        aspectRatio,
        chromaKey,
        targetLiveCompanion: targetCompanion,
      },
    });
  };

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const currentPlatformInfo = SUPPORTED_PLATFORMS.find((p) => p.id === task.sourcePlatform) || SUPPORTED_PLATFORMS[0];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 space-y-3">
      {/* Top Header & 1-of-2 Mode Selection Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20 shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">视频转播分发控制台</h2>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                单路通道 (二选一模式)
              </span>
              <span
                className={`text-[10px] px-2 py-0.2 rounded-full font-mono flex items-center gap-1 ${
                  task.status === 'running'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${task.status === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                {task.status === 'running' ? '转播运行中' : '已停止'}
              </span>
            </div>
          </div>
        </div>

        {/* 1-of-2 Mode Selector Radio Buttons */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => handleModeSwitch('potplayer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              task.relayMode === 'potplayer'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 ring-1 ring-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>📺 PotPlayer 伴侣窗口捕获</span>
            {task.relayMode === 'potplayer' && <span className="text-[9px] px-1 bg-cyan-800/80 rounded font-mono">生效中</span>}
          </button>

          <button
            onClick={() => handleModeSwitch('mediamtx')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              task.relayMode === 'mediamtx'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>🛰️ MediaMTX 协议推流中继</span>
            {task.relayMode === 'mediamtx' && <span className="text-[9px] px-1 bg-purple-800/80 rounded font-mono">生效中</span>}
          </button>
        </div>
      </div>

      {/* Main Split Panel (Left: Settings / Right: Live View & Output) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* Left: Stream Source & Mode Parameters (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3 min-h-0 overflow-hidden">
          {/* Stream Source Panel */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>转播直播源配置</span>
              </span>
              <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                平台: {currentPlatformInfo.name}
              </span>
            </div>

            <div className="space-y-1.5">
              <input
                type="text"
                value={sourceUrl}
                onChange={(e) => handleSourceUrlChange(e.target.value)}
                placeholder="输入直播源地址 (抖音/B站/快手/虎牙/TikTok/YouTube)..."
                className="w-full h-8 px-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={anchorName}
                  onChange={(e) => {
                    setAnchorName(e.target.value);
                    relayService.updateTask({ anchorName: e.target.value });
                  }}
                  placeholder="主播/频道名称"
                  className="flex-1 h-7 px-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                />
                <button
                  onClick={handleSaveConfig}
                  className="h-7 px-3 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
                >
                  应用源配置
                </button>
              </div>
            </div>
          </div>

          {/* Mode Specific Parameters Container */}
          <div className="flex-1 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between overflow-hidden">
            {task.relayMode === 'potplayer' ? (
              /* PotPlayer Mode Parameters */
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Tv className="w-4 h-4 text-cyan-400" />
                    <span>直播伴侣捕获视窗参数</span>
                  </span>
                  <span className="text-[10px] text-slate-400">供抖音/快手直播伴侣抓取</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400">目标直播伴侣类型</label>
                    <select
                      value={targetCompanion}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setTargetCompanion(val);
                        relayService.updatePotPlayerConfig({ targetLiveCompanion: val });
                      }}
                      className="w-full h-8 mt-1 px-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                    >
                      <option value="douyin_companion">抖音直播伴侣 (Douyin Live Companion)</option>
                      <option value="kuaishou_companion">快手直播伴侣 (Kuaishou Live Companion)</option>
                      <option value="obs">OBS Studio (窗口捕获 / Window Capture)</option>
                      <option value="wechat_helper">微信视频号助手 (WeChat Channels Helper)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400">画面比例锁定</label>
                      <select
                        value={aspectRatio}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setAspectRatio(val);
                          relayService.updatePotPlayerConfig({ aspectRatio: val });
                        }}
                        className="w-full h-8 mt-1 px-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                      >
                        <option value="16:9">16:9 横屏标准</option>
                        <option value="9:16">9:16 竖屏带货伴侣</option>
                        <option value="4:3">4:3 标清比例</option>
                        <option value="fill">拉伸全屏</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400">抠像底色 (Chroma Key)</label>
                      <select
                        value={chromaKey}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setChromaKey(val);
                          relayService.updatePotPlayerConfig({ chromaKey: val });
                        }}
                        className="w-full h-8 mt-1 px-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                      >
                        <option value="none">无 (默认纯黑)</option>
                        <option value="green">🟩 绿幕 (#00FF00)</option>
                        <option value="blue">🟦 蓝幕 (#0000FF)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400">视窗唯一标题 (用于伴侣识别)</label>
                    <input
                      type="text"
                      value={windowTitle}
                      onChange={(e) => {
                        setWindowTitle(e.target.value);
                        relayService.updatePotPlayerConfig({ windowTitle: e.target.value });
                      }}
                      className="w-full h-8 mt-1 px-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-[11px] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* MediaMTX Mode Parameters */
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-purple-400" />
                    <span>MediaMTX 协议推流中继参数</span>
                  </span>
                  <span className="text-[10px] text-slate-400">推送到本地或远端 RTMP/SRT 服务</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400">MediaMTX 推流目标地址</label>
                    <input
                      type="text"
                      value={targetRtmpUrl}
                      onChange={(e) => {
                        setTargetRtmpUrl(e.target.value);
                        handleSaveConfig();
                      }}
                      className="w-full h-8 mt-1 px-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-[11px] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400">推流协议</div>
                      <div className="text-xs font-bold text-purple-300 mt-0.5">RTMP / SRT / RTSP</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400">视频转码策略</div>
                      <div className="text-xs font-bold text-emerald-300 mt-0.5">无损 Direct Passthrough</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Action Bar */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <button
                onClick={() => relayService.toggleRelay()}
                className={`flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-all ${
                  task.status === 'running'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {task.status === 'running' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{task.status === 'running' ? '停止当前转播' : '立即启动转播'}</span>
              </button>

              <button
                onClick={() => onOpenPlayer(task.sourceUrl, task.anchorName, true)}
                className="h-9 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1 border border-slate-700 transition-colors"
                title="全屏预览原画直播"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>原画预览</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Live View Stage & Output Endpoints (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3 min-h-0 overflow-hidden">
          {/* Main Visual Stage */}
          <div className="flex-1 rounded-xl bg-slate-950 border border-slate-800 relative overflow-hidden flex flex-col min-h-0">
            {/* Live Video / Stage Simulator */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
              <div
                className={`w-full h-full flex flex-col items-center justify-center relative ${
                  task.potplayerConfig.chromaKey === 'green'
                    ? 'bg-green-600'
                    : task.potplayerConfig.chromaKey === 'blue'
                    ? 'bg-blue-600'
                    : 'bg-gradient-to-br from-slate-950 via-slate-900 to-black'
                }`}
              >
                {/* Visual Watermark / Live Badge */}
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10 text-[10px] text-white">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="font-bold">LIVE STAGE</span>
                  <span className="text-slate-400 font-mono">[{task.anchorName}]</span>
                </div>

                <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-black/60 text-cyan-400 border border-cyan-500/30 font-mono">
                    {task.currentFps} FPS • {task.currentBitrateKbps} kbps
                  </span>
                </div>

                {/* Stage Center Presentation */}
                <div className="text-center p-4 space-y-2 z-10">
                  <div className="w-12 h-12 mx-auto rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 animate-pulse">
                    {task.relayMode === 'potplayer' ? <Tv className="w-6 h-6" /> : <Server className="w-6 h-6" />}
                  </div>
                  <div className="text-sm font-bold text-white tracking-wide">
                    {task.relayMode === 'potplayer' ? '直播伴侣捕获视窗就绪' : 'MediaMTX 推流中继服务就绪'}
                  </div>
                  <p className="text-[11px] text-slate-300 max-w-sm mx-auto">
                    {task.relayMode === 'potplayer'
                      ? '在抖音/快手直播伴侣中【添加素材】->【窗口捕获】直接识别本窗口'
                      : `正在将 ${task.sourcePlatform.toUpperCase()} 直播流推送至 ${task.destinations[0]?.targetUrl}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Stage Quick Actions Bar */}
            <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
                <span>运行: <strong className="text-slate-200">{formatUptime(task.uptimeSeconds)}</strong></span>
                <span>流量: <strong className="text-slate-200">{formatBytes(task.totalTransferredBytes)}</strong></span>
              </div>

              {task.relayMode === 'potplayer' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsCapturingOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow transition-colors"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>弹出纯净捕获视窗 (ESC退出)</span>
                  </button>

                  <a
                    href={relayService.generatePotPlayerDeepLink()}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3 text-cyan-400" />
                    <span>唤起 PotPlayer</span>
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy('rtmp', task.destinations[0]?.targetUrl || '')}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    {copiedKey === 'rtmp' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>复制推流 RTMP</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Distribution / Capture Endpoints Card */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shrink-0 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>{task.relayMode === 'potplayer' ? '直播伴侣抓取指引' : '本地分发拉流地址 (MediaMTX Playback)'}</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {task.relayMode === 'potplayer' ? '极速零延迟' : '支持 WebRTC / HLS / RTMP'}
              </span>
            </div>

            {task.relayMode === 'potplayer' ? (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-semibold text-slate-400">1. 打开直播伴侣</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">点击「添加素材」</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-semibold text-slate-400">2. 选择窗口捕获</div>
                  <div className="text-[11px] text-cyan-300 mt-0.5">选择 StreamGet 视窗</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-semibold text-slate-400">3. 开启绿幕抠图</div>
                  <div className="text-[11px] text-emerald-300 mt-0.5">实现画中画透明转播</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="truncate mr-2">
                    <div className="text-[10px] text-slate-400">WebRTC WHEP (超低延迟 0.3s)</div>
                    <div className="text-[11px] font-mono text-cyan-300 truncate">{task.localPlaybackWebRTC}</div>
                  </div>
                  <button
                    onClick={() => handleCopy('whep', task.localPlaybackWebRTC)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    {copiedKey === 'whep' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="truncate mr-2">
                    <div className="text-[10px] text-slate-400">HLS M3U8 (多端通用分发)</div>
                    <div className="text-[11px] font-mono text-purple-300 truncate">{task.localPlaybackM3U8}</div>
                  </div>
                  <button
                    onClick={() => handleCopy('m3u8', task.localPlaybackM3U8)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    {copiedKey === 'm3u8' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pure Capture Window Fullscreen Modal (ESC to exit) */}
      {isCapturingOpen && (
        <PotPlayerCaptureWindow task={task} onClose={() => setIsCapturingOpen(false)} />
      )}
    </div>
  );
};
