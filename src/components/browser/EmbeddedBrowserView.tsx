import React, { useState, useEffect } from 'react';
import {
  Globe,
  KeyRound,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Lock,
  Sparkles,
  Plus,
  AlertCircle,
  HelpCircle,
  Search,
} from 'lucide-react';
import { PlatformCookie, PlatformId } from '../../types';
import { cookieService } from '../../services/cookieService';
import { SUPPORTED_PLATFORMS } from '../../data/platforms';
import { logger } from '../../services/logger';
import { electronApi, inElectron } from '../../services/electronBridge';

interface PlatformLoginConfig {
  name: string;
  url: string;
  domain: string;
  desc: string;
  category: 'chinese' | 'international' | 'ecommerce';
}

const PLATFORM_LOGIN_CONFIGS: Record<PlatformId, PlatformLoginConfig> = {
  douyin: {
    name: '抖音 (Douyin)',
    url: 'https://live.douyin.com',
    domain: 'douyin.com',
    desc: '登录后提取 ttwid、sessionid，解锁原画 4K 极清流与粉丝团专属流',
    category: 'chinese',
  },
  bilibili: {
    name: '哔哩哔哩 (Bilibili)',
    url: 'https://passport.bilibili.com/login',
    domain: 'bilibili.com',
    desc: '提取 SESSDATA、bili_jct，解锁大会员 4K/1080P60 专属超高码率',
    category: 'chinese',
  },
  kuaishou: {
    name: '快手 (Kuaishou)',
    url: 'https://live.kuaishou.com',
    domain: 'kuaishou.com',
    desc: '长效登录会话提取，突破未登录码率限制与高频风控校验',
    category: 'chinese',
  },
  huya: {
    name: '虎牙直播 (Huya)',
    url: 'https://www.huya.com',
    domain: 'huya.com',
    desc: '提取 yyuid 与 udb_n 等鉴权凭据，解锁蓝光 4K/8M 极清源',
    category: 'chinese',
  },
  douyu: {
    name: '斗鱼直播 (Douyu)',
    url: 'https://www.douyu.com',
    domain: 'douyu.com',
    desc: '登录提取 acf_auth 与 dy_did，解锁蓝光 1080P/原画专属流',
    category: 'chinese',
  },
  xiaohongshu: {
    name: '小红书 (RedNote)',
    url: 'https://www.xiaohongshu.com',
    domain: 'xiaohongshu.com',
    desc: '提取 a1、webId 与 xsec_token 等直播鉴权参数防被拦截',
    category: 'chinese',
  },
  tiktok: {
    name: 'TikTok Global',
    url: 'https://www.tiktok.com/login',
    domain: 'tiktok.com',
    desc: '支持国际版账号与跨境直播直链提取，获取长效会话 Token',
    category: 'international',
  },
  youtube: {
    name: 'YouTube',
    url: 'https://accounts.google.com/ServiceLogin?service=youtube',
    domain: 'youtube.com',
    desc: '登录以绕过地区/年龄限制并获取 4K/会员专属直播流',
    category: 'international',
  },
  twitch: {
    name: 'Twitch',
    url: 'https://www.twitch.tv/login',
    domain: 'twitch.tv',
    desc: '提取 auth-token 凭据，免广告并支持订阅者专属原画源',
    category: 'international',
  },
  wechat_channels: {
    name: '微信视频号 (Channels)',
    url: 'https://channels.weixin.qq.com',
    domain: 'weixin.qq.com',
    desc: '扫码登录视频号助手，捕获直播鉴权 Cookie 突破防盗链',
    category: 'chinese',
  },
  weibo: {
    name: '微博直播 (Weibo)',
    url: 'https://weibo.com/login.php',
    domain: 'weibo.com',
    desc: '登录提取 SUB 与 SUBP 鉴权票据，解锁高清原画直播源',
    category: 'chinese',
  },
  acfun: {
    name: 'AcFun (A站)',
    url: 'https://www.acfun.cn/login',
    domain: 'acfun.cn',
    desc: '提取 acfun.mid 与 auth_key，支持高清直播流稳定抓取',
    category: 'chinese',
  },
  inke: {
    name: '映客直播 (Inke)',
    url: 'https://www.inke.cn',
    domain: 'inke.cn',
    desc: '登录捕获用户会话与 token，获取专属推流与原画画质',
    category: 'chinese',
  },
  yy: {
    name: 'YY直播 (YY Live)',
    url: 'https://www.yy.com',
    domain: 'yy.com',
    desc: '提取 yy.com 身份 Cookie 与 uid，获取蓝光极清直播流',
    category: 'chinese',
  },
  chzzk: {
    name: 'CHZZK (Naver)',
    url: 'https://nid.naver.com/nidlogin.login?url=https://chzzk.naver.com',
    domain: 'naver.com',
    desc: '韩国 Naver 游戏直播，提取 NID_AUT/SES 凭据解锁 1080P60',
    category: 'international',
  },
  soop: {
    name: 'SOOP (AfreecaTV)',
    url: 'https://login.sooplive.co.kr',
    domain: 'sooplive.co.kr',
    desc: '韩国综合直播平台，登录提取 PdboxUserAuth 解锁原画画质',
    category: 'international',
  },
  pandatv: {
    name: 'PandaTV',
    url: 'https://www.panda.tv',
    domain: 'panda.tv',
    desc: '登录提取会话信息，稳定获取直播间高清流地址',
    category: 'international',
  },
  shopee: {
    name: 'Shopee Live (虾皮)',
    url: 'https://shopee.tw/buyer/login',
    domain: 'shopee.tw',
    desc: '提取 SPC_EC 与 SPC_T 会话凭据，支持跨境电商直播录制',
    category: 'ecommerce',
  },
  taobao: {
    name: '淘宝直播 (Taobao)',
    url: 'https://login.taobao.com',
    domain: 'taobao.com',
    desc: '提取 _m_h5_tk 与 cookie2，突破电商直播防爬与防盗链限制',
    category: 'ecommerce',
  },
  jd: {
    name: '京东直播 (JD Live)',
    url: 'https://passport.jd.com/new/login.aspx',
    domain: 'jd.com',
    desc: '提取 pt_key 与 pt_pin，稳定解析京东直播间超清源',
    category: 'ecommerce',
  },
  zhihu: {
    name: '知乎直播 (Zhihu)',
    url: 'https://www.zhihu.com/signin',
    domain: 'zhihu.com',
    desc: '提取 z_c0 与 session 凭据，获取公开课与知乎直播流',
    category: 'chinese',
  },
  netease: {
    name: '网易CC直播 (Netease CC)',
    url: 'https://cc.163.com',
    domain: '163.com',
    desc: '网易电竞与游戏直播，登录提取 NTES_SESS 凭据解锁原画蓝光',
    category: 'chinese',
  },
  kugou: {
    name: '酷狗直播 (繁星直播)',
    url: 'https://fanxing.kugou.com',
    domain: 'kugou.com',
    desc: '酷狗音乐演艺直播，提取 kg_mid 与 token 获取原画音视频流',
    category: 'chinese',
  },
  bigo: {
    name: 'Bigo Live',
    url: 'https://www.bigo.tv',
    domain: 'bigo.tv',
    desc: '全球综合直播平台，登录捕获会话 Cookie 保持高码率稳定解析',
    category: 'international',
  },
  baidu: {
    name: '百度直播 (Baidu Live)',
    url: 'https://live.baidu.com',
    domain: 'baidu.com',
    desc: '提取 BDUSS 登录凭据，解锁百度直播与贴吧直播高清源',
    category: 'chinese',
  },
  sixroom: {
    name: '六间房 (SixRoom)',
    url: 'https://v.6.cn',
    domain: '6.cn',
    desc: '秀场演艺直播，登录提取会话凭据获取清晰流地址',
    category: 'chinese',
  },
  huajiao: {
    name: '花椒直播 (Huajiao)',
    url: 'https://www.huajiao.com',
    domain: 'huajiao.com',
    desc: '移动与网页直播平台，提取登录 Cookie 防频繁刷新风控',
    category: 'chinese',
  },
  migu: {
    name: '咪咕视频 (Migu Video)',
    url: 'https://www.miguvideo.com',
    domain: 'miguvideo.com',
    desc: '咪咕体育与演艺直播，提取登录会话凭据解锁蓝光超高清流',
    category: 'chinese',
  },
  maoer: {
    name: '猫耳FM (Maoer FM)',
    url: 'https://www.missevan.com',
    domain: 'missevan.com',
    desc: '二次元音频与虚拟主播平台，提取登录凭据获取音频直播直链',
    category: 'chinese',
  },
  look: {
    name: '网易LOOK (LOOK Live)',
    url: 'https://look.163.com',
    domain: '163.com',
    desc: '网易云音乐旗下音频直播平台，提取用户 Token 抓取纯净流',
    category: 'chinese',
  },
  twitcasting: {
    name: 'TwitCasting',
    url: 'https://twitcasting.tv',
    domain: 'twitcasting.tv',
    desc: '日本主流个人与 VTuber 直播平台，捕获会员与登录直链',
    category: 'international',
  },
  showroom: {
    name: 'SHOWROOM',
    url: 'https://www.showroom-live.com',
    domain: 'showroom-live.com',
    desc: '日本偶像与虚拟主播互动平台，提取 Cookie 解锁高画质流',
    category: 'international',
  },
  yiqilive: {
    name: '17Live (17直播)',
    url: 'https://17.live',
    domain: '17.live',
    desc: '全球华人区互动直播平台，提取用户凭据防风控阻断',
    category: 'international',
  },
  custom: {
    name: '自定义平台 (Custom URL)',
    url: 'https://',
    domain: '',
    desc: '手动录入任意直播站点并进行通用 Cookie 凭据管理',
    category: 'chinese',
  },
};

