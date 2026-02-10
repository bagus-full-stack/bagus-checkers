import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SpectatorService, SpectatorGame } from '../../core/services/spectator.service';

@Component({
  selector: 'app-spectate',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="spectate-page">
      <header class="page-header">
        <a routerLink="/" class="back-link" aria-label="Retour à l'accueil">
          ← Accueil
        </a>
        <h1 class="page-title">👁️ Parties en Direct</h1>
        <div class="header-stats">
          <span class="stat">
            <span class="stat-icon">🎮</span>
            {{ liveGames().length }} parties
          </span>
          <span class="stat">
            <span class="stat-icon">👥</span>
            {{ totalSpectators() }} spectateurs
          </span>
        </div>
      </header>

      <main class="spectate-content">
        <!-- Featured Games -->
        @if (featuredGames().length > 0) {
          <section class="games-section featured">
            <h2 class="section-title">⭐ Parties en Vedette</h2>
            <div class="games-grid">
              @for (game of featuredGames(); track game.id) {
                <article class="game-card featured" (click)="spectateGame(game)">
                  <div class="featured-badge">⭐ En vedette</div>
                  <div class="players">
                    <div class="player white">
                      <span class="player-name">{{ game.whitePlayer.name }}</span>
                      <span class="player-rating" [class]="getRatingClass(game.whitePlayer.rating)">
                        {{ game.whitePlayer.rating }}
                      </span>
                    </div>
                    <span class="vs">VS</span>
                    <div class="player black">
                      <span class="player-name">{{ game.blackPlayer.name }}</span>
                      <span class="player-rating" [class]="getRatingClass(game.blackPlayer.rating)">
                        {{ game.blackPlayer.rating }}
                      </span>
                    </div>
                  </div>
                  <div class="game-meta">
                    <span class="move-count">{{ game.moveCount }} coups</span>
                    <span class="spectator-count">👁️ {{ game.spectatorCount }}</span>
                  </div>
                </article>
              }
            </div>
          </section>
        }

        <!-- High Level Games -->
        @if (highLevelGames().length > 0) {
          <section class="games-section">
            <h2 class="section-title">🏆 Parties Haut Niveau</h2>
            <div class="games-grid">
              @for (game of highLevelGames(); track game.id) {
                <article class="game-card high-level" (click)="spectateGame(game)">
                  <div class="high-level-badge">🏆 Haut niveau</div>
                  <div class="players">
                    <div class="player white">
                      <span class="player-name">{{ game.whitePlayer.name }}</span>
                      <span class="player-rating" [class]="getRatingClass(game.whitePlayer.rating)">
                        {{ game.whitePlayer.rating }}
                      </span>
                    </div>
                    <span class="vs">VS</span>
                    <div class="player black">
                      <span class="player-name">{{ game.blackPlayer.name }}</span>
                      <span class="player-rating" [class]="getRatingClass(game.blackPlayer.rating)">
                        {{ game.blackPlayer.rating }}
                      </span>
                    </div>
                  </div>
                  <div class="game-meta">
                    <span class="move-count">{{ game.moveCount }} coups</span>
                    <span class="spectator-count">👁️ {{ game.spectatorCount }}</span>
                  </div>
                </article>
              }
            </div>
          </section>
        }

        <!-- All Live Games -->
        <section class="games-section">
          <h2 class="section-title">🎮 Toutes les Parties</h2>

          @if (isLoading()) {
            <div class="loading">
              <span class="spinner"></span>
              Chargement des parties...
            </div>
          } @else if (liveGames().length === 0) {
            <div class="empty-state">
              <span class="empty-icon">📺</span>
              <h3>Aucune partie en cours</h3>
              <p>Revenez plus tard ou lancez une partie en ligne !</p>
              <a routerLink="/game/online" class="btn btn-primary">
                Jouer en ligne
              </a>
            </div>
          } @else {
            <div class="games-grid">
              @for (game of liveGames(); track game.id) {
                <article
                  class="game-card"
                  [class.high-level]="game.isHighLevel"
                  (click)="spectateGame(game)"
                  (keydown.enter)="spectateGame(game)"
                  tabindex="0"
                  role="button"
                  [attr.aria-label]="'Regarder ' + game.whitePlayer.name + ' vs ' + game.blackPlayer.name"
                >
                  <div class="players">
                    <div class="player white">
                      <div class="player-avatar" [class.current]="game.currentPlayer === 'white'">
                        {{ game.whitePlayer.name.charAt(0).toUpperCase() }}
                      </div>
                      <div class="player-info">
                        <span class="player-name">{{ game.whitePlayer.name }}</span>
                        <span class="player-rating" [class]="getRatingClass(game.whitePlayer.rating)">
                          {{ game.whitePlayer.rating }}
                        </span>
                      </div>
                    </div>
                    <span class="vs">VS</span>
                    <div class="player black">
                      <div class="player-info">
                        <span class="player-name">{{ game.blackPlayer.name }}</span>
                        <span class="player-rating" [class]="getRatingClass(game.blackPlayer.rating)">
                          {{ game.blackPlayer.rating }}
                        </span>
                      </div>
                      <div class="player-avatar" [class.current]="game.currentPlayer === 'black'">
                        {{ game.blackPlayer.name.charAt(0).toUpperCase() }}
                      </div>
                    </div>
                  </div>

                  <div class="game-info">
                    <span class="variant">{{ game.variant }}</span>
                    <span class="time-mode">{{ game.timeMode }}</span>
                  </div>

                  <div class="game-meta">
                    <span class="move-count">
                      <span class="icon">♟️</span>
                      {{ game.moveCount }} coups
                    </span>
                    <span class="duration">
                      <span class="icon">⏱️</span>
                      {{ formatDuration(game.startedAt) }}
                    </span>
                    <span class="spectator-count">
                      <span class="icon">👁️</span>
                      {{ game.spectatorCount }}
                    </span>
                  </div>

                  <div class="watch-btn">
                    Regarder →
                  </div>
                </article>
              }
            </div>
          }
        </section>
      </main>
    </div>
  `,
  styles: `
    .spectate-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      transition: background 0.3s ease;
    }

    :host-context(.light-theme) .spectate-page {
      background: linear-gradient(135deg, #e5e7eb 0%, #f3f4f6 100%);
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 2rem;
      padding: 1rem 2rem;
      background: rgba(0, 0, 0, 0.3);
      border-bottom: 1px solid #374151;
    }

    :host-context(.light-theme) .page-header {
      background: rgba(255, 255, 255, 0.9);
      border-bottom-color: #d1d5db;
    }

    .back-link {
      color: #9ca3af;
      text-decoration: none;
      font-size: 0.875rem;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      transition: all 0.15s ease;
    }

    .back-link:hover {
      color: white;
      background: rgba(255, 255, 255, 0.1);
    }

    :host-context(.light-theme) .back-link {
      color: #4b5563;
    }

    :host-context(.light-theme) .back-link:hover {
      color: #111827;
      background: rgba(0, 0, 0, 0.05);
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: white;
      margin: 0;
      flex: 1;
    }

    :host-context(.light-theme) .page-title {
      color: #111827;
    }

    .header-stats {
      display: flex;
      gap: 1.5rem;
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #9ca3af;
      font-size: 0.875rem;
    }

    :host-context(.light-theme) .stat {
      color: #6b7280;
    }

    .stat-icon {
      font-size: 1rem;
    }

    .spectate-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .games-section {
      margin-bottom: 3rem;
    }

    .section-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: white;
      margin: 0 0 1rem;
    }

    :host-context(.light-theme) .section-title {
      color: #111827;
    }

    .games-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1rem;
    }

    .game-card {
      background: #1f2937;
      border-radius: 0.75rem;
      padding: 1.25rem;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 2px solid transparent;
      position: relative;
    }

    :host-context(.light-theme) .game-card {
      background: #ffffff;
      border-color: #e5e7eb;
    }

    .game-card:hover {
      background: #374151;
      border-color: #4f46e5;
      transform: translateY(-2px);
    }

    :host-context(.light-theme) .game-card:hover {
      background: #f9fafb;
    }

    .game-card:focus-visible {
      outline: 2px solid #4f46e5;
      outline-offset: 2px;
    }

    .game-card.featured {
      border-color: #fbbf24;
      background: linear-gradient(135deg, #1f2937 0%, #292524 100%);
    }

    :host-context(.light-theme) .game-card.featured {
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
    }

    .game-card.high-level {
      border-color: #8b5cf6;
    }

    .featured-badge, .high-level-badge {
      position: absolute;
      top: -8px;
      right: 12px;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .featured-badge {
      background: #fbbf24;
      color: #1f2937;
    }

    .high-level-badge {
      background: #8b5cf6;
      color: white;
    }

    .players {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .player {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .player.black {
      flex-direction: row-reverse;
    }

    .player-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1rem;
    }

    .player.white .player-avatar {
      background: linear-gradient(145deg, #f5f5f5, #d4d4d4);
      color: #1f2937;
    }

    .player.black .player-avatar {
      background: linear-gradient(145deg, #3d3d3d, #1a1a1a);
      color: white;
    }

    .player-avatar.current {
      box-shadow: 0 0 0 3px #22c55e;
    }

    .player-info {
      display: flex;
      flex-direction: column;
    }

    .player.black .player-info {
      align-items: flex-end;
    }

    .player-name {
      font-weight: 600;
      color: white;
      font-size: 0.875rem;
    }

    .player-rating {
      font-size: 0.75rem;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
    }

    .player-rating.master {
      background: rgba(251, 191, 36, 0.2);
      color: #fbbf24;
    }

    .player-rating.expert {
      background: rgba(139, 92, 246, 0.2);
      color: #8b5cf6;
    }

    .player-rating.advanced {
      background: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
    }

    .player-rating.intermediate {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }

    .player-rating.beginner {
      background: rgba(156, 163, 175, 0.2);
      color: #9ca3af;
    }

    .vs {
      font-weight: 700;
      color: #6b7280;
      font-size: 0.75rem;
    }

    .game-info {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .variant, .time-mode {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      background: #374151;
      border-radius: 0.25rem;
      color: #9ca3af;
    }

    .game-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.75rem;
      color: #6b7280;
    }

    .game-meta span {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .icon {
      font-size: 0.875rem;
    }

    .watch-btn {
      position: absolute;
      bottom: 1rem;
      right: 1rem;
      padding: 0.5rem 1rem;
      background: #4f46e5;
      color: white;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 500;
      opacity: 0;
      transition: opacity 0.15s ease;
    }

    .game-card:hover .watch-btn {
      opacity: 1;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 4rem;
      color: #9ca3af;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid #374151;
      border-top-color: #4f46e5;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: #1f2937;
      border-radius: 1rem;
    }

    .empty-icon {
      font-size: 4rem;
      display: block;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      color: white;
      margin: 0 0 0.5rem;
    }

    .empty-state p {
      color: #9ca3af;
      margin: 0 0 1.5rem;
    }

    .btn {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .btn-primary {
      background: #4f46e5;
      color: white;
    }

    .btn-primary:hover {
      background: #4338ca;
    }

    @media (max-width: 600px) {
      .page-header {
        flex-wrap: wrap;
        gap: 1rem;
      }

      .header-stats {
        width: 100%;
        justify-content: center;
      }

      .games-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class SpectateComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly spectatorService = inject(SpectatorService);

  readonly liveGames = this.spectatorService.liveGames;
  readonly featuredGames = this.spectatorService.featuredGames;
  readonly highLevelGames = this.spectatorService.highLevelGames;
  readonly totalSpectators = this.spectatorService.totalSpectators;
  readonly isLoading = this.spectatorService.isLoading;

  ngOnInit(): void {
    this.spectatorService.connect();
    this.spectatorService.refreshLiveGames();
  }

  ngOnDestroy(): void {
    // Don't disconnect - service is singleton
  }

  spectateGame(game: SpectatorGame): void {
    this.router.navigate(['/spectate', game.id]);
  }

  getRatingClass(rating: number): string {
    return this.spectatorService.getRatingClass(rating);
  }

  formatDuration(startedAt: string): string {
    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const mins = Math.floor(diffMs / 60000);

    if (mins < 1) return 'À l\'instant';
    if (mins < 60) return `${mins} min`;

    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}min`;
  }
}

