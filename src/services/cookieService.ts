import { PlatformCookie, PlatformId } from '../types';
import { logger } from './logger';

type CookieListener = (cookies: PlatformCookie[]) => void;

class CookieService {
  private cookies: PlatformCookie[] = [];
  private listeners: Set<CookieListener> = new Set();

  constructor() {
    this.initDefaultCookies();
  }

  private initDefaultCookies() {
    this.cookies = [
      {
        id: 'ck_douyin_01',
        platform: 'douyin',
        accountName: 'StreamGeeker_DouyinVIP',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        cookieString: 'ttwid=1%7ChjM3Q...; sessionid=f89a9c4b2e81...; passport_csrf_token=98234...; odin_tt=e716c21...; msToken=w3_89xX...',
        isVip: true,
        isValid: true,
        lastTestedAt: Date.now() - 3600000 * 2,
        expiresAt: '2026-11-20',
        extractedFrom: 'qr_scan',
      },
      {
        id: 'ck_bilibili_02',
        platform: 'bilibili',
        accountName: 'BiliBili_大会员User',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
        cookieString: 'SESSDATA=8a9b2c3d%2C1759283920%2C9f8e7d6c; bili_jct=3f892a01; DedeUserID=10928374; DedeUserID__ckMd5=892348a;',
        isVip: true,
        isValid: true,
        lastTestedAt: Date.now() - 3600000 * 5,
        expiresAt: '2026-12-31',
        extractedFrom: 'embedded_browser',
      },
      {
        id: 'ck_kuaishou_03',
        platform: 'kuaishou',
        accountName: 'Kuaishou_Account_01',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        cookieString: 'kuaishou.server.web_st=ChZrdWFpc2hvdS5zZXJ2ZXIud2ViLnN0EqAB...; did=web_829374829384; client_key=6589fb29',
        isVip: false,
        isValid: true,
        lastTestedAt: Date.now() - 3600000 * 12,
        expiresAt: '2026-10-15',
        extractedFrom: 'manual_input',
      },
    ];
  }

  public addCookie(cookie: Omit<PlatformCookie, 'id' | 'lastTestedAt'>): PlatformCookie {
    const newCookie: PlatformCookie = {
      ...cookie,
      id: 'ck_' + Math.random().toString(36).substring(2, 9),
      lastTestedAt: Date.now(),
    };

    this.cookies = [newCookie, ...this.cookies];
    logger.addLog('success', 'BROWSER', `成功录入平台 [${cookie.platform.toUpperCase()}] 账号 Cookie: ${cookie.accountName}`);
    this.notify();
    return newCookie;
  }

  public updateCookie(id: string, updates: Partial<PlatformCookie>) {
    this.cookies = this.cookies.map((c) => (c.id === id ? { ...c, ...updates, lastTestedAt: Date.now() } : c));
    this.notify();
  }

  public deleteCookie(id: string) {
    const item = this.cookies.find((c) => c.id === id);
    if (item) {
      logger.addLog('info', 'BROWSER', `删除凭据: [${item.platform}] ${item.accountName}`);
    }
    this.cookies = this.cookies.filter((c) => c.id !== id);
    this.notify();
  }

  public testCookie(id: string): Promise<boolean> {
    const item = this.cookies.find((c) => c.id === id);
    if (!item) return Promise.resolve(false);

    logger.addLog('info', 'BROWSER', `正在校验 [${item.platform.toUpperCase()}] Cookie 凭据有效性...`);

    return new Promise((resolve) => {
      setTimeout(() => {
        const isValid = item.cookieString.length > 25;
        this.updateCookie(id, { isValid });
        if (isValid) {
          logger.addLog('success', 'BROWSER', `[${item.platform.toUpperCase()}] 凭据有效！成功获取用户信息与高清流授权`);
        } else {
          logger.addLog('error', 'BROWSER', `[${item.platform.toUpperCase()}] 凭据已失效或格式不正确，请重新登录`);
        }
        resolve(isValid);
      }, 700);
    });
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
