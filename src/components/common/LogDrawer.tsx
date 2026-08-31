import React, { useEffect, useState, useRef } from 'react';
import {
  Terminal,
  X,
  Trash2,
  Copy,
  Check,
  Filter,
  ArrowDownCircle,
  Cpu,
  Layers
} from 'lucide-react';
import { EngineLog } from '../../types';
import { logger } from '../../services/logger';

interface LogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogDrawer: React.FC<LogDrawerProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<EngineLog[]>([]);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = logger.subscribe((newLogs) => {
      setLogs(newLogs);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (autoScroll && isOpen) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll, isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    if (filterCategory !== 'all' && log.category !== filterCategory) return false;
    return true;
  });

  const handleCopyLogs = () => {
    const text = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.category}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelColor = (level: EngineLog['level']) => {
    switch (level) {
      case 'error':
        return 'text-rose-400 bg-rose-950/40 border-rose-800/40';
      case 'warn':
        return 'text-amber-400 bg-amber-950/40 border-amber-800/40';
      case 'success':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40';
      case 'debug':
        return 'text-purple-400 bg-purple-950/40 border-purple-800/40';
      default:
        return 'text-cyan-400 bg-cyan-950/40 border-cyan-800/40';
    }
  };

  return (
    <div className="h-64 bg-slate-950 border-t border-slate-800 flex flex-col shrink-0 font-mono text-xs z-30 shadow-2xl">
      {/* Console Toolbar */}
      <div className="h-9 px-4 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <Terminal className="w-4 h-4" />
            <span>StreamGet 内核运行终端 (JS Engine Core)</span>
          </div>

          <div className="h-3.5 w-px bg-slate-700 mx-1" />

          {/* Filter Level */}
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="bg-slate-950 border border-slate-700/80 rounded px-2 py-0.5 text-[11px] text-slate-300 focus:outline-none"
          >
            <option value="all">全部级别 (All Levels)</option>
            <option value="info">INFO</option>
            <option value="success">SUCCESS</option>
            <option value="warn">WARN</option>
            <option value="error">ERROR</option>
            <option value="debug">DEBUG</option>
          </select>

          {/* Filter Category */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-950 border border-slate-700/80 rounded px-2 py-0.5 text-[11px] text-slate-300 focus:outline-none"
          >
            <option value="all">全模块 (All Modules)</option>
            <option value="PARSER">PARSER (解析器)</option>
            <option value="DOWNLOADER">DOWNLOADER (下载器)</option>
            <option value="RELAY">RELAY (MediaMTX 转发)</option>
            <option value="BROWSER">BROWSER (浏览器/Cookie)</option>
            <option value="MONITOR">MONITOR (主播监控/采集)</option>
          </select>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 border transition-colors ${
              autoScroll
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="自动滚动到最新"
          >
            <ArrowDownCircle className="w-3 h-3" />
            <span>自动滚动</span>
          </button>

          <button
            onClick={handleCopyLogs}
            className="px-2 py-0.5 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? '已复制' : '复制日志'}</span>
          </button>

          <button
            onClick={() => logger.clearLogs()}
            className="px-2 py-0.5 rounded text-[11px] bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 text-slate-400 border border-slate-700 flex items-center gap-1 transition-colors"
            title="清空控制台"
          >
            <Trash2 className="w-3 h-3" />
            <span>清空</span>
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Log Output Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 select-text">
        {filteredLogs.length === 0 ? (
          <div className="text-slate-600 text-center py-6">暂无符合条件的运行日志</div>
        ) : (
          filteredLogs.slice().reverse().map((log) => (
            <div key={log.id} className="flex items-start gap-2.5 leading-relaxed hover:bg-slate-900/60 px-1.5 py-0.5 rounded">
              <span className="text-slate-500 shrink-0">{log.timestamp}</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] uppercase font-bold rounded border shrink-0 ${getLevelColor(
                  log.level
                )}`}
              >
                {log.level}
              </span>
              <span className="text-slate-400 bg-slate-800/80 px-1 rounded text-[10px] shrink-0 font-semibold">
                {log.category}
              </span>
              <span
                className={`flex-1 break-all ${
                  log.level === 'error'
                    ? 'text-rose-300 font-medium'
                    : log.level === 'warn'
                    ? 'text-amber-300'
                    : log.level === 'success'
                    ? 'text-emerald-300'
                    : 'text-slate-200'
                }`}
              >
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};
