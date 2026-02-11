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
        [class.unlimited]="isUnlimited()"
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
      transition: background 0.3s ease;

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

    :host-context(.light-theme) {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-left-width: 4px;
    }

    :host-context(.light-theme).active {
      background: #f3f4f6;
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

    :host-context(.light-theme) .player-label {
      color: #6b7280;
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

    :host-context(.light-theme) .time-display {
      color: #111827;
    }

    .time-display.low-time {
      color: #fbbf24;
    }

    :host-context(.light-theme) .time-display.low-time {
      color: #d97706;
    }

    .time-display.critical-time {
      color: #ef4444;
      animation: blink 0.5s infinite;
    }

    .time-display.unlimited {
      color: #9ca3af;
      font-size: 1.25rem;
    }

    :host-context(.light-theme) .time-display.unlimited {
      color: #6b7280;
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

  readonly isUnlimited = computed(() => {
    const state = this.timerService.timerState();
    return !state || state.mode === 'unlimited';
  });

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

  readonly formattedTime = computed(() => {
    if (this.isUnlimited()) {
      return '∞';
    }
    return formatTime(this.remainingTime());
  });

  readonly playerLabel = computed(() =>
    this.player() === 'white' ? 'Blancs' : 'Noirs'
  );

  readonly isLowTime = computed(() => {
    if (this.isUnlimited()) return false;
    const time = this.remainingTime();
    return time > 0 && time <= 60000 && time > 10000; // 10s - 60s
  });

  readonly isCriticalTime = computed(() => {
    if (this.isUnlimited()) return false;
    const time = this.remainingTime();
    return time > 0 && time <= 10000; // < 10s
  });

  readonly hostClasses = computed(() => {
    const classes: string[] = [this.player()];
    if (this.isActive()) classes.push('active');
    return classes.join(' ');
  });
}

