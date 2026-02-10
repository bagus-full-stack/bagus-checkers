import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService, KeyboardService, AudioService } from './core/services';
import { KeyboardHelpComponent } from './components';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, KeyboardHelpComponent],
  template: `
    <router-outlet />

    <!-- Theme toggle button (fixed position) -->
    <button
      type="button"
      class="theme-toggle"
      (click)="toggleTheme()"
      [attr.aria-label]="'Thème actuel: ' + (isDarkMode() ? 'sombre' : 'clair')"
      title="Changer de thème (T)"
    >
      {{ isDarkMode() ? '🌙' : '☀️' }}
    </button>

    <!-- Sound toggle button -->
    <button
      type="button"
      class="sound-toggle"
      (click)="toggleSound()"
      [attr.aria-label]="'Son: ' + (soundEnabled() ? 'activé' : 'désactivé')"
      title="Activer/désactiver le son (M)"
    >
      {{ soundEnabled() ? '🔊' : '🔇' }}
    </button>

    <!-- Keyboard help button -->
    <button
      type="button"
      class="help-toggle"
      (click)="showHelp()"
      aria-label="Raccourcis clavier"
      title="Raccourcis clavier (?)"
    >
      ⌨️
    </button>

    <!-- Keyboard help modal -->
    @if (showKeyboardHelp()) {
      <app-keyboard-help (close)="closeHelp()" />
    }
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
    }

    .theme-toggle,
    .sound-toggle,
    .help-toggle {
      position: fixed;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: none;
      background: var(--bg-secondary, #1f2937);
      color: var(--text-primary, white);
      font-size: 1.25rem;
      cursor: pointer;
      z-index: 50;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .theme-toggle {
      bottom: 1.5rem;
      right: 1.5rem;
    }

    .sound-toggle {
      bottom: 1.5rem;
      right: 4.5rem;
    }

    .help-toggle {
      bottom: 1.5rem;
      right: 7.5rem;
    }

    .theme-toggle:hover,
    .sound-toggle:hover,
    .help-toggle:hover {
      transform: scale(1.1);
      background: var(--bg-tertiary, #374151);
    }

    .theme-toggle:focus-visible,
    .sound-toggle:focus-visible,
    .help-toggle:focus-visible {
      outline: 2px solid #4f46e5;
      outline-offset: 2px;
    }

    @media (max-width: 600px) {
      .theme-toggle,
      .sound-toggle,
      .help-toggle {
        width: 40px;
        height: 40px;
        font-size: 1rem;
      }

      .theme-toggle {
        bottom: 1rem;
        right: 1rem;
      }

      .sound-toggle {
        bottom: 1rem;
        right: 3.5rem;
      }

      .help-toggle {
        bottom: 1rem;
        right: 6rem;
      }
    }
  `,
})
export class App implements OnInit {
  private readonly themeService = inject(ThemeService);
  private readonly keyboardService = inject(KeyboardService);
  private readonly audioService = inject(AudioService);

  readonly isDarkMode = this.themeService.isDarkMode;
  readonly soundEnabled = this.audioService.soundEnabled;
  readonly showKeyboardHelp = this.keyboardService.showHelp;

  ngOnInit(): void {
    // Services are initialized automatically
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleSound(): void {
    this.audioService.toggleSound();
  }

  showHelp(): void {
    this.keyboardService.toggleHelp();
  }

  closeHelp(): void {
    this.keyboardService.closeHelp();
  }
}
