import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { GameEngineService, GameVariantService } from '../../core/services';
import { countPieces } from '../../core/models';

@Component({
  selector: 'app-game-info',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="info-container">
      <div class="player-section black-player" [class.active]="currentPlayer() === 'black'">
        <div class="player-indicator">
          <div class="piece-icon black"></div>
          <span class="player-name">Noir</span>
        </div>
        <div class="piece-count">
          <span>Pions: {{ pieceCount().black.pawns }}</span>
          <span>Dames: {{ pieceCount().black.kings }}</span>
        </div>
      </div>

      <div class="game-status">
        @switch (status()) {
          @case ('playing') {
            <span class="status-text">
              Tour des {{ currentPlayer() === 'white' ? 'Blancs' : 'Noirs' }}
            </span>
          }
          @case ('finished') {
            <div class="game-result">
              @if (gameResult()?.winner === 'draw') {
                <span class="result-text">Match nul !</span>
              } @else {
                <span class="result-text winner">
                  Les {{ gameResult()?.winner === 'white' ? 'Blancs' : 'Noirs' }} gagnent !
                </span>
              }
              <span class="result-reason">
                @switch (gameResult()?.reason) {
                  @case ('no-pieces') { Plus de pièces }
                  @case ('no-moves') { Aucun coup possible }
                  @case ('resignation') { Abandon }
                  @case ('timeout') { Temps écoulé }
                }
              </span>
            </div>
          }
          @case ('waiting') {
            <span class="status-text">En attente...</span>
          }
        }
      </div>

      <div class="player-section white-player" [class.active]="currentPlayer() === 'white'">
        <div class="player-indicator">
          <div class="piece-icon white"></div>
          <span class="player-name">Blanc</span>
        </div>
        <div class="piece-count">
          <span>Pions: {{ pieceCount().white.pawns }}</span>
          <span>Dames: {{ pieceCount().white.kings }}</span>
        </div>
      </div>

      <div class="variant-info">
        <span class="variant-label">Variante:</span>
        <span class="variant-name">{{ variantName() }}</span>
      </div>
    </div>
  `,
  styles: `
    .info-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      background: #1f2937;
      border-radius: 0.5rem;
      color: white;
    }

    .player-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      border-radius: 0.375rem;
      background: #374151;
      transition: all 0.2s ease;

      &.active {
        background: #4f46e5;
        box-shadow: 0 0 12px rgba(79, 70, 229, 0.5);
      }
    }

    .player-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .piece-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid #6b7280;

      &.white {
        background: linear-gradient(145deg, #f5f5f5, #d4d4d4);
      }

      &.black {
        background: linear-gradient(145deg, #3d3d3d, #1a1a1a);
      }
    }

    .player-name {
      font-weight: 600;
      font-size: 1rem;
    }

    .piece-count {
      display: flex;
      gap: 1rem;
      font-size: 0.875rem;
      color: #d1d5db;
    }

    .game-status {
      text-align: center;
      padding: 0.75rem;
    }

    .status-text {
      font-size: 1.125rem;
      font-weight: 500;
    }

    .game-result {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .result-text {
      font-size: 1.25rem;
      font-weight: 700;

      &.winner {
        color: #10b981;
      }
    }

    .result-reason {
      font-size: 0.875rem;
      color: #9ca3af;
    }

    .variant-info {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid #374151;
      font-size: 0.875rem;
    }

    .variant-label {
      color: #9ca3af;
    }

    .variant-name {
      font-weight: 500;
    }
  `,
})
export class GameInfoComponent {
  private readonly gameEngine = inject(GameEngineService);
  private readonly variantService = inject(GameVariantService);

  readonly currentPlayer = this.gameEngine.currentPlayer;
  readonly status = this.gameEngine.status;
  readonly gameResult = this.gameEngine.gameResult;

  readonly variantName = computed(
    () => this.variantService.currentVariant().name
  );

  readonly pieceCount = computed(() => {
    const state = this.gameEngine.gameState();
    if (!state) {
      return {
        white: { pawns: 0, kings: 0 },
        black: { pawns: 0, kings: 0 },
      };
    }
    return countPieces(state);
  });
}

