import React, { useState, useEffect } from 'react';
import {
  DownloadCloud,
  Sparkles,
  Link,
  ListPlus,
  Play,
  CheckCircle,
  FolderOpen,
  Pause,
  Trash2,
  Tv,
  Layers,
  Radio,
  Clock,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  CheckCircle2
} from 'lucide-react';
import { SUPPORTED_PLATFORMS, WIRED_PLATFORM_COUNT, detectPlatformFromUrl } from '../../data/platforms';
import { ParsedStreamResult, DownloadTask, StreamQuality } from '../../types';
import { parseStreamUrl } from '../../services/streamParser';
import { downloadEngine } from '../../services/downloadEngine';
import { cookieService } from '../../services/cookieService';
import { fetchSidecarStatus, SidecarStatus } from '../../services/sidecarClient';
import { DownloadCard } from './DownloadCard';

interface DownloaderViewProps {
  onOpenPlayer: (url: string, title: string, isLive?: boolean) => void;
  presetUrl?: string;
}

export const DownloaderView: React.FC<DownloaderViewProps> = ({
  onOpenPlayer,
  presetUrl,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedStreamResult | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<StreamQuality | null>(null);
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [sidecarStatus, setSidecarStatus] = useState<SidecarStatus | null>(null);

  useEffect(() => {
    if (presetUrl) {
      setUrlInput(presetUrl);
      handleParse(presetUrl);
    }
  }, [presetUrl]);

  useEffect(() => {
    const unsub = downloadEngine.subscribe((newTasks) => {
      setTasks(newTasks);
    });
    return unsub;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const status = await fetchSidecarStatus();
      if (!cancelled) setSidecarStatus(status);
    };
    refresh();
    const timer = setInterval(refresh, 8000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const currentPlatform = detectPlatformFromUrl(urlInput);

  const handleParse = async (urlToParse?: string) => {
    const target = urlToParse || urlInput;
    if (!target.trim()) {
      setParseError('请输入有效的直播或视频链接');
      return;
    }

    setParseError(null);
    setParsedResult(null);
    setSelectedQuality(null);
    setIsParsing(true);

    try {
      const platformInfo = detectPlatformFromUrl(target);
      if (!platformInfo.parseWired && platformInfo.id !== 'custom') {
        throw new Error(`「${platformInfo.name}」尚未接入 sidecar 解析，请换用已接线平台`);
      }
      const cookie = cookieService.getCookieForPlatform(platformInfo.id);
      const res = await parseStreamUrl(target, cookie);
      setParsedResult(res);
      setSelectedQuality(res.qualities[0] || null);
    } catch (err: any) {
      setParseError(err.message || '解析失败，请确认边车已启动且链接有效');
    } finally {
      setIsParsing(false);
    }
  };

  const handleStartDownload = () => {
    if (!parsedResult || !selectedQuality) return;
    if (!parsedResult.isLive) {
      setParseError('当前房间未开播，无法开始录制');
      return;
    }
    downloadEngine.addTask(parsedResult, selectedQuality);
    setParsedResult(null);
    setSelectedQuality(null);
    setUrlInput('');
  };

  const handleBatchSubmit = async () => {
    const lines = urlInput
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setParseError('请输入至少一条有效的链接');
      return;
    }

    setIsParsing(true);
    setParseError(null);

    const failures: string[] = [];
    let queued = 0;

    for (const line of lines) {
      try {
        const platformInfo = detectPlatformFromUrl(line);
        const cookie = cookieService.getCookieForPlatform(platformInfo.id);
        const parsed = await parseStreamUrl(line, cookie);
        if (!parsed.isLive || parsed.qualities.length === 0) {
          failures.push(`${line} → 未开播`);
          continue;
        }
        downloadEngine.addTask(parsed, parsed.qualities[0]);
        queued += 1;
      } catch (e: any) {
        failures.push(`${line} → ${e?.message || '解析失败'}`);
      }
    }

    setIsParsing(false);
    setUrlInput('');
    setIsBatchMode(false);
    if (failures.length > 0) {
      setParseError(`成功入队 ${queued} 条；失败 ${failures.length} 条：${failures.slice(0, 3).join('；')}`);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (activeTabFilter === 'active' && !(t.status === 'downloading' || t.status === 'recording')) return false;
    if (activeTabFilter === 'completed' && t.status !== 'completed') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.anchorName.toLowerCase().includes(q);
    }
    return true;
  });

  const activeCount = tasks.filter((t) => t.status === 'downloading' || t.status === 'recording').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  // Pagination calculation
  const pageSize = viewMode === 'grid' ? 4 : 6;
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const paginatedTasks = filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const formatSpeed = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 KB/s';
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`;
    }
    return `${(bytes / 1024).toFixed(0)} KB/s`;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 space-y-3">
      {/* Top Input & Parse Bar */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <DownloadCloud className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-white">多平台视频/直播解析提取</span>
            <span className="text-[10px] text-slate-400 font-mono">
              sidecar 已接线 {WIRED_PLATFORM_COUNT} 个平台
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                sidecarStatus?.running && sidecarStatus?.pong
                  ? 'text-emerald-300 border-emerald-800 bg-emerald-950/40'
                  : 'text-amber-300 border-amber-800 bg-amber-950/40'
              }`}
              title={sidecarStatus?.error || sidecarStatus?.python || ''}
            >
              {sidecarStatus?.running && sidecarStatus?.pong
                ? `边车在线${sidecarStatus.pong.version ? ` v${sidecarStatus.pong.version}` : ''}`
                : '边车离线 · npm run sidecar'}
            </span>
          </div>

          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setIsBatchMode(false)}
              className={`px-2.5 py-0.5 text-xs font-medium rounded-md transition-colors ${
                !isBatchMode ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              单链接
            </button>
            <button
              onClick={() => setIsBatchMode(true)}
              className={`px-2.5 py-0.5 text-xs font-medium rounded-md flex items-center gap-1 transition-colors ${
                isBatchMode ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListPlus className="w-3 h-3" />
              批量
            </button>
          </div>
        </div>

        {/* Input Form */}
        {isBatchMode ? (
          <div className="space-y-1.5">
            <textarea
              rows={2}
              placeholder="每行一条链接: https://live.douyin.com/... 或 https://live.bilibili.com/..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
            />
            <div className="flex justify-end">
              <button
                disabled={isParsing || !urlInput.trim()}
                onClick={handleBatchSubmit}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isParsing ? '批量解析中...' : '一键批量解析并录制'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="粘贴直播间主页链接、视频分享链接或直链 (例如: https://live.douyin.com/...)"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleParse()}
                className="w-full h-8 pl-8 pr-20 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
              />
              <Link className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              {urlInput.trim() && (
                <div className="absolute right-2 top-1.5 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[9px] font-mono text-cyan-300">
                  {currentPlatform.name}
                </div>
              )}
            </div>

            <button
              disabled={isParsing || !urlInput.trim()}
              onClick={() => handleParse()}
              className="h-8 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow disabled:opacity-50 transition-all shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isParsing ? '解析中...' : '解析'}
            </button>
          </div>
        )}

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-500 font-medium">填入示例（需真实开播间才能解析成功）:</span>
          {SUPPORTED_PLATFORMS.filter((p) => p.parseWired).slice(0, 8).map((plat) => (
            <button
              key={plat.id}
              onClick={() => {
                setUrlInput(plat.sampleUrls[0]);
                setParsedResult(null);
                setParseError(null);
              }}
              className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 flex items-center gap-1 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: plat.color }} />
              <span>{plat.name}</span>
            </button>
          ))}
        </div>

        {parseError && (
          <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-[11px] flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}
      </div>

      {/* Parsed Result Inline Dialog / Drawer if available */}
      {parsedResult && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-slate-900 to-slate-900/90 border border-cyan-500/50 shadow-md shrink-0 space-y-2.5 animate-in fade-in">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {parsedResult.coverUrl ? (
                <img
                  src={parsedResult.coverUrl}
                  alt={parsedResult.title}
                  className="w-14 h-10 object-cover rounded-lg border border-slate-700 shrink-0"
                />
              ) : (
                <div className="w-14 h-10 rounded-lg border border-slate-700 shrink-0 bg-slate-800 flex items-center justify-center text-[9px] text-slate-400 font-mono">
                  {parsedResult.platformName.slice(0, 4)}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white truncate max-w-sm">{parsedResult.title}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                      parsedResult.isLive
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-slate-700/80 text-slate-300'
                    }`}
                  >
                    {parsedResult.statusText}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>
                    主播: <strong className="text-slate-200">{parsedResult.anchorName}</strong>
                  </span>
                  <span>•</span>
                  <span>{parsedResult.platformName}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleStartDownload}
                disabled={!parsedResult.isLive || !selectedQuality}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1 shadow disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>{parsedResult.isLive ? '开始录制' : '未开播'}</span>
              </button>
              <button
                disabled={!selectedQuality?.url}
                onClick={() =>
                  onOpenPlayer(
                    selectedQuality?.url || '',
                    parsedResult.title,
                    parsedResult.isLive
                  )
                }
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium flex items-center gap-1 border border-slate-700 disabled:opacity-40"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>试看</span>
              </button>
              <button
                onClick={() => {
                  setParsedResult(null);
                  setSelectedQuality(null);
                }}
                className="px-2 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs"
              >
                取消
              </button>
            </div>
          </div>

          {parsedResult.qualities.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-500 shrink-0">清晰度:</span>
              {parsedResult.qualities.map((q) => (
                <button
                  key={q.id}
                  onClick={() => setSelectedQuality(q)}
                  className={`px-2 py-0.5 rounded border text-[10px] font-mono transition-colors ${
                    selectedQuality?.id === q.id
                      ? 'bg-cyan-600 text-white border-cyan-400'
                      : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-cyan-700'
                  }`}
                >
                  {q.name} · {q.format.toUpperCase()}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-amber-300">
              未拿到可录制的流地址。房间可能未开播，或该平台需要有效 Cookie / Node 运行时。
            </p>
          )}
        </div>
      )}

      {/* Tasks Queue Header & Controls */}
      <div className="flex items-center justify-between shrink-0 px-1">
        <div className="flex items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => { setActiveTabFilter('all'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeTabFilter === 'all' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              全部 ({tasks.length})
            </button>
            <button
              onClick={() => { setActiveTabFilter('active'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                activeTabFilter === 'active' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
              进行中 ({activeCount})
            </button>
            <button
              onClick={() => { setActiveTabFilter('completed'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                activeTabFilter === 'completed' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle className="w-3 h-3" />
              已完成 ({completedCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="搜索任务/主播..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-36 h-7 pl-7 pr-2 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
          </div>
        </div>

        {/* View Switcher (Grid vs List) + Pagination Controls */}
        <div className="flex items-center gap-2">
          {/* Grid vs List Toggle */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              title="宫格卡片视图"
              className={`p-1 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="紧凑列表视图"
              className={`p-1 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <span>{currentPage} / {totalPages} 页</span>
            <div className="flex items-center">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-40 flex items-center justify-center text-slate-300"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-40 flex items-center justify-center text-slate-300 ml-1"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Task Display Container (Fixed Bounds) */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40 text-center p-6 space-y-2">
            <DownloadCloud className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-400">当前没有相关下载任务</p>
            <p className="text-[11px] text-slate-600">在上方粘贴链接或点击快捷测试预设即可解析录制</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full overflow-hidden content-start">
            {paginatedTasks.map((task) => (
              <DownloadCard
                key={task.id}
                task={task}
                onPreview={(t) => onOpenPlayer(t.streamUrl, t.title, t.isLiveStream)}
              />
            ))}
          </div>
        ) : (
          /* List View Table */
          <div className="h-full rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden flex flex-col">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-950 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span className="col-span-5">任务与主播</span>
              <span className="col-span-2">清晰度 / 格式</span>
              <span className="col-span-2">状态 / 进度</span>
              <span className="col-span-1 text-right">网速</span>
              <span className="col-span-2 text-right">操作</span>
            </div>

            <div className="flex-1 divide-y divide-slate-800/60 overflow-hidden">
              {paginatedTasks.map((task) => (
                <div key={task.id} className="grid grid-cols-12 gap-2 px-3 py-2 items-center hover:bg-slate-800/40 transition-colors text-xs">
                  {/* Title & Anchor */}
                  <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                    <img
                      src={task.coverUrl}
                      alt={task.title}
                      className="w-10 h-7 rounded object-cover border border-slate-800 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-200 truncate">{task.title}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <span className="text-cyan-400 font-mono">[{task.platformName}]</span>
                        <span>{task.anchorName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quality */}
                  <div className="col-span-2 text-slate-300 font-mono text-[11px] truncate">
                    {task.quality.name} ({task.quality.format.toUpperCase()})
                  </div>

                  {/* Progress & Status */}
                  <div className="col-span-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className={task.status === 'downloading' || task.status === 'recording' ? 'text-cyan-300' : 'text-slate-400'}>
                        {task.status === 'recording' ? '🔴 录制中' : task.status === 'downloading' ? '⬇ 下载中' : '✓ 完成'}
                      </span>
                      <span>{task.progress}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Speed */}
                  <div className="col-span-1 text-right font-mono text-cyan-400 font-semibold text-[11px]">
                    {formatSpeed(task.speedBytesPerSec)}
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onOpenPlayer(task.streamUrl, task.title, task.isLiveStream)}
                      className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white"
                      title="预览播放"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    </button>
                    <button
                      onClick={() => downloadEngine.togglePauseTask(task.id)}
                      className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white"
                      title={task.status === 'paused' ? '恢复' : '暂停'}
                    >
                      {task.status === 'paused' ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
                    </button>
                    <button
                      onClick={() => downloadEngine.removeTask(task.id)}
                      className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-rose-400"
                      title="删除任务"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Summary Bar */}
      <div className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
        <span>共 <strong className="text-slate-200">{filteredTasks.length}</strong> 项任务 • 当前每页显示 {pageSize} 条</span>
        <button
          onClick={() => downloadEngine.clearCompleted()}
          className="hover:text-slate-200 text-[11px] text-slate-400 flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" />
          <span>清除已完成记录</span>
        </button>
      </div>
    </div>
  );
};
