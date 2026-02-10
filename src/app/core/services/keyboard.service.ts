import { Injectable, inject, signal, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { GameEngineService } from './game-engine.service';
import { ThemeService } from './theme.service';
import { AudioService } from './audio.service';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  action: () => void;
  category: 'navigation' | 'game' | 'ui' | 'audio';
}

const SHORTCUTS_ENABLED_KEY = 'checkers_shortcuts_enabled';

/**
 * Service for managing keyboard shortcuts
 */
@Injectable({
  providedIn: 'root',
})
export class KeyboardService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly router = inject(Router);
  private readonly gameEngine = inject(GameEngineService);
  private readonly themeService = inject(ThemeService);
  private readonly audioService = inject(AudioService);

  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private readonly _enabled = signal(this.loadEnabled());
  private readonly _showHelp = signal(false);

  /** Is keyboard shortcuts enabled */
  readonly enabled = this._enabled.asReadonly();

  /** Show help modal */
  readonly showHelp = this._showHelp.asReadonly();

  /** All available shortcuts */
  readonly shortcuts: KeyboardShortcut[] = [
    // Navigation
    { key: 'h', description: 'Aller à l\'accueil', action: () => this.router.navigate(['/']), category: 'navigation' },
    { key: 'l', description: 'Partie locale', action: () => this.router.navigate(['/game/local']), category: 'navigation' },
    { key: 'a', description: 'Partie contre IA', action: () => this.router.navigate(['/game/ai']), category: 'navigation' },
    { key: 'o', description: 'Partie en ligne', action: () => this.router.navigate(['/game/online']), category: 'navigation' },
    { key: 'p', description: 'Profil', action: () => this.router.navigate(['/profile']), category: 'navigation' },
    { key: 's', description: 'Paramètres', action: () => this.router.navigate(['/settings']), category: 'navigation' },

    // Game controls
    { key: 'n', description: 'Nouvelle partie', action: () => this.newGame(), category: 'game' },
    { key: 'z', ctrlKey: true, description: 'Annuler le dernier coup', action: () => this.undo(), category: 'game' },
    { key: 'y', ctrlKey: true, description: 'Rétablir le coup', action: () => this.redo(), category: 'game' },
    { key: 'r', description: 'Abandonner', action: () => this.resign(), category: 'game' },
    { key: 'Escape', description: 'Désélectionner', action: () => this.deselect(), category: 'game' },

    // UI controls
    { key: 't', description: 'Changer de thème', action: () => this.themeService.cycleThemeMode(), category: 'ui' },
    { key: '?', shiftKey: true, description: 'Afficher l\'aide', action: () => this.toggleHelp(), category: 'ui' },
    { key: 'F1', description: 'Afficher l\'aide', action: () => this.toggleHelp(), category: 'ui' },

    // Audio controls
    { key: 'm', description: 'Activer/désactiver le son', action: () => this.audioService.toggleSound(), category: 'audio' },
    { key: 'M', shiftKey: true, description: 'Activer/désactiver la musique', action: () => this.audioService.toggleMusic(), category: 'audio' },
  ];

  constructor() {
    if (this.isBrowser) {
      this.initKeyboardListener();
    }
  }

  ngOnDestroy(): void {
    if (this.isBrowser && this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
    }
  }

  /**
   * Initializes keyboard listener
   */
  private initKeyboardListener(): void {
    this.keydownHandler = (e: KeyboardEvent) => {
      if (!this._enabled()) return;

      // Ignore if typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Find matching shortcut
      const shortcut = this.shortcuts.find(s =>
        s.key.toLowerCase() === e.key.toLowerCase() &&
        !!s.ctrlKey === e.ctrlKey &&
        !!s.shiftKey === e.shiftKey &&
        !!s.altKey === e.altKey
      );

      if (shortcut) {
        e.preventDefault();
        this.audioService.playClick();
        shortcut.action();
      }
    };

    document.addEventListener('keydown', this.keydownHandler);
  }

  /**
   * Enables keyboard shortcuts
   */
  enable(): void {
    this._enabled.set(true);
    this.saveEnabled();
  }

  /**
   * Disables keyboard shortcuts
   */
  disable(): void {
    this._enabled.set(false);
    this.saveEnabled();
  }

  /**
   * Toggles keyboard shortcuts
   */
  toggle(): void {
    this._enabled.update(v => !v);
    this.saveEnabled();
  }

  /**
   * Shows help modal
   */
  toggleHelp(): void {
    this._showHelp.update(v => !v);
  }

  /**
   * Closes help modal
   */
  closeHelp(): void {
    this._showHelp.set(false);
  }

  /**
   * Gets shortcuts by category
   */
  getShortcutsByCategory(category: KeyboardShortcut['category']): KeyboardShortcut[] {
    return this.shortcuts.filter(s => s.category === category);
  }

  /**
   * Formats shortcut key for display
   */
  formatShortcut(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.altKey) parts.push('Alt');

    let key = shortcut.key;
    if (key === ' ') key = 'Espace';
    if (key === 'Escape') key = 'Échap';
    if (key === 'ArrowUp') key = '↑';
    if (key === 'ArrowDown') key = '↓';
    if (key === 'ArrowLeft') key = '←';
    if (key === 'ArrowRight') key = '→';

    parts.push(key.toUpperCase());
    return parts.join(' + ');
  }

  // Game actions
  private newGame(): void {
    this.gameEngine.startNewGame();
  }

  private undo(): void {
    // Implement undo via history service if available
  }

  private redo(): void {
    // Implement redo via history service if available
  }

  private resign(): void {
    if (confirm('Êtes-vous sûr de vouloir abandonner ?')) {
      this.gameEngine.resign();
    }
  }

  private deselect(): void {
    this.gameEngine.deselectPiece();
  }

  private loadEnabled(): boolean {
    if (!this.isBrowser) return true;

    try {
      const stored = localStorage.getItem(SHORTCUTS_ENABLED_KEY);
      return stored !== 'false';
    } catch {
      return true;
    }
  }

  private saveEnabled(): void {
    if (!this.isBrowser) return;

    try {
      localStorage.setItem(SHORTCUTS_ENABLED_KEY, String(this._enabled()));
    } catch {
      console.warn('Failed to save shortcuts preference');
    }
  }
}

