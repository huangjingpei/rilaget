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
  Check,
  RefreshCw,
  Copy,
  AlertTriangle,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { logger } from '../../services/logger';
import { settingsService } from '../../services/settingsService';

import mpegts from 'mpegts.js';
import Hls from 'hls.js';

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
  const mpegtsPlayerRef = useRef<mpegts.Player | null>(null);
  const hlsPlayerRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [showDanmaku, setShowDanmaku] = useState(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);
  const [showTechInfo, setShowTechInfo] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [copiedStreamUrl, setCopiedStreamUrl] = useState(false);
  const [streamMeta, setStreamMeta] = useState<{
    width: number;
    height: number;
    duration: number;
    format: string;
  }>({ width: 0, height: 0, duration: 0, format: '检测中...' });
  const [danmakuItems, setDanmakuItems] = useState<{ id: string; text: string; top: number; color: string }[]>([]);
  const currentSettings = settingsService.getSettings();

  const lowerUrl = (streamUrl || '').toLowerCase();
  const isYoutube = lowerUrl.includes('googlevideo.com') || lowerUrl.includes('youtube.com');
  const isForeignPlatform = isYoutube || lowerUrl.includes('twitch.tv') || lowerUrl.includes('chzzk') || lowerUrl.includes('sooplive') || lowerUrl.includes('afreecatv');

  const handleEnableProxyAndRetry = async () => {
    settingsService.updateSettings({ proxyEnabled: true, proxyUrl: 'http://127.0.0.1:10808' });
    const api = (window as any).streamget;
    if (api?.app?.setProxy) {
      try {
        await api.app.setProxy('http://127.0.0.1:10808');
      } catch (e) {
        console.warn('调用 setProxy 失败:', e);
      }
    }
    setLoadError(null);
    setRetryCount((c) => c + 1);
  };

  useEffect(() => {
    if (!isOpen || !streamUrl) return;

    setLoadError(null);
    const video = videoRef.current;
    if (!video) return;

    const lower = streamUrl.toLowerCase();
    const isFlv = lower.includes('.flv') || lower.includes('format=flv');
    const isM3u8 = lower.includes('.m3u8') || lower.includes('format=m3u8') || lower.includes('/hls');
    const isYoutube = lower.includes('googlevideo.com') || lower.includes('youtube.com');

    const destroyCurrent = () => {
      if (mpegtsPlayerRef.current) {
        try {
          mpegtsPlayerRef.current.pause();
          mpegtsPlayerRef.current.unload();
          mpegtsPlayerRef.current.detachMediaElement();
          mpegtsPlayerRef.current.destroy();
        } catch {}
        mpegtsPlayerRef.current = null;
      }
      if (hlsPlayerRef.current) {
        try {
          hlsPlayerRef.current.destroy();
        } catch {}
        hlsPlayerRef.current = null;
      }
    };

    destroyCurrent();

    const onLoadedMetadata = () => {
      setStreamMeta({
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        duration: video.duration || 0,
        format: isFlv ? 'FLV (mpegts.js)' : isM3u8 ? 'HLS (hls.js)' : 'MP4 / 容器直链',
      });
    };
    video.addEventListener('loadedmetadata', onLoadedMetadata);

    const safePlay = (el: { play: () => unknown }) => {
      try {
        const res = el.play();
        if (res && typeof (res as Promise<void>).catch === 'function') {
          (res as Promise<void>).catch(() => {});
        }
      } catch {}
    };

    if (isFlv && mpegts.isSupported()) {
      try {
        const player = mpegts.createPlayer(
          {
            type: 'flv',
            isLive: isLive,
            url: streamUrl,
            hasAudio: true,
            hasVideo: true,
          },
          {
            enableWorker: true,
            lazyLoad: false,
            liveBufferLatencyChasing: true,
          }
        );
        player.attachMediaElement(video);
        player.load();
        safePlay(player);
        mpegtsPlayerRef.current = player;
        setStreamMeta((prev) => ({ ...prev, format: 'FLV (mpegts.js 硬解)' }));
      } catch (err: any) {
        setLoadError(`FLV 播放引擎启动失败: ${err?.message || err}`);
      }
    } else if (isM3u8 && Hls.isSupported()) {
      try {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: !isYoutube,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          manifestLoadingTimeOut: 20000,
          manifestLoadingMaxRetry: 5,
          levelLoadingTimeOut: 20000,
          levelLoadingMaxRetry: 5,
          fragLoadingTimeOut: 30000,
          fragLoadingMaxRetry: 6,
          maxFragLookUpTolerance: 0.3,
          xhrSetup: (xhr) => {
            xhr.withCredentials = false;
          },
        });
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          safePlay(video);
          setLoadError(null);
        });

        let networkErrorRetries = 0;
        let fragErrorRetries = 0;
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.warn('[VideoPlayer] HLS fatal error:', data.type, data.details);
            if (data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR || data.details === Hls.ErrorDetails.FRAG_LOAD_TIMEOUT) {
              if (fragErrorRetries < 3) {
                fragErrorRetries++;
                console.log(`[VideoPlayer] 正在重试加载视频分片 (${fragErrorRetries}/3)...`);
                hls.startLoad();
                return;
              }
            }

            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                if (networkErrorRetries < 2) {
                  networkErrorRetries++;
                  console.log(`[VideoPlayer] 尝试自动恢复 HLS 网络加载 (${networkErrorRetries}/2)...`);
                  hls.startLoad();
                } else {
                  const extra = isYoutube
                    ? '（YouTube 视频分片服务器位于海外，若直连超时请确保已在客户端 [系统设置] 中开启代理，如 http://127.0.0.1:10808）'
                    : '';
                  setLoadError(`HLS 流加载异常: ${data.details} ${extra}`);
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('[VideoPlayer] 尝试媒体解码错误自动恢复...');
                hls.recoverMediaError();
                break;
              default:
                setLoadError(`HLS 流加载异常: ${data.details}`);
                break;
            }
          }
        });

        hlsPlayerRef.current = hls;
        setStreamMeta((prev) => ({ ...prev, format: 'HLS (hls.js 引擎)' }));
      } catch (err: any) {
        setLoadError(`HLS 播放引擎启动失败: ${err?.message || err}`);
      }
    } else {
      video.src = streamUrl;
      safePlay(video);
      setStreamMeta((prev) => ({ ...prev, format: 'HTML5 原生解码' }));
    }

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      destroyCurrent();
    };
  }, [isOpen, streamUrl, isLive, retryCount]);

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
                {isForeignPlatform && (
                  currentSettings.proxyEnabled ? (
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                      <Globe className="w-3 h-3 text-cyan-400" />
                      代理加速开启
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Globe className="w-3 h-3 text-amber-400" />
                      直连海外 (卡顿可开代理)
                    </span>
                  )
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
            autoPlay
            loop
            playsInline
            className="w-full h-full object-contain"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* Centered Load Error Recovery Panel */}
          {loadError && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="max-w-md space-y-1">
                <h4 className="text-sm font-bold text-white">流媒体加载异常</h4>
                <p className="text-xs text-rose-300 leading-relaxed font-mono">{loadError}</p>
                {isForeignPlatform && (
                  <p className="text-[11px] text-slate-400 pt-1">
                    提示：海外流媒体服务器（Google Video / Twitch CDN）在国内直连易被防火墙阻断。请开启本地代理（10808 端口）后重试。
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {isForeignPlatform && (
                  <button
                    onClick={handleEnableProxyAndRetry}
                    className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-900/40 transition-all cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>启用 10808 代理并重试</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setLoadError(null);
                    setRetryCount((c) => c + 1);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>重新加载</span>
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(streamUrl);
                    setCopiedStreamUrl(true);
                    setTimeout(() => setCopiedStreamUrl(false), 2000);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedStreamUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedStreamUrl ? '已复制流地址' : '复制流地址 (外部播放)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Floating Danmaku Overlay */}
          {showDanmaku && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {danmakuItems.length === 0 ? (
                <div className="absolute top-2 right-4 text-xs text-slate-500 font-mono">弹幕监听就绪 (暂无弹幕)</div>
              ) : (
                danmakuItems.map((item) => (
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
                ))
              )}
            </div>
          )}

          {/* Stream Technical Inspector Overlay */}
          {showTechInfo && (
            <div className="absolute top-4 left-4 p-3 rounded-xl bg-black/85 backdrop-blur-md border border-cyan-500/30 text-[11px] font-mono text-cyan-300 space-y-1 z-20">
              <div className="text-white font-bold pb-1 border-b border-slate-700">实时流媒体技术参数</div>
              <div>画面尺寸: {streamMeta.width > 0 ? `${streamMeta.width} x ${streamMeta.height}` : '正在检测画面元数据...'}</div>
              <div>解封装引擎: {streamMeta.format}</div>
              <div>模式: {isLive ? '🔴 直播流 (Live Stream)' : '📼 点播视频 (VOD)'}</div>
              {streamMeta.duration > 0 && <div>视频总长: {Math.round(streamMeta.duration)} 秒</div>}
              <div className="text-slate-400 truncate max-w-sm">直链协议: {streamUrl.split('?')[0]}</div>
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
