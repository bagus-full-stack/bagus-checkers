import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { RankingService } from '../../core/services/ranking.service';
import { RankingEntry, getRankColor } from '../../core/models/ranking.model';

@Component({
  selector: 'app-leaderboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="leaderboard-page">
      <header class="page-header">
        <a routerLink="/" class="back-link" aria-label="Retour à l'accueil">
          ← Accueil
        </a>
        <h1 class="page-title">🏆 Classement</h1>
      </header>

      <main class="leaderboard-content">
        @if (leaderboard().length === 0) {
          <div class="empty-state">
            <span class="empty-icon">📊</span>
            <h2>Pas encore de joueurs classés</h2>
            <p>Créez un profil et jouez des parties en ligne pour apparaître au classement.</p>
            <a routerLink="/profile" class="btn btn-primary">
              Créer un profil
            </a>
          </div>
        } @else {
          <!-- Top 3 podium -->
          @if (topThree().length > 0) {
            <section class="podium-section">
              <div class="podium">
                @if (topThree().length > 1) {
                  <div class="podium-place second">
                    <div class="podium-avatar">
                      @if (topThree()[1].avatar) {
                        <img [src]="topThree()[1].avatar" alt="" class="avatar" />
                      } @else {
                        <div class="avatar-placeholder">
                          {{ topThree()[1].displayName.charAt(0) }}
                        </div>
                      }
                    </div>
                    <span class="podium-rank">🥈</span>
                    <span class="podium-name">{{ topThree()[1].displayName }}</span>
                    <span class="podium-rating" [style.color]="getRankColor(topThree()[1].rating)">
                      {{ topThree()[1].rating }}
                    </span>
                  </div>
                }

                @if (topThree().length > 0) {
                  <div class="podium-place first">
                    <div class="podium-avatar">
                      @if (topThree()[0].avatar) {
                        <img [src]="topThree()[0].avatar" alt="" class="avatar" />
                      } @else {
                        <div class="avatar-placeholder gold">
                          {{ topThree()[0].displayName.charAt(0) }}
                        </div>
                      }
                    </div>
                    <span class="podium-rank">🥇</span>
                    <span class="podium-name">{{ topThree()[0].displayName }}</span>
                    <span class="podium-rating" [style.color]="getRankColor(topThree()[0].rating)">
                      {{ topThree()[0].rating }}
                    </span>
                  </div>
                }

                @if (topThree().length > 2) {
                  <div class="podium-place third">
                    <div class="podium-avatar">
                      @if (topThree()[2].avatar) {
                        <img [src]="topThree()[2].avatar" alt="" class="avatar" />
                      } @else {
                        <div class="avatar-placeholder">
                          {{ topThree()[2].displayName.charAt(0) }}
                        </div>
                      }
                    </div>
                    <span class="podium-rank">🥉</span>
                    <span class="podium-name">{{ topThree()[2].displayName }}</span>
                    <span class="podium-rating" [style.color]="getRankColor(topThree()[2].rating)">
                      {{ topThree()[2].rating }}
                    </span>
                  </div>
                }
              </div>
            </section>
          }

          <!-- Full leaderboard -->
          <section class="table-section">
            <table class="leaderboard-table" role="table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Joueur</th>
                  <th scope="col">ELO</th>
                  <th scope="col">Parties</th>
                  <th scope="col">Victoires</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of leaderboard(); track entry.userId) {
                  <tr [class.current-user]="isCurrentUser(entry)">
                    <td class="rank-cell">
                      @switch (entry.rank) {
                        @case (1) { 🥇 }
                        @case (2) { 🥈 }
                        @case (3) { 🥉 }
                        @default { {{ entry.rank }} }
                      }
                    </td>
                    <td class="player-cell">
                      <div class="player-info">
                        @if (entry.avatar) {
                          <img [src]="entry.avatar" alt="" class="table-avatar" />
                        } @else {
                          <div class="table-avatar-placeholder">
                            {{ entry.displayName.charAt(0) }}
                          </div>
                        }
                        <span class="player-name">{{ entry.displayName }}</span>
                      </div>
                    </td>
                    <td class="rating-cell" [style.color]="getRankColor(entry.rating)">
                      {{ entry.rating }}
                    </td>
                    <td class="games-cell">{{ entry.gamesPlayed }}</td>
                    <td class="winrate-cell">{{ entry.winRate }}%</td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
        }

        @if (currentUserRank()) {
          <div class="your-rank-banner">
            <span>Votre classement:</span>
            <strong>#{{ currentUserRank() }}</strong>
          </div>
        }
      </main>
    </div>
  `,
  styles: `
    .leaderboard-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
    }

    .page-header {
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
    }

    .back-link:hover {
      color: white;
      background: rgba(255, 255, 255, 0.1);
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: white;
      margin: 0;
    }

    .leaderboard-content {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
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

    .empty-state h2 {
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
      font-size: 1rem;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.15s ease;
      border: none;
    }

    .btn-primary {
      background: #4f46e5;
      color: white;
    }

    .btn-primary:hover {
      background: #4338ca;
    }

    .podium-section {
      margin-bottom: 2rem;
    }

    .podium {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      gap: 1rem;
      padding: 2rem 0;
    }

    .podium-place {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem;
      background: #1f2937;
      border-radius: 0.75rem;
      min-width: 120px;
    }

    .podium-place.first {
      padding-bottom: 2rem;
      background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
      border: 2px solid #ffd700;
    }

    .podium-place.second {
      padding-bottom: 1.5rem;
    }

    .podium-place.third {
      padding-bottom: 1rem;
    }

    .podium-avatar {
      margin-bottom: 0.5rem;
    }

    .avatar, .avatar-placeholder {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      object-fit: cover;
    }

    .podium-place.first .avatar,
    .podium-place.first .avatar-placeholder {
      width: 80px;
      height: 80px;
    }

    .avatar-placeholder {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 700;
      color: white;
    }

    .avatar-placeholder.gold {
      background: linear-gradient(135deg, #ffd700, #ffb700);
      color: #1f2937;
    }

    .podium-rank {
      font-size: 1.5rem;
    }

    .podium-name {
      font-weight: 600;
      color: white;
      margin-top: 0.25rem;
    }

    .podium-rating {
      font-size: 1.25rem;
      font-weight: 700;
    }

    .table-section {
      background: #1f2937;
      border-radius: 0.75rem;
      overflow: hidden;
    }

    .leaderboard-table {
      width: 100%;
      border-collapse: collapse;
    }

    .leaderboard-table th,
    .leaderboard-table td {
      padding: 1rem;
      text-align: left;
    }

    .leaderboard-table th {
      background: #111827;
      color: #9ca3af;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .leaderboard-table tr {
      border-bottom: 1px solid #374151;
    }

    .leaderboard-table tr:last-child {
      border-bottom: none;
    }

    .leaderboard-table tr.current-user {
      background: rgba(79, 70, 229, 0.1);
    }

    .rank-cell {
      width: 60px;
      text-align: center;
      font-weight: 600;
      color: #9ca3af;
    }

    .player-cell {
      min-width: 200px;
    }

    .player-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .table-avatar, .table-avatar-placeholder {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }

    .table-avatar-placeholder {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      font-weight: 700;
      color: white;
    }

    .player-name {
      color: white;
      font-weight: 500;
    }

    .rating-cell {
      font-weight: 700;
      font-size: 1rem;
    }

    .games-cell, .winrate-cell {
      color: #9ca3af;
    }

    .your-rank-banner {
      position: fixed;
      bottom: 1rem;
      left: 50%;
      transform: translateX(-50%);
      background: #4f46e5;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 2rem;
      display: flex;
      gap: 0.5rem;
      box-shadow: 0 4px 16px rgba(79, 70, 229, 0.4);
    }

    @media (max-width: 600px) {
      .podium {
        flex-direction: column;
        align-items: center;
      }

      .podium-place {
        width: 100%;
        max-width: 200px;
      }

      .leaderboard-table th:nth-child(4),
      .leaderboard-table td:nth-child(4),
      .leaderboard-table th:nth-child(5),
      .leaderboard-table td:nth-child(5) {
        display: none;
      }
    }
  `,
})
export class LeaderboardComponent {
  private readonly rankingService = inject(RankingService);

  readonly leaderboard = this.rankingService.leaderboard;
  readonly currentUser = this.rankingService.userProfile;

  readonly topThree = computed(() =>
    this.leaderboard().slice(0, 3)
  );

  readonly currentUserRank = computed(() => {
    const user = this.currentUser();
    if (!user) return null;
    const entry = this.leaderboard().find(e => e.userId === user.id);
    return entry?.rank ?? null;
  });

  getRankColor(rating: number): string {
    return getRankColor(rating);
  }

  isCurrentUser(entry: RankingEntry): boolean {
    const user = this.currentUser();
    return user?.id === entry.userId;
  }
}

