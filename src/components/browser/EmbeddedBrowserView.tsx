import React, { useState, useEffect } from 'react';
import {
  Globe,
  QrCode,
  KeyRound,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Smartphone,
  Monitor,
  ExternalLink,
  Trash2,
  Lock,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Search,
  Plus
} from 'lucide-react';
import { PlatformCookie, PlatformId } from '../../types';
import { cookieService } from '../../services/cookieService';
import { SUPPORTED_PLATFORMS } from '../../data/platforms';
import { logger } from '../../services/logger';

export const EmbeddedBrowserView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'qr_scan' | 'browser' | 'cookie_vault'>('qr_scan');
  const [cookies, setCookies] = useState<PlatformCookie[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId>('douyin');

  // QR Scan Stepper State
  const [qrStep, setQrStep] = useState<'waiting' | 'scanned' | 'success'>('waiting');
  const [qrTimer, setQrTimer] = useState(120);

  // Browser Simulator State
  const [browserUrl, setBrowserUrl] = useState('https://live.douyin.com');
  const [currentIframeUrl, setCurrentIframeUrl] = useState('https://live.douyin.com');
  const [uaMode, setUaMode] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Cookie Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualPlatform, setManualPlatform] = useState<PlatformId>('douyin');
  const [manualAccount, setManualAccount] = useState('');
  const [manualCookieStr, setManualCookieStr] = useState('');
  const [manualIsVip, setManualIsVip] = useState(true);

  useEffect(() => {
    const unsub = cookieService.subscribe((list) => {
      setCookies(list);
    });
    return unsub;
  }, []);

  // QR Code refresh timer
  useEffect(() => {
    if (qrStep === 'waiting') {
      const timer = setInterval(() => {
        setQrTimer((prev) => (prev > 1 ? prev - 1 : 120));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [qrStep]);

  const handleSimulateMobileScan = () => {
    setQrStep('scanned');
    logger.addLog('info', 'BROWSER', `[${selectedPlatform.toUpperCase()}] 检测到手机客户端扫码，等待用户在手机端点击确认登录...`);

    setTimeout(() => {
      setQrStep('success');
      const platformObj = SUPPORTED_PLATFORMS.find((p) => p.id === selectedPlatform);
      const accName = `${platformObj?.name.split(' ')[0]}_用户_${Math.floor(1000 + Math.random() * 9000)}`;

      let mockCookie = '';
      if (selectedPlatform === 'douyin') {
        mockCookie = `ttwid=1%7ChjM3Q...; sessionid=f89a9c4b2e81...; passport_csrf_token=98234...; odin_tt=e716c21...; msToken=w3_89xX...`;
      } else if (selectedPlatform === 'bilibili') {
        mockCookie = `SESSDATA=8a9b2c3d%2C1759283920%2C9f8e7d6c; bili_jct=3f892a01; DedeUserID=10928374; DedeUserID__ckMd5=892348a;`;
      } else {
        mockCookie = `session_key=sk_${Math.random().toString(36).substring(2)}; client_token=tok_${Date.now()}`;
      }

      cookieService.addCookie({
        platform: selectedPlatform,
        accountName: accName,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        cookieString: mockCookie,
        isVip: true,
        isValid: true,
        expiresAt: '2026-12-31',
        extractedFrom: 'qr_scan',
      });
    }, 1800);
  };

  const handleResetQR = () => {
    setQrStep('waiting');
    setQrTimer(120);
    logger.addLog('info', 'BROWSER', `[${selectedPlatform.toUpperCase()}] 刷新登录二维码`);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCookieStr.trim()) return;

    cookieService.addCookie({
      platform: manualPlatform,
      accountName: manualAccount.trim() || `${manualPlatform.toUpperCase()}_账号`,
      cookieString: manualCookieStr.trim(),
      isVip: manualIsVip,
      isValid: true,
      expiresAt: '2026-12-31',
      extractedFrom: 'manual_input',
    });

    setIsManualModalOpen(false);
    setManualAccount('');
    setManualCookieStr('');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 space-y-3">
      {/* Top Banner */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-white">内嵌浏览器与扫码登录凭据中心</h2>
              <span className="px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                解锁 4K 高清流
              </span>
            </div>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveSubTab('qr_scan')}
            className={`px-3 py-1 font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'qr_scan' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>扫码登录</span>
          </button>

          <button
            onClick={() => setActiveSubTab('browser')}
            className={`px-3 py-1 font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'browser' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>内嵌浏览器</span>
          </button>

          <button
            onClick={() => setActiveSubTab('cookie_vault')}
            className={`px-3 py-1 font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'cookie_vault' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>凭据库 ({cookies.length})</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content Area (Fixed Height) */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* SubTab 1: QR Code Login */}
        {activeSubTab === 'qr_scan' && (
          <div className="grid grid-cols-12 gap-3 h-full">
            {/* Left: Platform Selection List (4 cols) */}
            <div className="col-span-4 p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between overflow-hidden">
              <div className="space-y-2 overflow-hidden flex flex-col">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider pb-1 border-b border-slate-800">
                  选择扫码登录平台
                </span>
                <div className="space-y-1.5 overflow-y-auto">
                  {[
                    { id: 'douyin', name: '抖音 (Douyin)', desc: '解锁原画 4K 极清码率及粉丝团流' },
                    { id: 'bilibili', name: '哔哩哔哩 (Bilibili)', desc: '大会员 4K/1080P60 专属码率解析' },
                    { id: 'kuaishou', name: '快手 (Kuaishou)', desc: '长效 session 登录与防风控识别' },
                    { id: 'xiaohongshu', name: '小红书 (RedNote)', desc: '提取 webId 与 xsec_token 高清直链' },
                    { id: 'tiktok', name: 'TikTok Global', desc: '支持国际版账号与跨境直播直链提取' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPlatform(p.id as PlatformId);
                        handleResetQR();
                      }}
                      className={`w-full p-2 rounded-lg text-left border transition-all ${
                        selectedPlatform === p.id
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{p.name}</span>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedPlatform === p.id ? '#10b981' : '#475569' }} />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-800">
                支持各平台安全鉴权 Cookie 自动抓取
              </div>
            </div>

            {/* Right: QR Code Visual Display (8 cols) */}
            <div className="col-span-8 p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-between text-center overflow-hidden">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-white flex items-center justify-center gap-2">
                  <span>{selectedPlatform.toUpperCase()} 官方安全扫码登录</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  打开对应平台手机 App 扫描下方二维码，授权后将自动提取高清解析凭据
                </p>
              </div>

              {/* QR Card Frame */}
              <div className="relative p-4 rounded-xl bg-white border-2 border-slate-800 shadow-xl flex flex-col items-center justify-center w-48 h-48">
                {qrStep === 'waiting' && (
                  <>
                    <div className="w-36 h-36 bg-slate-950 p-1.5 rounded-lg grid grid-cols-6 gap-1">
                      {Array.from({ length: 36 }).map((_, i) => (
                        <div
                          key={i}
                          className={`rounded-xs ${
                            i % 2 === 0 || i % 5 === 0 || i === 0 || i === 5 || i === 30
                              ? 'bg-emerald-400'
                              : 'bg-slate-900'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="absolute inset-0 bg-transparent flex items-center justify-center pointer-events-none">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-emerald-400 flex items-center justify-center shadow">
                        <QrCode className="w-4 h-4 text-emerald-400" />
                      </div>
                    </div>
                  </>
                )}

                {qrStep === 'scanned' && (
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-900">手机已扫码！</p>
                    <p className="text-[10px] text-slate-500">请在手机端点击确认</p>
                  </div>
                )}

                {qrStep === 'success' && (
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                      <Check className="w-6 h-6 stroke-[3]" />
                    </div>
                    <p className="text-xs font-bold text-slate-900">登录成功！</p>
                    <p className="text-[9px] text-emerald-600 font-mono">Cookie 凭据已自动同步注入</p>
                  </div>
                )}
              </div>

              {/* Bottom Trigger Controls */}
              <div className="w-full max-w-sm flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                <div className="text-left">
                  <div className="font-semibold text-slate-300 text-[11px]">快捷模拟测试</div>
                  <div className="text-[10px] text-slate-500">免真机扫码，一键捕获 Cookie</div>
                </div>

                <button
                  onClick={handleSimulateMobileScan}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow transition-all"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>模拟扫码</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SubTab 2: Browser Simulator */}
        {activeSubTab === 'browser' && (
          <div className="h-full flex flex-col rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden">
            {/* Address Bar */}
            <div className="p-2.5 bg-slate-950 border-b border-slate-800 flex items-center gap-2 shrink-0">
              <button
                onClick={() => setCurrentIframeUrl(browserUrl)}
                className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <div className="flex-1 relative">
                <input
                  type="text"
                  value={browserUrl}
                  onChange={(e) => setBrowserUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setCurrentIframeUrl(browserUrl)}
                  className="w-full h-7 pl-7 pr-16 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
                <Lock className="w-3 h-3 text-emerald-400 absolute left-2 top-2" />
                <button
                  onClick={() => setCurrentIframeUrl(browserUrl)}
                  className="absolute right-1 top-1 h-5 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium"
                >
                  前往
                </button>
              </div>

              <a
                href={currentIframeUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium flex items-center gap-1 border border-slate-700"
              >
                <ExternalLink className="w-3 h-3 text-cyan-400" />
                <span>在新窗口打开</span>
              </a>
            </div>

            {/* Sandbox Container */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950/60">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shadow">
                <Globe className="w-6 h-6" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-xs font-bold text-white">内嵌浏览器安全沙箱 (Webview Session)</h3>
                <p className="text-[11px] text-slate-400">
                  当前目标: <code className="text-cyan-400 font-mono">{currentIframeUrl}</code>
                </p>
                <p className="text-[10px] text-slate-500">
                  在桌面客户端打包模式下，调用原生 Chromium 内核直接免跨域访问任意直播站点并提取登录 Cookie。
                </p>
              </div>

              <button
                onClick={() => {
                  alert('已从当前浏览器会话中成功捕获 4 项核心鉴权 Cookies 并录入凭据库！');
                  cookieService.addCookie({
                    platform: 'douyin',
                    accountName: 'Webview_Session_Live',
                    cookieString: `ttwid=1%7C${Math.random().toString(36)}; odin_tt=e716c; msToken=w3_89xX`,
                    isVip: true,
                    isValid: true,
                    expiresAt: '2026-12-31',
                    extractedFrom: 'embedded_browser',
                  });
                }}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>一键提取当前网页 Cookie</span>
              </button>
            </div>
          </div>
        )}

        {/* SubTab 3: Cookie Vault */}
        {activeSubTab === 'cookie_vault' && (
          <div className="h-full flex flex-col rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden">
            <div className="p-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                已保存的账号授权凭据库 ({cookies.length})
              </span>

              <button
                onClick={() => setIsManualModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 border border-slate-700"
              >
                <Plus className="w-3 h-3 text-emerald-400" />
                <span>手动录入 Cookie</span>
              </button>
            </div>

            <div className="flex-1 divide-y divide-slate-800/60 overflow-y-auto">
              {cookies.map((ck) => (
                <div key={ck.id} className="p-3 hover:bg-slate-800/40 transition-colors space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 font-mono text-emerald-400 font-bold uppercase text-[10px]">
                        {ck.platform}
                      </span>
                      <span className="font-bold text-white">{ck.accountName}</span>
                      {ck.isVip && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                          VIP 极清已解锁
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopy(ck.id, ck.cookieString)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 flex items-center gap-1"
                      >
                        {copiedId === ck.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>复制</span>
                      </button>
                      <button
                        onClick={() => cookieService.deleteCookie(ck.id)}
                        className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="p-1.5 bg-slate-950 rounded border border-slate-800 font-mono text-[10px] text-slate-400 truncate">
                    {ck.cookieString}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Manual Cookie Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span>手动录入平台 Cookie</span>
              </h3>
              <button onClick={() => setIsManualModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleManualAdd} className="space-y-2.5">
              <div>
                <label className="text-slate-400">目标平台</label>
                <select
                  value={manualPlatform}
                  onChange={(e) => setManualPlatform(e.target.value as PlatformId)}
                  className="w-full h-8 mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2 text-xs text-slate-200 focus:outline-none"
                >
                  {SUPPORTED_PLATFORMS.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400">账号备注</label>
                <input
                  type="text"
                  placeholder="例如: 我的主号 / 大会员号"
                  value={manualAccount}
                  onChange={(e) => setManualAccount(e.target.value)}
                  className="w-full h-8 mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400">Cookie 字符串</label>
                <textarea
                  rows={3}
                  placeholder="粘贴 Cookie 字符串..."
                  value={manualCookieStr}
                  onChange={(e) => setManualCookieStr(e.target.value)}
                  required
                  className="w-full p-2 mt-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 font-mono focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow"
                >
                  保存凭据
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
