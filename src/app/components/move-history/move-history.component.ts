import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { GameEngineService } from '../../core/services';
import { moveToNotation } from '../../core/models';

@Component({
  selector: 'app-move-history',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'block',
  },
  template: `
    <div class="history-container">
      <h2 class="history-title">Historique des coups</h2>

      <div class="controls">
        <button
          type="button"
          class="control-btn"
          [disabled]="!canUndo()"
          (click)="undo()"
          aria-label="Annuler le dernier coup"
        >
          ← Annuler
        </button>
        <button
          type="button"
          class="control-btn"
          [disabled]="!canRedo()"
          (click)="redo()"
          aria-label="Rétablir le coup"
        >
          Rétablir →
        </button>
      </div>

      <div class="moves-list" role="list" aria-label="Liste des coups joués">
        @if (formattedMoves().length === 0) {
          <p class="empty-message">Aucun coup joué</p>
        } @else {
          @for (movePair of formattedMoves(); track movePair.number; let i = $index) {
            <div class="move-pair" role="listitem">
              <span class="move-number">{{ movePair.number }}.</span>
              <span class="move white-move">{{ movePair.white }}</span>
              @if (movePair.black) {
                <span class="move black-move">{{ movePair.black }}</span>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: `
    .history-container {
      background: #1f2937;
      border-radius: 0.5rem;
      padding: 1rem;
      color: white;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .history-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0 0 1rem 0;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #374151;
    }

    .controls {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .control-btn {
      flex: 1;
      padding: 0.5rem 1rem;
      background: #374151;
      border: 1px solid #4b5563;
      border-radius: 0.375rem;
      color: white;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background-color 0.15s ease;

      &:hover:not(:disabled) {
        background: #4b5563;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &:focus-visible {
        outline: 2px solid #4f46e5;
        outline-offset: 2px;
      }
    }

    .moves-list {
      flex: 1;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
    }

    .empty-message {
      color: #9ca3af;
      font-style: italic;
      text-align: center;
      margin: 1rem 0;
    }

    .move-pair {
      display: flex;
      gap: 0.5rem;
      padding: 0.25rem 0;
      border-bottom: 1px solid #374151;

      &:last-child {
        border-bottom: none;
      }
    }

    .move-number {
      color: #9ca3af;
      min-width: 2rem;
    }

    .move {
      padding: 0.125rem 0.5rem;
      border-radius: 0.25rem;
      min-width: 4rem;
      text-align: center;
    }

    .white-move {
      background: #f3f4f6;
      color: #1f2937;
    }

    .black-move {
      background: #1f2937;
      border: 1px solid #4b5563;
    }
  `,
})
export class MoveHistoryComponent {
  private readonly gameEngine = inject(GameEngineService);

  readonly moveHistory = this.gameEngine.moveHistory;

  readonly formattedMoves = computed(() => {
    const moves = this.moveHistory();
    const pairs: { number: number; white: string; black?: string }[] = [];

    for (let i = 0; i < moves.length; i += 2) {
      const whiteMove = moves[i];
      const blackMove = moves[i + 1];

      pairs.push({
        number: Math.floor(i / 2) + 1,
        white: moveToNotation(whiteMove),
        black: blackMove ? moveToNotation(blackMove) : undefined,
      });
    }

    return pairs;
  });

  canUndo(): boolean {
    return this.gameEngine.canUndo();
  }

  canRedo(): boolean {
    return this.gameEngine.canRedo();
  }

  undo(): void {
    this.gameEngine.undo();
  }

  redo(): void {
    this.gameEngine.redo();
  }
}

