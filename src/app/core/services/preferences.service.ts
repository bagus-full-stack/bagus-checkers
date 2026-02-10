import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  UserPreferences,
  BoardTheme,
  PieceStyle,
  DEFAULT_PREFERENCES,
  BOARD_THEMES,
  PIECE_STYLES,
} from '../models';

const STORAGE_KEY = 'checkers_preferences';

/**
 * Service for managing user preferences
 */
@Injectable({
  providedIn: 'root',
})
export class PreferencesService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _preferences = signal<UserPreferences>(this.loadPreferences());

  /** Current preferences */
  readonly preferences = this._preferences.asReadonly();

  /** Current board theme */
  readonly boardTheme = computed(() => this._preferences().boardTheme);

  /** Current piece style */
  readonly pieceStyle = computed(() => this._preferences().pieceStyle);

  /** Current board theme config */
  readonly boardThemeConfig = computed(() => BOARD_THEMES[this._preferences().boardTheme]);

  /** Current piece style config */
  readonly pieceStyleConfig = computed(() => PIECE_STYLES[this._preferences().pieceStyle]);

  /** Sound enabled */
  readonly soundEnabled = computed(() => this._preferences().soundEnabled);

  /** Animations enabled */
  readonly animationsEnabled = computed(() => this._preferences().animationsEnabled);

  /** Show valid moves */
  readonly showValidMoves = computed(() => this._preferences().showValidMoves);

  /** Show last move */
  readonly showLastMove = computed(() => this._preferences().showLastMove);

  constructor() {
    // Apply theme CSS variables on initialization
    if (this.isBrowser) {
      this.applyTheme(this._preferences());
    }
  }

  /**
   * Sets the board theme
   */
  setBoardTheme(theme: BoardTheme): void {
    this.updatePreferences({ boardTheme: theme });
  }

  /**
   * Sets the piece style
   */
  setPieceStyle(style: PieceStyle): void {
    this.updatePreferences({ pieceStyle: style });
  }

  /**
   * Toggles sound
   */
  toggleSound(): void {
    this.updatePreferences({ soundEnabled: !this._preferences().soundEnabled });
  }

  /**
   * Toggles animations
   */
  toggleAnimations(): void {
    this.updatePreferences({ animationsEnabled: !this._preferences().animationsEnabled });
  }

  /**
   * Toggles show valid moves
   */
  toggleShowValidMoves(): void {
    this.updatePreferences({ showValidMoves: !this._preferences().showValidMoves });
  }

  /**
   * Toggles show last move
   */
  toggleShowLastMove(): void {
    this.updatePreferences({ showLastMove: !this._preferences().showLastMove });
  }

  /**
   * Updates preferences
   */
  updatePreferences(partial: Partial<UserPreferences>): void {
    const newPrefs = { ...this._preferences(), ...partial };
    this._preferences.set(newPrefs);
    this.savePreferences(newPrefs);
    // Apply theme immediately for responsive UI
    this.applyTheme(newPrefs);
  }

  /**
   * Resets to default preferences
   */
  resetToDefaults(): void {
    this._preferences.set(DEFAULT_PREFERENCES);
    this.savePreferences(DEFAULT_PREFERENCES);
  }

  private loadPreferences(): UserPreferences {
    if (!this.isBrowser) {
      return DEFAULT_PREFERENCES;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch {
      console.warn('Failed to load preferences from localStorage');
    }
    return DEFAULT_PREFERENCES;
  }

  private savePreferences(prefs: UserPreferences): void {
    if (!this.isBrowser) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      console.warn('Failed to save preferences to localStorage');
    }
  }

  private applyTheme(prefs: UserPreferences): void {
    if (!this.isBrowser) return;

    const themeConfig = BOARD_THEMES[prefs.boardTheme];
    const pieceConfig = PIECE_STYLES[prefs.pieceStyle];

    const root = document.documentElement;

    // Board colors
    root.style.setProperty('--board-light', themeConfig.lightSquare);
    root.style.setProperty('--board-dark', themeConfig.darkSquare);
    root.style.setProperty('--board-border', themeConfig.border);
    root.style.setProperty('--board-highlight', themeConfig.highlight);
    root.style.setProperty('--board-valid-move', themeConfig.validMove);

    // Piece colors
    root.style.setProperty('--piece-white-primary', pieceConfig.whitePrimary);
    root.style.setProperty('--piece-white-secondary', pieceConfig.whiteSecondary);
    root.style.setProperty('--piece-black-primary', pieceConfig.blackPrimary);
    root.style.setProperty('--piece-black-secondary', pieceConfig.blackSecondary);

    // Effects
    root.style.setProperty('--piece-3d-effect', pieceConfig.use3dEffect ? '1' : '0');
    root.style.setProperty('--animations-enabled', prefs.animationsEnabled ? '1' : '0');
  }
}

