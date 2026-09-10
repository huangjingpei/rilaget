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

  public async testCookie(id: string): Promise<boolean> {
    const item = this.cookies.find((c) => c.id === id);
    if (!item) return false;

    logger.addLog('info', 'BROWSER', `正在校验 [${item.platform.toUpperCase()}] Cookie 凭据格式与关键字段...`);

    const clean = item.cookieString.trim();
    let isValid = clean.length > 20 && !clean.includes('...');

    // 针对各核心平台关键鉴权字段特征检测
    if (item.platform === 'douyin') {
      isValid = isValid && (clean.includes('sessionid') || clean.includes('ttwid') || clean.includes('passport_csrf_token'));
    } else if (item.platform === 'bilibili') {
      isValid = isValid && (clean.includes('SESSDATA') || clean.includes('bili_jct') || clean.includes('DedeUserID'));
    } else if (item.platform === 'huya') {
      isValid = isValid && (clean.includes('yyuid') || clean.includes('udb_n') || clean.includes('huya_web_rep_cnt'));
    }

    this.updateCookie(id, { isValid });
    if (isValid) {
      logger.addLog('success', 'BROWSER', `[${item.platform.toUpperCase()}] 凭据有效，包含关键鉴权 Token`);
    } else {
      logger.addLog('error', 'BROWSER', `[${item.platform.toUpperCase()}] 凭据格式不正确或缺少必要授权字段，请重新提取`);
    }
    return isValid;
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
