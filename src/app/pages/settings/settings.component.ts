import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameVariantService } from '../../core/services';
import { GAME_VARIANTS, GameVariant } from '../../core/models';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="settings-container">
      <header class="settings-header">
        <a routerLink="/" class="back-link" aria-label="Retour à l'accueil">
          ← Accueil
        </a>
        <h1 class="settings-title">Paramètres</h1>
      </header>

      <main class="settings-main">
        <section class="settings-section" aria-labelledby="variant-heading">
          <h2 id="variant-heading" class="section-title">Variante de jeu</h2>
          <div class="variant-options" role="radiogroup" aria-labelledby="variant-heading">
            @for (variant of variants; track variant.id) {
              <button
                type="button"
                role="radio"
                [attr.aria-checked]="isSelectedVariant(variant.id)"
                class="variant-option"
                [class.selected]="isSelectedVariant(variant.id)"
                (click)="selectVariant(variant.id)"
              >
                <span class="variant-name">{{ variant.name }}</span>
                <span class="variant-details">
                  {{ variant.boardSize }}x{{ variant.boardSize }} •
                  {{ variant.piecesPerPlayer }} pions
                </span>
                <ul class="variant-rules">
                  <li>
                    @if (variant.flyingKings) {
                      Dames volantes
                    } @else {
                      Dames classiques
                    }
                  </li>
                  <li>
                    @if (variant.mandatoryMaxCapture) {
                      Prise maximale obligatoire
                    } @else {
                      Prise libre
                    }
                  </li>
                </ul>
              </button>
            }
          </div>
        </section>

        <section class="settings-section" aria-labelledby="theme-heading">
          <h2 id="theme-heading" class="section-title">Thème du plateau</h2>
          <div class="theme-options" role="radiogroup" aria-labelledby="theme-heading">
            @for (theme of themes; track theme.id) {
              <button
                type="button"
                role="radio"
                [attr.aria-checked]="selectedTheme() === theme.id"
                class="theme-option"
                [class.selected]="selectedTheme() === theme.id"
                (click)="selectTheme(theme.id)"
              >
                <div
                  class="theme-preview"
                  [style.--light-color]="theme.lightColor"
                  [style.--dark-color]="theme.darkColor"
                  aria-hidden="true"
                >
                  <div class="preview-square light"></div>
                  <div class="preview-square dark"></div>
                  <div class="preview-square dark"></div>
                  <div class="preview-square light"></div>
                </div>
                <span class="theme-name">{{ theme.name }}</span>
              </button>
            }
          </div>
        </section>

        <section class="settings-section" aria-labelledby="accessibility-heading">
          <h2 id="accessibility-heading" class="section-title">Accessibilité</h2>
          <div class="accessibility-options">
            <label class="toggle-option">
              <span class="toggle-label">Animations réduites</span>
              <input
                type="checkbox"
                [checked]="reducedMotion()"
                (change)="toggleReducedMotion()"
                class="toggle-input"
              />
              <span class="toggle-switch" aria-hidden="true"></span>
            </label>
            <label class="toggle-option">
              <span class="toggle-label">Contraste élevé</span>
              <input
                type="checkbox"
                [checked]="highContrast()"
                (change)="toggleHighContrast()"
                class="toggle-input"
              />
              <span class="toggle-switch" aria-hidden="true"></span>
            </label>
          </div>
        </section>
      </main>
    </div>
  `,
  styles: `
    .settings-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      color: white;
    }

    .settings-header {
      display: flex;
      align-items: center;
      gap: 2rem;
      padding: 1rem 2rem;
      background: rgba(0, 0, 0, 0.3);
      border-bottom: 1px solid #374151;
    }

    .back-link {
      color: #9ca3af;
      text-decoration: none;
      font-size: 0.875rem;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      transition: all 0.15s ease;

      &:hover {
        color: white;
        background: rgba(255, 255, 255, 0.1);
      }

      &:focus-visible {
        outline: 2px solid #4f46e5;
        outline-offset: 2px;
      }
    }

    .settings-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0;
    }

    .settings-main {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }

    .settings-section {
      margin-bottom: 3rem;
    }

    .section-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0 0 1rem 0;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #374151;
    }

    .variant-options {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .variant-option {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 1rem 1.5rem;
      background: #374151;
      border: 2px solid transparent;
      border-radius: 0.5rem;
      color: white;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;

      &:hover {
        background: #4b5563;
      }

      &.selected {
        border-color: #4f46e5;
        background: rgba(79, 70, 229, 0.2);
      }

      &:focus-visible {
        outline: 2px solid #4f46e5;
        outline-offset: 2px;
      }
    }

    .variant-name {
      font-size: 1.125rem;
      font-weight: 600;
    }

    .variant-details {
      font-size: 0.875rem;
      color: #9ca3af;
      margin-top: 0.25rem;
    }

    .variant-rules {
      display: flex;
      gap: 1rem;
      margin: 0.5rem 0 0 0;
      padding: 0;
      list-style: none;
      font-size: 0.75rem;
      color: #6b7280;
    }

    .theme-options {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1rem;
    }

    .theme-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      background: #374151;
      border: 2px solid transparent;
      border-radius: 0.5rem;
      color: white;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: #4b5563;
      }

      &.selected {
        border-color: #4f46e5;
      }

      &:focus-visible {
        outline: 2px solid #4f46e5;
        outline-offset: 2px;
      }
    }

    .theme-preview {
      display: grid;
      grid-template-columns: 1fr 1fr;
      width: 48px;
      height: 48px;
      border-radius: 0.25rem;
      overflow: hidden;
    }

    .preview-square {
      &.light {
        background-color: var(--light-color);
      }
      &.dark {
        background-color: var(--dark-color);
      }
    }

    .theme-name {
      font-size: 0.875rem;
    }

    .accessibility-options {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .toggle-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      background: #374151;
      border-radius: 0.5rem;
      cursor: pointer;

      &:focus-within {
        outline: 2px solid #4f46e5;
        outline-offset: 2px;
      }
    }

    .toggle-label {
      font-size: 1rem;
    }

    .toggle-input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-switch {
      position: relative;
      width: 48px;
      height: 24px;
      background: #6b7280;
      border-radius: 12px;
      transition: background-color 0.15s ease;

      &::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 20px;
        height: 20px;
        background: white;
        border-radius: 50%;
        transition: transform 0.15s ease;
      }
    }

    .toggle-input:checked + .toggle-switch {
      background: #4f46e5;

      &::after {
        transform: translateX(24px);
      }
    }
  `,
})
export class SettingsComponent {
  private readonly variantService = inject(GameVariantService);

  readonly variants = GAME_VARIANTS;
  readonly selectedVariant = this.variantService.currentVariant;

  readonly themes = [
    { id: 'classic', name: 'Classique', lightColor: '#f0d9b5', darkColor: '#b58863' },
    { id: 'wood', name: 'Bois', lightColor: '#deb887', darkColor: '#8b4513' },
    { id: 'blue', name: 'Bleu', lightColor: '#e8eef4', darkColor: '#5b7c99' },
    { id: 'green', name: 'Vert', lightColor: '#eeeed2', darkColor: '#769656' },
    { id: 'dark', name: 'Sombre', lightColor: '#4a5568', darkColor: '#2d3748' },
  ];

  readonly selectedTheme = signal('classic');
  readonly reducedMotion = signal(false);
  readonly highContrast = signal(false);

  isSelectedVariant(variantId: string): boolean {
    return this.selectedVariant().id === variantId;
  }

  selectVariant(variantId: string): void {
    this.variantService.setVariant(variantId);
  }

  selectTheme(themeId: string): void {
    this.selectedTheme.set(themeId);
    // Could store in localStorage and apply CSS variables
  }

  toggleReducedMotion(): void {
    this.reducedMotion.update((v) => !v);
  }

  toggleHighContrast(): void {
    this.highContrast.update((v) => !v);
  }
}

