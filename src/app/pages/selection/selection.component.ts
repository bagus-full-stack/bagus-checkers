import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/services';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-selection',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="selection-container">
      <header class="hero">
        <h1 class="title">BagusGames</h1>
        <p class="subtitle">Sélectionnez votre jeu / Choose your game</p>
      </header>

      <main class="games-grid">
        <a routerLink="/checkers" class="game-card checkers">
          <div class="card-content">
            <span class="game-icon" aria-hidden="true">♟️</span>
            <h2 class="game-title">Checkers</h2>
            <p class="game-desc">{{ currentLanguage() === 'fr' ? 'Dames Internationales (10x10)' : 'International Checkers (10x10)' }}</p>
          </div>
        </a>

        <a [routerLink]="['/ludo']" class="game-card ludo">
          <div class="card-content">
            <span class="game-icon" aria-hidden="true">🎲</span>
            <h2 class="game-title">Ludo</h2>
            <p class="game-desc">{{ currentLanguage() === 'fr' ? 'Jeu de société classique (Ludo)' : 'Classic board game (Ludo) ' }}</p>
          </div>
        </a>
      </main>
    </div>
  `,
  styles: `
    .selection-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background: linear-gradient(135deg, #111827 0%, #1f2937 50%, #111827 100%);
      transition: background 0.3s ease;
    }

    :host-context(.light-theme) .selection-container {
      background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%);
    }

    .hero {
      text-align: center;
      margin-bottom: 4rem;
    }

    .title {
      font-size: clamp(2.5rem, 6vw, 4rem);
      font-weight: 800;
      color: white;
      margin: 0 0 0.5rem 0;
      text-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      letter-spacing: -1px;
    }

    :host-context(.light-theme) .title {
      color: #111827;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .subtitle {
      font-size: 1.25rem;
      color: #9ca3af;
      margin: 0;
    }

    :host-context(.light-theme) .subtitle {
      color: #4b5563;
    }

    .games-grid {
      display: flex;
      gap: 2rem;
      width: 100%;
      max-width: 800px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .game-card {
      flex: 1;
      min-width: 280px;
      padding: 3rem 2rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 1.5rem;
      text-decoration: none;
      color: white;
      text-align: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        transform: translateY(-8px) scale(1.02);
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      }

      &:focus-visible {
        outline: 3px solid #818cf8;
        outline-offset: 2px;
      }
    }

    .checkers {
      background: linear-gradient(145deg, rgba(79, 70, 229, 0.2), rgba(124, 58, 237, 0.2));
      &:hover {
        background: linear-gradient(145deg, rgba(79, 70, 229, 0.3), rgba(124, 58, 237, 0.3));
        box-shadow: 0 20px 40px rgba(79, 70, 229, 0.2);
      }
    }

    .ludo {
      background: linear-gradient(145deg, rgba(220, 38, 38, 0.2), rgba(234, 179, 8, 0.2));
      &:hover {
        background: linear-gradient(145deg, rgba(220, 38, 38, 0.3), rgba(234, 179, 8, 0.3));
        box-shadow: 0 20px 40px rgba(220, 38, 38, 0.2);
      }
    }

    :host-context(.light-theme) .game-card {
      color: #111827;
      background: rgba(255, 255, 255, 0.9);
      border-color: rgba(0, 0, 0, 0.1);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

      &:hover {
        background: white;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      }

      &.checkers {
        border-color: rgba(79, 70, 229, 0.3);
      }

      &.ludo {
        border-color: rgba(220, 38, 38, 0.3);
      }
    }

    .card-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .game-icon {
      font-size: 4rem;
      margin-bottom: 0.5rem;
      display: inline-block;
      transition: transform 0.3s ease;
    }

    .game-card:hover .game-icon {
      transform: scale(1.1) rotate(5deg);
    }

    .game-title {
      font-size: 2rem;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.5px;
    }

    .game-desc {
      font-size: 1rem;
      margin: 0;
      color: #9ca3af;
      max-width: 200px;
    }

    :host-context(.light-theme) .game-desc {
      color: #4b5563;
    }
  `
})
export class SelectionComponent {
  readonly i18n = inject(I18nService);
  readonly currentLanguage = this.i18n.currentLanguage;
}

