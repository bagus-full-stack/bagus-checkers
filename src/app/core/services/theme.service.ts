import { Injectable, inject, signal, computed, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'light' | 'dark' | 'auto';

const THEME_STORAGE_KEY = 'checkers_theme_mode';

/**
 * Service for managing theme (dark/light mode)
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private mediaQuery: MediaQueryList | null = null;
  private mediaQueryHandler: ((e: MediaQueryListEvent) => void) | null = null;

  private readonly _themeMode = signal<ThemeMode>(this.loadThemeMode());
  private readonly _systemPrefersDark = signal(this.getSystemPreference());

  /** Current theme mode setting */
  readonly themeMode = this._themeMode.asReadonly();

  /** System prefers dark mode */
  readonly systemPrefersDark = this._systemPrefersDark.asReadonly();

  /** Actual active theme (resolved from auto) */
  readonly activeTheme = computed((): 'light' | 'dark' => {
    const mode = this._themeMode();
    if (mode === 'auto') {
      return this._systemPrefersDark() ? 'dark' : 'light';
    }
    return mode;
  });

  /** Is dark mode active */
  readonly isDarkMode = computed(() => this.activeTheme() === 'dark');

  constructor() {
    if (this.isBrowser) {
      this.initSystemThemeWatcher();
      this.applyTheme();
    }
  }

  ngOnDestroy(): void {
    if (this.mediaQuery && this.mediaQueryHandler) {
      this.mediaQuery.removeEventListener('change', this.mediaQueryHandler);
    }
  }

  /**
   * Initializes system theme preference watcher
   */
  private initSystemThemeWatcher(): void {
    if (!this.isBrowser) return;

    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this._systemPrefersDark.set(this.mediaQuery.matches);

    this.mediaQueryHandler = (e: MediaQueryListEvent) => {
      this._systemPrefersDark.set(e.matches);
      if (this._themeMode() === 'auto') {
        this.applyTheme();
      }
    };

    this.mediaQuery.addEventListener('change', this.mediaQueryHandler);
  }

  /**
   * Gets system color scheme preference
   */
  private getSystemPreference(): boolean {
    if (!this.isBrowser) return true; // Default to dark for SSR
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  /**
   * Loads theme mode from storage
   */
  private loadThemeMode(): ThemeMode {
    if (!this.isBrowser) return 'dark';

    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'auto') {
        return stored;
      }
    } catch {
      console.warn('Failed to load theme mode');
    }
    return 'auto'; // Default to auto
  }

  /**
   * Saves theme mode to storage
   */
  private saveThemeMode(): void {
    if (!this.isBrowser) return;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, this._themeMode());
    } catch {
      console.warn('Failed to save theme mode');
    }
  }

  /**
   * Applies the current theme to the document
   */
  private applyTheme(): void {
    if (!this.isBrowser) return;

    const isDark = this.activeTheme() === 'dark';
    const root = document.documentElement;

    if (isDark) {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
    } else {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
    }

    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#111827' : '#f3f4f6');
    }
  }

  /**
   * Sets theme mode
   */
  setThemeMode(mode: ThemeMode): void {
    this._themeMode.set(mode);
    this.saveThemeMode();
    this.applyTheme();
  }

  /**
   * Toggles between light and dark mode
   */
  toggleTheme(): void {
    const current = this.activeTheme();
    this.setThemeMode(current === 'dark' ? 'light' : 'dark');
  }

  /**
   * Sets to auto mode
   */
  setAutoMode(): void {
    this.setThemeMode('auto');
  }

  /**
   * Cycles through theme modes: auto -> light -> dark -> auto
   */
  cycleThemeMode(): void {
    const current = this._themeMode();
    const next: ThemeMode =
      current === 'auto' ? 'light' :
      current === 'light' ? 'dark' : 'auto';
    this.setThemeMode(next);
  }
}

