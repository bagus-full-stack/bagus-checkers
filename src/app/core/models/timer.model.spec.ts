import { createTimerState, formatTime, TIME_MODES } from './timer.model';

describe('timer.model', () => {
  describe('createTimerState', () => {
    it('seeds both players with the mode initial time and no active player', () => {
      const state = createTimerState('blitz');
      expect(state.mode).toBe('blitz');
      expect(state.white.remainingTimeMs).toBe(TIME_MODES.blitz.initialTimeSeconds * 1000);
      expect(state.black.remainingTimeMs).toBe(TIME_MODES.blitz.initialTimeSeconds * 1000);
      expect(state.white.isRunning).toBe(false);
      expect(state.activePlayer).toBeNull();
    });

    it('gives unlimited mode zero remaining time', () => {
      expect(createTimerState('unlimited').white.remainingTimeMs).toBe(0);
    });
  });

  describe('formatTime', () => {
    it('formats zero or negative time as 00:00', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(-500)).toBe('00:00');
    });

    it('formats minutes and seconds, rounding up partial seconds', () => {
      expect(formatTime(65_000)).toBe('01:05');
      expect(formatTime(1)).toBe('00:01');
    });

    it('pads single digits', () => {
      expect(formatTime(9_000)).toBe('00:09');
    });
  });
});
