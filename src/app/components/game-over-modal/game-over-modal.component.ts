import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { GameStatistics } from '../../core/models/replay.model';
import { PlayerColor } from '../../core/models/piece.model';
import { MaterialGraphComponent } from '../material-graph/material-graph.component';

@Component({
  selector: 'app-game-over-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialGraphComponent],
  template: `
    <div
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
      (click)="onBackdropClick($event)"
    >
      <div class="modal-content" (click)="$event.stopPropagation()">
        <h2 id="game-over-title" class="modal-title">
          {{ titleText() }}
        </h2>

        <div class="result-display">
          @if (winner() && winner() !== 'draw') {
            <div class="winner-badge" [class]="winner()">
              <span class="winner-icon">🏆</span>
              <span class="winner-text">
                Les {{ winner() === 'white' ? 'Blancs' : 'Noirs' }} gagnent !
              </span>
            </div>
          } @else {
            <div class="draw-badge">
              <span class="draw-icon">🤝</span>
              <span class="draw-text">Match nul</span>
            </div>
          }

          @if (reason()) {
            <p class="reason-text">{{ reasonText() }}</p>
          }
        </div>

        @if (stats()) {
          <div class="stats-section">
            <h3 class="stats-title">Statistiques</h3>

            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-value">{{ stats()!.totalMoves }}</span>
                <span class="stat-label">Coups joués</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ formatDuration(stats()!.duration) }}</span>
                <span class="stat-label">Durée</span>
              </div>
              <div class="stat-item white">
                <span class="stat-value">{{ stats()!.whiteCaptures }}</span>
                <span class="stat-label">Prises blancs</span>
              </div>
              <div class="stat-item black">
                <span class="stat-value">{{ stats()!.blackCaptures }}</span>
                <span class="stat-label">Prises noirs</span>
              </div>
            </div>

            @if (stats()!.materialHistory.length > 1) {
              <app-material-graph [history]="stats()!.materialHistory" />
            }
          </div>
        }

        @if (eloChange()) {
          <div class="elo-section">
            <span class="elo-label">Changement ELO:</span>
            <span
              class="elo-change"
              [class.positive]="eloChange()! > 0"
              [class.negative]="eloChange()! < 0"
            >
              {{ eloChange()! > 0 ? '+' : '' }}{{ eloChange() }}
            </span>
          </div>
        }

        <div class="modal-actions">
          @if (showRematch()) {
            <button
              type="button"
              class="btn btn-primary"
              (click)="rematch.emit()"
            >
              🔄 Revanche
            </button>
          }

          <button
            type="button"
            class="btn btn-secondary"
            (click)="newGame.emit()"
          >
            🆕 Nouvelle partie
          </button>

          <button
            type="button"
            class="btn btn-outline"
            (click)="saveReplay.emit()"
          >
            💾 Sauvegarder
          </button>

          <button
            type="button"
            class="btn btn-ghost"
            (click)="close.emit()"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      animation: fadeIn 0.2s ease;
      padding: 1rem;
    }

    .modal-content {
      background: #1f2937;
      border-radius: 1rem;
      padding: 2rem;
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      animation: slideUp 0.3s ease;
    }

    :host-context(.light-theme) .modal-content {
      background: #ffffff;
    }

    .modal-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: white;
      text-align: center;
      margin: 0 0 1.5rem;
    }

    :host-context(.light-theme) .modal-title {
      color: #111827;
    }

    .result-display {
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .winner-badge, .draw-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border-radius: 2rem;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .winner-badge.white {
      background: linear-gradient(135deg, #f5f5f5, #d4d4d4);
      color: #1f2937;
    }

    .winner-badge.black {
      background: linear-gradient(135deg, #3d3d3d, #1a1a1a);
      color: white;
    }

    .draw-badge {
      background: #374151;
      color: #9ca3af;
    }

    :host-context(.light-theme) .draw-badge {
      background: #f3f4f6;
      color: #6b7280;
    }

    .winner-icon, .draw-icon {
      font-size: 1.5rem;
    }

    .reason-text {
      margin: 0.75rem 0 0;
      color: #9ca3af;
      font-size: 0.875rem;
    }

    :host-context(.light-theme) .reason-text {
      color: #6b7280;
    }

    .stats-section {
      background: #111827;
      border-radius: 0.5rem;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }

    .stats-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #9ca3af;
      margin: 0 0 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.5rem;
      background: #1f2937;
      border-radius: 0.375rem;
    }

    .stat-item.white {
      border-left: 3px solid #f5f5f5;
    }

    .stat-item.black {
      border-left: 3px solid #3d3d3d;
    }

    .stat-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: white;
    }

    .stat-label {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .elo-section {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      padding: 0.75rem;
      background: #111827;
      border-radius: 0.5rem;
    }

    .elo-label {
      color: #9ca3af;
      font-size: 0.875rem;
    }

    .elo-change {
      font-size: 1.25rem;
      font-weight: 700;
    }

    .elo-change.positive {
      color: #22c55e;
    }

    .elo-change.negative {
      color: #ef4444;
    }

    .modal-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: center;
    }

    .btn {
      padding: 0.75rem 1.25rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
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

    .btn-secondary {
      background: #374151;
      color: white;
    }

    .btn-secondary:hover {
      background: #4b5563;
    }

    .btn-outline {
      background: transparent;
      border: 1px solid #4b5563;
      color: #9ca3af;
    }

    .btn-outline:hover {
      background: #374151;
      color: white;
    }

    .btn-ghost {
      background: transparent;
      color: #6b7280;
    }

    .btn-ghost:hover {
      color: white;
    }

    .btn:focus-visible {
      outline: 2px solid #4f46e5;
      outline-offset: 2px;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
})
export class GameOverModalComponent {
  readonly winner = input<PlayerColor | 'draw' | null>(null);
  readonly reason = input<string>();
  readonly stats = input<GameStatistics>();
  readonly eloChange = input<number>();
  readonly showRematch = input(false);

  readonly rematch = output<void>();
  readonly newGame = output<void>();
  readonly saveReplay = output<void>();
  readonly close = output<void>();

  readonly titleText = computed(() => {
    const w = this.winner();
    if (w === 'draw') return 'Match Nul !';
    if (w) return 'Partie Terminée !';
    return 'Fin de Partie';
  });

  readonly reasonText = computed(() => {
    const r = this.reason();
    switch (r) {
      case 'no-pieces': return 'Toutes les pièces adverses ont été capturées';
      case 'no-moves': return 'L\'adversaire ne peut plus jouer';
      case 'resignation': return 'Abandon';
      case 'timeout': return 'Temps écoulé';
      case 'disconnect': return 'Déconnexion de l\'adversaire';
      default: return r;
    }
  });

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}

