import React from 'react';
import {
  Play,
  Pause,
  Square,
  Trash2,
  FolderOpen,
  Eye,
  Clock,
  HardDrive,
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { DownloadTask } from '../../types';
import { downloadEngine } from '../../services/downloadEngine';

interface DownloadCardProps {
  task: DownloadTask;
  onPreview: (task: DownloadTask) => void;
}

export const DownloadCard: React.FC<DownloadCardProps> = ({ task, onPreview }) => {
  const isRecording = task.status === 'recording';
  const isDownloading = task.status === 'downloading';
  const isPaused = task.status === 'paused';
  const isCompleted = task.status === 'completed';
  const isFailed = task.status === 'failed';

  const formatSpeed = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 KB/s';
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`;
    }
    return `${(bytes / 1024).toFixed(0)} KB/s`;
  };

  const formatTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 transition-all shadow-sm space-y-3 group">
      {/* Top Header info */}
      <div className="flex items-start gap-3">
        {/* Cover thumbnail */}
        <div className="relative w-28 h-18 rounded-lg overflow-hidden shrink-0 bg-slate-950 border border-slate-800">
          <img
            src={task.coverUrl}
            alt={task.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {task.isLiveStream ? (
            <div className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-rose-500 text-white text-[9px] font-bold flex items-center gap-1 shadow">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </div>
          ) : (
            <div className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-blue-500 text-white text-[9px] font-bold shadow">
              VOD
            </div>
          )}

          {/* Platform Tag */}
          <div className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/70 text-cyan-300 text-[9px] font-mono">
            {task.platformName}
          </div>
        </div>

        {/* Title and metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-white truncate max-w-md group-hover:text-cyan-300 transition-colors">
              {task.title}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <img
                src={task.anchorAvatar}
                alt={task.anchorName}
                className="w-4 h-4 rounded-full object-cover border border-slate-700"
              />
              <span className="text-slate-300 font-medium">{task.anchorName}</span>
            </div>

            <span className="text-slate-600">•</span>

            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-cyan-400 font-mono text-[10px] border border-slate-700/60">
              {task.quality.name}
            </span>

            <span className="text-slate-600">•</span>

            <span className="text-[11px] font-mono text-slate-400">
              {task.quality.resolution} ({task.quality.format.toUpperCase()})
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-500 truncate mt-1">
            保存路径: {task.filePath}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Open in Explorer */}
          <button
            onClick={() => {
              if (window.streamget?.app?.showItemInFolder) {
                window.streamget.app.showItemInFolder(task.filePath);
              } else if (window.streamget?.app?.openPath) {
                window.streamget.app.openPath(task.filePath);
              }
            }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-300 border border-slate-700/80 transition-colors"
            title="在系统文件管理器中定位"
          >
            <FolderOpen className="w-4 h-4" />
          </button>

          {/* Preview / Play */}
          <button
            onClick={() => onPreview(task)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-300 border border-slate-700/80 transition-colors"
            title="试播与画质监控"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Pause / Resume */}
          {(isDownloading || isRecording) && (
            <button
              onClick={() => downloadEngine.pauseTask(task.id)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300 border border-slate-700/80 transition-colors"
              title="暂停任务"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}

          {isPaused && (
            <button
              onClick={() => downloadEngine.resumeTask(task.id)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 border border-slate-700/80 transition-colors"
              title="恢复下载"
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          {/* Stop & Save (for live stream recording) */}
          {(isRecording || isDownloading) && (
            <button
              onClick={() => downloadEngine.stopAndFinishTask(task.id)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 border border-slate-700/80 transition-colors"
              title="停止录制并保存"
            >
              <Square className="w-4 h-4" />
            </button>
          )}

          {/* Delete */}
          <button
            onClick={() => downloadEngine.deleteTask(task.id)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/40 hover:text-rose-300 text-slate-400 border border-slate-700/80 transition-colors"
            title="移除任务"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar & Telemetry */}
      <div className="space-y-1.5 pt-1">
        {/* Progress Track */}
        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative">
          <div
            style={{ width: `${task.progress}%` }}
            className={`h-full transition-all duration-300 rounded-full ${
              isCompleted
                ? 'bg-emerald-500'
                : isPaused
                ? 'bg-amber-500'
                : isFailed
                ? 'bg-rose-500'
                : 'bg-gradient-to-r from-cyan-500 to-blue-500'
            }`}
          />
        </div>

        {/* Telemetry Row */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-semibold text-slate-300">
              <HardDrive className="w-3.5 h-3.5 text-slate-500" />
              {task.fileSizeFormatted}
            </span>

            <span className="text-slate-600">|</span>

            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              已用时: {formatTime(task.elapsedSeconds)}
            </span>

            {task.status !== 'completed' && task.etaSeconds > 0 && (
              <>
                <span className="text-slate-600">|</span>
                <span>预计剩余: {formatTime(task.etaSeconds)}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isRecording && (
              <span className="flex items-center gap-1 text-rose-400 font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                正在实时录制中
              </span>
            )}

            {isDownloading && (
              <span className="text-cyan-400 font-semibold">
                下载进度: {task.progress}%
              </span>
            )}

            {isCompleted && (
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                下载完成 (可直接播放)
              </span>
            )}

            {(isRecording || isDownloading) && (
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40 font-bold">
                {formatSpeed(task.speedBytesPerSec)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
