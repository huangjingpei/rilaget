import { settingsService } from './settingsService';

export type ThemeMode = 'dark' | 'light';

type ThemeListener = (theme: ThemeMode) => void;

class ThemeService {
  private currentTheme: ThemeMode = 'dark';
  private listeners: Set<ThemeListener> = new Set();

  constructor() {
    this.initTheme();
  }

  private initTheme() {
    try {
      const stored = localStorage.getItem('rilaget_theme') as ThemeMode;
      if (stored === 'light' || stored === 'dark') {
        this.currentTheme = stored;
      } else {
        const sysSettings = settingsService.getSettings();
        if (sysSettings.theme === 'light') {
          this.currentTheme = 'light';
        } else {
          this.currentTheme = 'dark';
        }
      }
    } catch (e) {
      this.currentTheme = 'dark';
    }
    this.applyThemeToDOM(this.currentTheme);
  }

  public getTheme(): ThemeMode {
    return this.currentTheme;
  }

  public setTheme(theme: ThemeMode) {
    this.currentTheme = theme;
    try {
      localStorage.setItem('rilaget_theme', theme);
    } catch (e) {}
    this.applyThemeToDOM(theme);
    settingsService.updateSettings({ theme: theme as any });
    this.notify();
  }

  public toggleTheme(): ThemeMode {
    const nextTheme: ThemeMode = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
    return nextTheme;
  }

  private applyThemeToDOM(theme: ThemeMode) {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }

  public subscribe(listener: ThemeListener) {
    this.listeners.add(listener);
    listener(this.currentTheme);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.currentTheme));
  }
}

export const themeService = new ThemeService();
