import React, { useEffect, useState } from 'react';
import {
  DownloadCloud,
  Users,
  Globe,
  Radio,
  BarChart3,
  Settings,
  Tv,
  Sparkles,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { downloadEngine } from '../../services/downloadEngine';
import { anchorService } from '../../services/anchorService';
import { relayService } from '../../services/relayService';
import { cookieService } from '../../services/cookieService';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenPlayer: (url: string, title: string, isLive?: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenPlayer
}) => {
  const [downloadCount, setDownloadCount] = useState(0);
  const [liveAnchorCount, setLiveAnchorCount] = useState(0);
  const [relayCount, setRelayCount] = useState(0);
  const [cookieCount, setCookieCount] = useState(0);

  useEffect(() => {
    const unsubDown = downloadEngine.subscribe((tasks) => {
      const active = tasks.filter((t) => t.status === 'downloading' || t.status === 'recording');
      setDownloadCount(active.length);
    });

    const unsubAnchor = anchorService.subscribe((anchors) => {
      const live = anchors.filter((a) => a.isLive);
      setLiveAnchorCount(live.length);
    });

    const unsubRelay = relayService.subscribe((task) => {
      setRelayCount(task && task.status === 'running' ? 1 : 0);
    });

    const unsubCookies = cookieService.subscribe((cookies) => {
      const valid = cookies.filter((c) => c.isValid);
      setCookieCount(valid.length);
    });

    return () => {
      unsubDown();
      unsubAnchor();
      unsubRelay();
      unsubCookies();
    };
  }, []);

  const navItems = [
    {
      id: 'downloader',
      label: '视频与直播下载',
      sub: 'Python sidecar 真实解析',
      icon: DownloadCloud,
      badge: downloadCount > 0 ? downloadCount : null,
      badgeColor: 'bg-cyan-500 text-slate-950 font-bold',
    },
    {
      id: 'anchors',
      label: '主播关注与监控',
      sub: '开播自动侦测与批量录制',
      icon: Users,
      badge: liveAnchorCount > 0 ? `${liveAnchorCount} 开播` : null,
      badgeColor: 'bg-rose-500 text-white font-medium',
    },
    {
      id: 'browser',
      label: '内嵌浏览器与扫码',
      sub: '扫码登录与Cookie凭据库',
      icon: Globe,
      badge: cookieCount > 0 ? `${cookieCount} 账号` : null,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    },
    {
      id: 'relay',
      label: '流转发与MediaMTX',
      sub: 'RTMP/SRT中继与低延分发',
      icon: Radio,
      badge: relayCount > 0 ? '推流中' : null,
      badgeColor: 'bg-purple-500/30 text-purple-200 border border-purple-500/40 animate-pulse',
    },
    {
      id: 'scraper',
      label: '直播数据与弹幕采集',
      sub: '实时热度、弹幕与ASS导出',
      icon: BarChart3,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'settings',
      label: '客户端与封装配置',
      sub: 'Electron/Tauri、FFmpeg、存储',
      icon: Settings,
      badge: null,
      badgeColor: '',
    },
  ];

  return (
    <aside className="w-64 bg-slate-900/70 border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none">
      {/* Navigation List */}
      <div className="p-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase font-mono">
          功能导航 (Modules)
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full group px-3 py-2.5 rounded-xl text-left flex items-start gap-3 transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <div
                className={`p-2 rounded-lg mt-0.5 transition-colors ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                    : 'bg-slate-800/80 text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5 leading-tight">{item.sub}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Info Card: JS Stack & Engine Info */}
      <div className="p-3 border-t border-slate-800/80 space-y-2">
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>解析内核</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
              Python sidecar
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            UI 基于 React 19；拉流解析由 Python 边车完成，内置 mpegts.js & hls.js 直播解码。
          </p>
        </div>
      </div>
    </aside>
  );
};
