/**
 * Time control modes for the game
 */
export type TimeMode = 'blitz' | 'rapid' | 'classic' | 'unlimited';

/**
 * Time mode configuration
 */
export interface TimeModeConfig {
  readonly id: TimeMode;
  readonly name: string;
  readonly initialTimeSeconds: number;
  readonly incrementSeconds: number;
}

/**
 * Available time modes
 */
export const TIME_MODES: Record<TimeMode, TimeModeConfig> = {
  blitz: {
    id: 'blitz',
    name: 'Blitz',
    initialTimeSeconds: 3 * 60,
    incrementSeconds: 0,
  },
  rapid: {
    id: 'rapid',
    name: 'Rapide',
    initialTimeSeconds: 10 * 60,
    incrementSeconds: 5,
  },
  classic: {
    id: 'classic',
    name: 'Classique',
    initialTimeSeconds: 30 * 60,
    incrementSeconds: 10,
  },
  unlimited: {
    id: 'unlimited',
    name: 'Sans limite',
    initialTimeSeconds: 0,
    incrementSeconds: 0,
  },
};

/**
 * Timer state for a single player
 */
export interface PlayerTimer {
  readonly remainingTimeMs: number;
  readonly isRunning: boolean;
}

/**
 * Complete timer state for the game
 */
export interface TimerState {
  readonly mode: TimeMode;
  readonly white: PlayerTimer;
  readonly black: PlayerTimer;
  readonly activePlayer: 'white' | 'black' | null;
  readonly lastUpdateTimestamp: number;
}

/**
 * Creates initial timer state
 */
export function createTimerState(mode: TimeMode): TimerState {
  const config = TIME_MODES[mode];
  const initialTimeMs = config.initialTimeSeconds * 1000;

  return {
    mode,
    white: { remainingTimeMs: initialTimeMs, isRunning: false },
    black: { remainingTimeMs: initialTimeMs, isRunning: false },
    activePlayer: null,
    lastUpdateTimestamp: Date.now(),
  };
}

/**
 * Formats milliseconds to MM:SS display
 */
export function formatTime(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

