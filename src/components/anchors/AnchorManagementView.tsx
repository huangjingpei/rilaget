import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Radio,
  Tv,
  Trash2,
  Settings,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  Video,
  Clock,
  Sparkles,
  ExternalLink,
  Flame,
  ShieldAlert,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Eye
} from 'lucide-react';
import { MonitoredAnchor, PlatformId } from '../../types';
import { anchorService } from '../../services/anchorService';
import { downloadEngine } from '../../services/downloadEngine';
import { parseStreamUrl } from '../../services/streamParser';
import { SUPPORTED_PLATFORMS } from '../../data/platforms';

interface AnchorManagementViewProps {
  onOpenPlayer: (url: string, title: string, isLive?: boolean) => void;
  onNavigateToDownloader: () => void;
}

export const AnchorManagementView: React.FC<AnchorManagementViewProps> = ({
  onOpenPlayer,
  onNavigateToDownloader,
}) => {
  const [anchors, setAnchors] = useState<MonitoredAnchor[]>([]);
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'live' | 'offline'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Add Form state
  const [newPlatform, setNewPlatform] = useState<PlatformId>('douyin');
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newAutoRecord, setNewAutoRecord] = useState(true);
  const [newQuality, setNewQuality] = useState('origin_4k');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const unsub = anchorService.subscribe((list) => {
      setAnchors(list);
    });
    return unsub;
  }, []);

  const filteredAnchors = anchors.filter((a) => {
    if (filterPlatform !== 'all' && a.platform !== filterPlatform) return false;
    if (filterStatus === 'live' && !a.isLive) return false;
    if (filterStatus === 'offline' && a.isLive) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.currentTitle.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const liveCount = anchors.filter((a) => a.isLive).length;
  const autoRecordCount = anchors.filter((a) => a.autoRecord).length;

  const pageSize = viewMode === 'grid' ? 6 : 8;
  const totalPages = Math.max(1, Math.ceil(filteredAnchors.length / pageSize));
  const paginatedAnchors = filteredAnchors.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handleAddAnchor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim() || !newName.trim()) return;

    setIsAdding(true);
    try {
      anchorService.addAnchor({
        platform: newPlatform,
        url: newUrl.trim(),
        name: newName.trim(),
        autoRecord: newAutoRecord,
        qualityPreference: newQuality,
      });
      setIsAddModalOpen(false);
      setNewUrl('');
      setNewName('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsAdding(false);
    }
  };

  const handleInstantRecord = async (anchor: MonitoredAnchor) => {
    try {
      const parsed = await parseStreamUrl(anchor.url);
      if (!parsed.isLive || parsed.qualities.length === 0) {
        alert(`${parsed.anchorName} 当前未开播，无法开始录制`);
        return;
      }
      const quality = parsed.qualities.find((q) => q.id === anchor.qualityPreference) || parsed.qualities[0];
      downloadEngine.addTask(parsed, quality);
      onNavigateToDownloader();
    } catch (e: any) {
      alert(`启动录制失败: ${e.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 space-y-3">
      {/* Top Header & Filter Toolbar */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shrink-0 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-white">主播关注与开播监控中心</span>
            <span className="text-[10px] text-slate-400 font-mono">
              已关注 {anchors.length} 位 • <span className="text-rose-400 font-bold">{liveCount} 位直播中</span> • {autoRecordCount} 位自动录制
            </span>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="h-7 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>添加主播</span>
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="搜索主播昵称、直播标题..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-48 h-7 pl-7 pr-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-2" />
            </div>

            {/* Status Filter */}
            <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800">
              <button
                onClick={() => { setFilterStatus('all'); setCurrentPage(1); }}
                className={`px-2.5 py-0.5 text-xs rounded-md font-semibold transition-colors ${
                  filterStatus === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                全部 ({anchors.length})
              </button>
              <button
                onClick={() => { setFilterStatus('live'); setCurrentPage(1); }}
                className={`px-2.5 py-0.5 text-xs rounded-md font-semibold flex items-center gap-1 transition-colors ${
                  filterStatus === 'live' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                直播中 ({liveCount})
              </button>
              <button
                onClick={() => { setFilterStatus('offline'); setCurrentPage(1); }}
                className={`px-2.5 py-0.5 text-xs rounded-md font-semibold transition-colors ${
                  filterStatus === 'offline' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                未开播
              </button>
            </div>

            {/* Platform Filter */}
            <select
              value={filterPlatform}
              onChange={(e) => { setFilterPlatform(e.target.value); setCurrentPage(1); }}
              className="h-7 bg-slate-950 border border-slate-800 rounded-lg px-2 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">所有平台</option>
              {SUPPORTED_PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>{p.name.split(' ')[0]}</option>
              ))}
            </select>
          </div>

          {/* View Switcher (Grid vs List) + Pagination */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
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

            {/* Pagination Controls */}
            <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
              <span>{currentPage} / {totalPages} 页</span>
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-6 h-6 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 disabled:opacity-40 flex items-center justify-center text-slate-300"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-6 h-6 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 disabled:opacity-40 flex items-center justify-center text-slate-300"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area (Fixed Bounds) */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {filteredAnchors.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40 text-center p-6 space-y-2">
            <Users className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-400">暂无符合条件的主播</p>
            <p className="text-[11px] text-slate-600">点击右上角 “添加主播” 即可新增监控</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 h-full overflow-hidden content-start">
            {paginatedAnchors.map((anchor) => (
              <div
                key={anchor.id}
                className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 flex flex-col justify-between space-y-2 shadow-sm transition-all"
              >
                <div className="flex items-start gap-2.5">
                  <div className="relative shrink-0">
                    <img
                      src={anchor.avatar}
                      alt={anchor.name}
                      className="w-10 h-10 rounded-lg object-cover border border-slate-700"
                    />
                    {anchor.isLive ? (
                      <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded bg-rose-500 text-white text-[8px] font-bold ring-1 ring-slate-900 animate-pulse">
                        LIVE
                      </span>
                    ) : (
                      <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded bg-slate-700 text-slate-300 text-[8px] font-medium ring-1 ring-slate-900">
                        OFF
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-white truncate">{anchor.name}</h4>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-cyan-400 font-mono uppercase">
                        {anchor.platform}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{anchor.currentTitle}</p>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {anchor.isLive ? (
                        <span className="text-rose-400 font-semibold">🔥 {anchor.viewerCount.toLocaleString()} 观众</span>
                      ) : (
                        <span>上次: {anchor.lastLiveTime}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Buttons */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <button
                    onClick={() => anchorService.toggleAutoRecord(anchor.id)}
                    className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 ${
                      anchor.autoRecord
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <Radio className={`w-3 h-3 ${anchor.autoRecord ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
                    <span>自动录制: {anchor.autoRecord ? '开' : '关'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {anchor.isLive && (
                      <button
                        onClick={() => handleInstantRecord(anchor)}
                        className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold flex items-center gap-1"
                        title="立即录制"
                      >
                        <Video className="w-3 h-3" />
                        <span>录制</span>
                      </button>
                    )}

                    <button
                      onClick={() =>
                        onOpenPlayer(
                          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                          `${anchor.name} - ${anchor.currentTitle}`,
                          anchor.isLive
                        )
                      }
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                      title="预览试看"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    </button>

                    <button
                      onClick={() => anchorService.removeAnchor(anchor.id)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400"
                      title="取消关注"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View Table */
          <div className="h-full rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden flex flex-col">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-950 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span className="col-span-4">主播与直播间</span>
              <span className="col-span-2">平台 / 分类</span>
              <span className="col-span-2">开播状态</span>
              <span className="col-span-2">自动录制策略</span>
              <span className="col-span-2 text-right">操作</span>
            </div>

            <div className="flex-1 divide-y divide-slate-800/60 overflow-hidden">
              {paginatedAnchors.map((anchor) => (
                <div key={anchor.id} className="grid grid-cols-12 gap-2 px-3 py-2 items-center hover:bg-slate-800/40 transition-colors text-xs">
                  <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                    <img
                      src={anchor.avatar}
                      alt={anchor.name}
                      className="w-8 h-8 rounded-lg object-cover border border-slate-800 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-200 truncate">{anchor.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{anchor.currentTitle}</div>
                    </div>
                  </div>

                  <div className="col-span-2 text-slate-300 font-mono text-[11px] truncate">
                    <span className="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-cyan-400 uppercase mr-1">
                      {anchor.platform}
                    </span>
                    <span className="text-slate-400">{anchor.category}</span>
                  </div>

                  <div className="col-span-2">
                    {anchor.isLive ? (
                      <span className="text-rose-400 text-[11px] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        直播中 (🔥 {anchor.viewerCount.toLocaleString()})
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">未开播 ({anchor.lastLiveTime})</span>
                    )}
                  </div>

                  <div className="col-span-2">
                    <button
                      onClick={() => anchorService.toggleAutoRecord(anchor.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        anchor.autoRecord
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-slate-950 text-slate-500 border-slate-800'
                      }`}
                    >
                      {anchor.autoRecord ? '✓ 开播自动录制' : '关闭'}
                    </button>
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-1.5">
                    {anchor.isLive && (
                      <button
                        onClick={() => handleInstantRecord(anchor)}
                        className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold"
                        title="立即录制"
                      >
                        录制
                      </button>
                    )}
                    <button
                      onClick={() =>
                        onOpenPlayer(
                          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                          `${anchor.name} - ${anchor.currentTitle}`,
                          anchor.isLive
                        )
                      }
                      className="p-1 rounded hover:bg-slate-700 text-slate-300"
                      title="预览"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    </button>
                    <button
                      onClick={() => anchorService.removeAnchor(anchor.id)}
                      className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-rose-400"
                      title="删除"
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
        <span>共监控 <strong className="text-slate-200">{filteredAnchors.length}</strong> 位主播 • 当前每页显示 {pageSize} 条</span>
        <span className="text-[11px] text-cyan-400 font-mono">轮询频率: 每 30 秒自动侦测开播</span>
      </div>

      {/* Add Anchor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>添加关注主播至自动监控</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAnchor} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-medium">直播平台</label>
                <select
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value as PlatformId)}
                  className="w-full h-8 mt-1 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                >
                  {SUPPORTED_PLATFORMS.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-medium">主播主页或直播间链接</label>
                <input
                  type="text"
                  placeholder="https://live.douyin.com/... 或 https://live.bilibili.com/..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full h-8 mt-1 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium">主播昵称 / 频道备注</label>
                <input
                  type="text"
                  placeholder="例如: 东方甄选、交个朋友直播间"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-8 mt-1 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-300">开播时自动启动后台录制</span>
                <input
                  type="checkbox"
                  checked={newAutoRecord}
                  onChange={(e) => setNewAutoRecord(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isAdding || !newUrl.trim() || !newName.trim()}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg disabled:opacity-50"
                >
                  {isAdding ? '添加中...' : '确认添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
