import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  computed,
} from '@angular/core';
import { TimerService } from '../../core/services/timer.service';
import { formatTime } from '../../core/models/timer.model';
import { PlayerColor } from '../../core/models/piece.model';

@Component({
  selector: 'app-game-timer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClasses()',
  },
  template: `
    <div class="timer-container">
      <div class="player-info">
        <span class="player-label">{{ playerLabel() }}</span>
        @if (isActive()) {
          <span class="active-indicator" aria-label="Tour actif">●</span>
        }
      </div>
      <div
        class="time-display"
        [class.low-time]="isLowTime()"
        [class.critical-time]="isCriticalTime()"
        [attr.aria-label]="'Temps restant: ' + formattedTime()"
      >
        {{ formattedTime() }}
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      background: #1f2937;
      border-radius: 0.5rem;
      padding: 0.75rem 1rem;
      min-width: 120px;

      &.white {
        border-left: 4px solid #f5f5f5;
      }

      &.black {
        border-left: 4px solid #3d3d3d;
      }

      &.active {
        background: #374151;
        box-shadow: 0 0 0 2px var(--board-highlight, #4f46e5);
      }
    }

    .timer-container {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .player-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .player-label {
      font-size: 0.75rem;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .active-indicator {
      color: #22c55e;
      font-size: 0.5rem;
      animation: pulse 1s infinite;
    }

    .time-display {
      font-size: 1.5rem;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      color: white;
      transition: color 0.3s ease;
    }

    .time-display.low-time {
      color: #fbbf24;
    }

    .time-display.critical-time {
      color: #ef4444;
      animation: blink 0.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `,
})
export class GameTimerComponent {
  private readonly timerService = inject(TimerService);

  readonly player = input.required<PlayerColor>();

  readonly remainingTime = computed(() => {
    const state = this.timerService.timerState();
    if (!state) return 0;
    return this.player() === 'white' ? state.white.remainingTimeMs : state.black.remainingTimeMs;
  });

  readonly isActive = computed(() => {
    const state = this.timerService.timerState();
    if (!state) return false;
    return state.activePlayer === this.player();
  });

  readonly formattedTime = computed(() => formatTime(this.remainingTime()));

  readonly playerLabel = computed(() =>
    this.player() === 'white' ? 'Blancs' : 'Noirs'
  );

  readonly isLowTime = computed(() => {
    const time = this.remainingTime();
    return time > 0 && time <= 60000 && time > 10000; // 10s - 60s
  });

  readonly isCriticalTime = computed(() => {
    const time = this.remainingTime();
    return time > 0 && time <= 10000; // < 10s
  });

  readonly hostClasses = computed(() => {
    const classes: string[] = [this.player()];
    if (this.isActive()) classes.push('active');
    return classes.join(' ');
  });
}

