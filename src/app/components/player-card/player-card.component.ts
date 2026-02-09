import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  computed,
} from '@angular/core';
import { RankingService } from '../../core/services/ranking.service';
import { UserProfile, getRankTitle, getRankColor, calculateWinRate } from '../../core/models/ranking.model';

@Component({
  selector: 'app-player-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="player-card" [class.compact]="compact()">
      <div class="avatar-section">
        @if (profile().avatar) {
          <img
            [src]="profile().avatar"
            [alt]="profile().displayName"
            class="avatar"
          />
        } @else {
          <div class="avatar-placeholder">
            {{ profile().displayName.charAt(0).toUpperCase() }}
          </div>
        }

        <div class="rank-badge" [style.background]="rankColor()">
          {{ profile().rating }}
        </div>
      </div>

      <div class="info-section">
        <h3 class="player-name">{{ profile().displayName }}</h3>
        <p class="rank-title" [style.color]="rankColor()">{{ rankTitle() }}</p>

        @if (!compact()) {
          <div class="stats-row">
            <div class="stat">
              <span class="stat-value">{{ profile().gamesPlayed }}</span>
              <span class="stat-label">Parties</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ winRate() }}%</span>
              <span class="stat-label">Victoires</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ profile().winStreak }}</span>
              <span class="stat-label">Série</span>
            </div>
          </div>
        }
      </div>

      @if (showActions()) {
        <div class="actions-section">
          <button
            type="button"
            class="action-btn challenge"
            (click)="challenge.emit(profile())"
            aria-label="Défier ce joueur"
          >
            ⚔️
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .player-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: #1f2937;
      border-radius: 0.75rem;
      padding: 1rem;
      transition: all 0.15s ease;
    }

    .player-card:hover {
      background: #374151;
    }

    .player-card.compact {
      padding: 0.5rem 0.75rem;
      gap: 0.75rem;
    }

    .avatar-section {
      position: relative;
      flex-shrink: 0;
    }

    .avatar, .avatar-placeholder {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      object-fit: cover;
    }

    .compact .avatar, .compact .avatar-placeholder {
      width: 40px;
      height: 40px;
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

    .compact .avatar-placeholder {
      font-size: 1rem;
    }

    .rank-badge {
      position: absolute;
      bottom: -4px;
      right: -4px;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      font-size: 0.625rem;
      font-weight: 700;
      color: white;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .info-section {
      flex: 1;
      min-width: 0;
    }

    .player-name {
      font-size: 1rem;
      font-weight: 600;
      color: white;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .compact .player-name {
      font-size: 0.875rem;
    }

    .rank-title {
      font-size: 0.75rem;
      font-weight: 500;
      margin: 0.125rem 0 0;
    }

    .stats-row {
      display: flex;
      gap: 1rem;
      margin-top: 0.5rem;
    }

    .stat {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 0.875rem;
      font-weight: 600;
      color: white;
    }

    .stat-label {
      font-size: 0.625rem;
      color: #6b7280;
    }

    .actions-section {
      flex-shrink: 0;
    }

    .action-btn {
      width: 40px;
      height: 40px;
      border-radius: 0.5rem;
      border: none;
      background: #374151;
      font-size: 1.25rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .action-btn:hover {
      background: #4f46e5;
      transform: scale(1.05);
    }

    .action-btn:focus-visible {
      outline: 2px solid #4f46e5;
      outline-offset: 2px;
    }
  `,
})
export class PlayerCardComponent {
  readonly profile = input.required<UserProfile>();
  readonly compact = input(false);
  readonly showActions = input(false);

  readonly challenge = output<UserProfile>();

  readonly rankTitle = computed(() => getRankTitle(this.profile().rating));
  readonly rankColor = computed(() => getRankColor(this.profile().rating));
  readonly winRate = computed(() =>
    calculateWinRate(this.profile().wins, this.profile().gamesPlayed)
  );
}

