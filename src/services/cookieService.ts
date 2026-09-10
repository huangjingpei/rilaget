import { PlatformCookie, PlatformId } from '../types';
import { logger } from './logger';
import { loadStore, makePersister } from './persistence';

type CookieListener = (cookies: PlatformCookie[]) => void;

class CookieService {
  private cookies: PlatformCookie[] = [];
  private listeners: Set<CookieListener> = new Set();
  private hasLocalChanges = false;
  private persister = makePersister('cookies', () => this.cookies, 800);

  constructor() {
    this.initDefaultCookies();
    void this.hydrate();
  }

  private async hydrate() {
    const stored = await loadStore<PlatformCookie[]>('cookies');
    if (this.hasLocalChanges || !Array.isArray(stored)) return;
    // 过滤掉历史残留的原型假 Cookie
    this.cookies = stored.filter(
      (c) =>
        !c.id.startsWith('ck_douyin_01') &&
        !c.id.startsWith('ck_bilibili_02') &&
        !c.id.startsWith('ck_kuaishou_03')
    );
    if (this.cookies.length > 0) {
      logger.addLog('info', 'BROWSER', `已从本地存储恢复 ${this.cookies.length} 条平台凭据`);
    }
    this.notify();
  }

  private initDefaultCookies() {
    this.cookies = [];
  }

  public addCookie(cookie: Omit<PlatformCookie, 'id' | 'lastTestedAt'>): PlatformCookie {
    this.hasLocalChanges = true;
    const newCookie: PlatformCookie = {
      ...cookie,
      id: 'ck_' + Math.random().toString(36).substring(2, 9),
      lastTestedAt: Date.now(),
    };

    this.cookies = [newCookie, ...this.cookies];
    logger.addLog('success', 'BROWSER', `成功录入平台 [${cookie.platform.toUpperCase()}] 账号 Cookie: ${cookie.accountName}`);
    this.persister.schedule();
    this.notify();
    return newCookie;
  }

  public updateCookie(id: string, updates: Partial<PlatformCookie>) {
    this.hasLocalChanges = true;
    this.cookies = this.cookies.map((c) => (c.id === id ? { ...c, ...updates, lastTestedAt: Date.now() } : c));
    this.persister.schedule();
    this.notify();
  }

  public deleteCookie(id: string) {
    this.hasLocalChanges = true;
    const item = this.cookies.find((c) => c.id === id);
    if (item) {
      logger.addLog('info', 'BROWSER', `删除凭据: [${item.platform}] ${item.accountName}`);
    }
    this.cookies = this.cookies.filter((c) => c.id !== id);
    this.persister.schedule();
    this.notify();
  }

  public async testCookie(id: string): Promise<{ isValid: boolean; message: string; tokens: string[] }> {
    const item = this.cookies.find((c) => c.id === id);
    if (!item) return { isValid: false, message: '未找到对应凭据', tokens: [] };

    logger.addLog('info', 'BROWSER', `正在校验 [${item.platform.toUpperCase()}] Cookie 凭据格式与关键字段...`);

    // 增加短延迟以提供清晰的 UI 校验交互反馈
    await new Promise((r) => setTimeout(r, 450));

    const clean = item.cookieString.trim();
    if (clean.length < 15 || clean.includes('...')) {
      const msg = '凭据格式不完整（含截断省略号或长度过短），请重新录入或捕获完整 Cookie';
      this.updateCookie(id, { isValid: false, lastTestedAt: Date.now(), lastTestedMsg: msg });
      logger.addLog('error', 'BROWSER', `[${item.platform.toUpperCase()}] ${msg}`);
      return { isValid: false, message: msg, tokens: [] };
    }

    // 统计 Cookie 总条数
    const entries = clean.split(';').map((s) => s.trim()).filter(Boolean);

    // 针对各平台的核心关键凭据定义
    const PLATFORM_KEY_TOKENS: Record<string, string[]> = {
      douyin: ['sessionid', 'ttwid', 'passport_csrf_token', 'odin_tt'],
      bilibili: ['SESSDATA', 'bili_jct', 'DedeUserID', 'buvid3'],
      kuaishou: ['did', 'userId', 'kuaishou.live.bfb1s', 'clientid'],
      huya: ['yyuid', 'udb_n', 'huya_web_rep_cnt'],
      douyu: ['acf_auth', 'dy_did', 'acf_uid'],
      xiaohongshu: ['a1', 'webId', 'xsec_token'],
      tiktok: ['sessionid', 'ttwid', 'msToken'],
      youtube: ['SAPISID', 'SSID', 'LOGIN_INFO', '__Secure-3PSID'],
      twitch: ['auth-token', 'login'],
      weibo: ['SUB', 'SUBP'],
      baidu: ['BDUSS', 'BAIDUID'],
      taobao: ['_m_h5_tk', 'cookie2', '_tb_token_'],
      jd: ['pt_key', 'pt_pin'],
      netease: ['NTES_SESS', 'P_INFO'],
      chzzk: ['NID_AUT', 'NID_SES'],
      soop: ['PdboxUserAuth'],
      acfun: ['auth_key', 'acfun.mid'],
      wechat_channels: ['wxuin', 'pass_ticket', 'session_id'],
      shopee: ['SPC_EC', 'SPC_T'],
    };

    const targetTokens = PLATFORM_KEY_TOKENS[item.platform] || ['session', 'token', 'auth', 'id'];
    const detected = targetTokens.filter((k) => clean.includes(k));

    let isValid = false;
    let msg = '';

    if (PLATFORM_KEY_TOKENS[item.platform]) {
      if (detected.length > 0) {
        isValid = true;
        msg = `校验通过！已检测到关键鉴权参数: ${detected.join(', ')}（共解析出 ${entries.length} 项 Cookie）`;
      } else {
        isValid = false;
        msg = `缺少核心鉴权 Token（建议包含: ${targetTokens.slice(0, 3).join('/')}），可能未登录或凭据已失效`;
      }
    } else {
      isValid = entries.length >= 1;
      msg = `校验通过！已识别 ${entries.length} 项 Cookie 凭据，格式完好`;
    }

    this.updateCookie(id, {
      isValid,
      lastTestedAt: Date.now(),
      lastTestedMsg: msg,
    });

    if (isValid) {
      logger.addLog('success', 'BROWSER', `[${item.platform.toUpperCase()}] ${msg}`);
    } else {
      logger.addLog('warn', 'BROWSER', `[${item.platform.toUpperCase()}] ${msg}`);
    }

    return { isValid, message: msg, tokens: detected };
  }

  public getCookieForPlatform(platform: PlatformId): string | undefined {
    const match = this.cookies.find(
      (c) => c.platform === platform && c.isValid && this.isUsableCookieString(c.cookieString)
    );
    return match?.cookieString;
  }

  /** 原型预置的截断假 Cookie（含 ...）不得发给 sidecar */
  private isUsableCookieString(value: string): boolean {
    const t = value.trim();
    if (t.length < 24) return false;
    if (t.includes('...')) return false;
    return true;
  }

  public getCookies(): PlatformCookie[] {
    return this.cookies;
  }

  public subscribe(listener: CookieListener) {
    this.listeners.add(listener);
    listener(this.cookies);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.cookies));
  }
}

export const cookieService = new CookieService();
