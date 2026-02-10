import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FR_TRANSLATIONS, EN_TRANSLATIONS, TranslationKey } from './translations';

export type Language = 'fr' | 'en';

export interface LanguageConfig {
  readonly code: Language;
  readonly name: string;
  readonly nativeName: string;
}

export const AVAILABLE_LANGUAGES: LanguageConfig[] = [
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'en', name: 'English', nativeName: 'English' },
];

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  fr: FR_TRANSLATIONS,
  en: EN_TRANSLATIONS,
};

const STORAGE_KEY = 'checkers_language';
const DEFAULT_LANGUAGE: Language = 'fr';

/**
 * Service for internationalization (i18n)
 * Provides reactive translations with signal-based state management
 */
@Injectable({
  providedIn: 'root',
})
export class I18nService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _currentLanguage = signal<Language>(this.loadLanguage());

  /** Current language code */
  readonly currentLanguage = this._currentLanguage.asReadonly();

  /** Current language configuration */
  readonly currentLanguageConfig = computed(() =>
    AVAILABLE_LANGUAGES.find((l) => l.code === this._currentLanguage()) ?? AVAILABLE_LANGUAGES[0]
  );

  /** Available languages */
  readonly availableLanguages = AVAILABLE_LANGUAGES;

  /**
   * Translates a key to the current language
   */
  t(key: TranslationKey, params?: Record<string, string | number>): string {
    const lang = this._currentLanguage();
    const translations = TRANSLATIONS[lang];
    let text = translations[key] ?? key;

    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(new RegExp(`{{${param}}}`, 'g'), String(value));
      });
    }

    return text;
  }

  /**
   * Creates a computed signal for a translation
   * Use this in templates for reactive translations
   */
  translate(key: TranslationKey, params?: Record<string, string | number>) {
    return computed(() => this.t(key, params));
  }

  /**
   * Sets the current language
   */
  setLanguage(lang: Language): void {
    this._currentLanguage.set(lang);
    this.saveLanguage(lang);
    this.updateDocumentLang(lang);
  }

  /**
   * Toggles between available languages
   */
  toggleLanguage(): void {
    const current = this._currentLanguage();
    const currentIndex = AVAILABLE_LANGUAGES.findIndex((l) => l.code === current);
    const nextIndex = (currentIndex + 1) % AVAILABLE_LANGUAGES.length;
    this.setLanguage(AVAILABLE_LANGUAGES[nextIndex].code);
  }

  private loadLanguage(): Language {
    if (!this.isBrowser) {
      return DEFAULT_LANGUAGE;
    }

    try {
      // Check stored preference
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'fr' || stored === 'en') {
        return stored;
      }

      // Detect browser language
      const browserLang = navigator.language.split('-')[0].toLowerCase();
      if (browserLang === 'en') {
        return 'en';
      }
    } catch {
      console.warn('Failed to load language preference');
    }

    return DEFAULT_LANGUAGE;
  }

  private saveLanguage(lang: Language): void {
    if (!this.isBrowser) return;

    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      console.warn('Failed to save language preference');
    }
  }

  private updateDocumentLang(lang: Language): void {
    if (!this.isBrowser) return;
    document.documentElement.lang = lang;
  }
}

