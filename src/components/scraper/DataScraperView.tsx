import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Flame,
  MessageSquare,
  Gift,
  Heart,
  Download,
  Trash2,
  Play,
  Pause,
  Filter,
  Search,
  FileText,
  FileSpreadsheet,
  Tv,
  Sparkles,
  TrendingUp,
  Radio,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { StreamScrapeData, DanmakuMessage, PlatformId } from '../../types';
import { scraperService } from '../../services/scraperService';
import { SUPPORTED_PLATFORMS } from '../../data/platforms';

export const DataScraperView: React.FC = () => {
  const [data, setData] = useState<StreamScrapeData>(scraperService.getData());
  const [searchKeyword, setSearchKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'chat' | 'gift' | 'like'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const unsub = scraperService.subscribe((newData) => {
      setData({ ...newData });
    });
    return unsub;
  }, []);

  const filteredDanmaku = data.danmakuList.filter((m) => {
    if (typeFilter !== 'all' && m.type !== typeFilter) return false;
    if (searchKeyword.trim()) {
      const q = searchKeyword.toLowerCase();
      return m.content.toLowerCase().includes(q) || m.senderName.toLowerCase().includes(q);
    }
    return true;
  });

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredDanmaku.length / pageSize));
  const paginatedDanmaku = filteredDanmaku.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 space-y-3">
      {/* Top Banner */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-white">直播数据看板与弹幕采集</h2>
              <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono ${
                data.isScraping ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
              }`}>
                {data.isScraping ? '实时采集监听中' : '已暂停'}
              </span>
            </div>
          </div>
        </div>

        {/* Controls & Export */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => scraperService.toggleScraping()}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border transition-colors ${
              data.isScraping
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
            }`}
          >
            {data.isScraping ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{data.isScraping ? '暂停' : '继续'}</span>
          </button>

          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => scraperService.exportDanmaku('ass')}
              className="px-2 py-0.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded flex items-center gap-1"
            >
              <FileText className="w-3 h-3 text-cyan-400" />
              <span>ASS</span>
            </button>
            <button
              onClick={() => scraperService.exportDanmaku('csv')}
              className="px-2 py-0.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => scraperService.exportDanmaku('json')}
              className="px-2 py-0.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded flex items-center gap-1"
            >
              <Download className="w-3 h-3 text-purple-400" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Compact Metric Cards */}
      <div className="grid grid-cols-4 gap-2.5 shrink-0">
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400">实时在线观众</div>
            <div className="text-sm font-bold text-white font-mono mt-0.5">
              {data.viewerCountHistory[data.viewerCountHistory.length - 1]?.count.toLocaleString() || '48,290'}
            </div>
          </div>
          <Flame className="w-4 h-4 text-rose-500" />
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400">捕获弹幕总数</div>
            <div className="text-sm font-bold text-white font-mono mt-0.5">
              {data.danmakuCount.toLocaleString()} 条
            </div>
          </div>
          <MessageSquare className="w-4 h-4 text-cyan-400" />
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400">直播间总点赞</div>
            <div className="text-sm font-bold text-white font-mono mt-0.5">
              {(data.totalLikes / 10000).toFixed(1)} 万
            </div>
          </div>
          <Heart className="w-4 h-4 text-pink-500" />
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400">礼物打赏收益</div>
            <div className="text-sm font-bold text-white font-mono mt-0.5">
              {data.giftValueTotal.toLocaleString()} 币
            </div>
          </div>
          <Gift className="w-4 h-4 text-amber-400" />
        </div>
      </div>

      {/* Main Split Content Area (Left: Chart / Right: Danmaku Table with Pagination) */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* Left: Trend Sparkline & Room Info (4 cols) */}
        <div className="col-span-4 flex flex-col gap-2.5 min-h-0 overflow-hidden">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                <span>观众热度趋势</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">峰值 {data.peakViewers.toLocaleString()}</span>
            </div>

            {/* Bars */}
            <div className="flex-1 flex items-end gap-1.5 pt-2 border-b border-slate-800 min-h-0">
              {data.viewerCountHistory.map((item, idx) => {
                const max = Math.max(...data.viewerCountHistory.map((i) => i.count), 55000);
                const heightPercent = Math.max(15, (item.count / max) * 100);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-0.5 group h-full justify-end">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full rounded-t bg-gradient-to-t from-cyan-600/40 to-cyan-400 group-hover:to-rose-400 transition-all"
                    />
                    <span className="text-[8px] font-mono text-slate-500 truncate w-full text-center">{item.time.slice(0, 5)}</span>
                  </div>
                );
              })}
            </div>

            <div className="space-y-1 text-[11px] text-slate-400 pt-1">
              <div className="flex justify-between">
                <span>目标主播:</span>
                <span className="text-slate-200 font-bold">{data.anchorName}</span>
              </div>
              <div className="flex justify-between">
                <span>所属平台:</span>
                <span className="text-cyan-300 font-mono">{data.platform.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>当前速率:</span>
                <span className="text-emerald-400 font-mono">~45 条/分</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Danmaku Feed with Pagination (8 cols) */}
        <div className="col-span-8 flex flex-col rounded-xl bg-slate-900/90 border border-slate-800 min-h-0 overflow-hidden">
          {/* Danmaku Toolbar */}
          <div className="p-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-slate-900 p-0.5 rounded-md border border-slate-800 text-xs">
                <button
                  onClick={() => { setTypeFilter('all'); setCurrentPage(1); }}
                  className={`px-2 py-0.5 rounded ${typeFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                >
                  全部
                </button>
                <button
                  onClick={() => { setTypeFilter('chat'); setCurrentPage(1); }}
                  className={`px-2 py-0.5 rounded ${typeFilter === 'chat' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                >
                  发言
                </button>
                <button
                  onClick={() => { setTypeFilter('gift'); setCurrentPage(1); }}
                  className={`px-2 py-0.5 rounded ${typeFilter === 'gift' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                >
                  礼物
                </button>
                <button
                  onClick={() => { setTypeFilter('like'); setCurrentPage(1); }}
                  className={`px-2 py-0.5 rounded ${typeFilter === 'like' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                >
                  点赞
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="过滤弹幕..."
                  value={searchKeyword}
                  onChange={(e) => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
                  className="w-32 h-6 pl-6 pr-2 text-[11px] bg-slate-900 border border-slate-800 rounded text-slate-200 focus:outline-none"
                />
                <Search className="w-3 h-3 text-slate-500 absolute left-1.5 top-1.5" />
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
              <span>{currentPage} / {totalPages} 页</span>
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-5 h-5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-40 flex items-center justify-center text-slate-300"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-5 h-5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-40 flex items-center justify-center text-slate-300"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => scraperService.clearDanmaku()}
                className="ml-1 p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-rose-400"
                title="清空"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Danmaku Items List */}
          <div className="flex-1 divide-y divide-slate-800/60 overflow-hidden font-mono text-xs select-text">
            {paginatedDanmaku.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-600">暂无互动弹幕</div>
            ) : (
              paginatedDanmaku.map((item) => (
                <div key={item.id} className="px-3 py-2 flex items-center gap-2 hover:bg-slate-800/40 transition-colors">
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}
                  </span>

                  {item.type === 'gift' ? (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold shrink-0 flex items-center gap-1">
                      <Gift className="w-3 h-3" />
                      礼物
                    </span>
                  ) : item.type === 'like' ? (
                    <span className="px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 text-[10px] font-bold shrink-0 flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      点赞
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 text-[10px] shrink-0">
                      LV.{item.senderLevel || 1}
                    </span>
                  )}

                  <span className="font-semibold text-slate-300 shrink-0">{item.senderName}:</span>
                  <span style={{ color: item.color || '#ffffff' }} className="truncate flex-1">
                    {item.content}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
