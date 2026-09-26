import {
  LUDO_PATH,
  LUDO_HOME_PATH,
  LUDO_START_INDEX,
  LUDO_TRACK_LENGTH,
  LUDO_HOME_ENTRY_STEP,
  LUDO_TOTAL_STEPS,
  ludoPositionForSteps,
} from './ludo.model';

const COLORS = ['red', 'green', 'yellow', 'blue'] as const;

describe('ludo path geometry', () => {
  it('has no duplicate cells across the shared track', () => {
    const seen = new Set(LUDO_PATH.map(p => `${p.row},${p.col}`));
    expect(seen.size).toBe(LUDO_PATH.length);
  });

  it('is a single closed loop - every consecutive cell (including the wrap) is orthogonally adjacent', () => {
    for (let i = 0; i < LUDO_PATH.length; i++) {
      const a = LUDO_PATH[i];
      const b = LUDO_PATH[(i + 1) % LUDO_PATH.length];
      const dist = Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
      expect(dist).toBe(1);
    }
  });

  it('lands each color at the cell adjacent to its own home entrance after LUDO_HOME_ENTRY_STEP steps', () => {
    for (const color of COLORS) {
      const lastSharedIndex = (LUDO_START_INDEX[color] + LUDO_HOME_ENTRY_STEP - 1) % LUDO_TRACK_LENGTH;
      const lastShared = LUDO_PATH[lastSharedIndex];
      const homeEntrance = LUDO_HOME_PATH[color][0];
      const dist = Math.abs(lastShared.row - homeEntrance.row) + Math.abs(lastShared.col - homeEntrance.col);
      expect(dist).toBe(1);
    }
  });

  it('ludoPositionForSteps matches the shared track, then the home path, consistently', () => {
    for (const color of COLORS) {
      expect(ludoPositionForSteps(color, 0)).toEqual(LUDO_PATH[LUDO_START_INDEX[color]]);
      expect(ludoPositionForSteps(color, LUDO_HOME_ENTRY_STEP)).toEqual(LUDO_HOME_PATH[color][0]);
      expect(ludoPositionForSteps(color, LUDO_TOTAL_STEPS - 1)).toEqual(LUDO_HOME_PATH[color][4]);
    }
  });
});
