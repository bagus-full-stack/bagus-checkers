import { Injectable, signal, computed, inject, DestroyRef } from '@angular/core';
import {
  TimerState,
  TimeMode,
  PlayerTimer,
  TIME_MODES,
  createTimerState,
} from '../models';
import { PlayerColor } from '../models/piece.model';

/**
 * Service for managing game timers
 */
@Injectable({
  providedIn: 'root',
})
export class TimerService {
  private readonly destroyRef = inject(DestroyRef);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  private readonly _timerState = signal<TimerState | null>(null);
  private readonly _isTimedOut = signal<PlayerColor | null>(null);

  /** Current timer state */
  readonly timerState = this._timerState.asReadonly();

  /** Player who timed out (if any) */
  readonly timedOutPlayer = this._isTimedOut.asReadonly();

  /** White player time */
  readonly whiteTime = computed(() => this._timerState()?.white.remainingTimeMs ?? 0);

  /** Black player time */
  readonly blackTime = computed(() => this._timerState()?.black.remainingTimeMs ?? 0);

  /** Is timer running */
  readonly isRunning = computed(() => {
    const state = this._timerState();
    return state?.white.isRunning || state?.black.isRunning || false;
  });

  /** Current time mode */
  readonly timeMode = computed(() => this._timerState()?.mode ?? 'unlimited');

  constructor() {
    this.destroyRef.onDestroy(() => this.stopTimer());
  }

  /**
   * Initializes timer with specified mode
   */
  initialize(mode: TimeMode): void {
    this.stopTimer();
    this._isTimedOut.set(null);

    if (mode === 'unlimited') {
      this._timerState.set(null);
      return;
    }

    this._timerState.set(createTimerState(mode));
  }

  /**
   * Starts the timer for a player
   */
  startTimer(player: PlayerColor): void {
    const state = this._timerState();
    if (!state || state.mode === 'unlimited') return;

    this._timerState.set({
      ...state,
      activePlayer: player,
      white: {
        ...state.white,
        isRunning: player === 'white',
      },
      black: {
        ...state.black,
        isRunning: player === 'black',
      },
      lastUpdateTimestamp: Date.now(),
    });

    this.startInterval();
  }

  /**
   * Switches timer to the other player (after a move)
   */
  switchPlayer(newActivePlayer: PlayerColor): void {
    const state = this._timerState();
    if (!state || state.mode === 'unlimited') return;

    const config = TIME_MODES[state.mode];
    const previousPlayer = state.activePlayer;

    // Add increment to the player who just moved
    let white = state.white;
    let black = state.black;

    if (previousPlayer === 'white' && config.incrementSeconds > 0) {
      white = {
        ...white,
        remainingTimeMs: white.remainingTimeMs + config.incrementSeconds * 1000,
      };
    } else if (previousPlayer === 'black' && config.incrementSeconds > 0) {
      black = {
        ...black,
        remainingTimeMs: black.remainingTimeMs + config.incrementSeconds * 1000,
      };
    }

    this._timerState.set({
      ...state,
      activePlayer: newActivePlayer,
      white: {
        ...white,
        isRunning: newActivePlayer === 'white',
      },
      black: {
        ...black,
        isRunning: newActivePlayer === 'black',
      },
      lastUpdateTimestamp: Date.now(),
    });
  }

  /**
   * Pauses the timer
   */
  pauseTimer(): void {
    const state = this._timerState();
    if (!state) return;

    this.stopInterval();

    this._timerState.set({
      ...state,
      white: { ...state.white, isRunning: false },
      black: { ...state.black, isRunning: false },
    });
  }

  /**
   * Resumes the timer
   */
  resumeTimer(): void {
    const state = this._timerState();
    if (!state || !state.activePlayer) return;

    this.startTimer(state.activePlayer);
  }

  /**
   * Stops and clears the timer
   */
  stopTimer(): void {
    this.stopInterval();
    this._timerState.set(null);
    this._isTimedOut.set(null);
  }

  /**
   * Updates timer from server (for online games)
   */
  syncFromServer(timerState: TimerState): void {
    this._timerState.set(timerState);
    if (timerState.white.isRunning || timerState.black.isRunning) {
      this.startInterval();
    }
  }

  private startInterval(): void {
    this.stopInterval();

    this.intervalId = setInterval(() => {
      this.tick();
    }, 100); // Update every 100ms for smooth display
  }

  private stopInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tick(): void {
    const state = this._timerState();
    if (!state) return;

    const now = Date.now();
    const elapsed = now - state.lastUpdateTimestamp;

    let white = state.white;
    let black = state.black;

    if (white.isRunning) {
      const newTime = white.remainingTimeMs - elapsed;
      if (newTime <= 0) {
        this._isTimedOut.set('white');
        this.stopInterval();
        white = { remainingTimeMs: 0, isRunning: false };
      } else {
        white = { ...white, remainingTimeMs: newTime };
      }
    }

    if (black.isRunning) {
      const newTime = black.remainingTimeMs - elapsed;
      if (newTime <= 0) {
        this._isTimedOut.set('black');
        this.stopInterval();
        black = { remainingTimeMs: 0, isRunning: false };
      } else {
        black = { ...black, remainingTimeMs: newTime };
      }
    }

    this._timerState.set({
      ...state,
      white,
      black,
      lastUpdateTimestamp: now,
    });
  }
}