function formatTestedTime(timestamp?: number): string {
  if (!timestamp) return '未校验';
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 30000) return '刚刚';
  if (diff < 60000) return '半分钟前';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}-${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export const EmbeddedBrowserView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'cookie_vault' | 'web_login' | 'guide'>('cookie_vault');
  const [cookies, setCookies] = useState<PlatformCookie[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId>('douyin');
  const [loginSearchQuery, setLoginSearchQuery] = useState('');
  const [loginFilterCategory, setLoginFilterCategory] = useState<'all' | 'chinese' | 'international' | 'ecommerce'>('all');
  const [customLoginUrl, setCustomLoginUrl] = useState('');
  const [customLoginDomain, setCustomLoginDomain] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [justTestedId, setJustTestedId] = useState<{ id: string; ok: boolean; msg: string } | null>(null);

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

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTestCookie = async (id: string) => {
    setTestingId(id);
    try {
      const res = await cookieService.testCookie(id);
      setJustTestedId({ id, ok: res.isValid, msg: res.message });
      setTimeout(() => setJustTestedId(null), 4000);
    } catch (e: any) {
      setJustTestedId({ id, ok: false, msg: e?.message || '校验发生异常' });
      setTimeout(() => setJustTestedId(null), 4000);
    } finally {
      setTestingId(null);
    }
  };

  const handleOpenLoginWindow = async () => {
    const config = PLATFORM_LOGIN_CONFIGS[selectedPlatform];
    if (!config) return;

    let targetUrl = config.url;
    let targetDomain = config.domain;

    if (selectedPlatform === 'custom') {
      targetUrl = customLoginUrl.trim();
      targetDomain = customLoginDomain.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        alert('请输入以 http:// 或 https:// 开头的完整有效网址');
        return;
      }
    }

    const api = electronApi();
    if (!inElectron() || !api?.cookies?.openLoginSession) {
      alert('当前处于纯浏览器模式，请在 StreamGet 桌面客户端中使用网页登录捕获功能，或使用下方的“手动录入”功能。');
      return;
    }

    setIsLoggingIn(true);
    logger.addLog('info', 'BROWSER', `正在打开 [${config.name}] 官方登录窗口，完成登录后关闭窗口即可自动提取 Cookie...`);

    try {
      const res = await api.cookies.openLoginSession({
        url: targetUrl,
        domain: targetDomain,
      });

      if (res.ok && res.cookieString && res.cookieString.trim()) {
        const accName = `${config.name.split(' ')[0]}_授权账号`;
        cookieService.addCookie({
          platform: selectedPlatform,
          accountName: accName,
          cookieString: res.cookieString.trim(),
          isVip: true,
          isValid: true,
          expiresAt: '2026-12-31',
          extractedFrom: 'embedded_browser',
        });
        logger.addLog('success', 'BROWSER', `成功从 [${config.name}] 捕获 ${res.count || 0} 个 Cookie 凭据并已保存！`);
        setActiveSubTab('cookie_vault');
      } else if (!res.cookieString || !res.cookieString.trim()) {
        logger.addLog('warn', 'BROWSER', `未从会话中检测到 [${targetDomain || '目标站点'}] 的登录 Cookie，窗口已关闭`);
      }
    } catch (err: any) {
      logger.addLog('error', 'BROWSER', `登录捕获异常: ${err?.message || err}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCookieStr.trim()) return;

    let clean = manualCookieStr.trim();
    // 尝试解析 JSON 格式 (例如从 EditThisCookie 导出的 JSON)
    if (clean.startsWith('[') && clean.endsWith(']')) {
      try {
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed)) {
          clean = parsed.map((item: any) => `${item.name}=${item.value}`).join('; ');
        }
      } catch {}
    }

    cookieService.addCookie({
      platform: manualPlatform,
      accountName: manualAccount.trim() || `${manualPlatform.toUpperCase()}_账号`,
      cookieString: clean,
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
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-white">平台账号凭据中心 (Cookie Hub)</h2>
              <span className="px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                解锁 4K/蓝光 高清直播流
              </span>
            </div>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveSubTab('cookie_vault')}
            className={`px-3 py-1 font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'cookie_vault' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>凭据仓库 ({cookies.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('web_login')}
            className={`px-3 py-1 font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'web_login' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>官方网页登录捕获</span>
          </button>

          <button
            onClick={() => setActiveSubTab('guide')}
            className={`px-3 py-1 font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'guide' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>提取指南与安全</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* SubTab 1: Cookie Vault */}
        {activeSubTab === 'cookie_vault' && (
          <div className="h-full flex flex-col rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden">
            <div className="p-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                已保存平台授权凭据 ({cookies.length})
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsManualModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1 shadow transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>录入 / 导入凭据</span>
                </button>
              </div>
            </div>

            {cookies.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 text-slate-400">
                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div className="max-w-sm space-y-1">
                  <p className="text-xs font-bold text-slate-300">暂无平台 Cookie 凭据</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    录入平台凭据后，解析器将自动携带授权头，可解锁 B站大会员 4K、抖音 4K 粉丝团超清码率。
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setActiveSubTab('web_login')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span>前往官方网页登录捕获</span>
                  </button>
                  <button
                    onClick={() => setIsManualModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>手动粘贴录入</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 divide-y divide-slate-800/60 overflow-y-auto">
                {cookies.map((ck) => (
                  <div
                    key={ck.id}
                    className={`p-3.5 transition-all space-y-2 text-xs ${
                      justTestedId?.id === ck.id
                        ? justTestedId.ok
                          ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500'
                          : 'bg-rose-500/10 border-l-4 border-l-rose-500'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-emerald-400 font-bold uppercase text-[10px]">
                          {ck.platform}
                        </span>
                        <span className="font-bold text-white text-xs">{ck.accountName}</span>
                        {ck.isValid ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-medium">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>凭据有效</span>
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-medium">
                            <AlertCircle className="w-3 h-3 text-rose-400" />
                            <span>格式不全 / 已失效</span>
                          </span>
                        )}
                        <span className="text-slate-500 text-[10px]">
                          最后校验: <strong className="text-slate-400 font-mono">{formatTestedTime(ck.lastTestedAt)}</strong>
                        </span>
                        <span className="text-slate-500 text-[10px]">来源: {ck.extractedFrom || '手动录入'}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleTestCookie(ck.id)}
                          disabled={testingId === ck.id}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1.5 border transition-all ${
                            testingId === ck.id
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                              : justTestedId?.id === ck.id
                              ? justTestedId.ok
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
                          }`}
                          title="校验关键 Token 格式与有效性"
                        >
                          {testingId === ck.id ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                              <span>校验中...</span>
                            </>
                          ) : justTestedId?.id === ck.id ? (
                            <>
                              {justTestedId.ok ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-rose-400" />
                              )}
                              <span>{justTestedId.ok ? '校验通过 ✓' : '校验未通过'}</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3" />
                              <span>校验</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleCopy(ck.id, ck.cookieString)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 flex items-center gap-1 border border-slate-700/60 transition-colors"
                        >
                          {copiedId === ck.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>复制</span>
                        </button>
                        <button
                          onClick={() => cookieService.deleteCookie(ck.id)}
                          className="p-1 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-rose-400 border border-slate-800 transition-colors"
                          title="删除此凭据"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Detailed Diagnostic Message */}
                    {ck.lastTestedMsg && (
                      <div
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex items-start gap-2 ${
                          ck.isValid
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                        }`}
                      >
                        {ck.isValid ? (
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                        )}
                        <span className="leading-relaxed">{ck.lastTestedMsg}</span>
                      </div>
                    )}

                    <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-400 truncate select-all">
                      {ck.cookieString}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SubTab 2: Web Login */}
        {activeSubTab === 'web_login' && (
          <div className="grid grid-cols-12 gap-3 h-full">
            {/* Left: Platform Selection (4 cols) */}
            <div className="col-span-4 p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between overflow-hidden">
              <div className="space-y-2 overflow-hidden flex flex-col flex-1">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    选择授权平台
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    共 {Object.keys(PLATFORM_LOGIN_CONFIGS).length} 个平台
                  </span>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="搜索平台名称或域名..."
                    value={loginSearchQuery}
                    onChange={(e) => setLoginSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                  />
                  {loginSearchQuery && (
                    <button
                      onClick={() => setLoginSearchQuery('')}
                      className="absolute right-2 top-1.5 text-slate-500 hover:text-slate-300 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
                  {[
                    { id: 'all', label: '全部' },
                    { id: 'chinese', label: '国内平台' },
                    { id: 'international', label: '国际平台' },
                    { id: 'ecommerce', label: '电商直播' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setLoginFilterCategory(cat.id as any)}
                      className={`px-2 py-0.5 rounded-md whitespace-nowrap transition-colors ${
                        loginFilterCategory === cat.id
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Platforms List */}
                <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                  {Object.entries(PLATFORM_LOGIN_CONFIGS)
                    .filter(([key, config]) => {
                      if (loginFilterCategory !== 'all') {
                        if (config.category !== loginFilterCategory) return false;
                      }
                      if (!loginSearchQuery.trim()) return true;
                      const q = loginSearchQuery.toLowerCase();
                      return (
                        key.toLowerCase().includes(q) ||
                        config.name.toLowerCase().includes(q) ||
                        config.domain.toLowerCase().includes(q) ||
                        config.desc.toLowerCase().includes(q)
                      );
                    })
                    .map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => setSelectedPlatform(key as PlatformId)}
                        className={`w-full p-2.5 rounded-lg text-left border transition-all ${
                          selectedPlatform === key
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{config.name}</span>
                          <div className="flex items-center gap-1.5">
                            {config.domain && (
                              <span className="text-[9px] text-slate-500 font-mono">
                                .{config.domain}
                              </span>
                            )}
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: selectedPlatform === key ? '#10b981' : '#475569' }}
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{config.desc}</p>
                      </button>
                    ))}
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-800 shrink-0">
                基于原生独立 Chromium 会话沙箱隔离
              </div>
            </div>

            {/* Right: Actions and Info (8 cols) */}
            <div className="col-span-8 p-6 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg">
                <Globe className="w-7 h-7" />
              </div>

              <div className="max-w-md space-y-1.5">
                <h3 className="text-sm font-bold text-white">
                  {PLATFORM_LOGIN_CONFIGS[selectedPlatform]?.name} 官方网页登录捕获
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  点击下方按钮将弹出独立登录窗口，请在官方页面完成扫码或短信登录。登录成功后关闭窗口，StreamGet 将自动提取安全鉴权 Cookie 并保存至凭据仓库。
                </p>
              </div>

              {selectedPlatform === 'custom' ? (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-left w-full max-w-md text-xs space-y-2">
                  <div>
                    <label className="text-slate-400 text-[11px]">自定义目标登录网址:</label>
                    <input
                      type="text"
                      placeholder="https://example.com/login"
                      value={customLoginUrl}
                      onChange={(e) => setCustomLoginUrl(e.target.value)}
                      className="w-full mt-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-cyan-400 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[11px]">捕获 Cookie 主域名 (可选):</label>
                    <input
                      type="text"
                      placeholder="example.com"
                      value={customLoginDomain}
                      onChange={(e) => setCustomLoginDomain(e.target.value)}
                      className="w-full mt-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-left w-full max-w-md text-[11px] font-mono text-slate-400 space-y-1">
                  <div>目标网址: <span className="text-cyan-400">{PLATFORM_LOGIN_CONFIGS[selectedPlatform]?.url}</span></div>
                  <div>目标域名: <span className="text-emerald-400">.{PLATFORM_LOGIN_CONFIGS[selectedPlatform]?.domain}</span></div>
                  <div>会话模式: <span className="text-amber-400">persist:streamget_auth (独立持久化沙箱)</span></div>
                </div>
              )}

              <button
                onClick={handleOpenLoginWindow}
                disabled={isLoggingIn}
                className={`px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
                  isLoggingIn ? 'opacity-50 cursor-wait' : ''
                }`}
              >
                <ExternalLink className="w-4 h-4" />
                <span>{isLoggingIn ? '正在登录捕获中...' : '打开官方网页登录窗口'}</span>
              </button>
            </div>
          </div>
        )}

        {/* SubTab 3: Guide & Security */}
        {activeSubTab === 'guide' && (
          <div className="h-full rounded-xl bg-slate-900/90 border border-slate-800 p-6 overflow-y-auto space-y-4 text-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white">Cookie 凭据使用与安全声明</h3>
            </div>

            <div className="space-y-3 text-slate-300 leading-relaxed text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-cyan-400">1. 凭据存储位置</span>
                <p className="text-slate-400 text-[11px]">
                  所有添加或自动捕获的 Cookie 凭据均严格存储于用户本地计算机目录（<code>%APPDATA%/streamget/store/cookies.json</code>），绝对不会上传到任何外部服务器或云端。
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-cyan-400">2. 手动从常规浏览器（Chrome / Edge）提取 Cookie</span>
                <p className="text-slate-400 text-[11px]">
                  在 Chrome 或 Edge 浏览器中登录对应平台直播间，按 <kbd className="px-1 bg-slate-800 rounded">F12</kbd> 打开开发者工具，切换到 <strong>Application</strong>（应用） &gt; <strong>Cookies</strong>，或者在 <strong>Network</strong>（网络）选项卡中点击任意接口，复制请求头中的 <code>Cookie: ...</code> 完整字符串，即可使用“录入 / 导入凭据”功能粘入。
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-cyan-400">3. 插件导出的 JSON 格式兼容</span>
                <p className="text-slate-400 text-[11px]">
                  支持从 EditThisCookie、Cookie-Editor 等浏览器扩展导出的 JSON 数组格式，直接粘入输入框即可自动解析转换。
                </p>
              </div>
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
                <span>录入 / 导入平台 Cookie</span>
              </h3>
              <button onClick={() => setIsManualModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleManualAdd} className="space-y-2.5">
              <div>
                <label className="text-slate-400">目标平台</label>
                <select
                  value={manualPlatform}
                  onChange={(e) => setManualPlatform(e.target.value as PlatformId)}
                  className="w-full h-8 mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
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
                  placeholder="例如: 我的大会员主号"
                  value={manualAccount}
                  onChange={(e) => setManualAccount(e.target.value)}
                  className="w-full h-8 mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400">Cookie 字符串 / JSON 数组</label>
                <textarea
                  rows={4}
                  placeholder="粘贴如: SESSDATA=xxx; bili_jct=yyy 或 JSON 格式数组"
                  value={manualCookieStr}
                  onChange={(e) => setManualCookieStr(e.target.value)}
                  required
                  className="w-full p-2 mt-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
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

