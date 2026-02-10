import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/services';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="home-container">
      <header class="hero">
        <h1 class="title">{{ i18n.t('home.title') }}</h1>
        <p class="subtitle">{{ i18n.t('home.subtitle') }}</p>
      </header>

      <nav class="menu" aria-label="Menu principal">
        <a routerLink="/game/local" class="menu-btn primary">
          <span class="btn-icon" aria-hidden="true">👥</span>
          <span class="btn-text">
            <strong>{{ i18n.t('home.playLocal') }}</strong>
            <small>{{ i18n.t('home.playLocalDesc') }}</small>
          </span>
        </a>

        <a routerLink="/game/ai" class="menu-btn">
          <span class="btn-icon" aria-hidden="true">🤖</span>
          <span class="btn-text">
            <strong>{{ i18n.t('home.playAI') }}</strong>
            <small>{{ i18n.t('home.playAIDesc') }}</small>
          </span>
        </a>

        <a routerLink="/game/online" class="menu-btn">
          <span class="btn-icon" aria-hidden="true">🌐</span>
          <span class="btn-text">
            <strong>{{ i18n.t('home.playOnline') }}</strong>
            <small>{{ i18n.t('home.playOnlineDesc') }}</small>
          </span>
        </a>

        <a routerLink="/tutorial" class="menu-btn secondary">
          <span class="btn-icon" aria-hidden="true">📖</span>
          <span class="btn-text">
            <strong>{{ i18n.t('home.tutorial') }}</strong>
            <small>{{ i18n.t('home.tutorialDesc') }}</small>
          </span>
        </a>

        <a routerLink="/settings" class="menu-btn secondary">
          <span class="btn-icon" aria-hidden="true">⚙️</span>
          <span class="btn-text">
            <strong>{{ i18n.t('common.settings') }}</strong>
            <small>{{ currentLanguage() === 'fr' ? 'Personnalisez votre expérience' : 'Customize your experience' }}</small>
          </span>
        </a>
      </nav>

      <nav class="secondary-menu" aria-label="Menu secondaire">
        <a routerLink="/spectate" class="secondary-btn">
          <span class="btn-icon" aria-hidden="true">👁️</span>
          <span>{{ i18n.t('home.spectate') }}</span>
        </a>
        <a routerLink="/profile" class="secondary-btn">
          <span class="btn-icon" aria-hidden="true">👤</span>
          <span>{{ i18n.t('home.profile') }}</span>
        </a>
        <a routerLink="/leaderboard" class="secondary-btn">
          <span class="btn-icon" aria-hidden="true">🏆</span>
          <span>{{ i18n.t('home.leaderboard') }}</span>
        </a>
        <a routerLink="/replays" class="secondary-btn">
          <span class="btn-icon" aria-hidden="true">📼</span>
          <span>{{ i18n.t('home.replays') }}</span>
        </a>
      </nav>

      <footer class="footer">
        <p>{{ currentLanguage() === 'fr' ? 'Dames Internationales (10x10) • Règles officielles' : 'International Checkers (10x10) • Official Rules' }}</p>
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

    :host-context(.light-theme) .home-container {
      background: linear-gradient(135deg, #c7d2fe 0%, #e0e7ff 50%, #c7d2fe 100%);
    }

    .hero {
      text-align: center;
      margin-bottom: 3rem;
    }

    .title {
      font-size: clamp(2rem, 5vw, 3.5rem);
      font-weight: 800;
      color: white;
      margin: 0 0 0.5rem 0;
      text-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    :host-context(.light-theme) .title {
      color: #1e1b4b;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .subtitle {
      font-size: 1.25rem;
      color: #c7d2fe;
      margin: 0;
    }

    :host-context(.light-theme) .subtitle {
      color: #4338ca;
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
      padding: 1rem 1.5rem;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 0.75rem;
      color: white;
      text-decoration: none;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      }

      &:focus-visible {
        outline: 3px solid #818cf8;
        outline-offset: 2px;
      }

      &.primary {
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        border-color: #6366f1;
      }

      &.secondary {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
      }
    }

    :host-context(.light-theme) .menu-btn {
      background: rgba(255, 255, 255, 0.9);
      border-color: rgba(79, 70, 229, 0.2);
      color: #1e1b4b;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

      &:hover {
        background: white;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      }

      &.primary {
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
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
        color: #c7d2fe;
        margin-top: 0.125rem;
      }
    }

    :host-context(.light-theme) .btn-text small {
      color: #6366f1;
    }

    :host-context(.light-theme) .menu-btn.primary .btn-text small {
      color: #c7d2fe;
    }

    .footer {
      margin-top: 3rem;
      text-align: center;
      color: #a5b4fc;
      font-size: 0.875rem;
    }

    :host-context(.light-theme) .footer {
      color: #4338ca;
    }

    .secondary-menu {
      display: flex;
      gap: 1rem;
      margin-top: 2rem;
    }

    .secondary-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.5rem;
      color: #c7d2fe;
      text-decoration: none;
      font-size: 0.875rem;
      transition: all 0.2s ease;

      .btn-icon {
        font-size: 1rem;
        width: auto;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }

      &:focus-visible {
        outline: 2px solid #818cf8;
        outline-offset: 2px;
      }
    }

    :host-context(.light-theme) .secondary-btn {
      background: rgba(255, 255, 255, 0.7);
      border-color: rgba(79, 70, 229, 0.2);
      color: #4338ca;

      &:hover {
        background: white;
        color: #1e1b4b;
      }
    }
  `,
})
export class HomeComponent {
  readonly i18n = inject(I18nService);
  readonly currentLanguage = this.i18n.currentLanguage;
}

