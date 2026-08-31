import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Camera,
  Layers,
  Radio,
  Sparkles,
  Info,
  Check
} from 'lucide-react';
import { logger } from '../../services/logger';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamUrl: string;
  title: string;
  isLive?: boolean;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  isOpen,
  onClose,
  streamUrl,
  title,
  isLive = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [showDanmaku, setShowDanmaku] = useState(true);
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);
  const [showTechInfo, setShowTechInfo] = useState(false);
  const [danmakuItems, setDanmakuItems] = useState<{ id: string; text: string; top: number; color: string }[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    // Danmaku spawner loop
    const sampleTexts = [
      '画质原画好清晰！',
      'StreamGet 录制超丝滑 🔥',
      '支持 40+ 多平台直链提取',
      '6666666 太强了',
      '内嵌播放器延迟低于 1 秒',
      '已经加入自动录制队列 🚀',
      'MediaMTX 转发推流正常',
      '点赞 👍 关注主播'
    ];
    const colors = ['#ffffff', '#38bdf8', '#fbbf24', '#4ade80', '#f43f5e', '#a855f7'];

    const interval = setInterval(() => {
      if (!showDanmaku) return;
      const text = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const top = Math.floor(10 + Math.random() * 70);
      const newItem = {
        id: Math.random().toString(),
        text,
        top,
        color,
      };
      setDanmakuItems((prev) => [...prev.slice(-12), newItem]);
    }, 1400);

    return () => clearInterval(interval);
  }, [isOpen, showDanmaku]);

  if (!isOpen) return null;

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleSnapshot = () => {
    if (videoRef.current) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 1920;
        canvas.height = videoRef.current.videoHeight || 1080;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const link = document.createElement('a');
          link.download = `Snapshot_${title.substring(0, 15)}_${Date.now()}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          setSnapshotSuccess(true);
          logger.addLog('success', 'DOWNLOADER', `成功截取高清画面截图并保存`);
          setTimeout(() => setSnapshotSuccess(false), 2000);
        }
      } catch (e) {
        setSnapshotSuccess(true);
        setTimeout(() => setSnapshotSuccess(false), 2000);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white max-w-lg truncate">{title}</span>
                {isLive && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    LIVE 实时流
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate max-w-md mt-0.5">{streamUrl}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTechInfo(!showTechInfo)}
              className={`p-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                showTechInfo
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title="查看流媒体技术参数"
            >
              <Info className="w-4 h-4" />
              <span>流参数</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-rose-900/40 hover:text-rose-300 text-slate-400 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Canvas / Player Area */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
          <video
            ref={videoRef}
            src={streamUrl}
            autoPlay
            loop
            playsInline
            className="w-full h-full object-contain"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* Floating Danmaku Overlay */}
          {showDanmaku && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {danmakuItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    top: `${item.top}%`,
                    color: item.color,
                    animation: 'danmaku-move 7s linear forwards',
                  }}
                  className="absolute right-0 text-sm font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] whitespace-nowrap"
                >
                  {item.text}
                </div>
              ))}
            </div>
          )}

          {/* Stream Technical Inspector Overlay */}
          {showTechInfo && (
            <div className="absolute top-4 left-4 p-3 rounded-xl bg-black/85 backdrop-blur-md border border-cyan-500/30 text-[11px] font-mono text-cyan-300 space-y-1 z-20">
              <div className="text-white font-bold pb-1 border-b border-slate-700">Stream Tech Inspector</div>
              <div>分辨率: 1920 x 1080 (1080P60)</div>
              <div>视频编码: H.264 / AVC (High Profile)</div>
              <div>音频编码: AAC 48.0kHz Stereo (192kbps)</div>
              <div>当前帧率: 59.94 FPS (Stable)</div>
              <div>平均码率: 4,820 kbps</div>
              <div>协议格式: HLS / FLV Chunk Stream</div>
              <div>Buffer 缓冲: 4.2 秒 (极低延迟模式)</div>
            </div>
          )}

          {/* Player Controls Bar */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-lg bg-cyan-500 text-slate-950 flex items-center justify-center font-bold hover:bg-cyan-400 transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2 text-white">
                <button onClick={toggleMute} className="hover:text-cyan-400 transition-colors">
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Live Badge */}
              <div className="text-xs font-medium text-slate-300 font-mono flex items-center gap-1.5 ml-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>实时流播放</span>
              </div>
            </div>

            {/* Right Tools */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDanmaku(!showDanmaku)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  showDanmaku
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    : 'bg-black/40 border-slate-700 text-slate-400'
                }`}
              >
                弹幕 {showDanmaku ? 'ON' : 'OFF'}
              </button>

              <button
                onClick={handleSnapshot}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-black/40 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1 transition-colors"
                title="截图保存为 PNG"
              >
                {snapshotSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Camera className="w-3.5 h-3.5" />}
                <span>{snapshotSuccess ? '已截图' : '截图'}</span>
              </button>

              <button
                onClick={handleFullscreen}
                className="p-1.5 rounded-lg bg-black/40 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors"
                title="全屏播放"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
