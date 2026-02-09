import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  computed,
} from '@angular/core';
import { ReplayService } from '../../core/services/replay.service';
import { SavedGame } from '../../core/models/replay.model';
import { formatTime } from '../../core/models/timer.model';

@Component({
  selector: 'app-replay-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="replay-controls" role="group" aria-label="Contrôles de lecture">
      <div class="controls-row">
        <button
          type="button"
          class="control-btn"
          [disabled]="!canGoBack()"
          (click)="goToStart()"
          aria-label="Aller au début"
          title="Début"
        >
          ⏮️
        </button>

        <button
          type="button"
          class="control-btn"
          [disabled]="!canGoBack()"
          (click)="previousMove()"
          aria-label="Coup précédent"
          title="Précédent"
        >
          ⏪
        </button>

        <button
          type="button"
          class="control-btn play-btn"
          (click)="togglePlay()"
          [attr.aria-label]="isPlaying() ? 'Pause' : 'Lecture'"
          [title]="isPlaying() ? 'Pause' : 'Lecture'"
        >
          {{ isPlaying() ? '⏸️' : '▶️' }}
        </button>

        <button
          type="button"
          class="control-btn"
          [disabled]="!canGoForward()"
          (click)="nextMove()"
          aria-label="Coup suivant"
          title="Suivant"
        >
          ⏩
        </button>

        <button
          type="button"
          class="control-btn"
          [disabled]="!canGoForward()"
          (click)="goToEnd()"
          aria-label="Aller à la fin"
          title="Fin"
        >
          ⏭️
        </button>
      </div>

      <div class="progress-row">
        <span class="move-counter">
          {{ currentMove() }} / {{ totalMoves() }}
        </span>

        <input
          type="range"
          class="progress-slider"
          [min]="-1"
          [max]="totalMoves() - 1"
          [value]="currentMoveIndex()"
          (input)="onSliderChange($event)"
          aria-label="Position dans la partie"
        />
      </div>

      <div class="speed-row">
        <span class="speed-label">Vitesse:</span>
        <div class="speed-buttons">
          @for (speed of speeds; track speed) {
            <button
              type="button"
              class="speed-btn"
              [class.active]="playbackSpeed() === speed"
              (click)="setSpeed(speed)"
            >
              {{ speed }}x
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    .replay-controls {
      background: #1f2937;
      border-radius: 0.5rem;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .controls-row {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
    }

    .control-btn {
      width: 44px;
      height: 44px;
      border-radius: 0.5rem;
      border: none;
      background: #374151;
      color: white;
      font-size: 1.25rem;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .control-btn:hover:not(:disabled) {
      background: #4b5563;
    }

    .control-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .control-btn.play-btn {
      width: 56px;
      background: #4f46e5;
    }

    .control-btn.play-btn:hover {
      background: #4338ca;
    }

    .control-btn:focus-visible {
      outline: 2px solid #4f46e5;
      outline-offset: 2px;
    }

    .progress-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .move-counter {
      font-size: 0.875rem;
      color: #9ca3af;
      min-width: 60px;
      text-align: center;
      font-family: 'JetBrains Mono', monospace;
    }

    .progress-slider {
      flex: 1;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: #374151;
      border-radius: 2px;
      cursor: pointer;
    }

    .progress-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      background: #4f46e5;
      border-radius: 50%;
      cursor: pointer;
      transition: transform 0.15s ease;
    }

    .progress-slider::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }

    .speed-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .speed-label {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .speed-buttons {
      display: flex;
      gap: 0.25rem;
    }

    .speed-btn {
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      border: none;
      background: #374151;
      color: #9ca3af;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .speed-btn:hover {
      background: #4b5563;
    }

    .speed-btn.active {
      background: #4f46e5;
      color: white;
    }

    .speed-btn:focus-visible {
      outline: 2px solid #4f46e5;
      outline-offset: 1px;
    }
  `,
})
export class ReplayControlsComponent {
  private readonly replayService = inject(ReplayService);

  readonly speeds = [0.5, 1, 1.5, 2];

  readonly currentMoveIndex = computed(() =>
    this.replayService.currentMoveIndex()
  );

  readonly currentMove = computed(() =>
    this.currentMoveIndex() + 1
  );

  readonly totalMoves = computed(() => {
    const state = this.replayService.replayState();
    return state?.game.moves.length ?? 0;
  });

  readonly isPlaying = computed(() =>
    this.replayService.isAutoPlaying()
  );

  readonly playbackSpeed = computed(() => {
    const state = this.replayService.replayState();
    return state?.playbackSpeed ?? 1;
  });

  readonly canGoBack = computed(() =>
    this.currentMoveIndex() >= 0
  );

  readonly canGoForward = computed(() =>
    this.currentMoveIndex() < this.totalMoves() - 1
  );

  goToStart(): void {
    this.replayService.goToMove(-1);
  }

  goToEnd(): void {
    this.replayService.goToMove(this.totalMoves() - 1);
  }

  previousMove(): void {
    this.replayService.previousMove();
  }

  nextMove(): void {
    this.replayService.nextMove();
  }

  togglePlay(): void {
    this.replayService.toggleAutoPlay();
  }

  setSpeed(speed: number): void {
    this.replayService.setPlaybackSpeed(speed);
  }

  onSliderChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.replayService.goToMove(parseInt(target.value, 10));
  }
}

