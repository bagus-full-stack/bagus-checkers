import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="home-container">
      <header class="hero">
        <h1 class="title">Angular Checkers Master</h1>
        <p class="subtitle">Le jeu de dames nouvelle génération</p>
      </header>

      <nav class="menu" aria-label="Menu principal">
        <a routerLink="/game/local" class="menu-btn primary">
          <span class="btn-icon" aria-hidden="true">👥</span>
          <span class="btn-text">
            <strong>Jouer en Local</strong>
            <small>2 joueurs sur le même écran</small>
          </span>
        </a>

        <a routerLink="/game/ai" class="menu-btn">
          <span class="btn-icon" aria-hidden="true">🤖</span>
          <span class="btn-text">
            <strong>Jouer contre l'IA</strong>
            <small>3 niveaux de difficulté</small>
          </span>
        </a>

        <a routerLink="/game/online" class="menu-btn">
          <span class="btn-icon" aria-hidden="true">🌐</span>
          <span class="btn-text">
            <strong>Jouer en Ligne</strong>
            <small>Affrontez des joueurs du monde entier</small>
          </span>
        </a>

        <a routerLink="/tutorial" class="menu-btn secondary">
          <span class="btn-icon" aria-hidden="true">📖</span>
          <span class="btn-text">
            <strong>Tutoriel</strong>
            <small>Apprenez les règles du jeu</small>
          </span>
        </a>

        <a routerLink="/settings" class="menu-btn secondary">
          <span class="btn-icon" aria-hidden="true">⚙️</span>
          <span class="btn-text">
            <strong>Paramètres</strong>
            <small>Personnalisez votre expérience</small>
          </span>
        </a>
      </nav>

      <nav class="secondary-menu" aria-label="Menu secondaire">
        <a routerLink="/profile" class="secondary-btn">
          <span class="btn-icon" aria-hidden="true">👤</span>
          <span>Profil</span>
        </a>
        <a routerLink="/leaderboard" class="secondary-btn">
          <span class="btn-icon" aria-hidden="true">🏆</span>
          <span>Classement</span>
        </a>
        <a routerLink="/replays" class="secondary-btn">
          <span class="btn-icon" aria-hidden="true">📼</span>
          <span>Replays</span>
        </a>
      </nav>

      <footer class="footer">
        <p>Dames Internationales (10x10) • Règles officielles</p>
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

    .subtitle {
      font-size: 1.25rem;
      color: #c7d2fe;
      margin: 0;
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

    .footer {
      margin-top: 3rem;
      text-align: center;
      color: #a5b4fc;
      font-size: 0.875rem;
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
  `,
})
export class HomeComponent {}

