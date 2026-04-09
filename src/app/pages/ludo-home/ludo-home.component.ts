import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/services';

@Component({
  selector: 'app-ludo-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="home-container ludo-theme">
      <header class="hero">
        <a routerLink="/" class="back-link" aria-label="Retour  l'accueil">
          ← Selection / Menu
        </a>
        <h1 class="title">Ludo</h1>
        <p class="subtitle">{{ currentLanguage() === 'fr' ? 'Jeu de socit classique' : 'Classic Board Game' }}</p>
      </header>

      <nav class="menu" aria-label="Menu principal Ludo">
        <a [routerLink]="['/game/online']" [queryParams]="{ variant: 'ludo' }" class="menu-btn primary">
          <span class="btn-icon" aria-hidden="true">🌐</span>
          <span class="btn-text">
            <strong>{{ currentLanguage() === 'fr' ? 'Jouer en ligne' : 'Play Online' }}</strong>
            <small>{{ currentLanguage() === 'fr' ? 'Rejoignez ou crez une partie Ludo' : 'Join or create a Ludo room' }}</small>
          </span>
        </a>

        <!-- Additional placeholder buttons for future features -->
        <button disabled class="menu-btn disabled-btn" title="Coming soon">
          <span class="btn-icon" aria-hidden="true">👥</span>
          <span class="btn-text">
            <strong>{{ currentLanguage() === 'fr' ? 'Jouer en local' : 'Play Local' }}</strong>
            <small>{{ currentLanguage() === 'fr' ? 'Prochainement' : 'Coming soon' }}</small>
          </span>
        </button>

        <a routerLink="/settings" class="menu-btn secondary">
          <span class="btn-icon" aria-hidden="true">⚙️</span>
          <span class="btn-text">
            <strong>{{ i18n.t('common.settings') }}</strong>
            <small>{{ currentLanguage() === 'fr' ? 'Personnalisez votre exprience' : 'Customize your experience' }}</small>
          </span>
        </a>
      </nav>

      <footer class="footer">
        <p>{{ currentLanguage() === 'fr' ? 'Ludo Board Game (2-4 Joueurs)' : 'Ludo Board Game (2-4 Players)' }}</p>
      </footer>
    </div>
  `,
  styles: `
    .home-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%);
      transition: background 0.3s ease;
    }

    .ludo-theme {
      background: linear-gradient(135deg, #451a03 0%, #7c2d12 50%, #451a03 100%);
    }

    :host-context(.light-theme) .home-container.ludo-theme {
      background: linear-gradient(135deg, #fef3c7 0%, #ffedd5 50%, #fef3c7 100%);
    }

    .back-link {
      position: absolute;
      top: 1.5rem;
      left: 1.5rem;
      color: #fdba74;
      text-decoration: none;
      font-size: 0.875rem;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      transition: all 0.15s ease;
      background: rgba(255, 255, 255, 0.1);

      &:hover {
        color: white;
        background: rgba(255, 255, 255, 0.2);
      }
    }

    :host-context(.light-theme) .back-link {
      color: #9a3412;
      background: rgba(0, 0, 0, 0.05);

      &:hover {
        color: #7c2d12;
        background: rgba(0, 0, 0, 0.1);
      }
    }

    .hero {
      text-align: center;
      margin-bottom: 3rem;
    }

    .title {
      font-size: clamp(2.5rem, 6vw, 4rem);
      font-weight: 800;
      color: white;
      margin: 0 0 0.5rem 0;
      text-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    :host-context(.light-theme) .title {
      color: #7c2d12;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .subtitle {
      font-size: 1.25rem;
      color: #fed7aa;
      margin: 0;
    }

    :host-context(.light-theme) .subtitle {
      color: #9a3412;
    }

    .menu {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: 100%;
      max-width: 400px;
    }

    .menu-btn {
      display: flex;
      align-items: center;
      gap: 1rem;
      width: 100%;
      padding: 1rem 1.5rem;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 0.75rem;
      color: white;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
      text-align: left;

      &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      }

      &:focus-visible {
        outline: 3px solid #fb923c;
        outline-offset: 2px;
      }

      &.primary {
        background: linear-gradient(135deg, #ea580c, #c2410c);
        border-color: #f97316;
      }

      &.secondary {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
      }
    }

    .disabled-btn {
      opacity: 0.6;
      cursor: not-allowed;
    }

    :host-context(.light-theme) .menu-btn {
      background: rgba(255, 255, 255, 0.9);
      border-color: rgba(234, 88, 12, 0.2);
      color: #431407;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

      &:hover:not(:disabled) {
        background: white;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      }

      &.primary {
        background: linear-gradient(135deg, #ea580c, #c2410c);
        color: white;
      }

      &.secondary {
        background: rgba(255, 255, 255, 0.7);
      }
    }

    .btn-icon {
      font-size: 2rem;
      width: 48px;
      text-align: center;
    }

    .btn-text {
      display: flex;
      flex-direction: column;
      text-align: left;

      strong {
        font-size: 1.125rem;
      }

      small {
        font-size: 0.875rem;
        color: #fed7aa;
        margin-top: 0.125rem;
      }
    }

    :host-context(.light-theme) .btn-text small {
      color: #c2410c;
    }

    :host-context(.light-theme) .menu-btn.primary .btn-text small {
      color: #fed7aa;
    }

    .footer {
      margin-top: 3rem;
      text-align: center;
      color: #fdba74;
      font-size: 0.875rem;
    }

    :host-context(.light-theme) .footer {
      color: #9a3412;
    }
  `
})
export class LudoHomeComponent {
  readonly i18n = inject(I18nService);
  readonly currentLanguage = this.i18n.currentLanguage;
}

