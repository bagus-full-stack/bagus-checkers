import { TranspositionTable } from './transposition-table';
import { createInitialGameState } from '../models/game-state.model';
import { createPiece } from '../models/piece.model';

function state(pieces = [createPiece('w1', 'white', { row: 9, col: 0 })]) {
  return createInitialGameState(pieces);
}

describe('TranspositionTable', () => {
  let table: TranspositionTable;

  beforeEach(() => {
    table = new TranspositionTable();
  });

  it('misses on an empty table', () => {
    expect(table.get(state(), 5)).toBeNull();
    expect(table.getStats().misses).toBe(1);
  });

  it('stores and retrieves an entry for the same position at sufficient depth', () => {
    const s = state();
    table.set(s, 5, 42, 'exact', 'move-key');
    const entry = table.get(s, 5);
    expect(entry?.score).toBe(42);
    expect(entry?.bestMoveKey).toBe('move-key');
    expect(table.getStats().hits).toBe(1);
  });

  it('misses when the cached entry was searched to a shallower depth', () => {
    const s = state();
    table.set(s, 2, 42, 'exact');
    expect(table.get(s, 5)).toBeNull();
  });

  it('distinguishes different positions', () => {
    const a = state([createPiece('w1', 'white', { row: 9, col: 0 })]);
    const b = state([createPiece('w1', 'white', { row: 8, col: 1 })]);
    table.set(a, 5, 1, 'exact');
    expect(table.get(b, 5)).toBeNull();
  });

  describe('probe', () => {
    it('returns the exact score directly', () => {
      const s = state();
      table.set(s, 5, 10, 'exact');
      expect(table.probe(s, 5, -100, 100)).toEqual({ score: 10, valid: true });
    });

    it('uses a lowerbound entry only when it already fails high against beta', () => {
      const s = state();
      table.set(s, 5, 50, 'lowerbound');
      expect(table.probe(s, 5, -100, 20).valid).toBe(true);
      table.clear();
      table.set(s, 5, 50, 'lowerbound');
      expect(table.probe(s, 5, -100, 100).valid).toBe(false);
    });

    it('is invalid when there is no usable cached entry', () => {
      expect(table.probe(state(), 5, -100, 100)).toEqual({ score: 0, valid: false });
    });
  });

  it('getBestMoveKey returns undefined for an unseen position', () => {
    expect(table.getBestMoveKey(state())).toBeUndefined();
  });

  it('clear resets entries and stats', () => {
    const s = state();
    table.set(s, 5, 1, 'exact');
    table.get(s, 5);
    table.clear();
    expect(table.getStats()).toEqual({ size: 0, hits: 0, misses: 0, hitRate: 0 });
  });

  it('evicts old entries once the table is full, keeping it from growing unbounded', () => {
    const small = new TranspositionTable(10);
    const positions = [
      ...Array.from({ length: 10 }, (_, i) => ({ row: i, col: 0 })),
      { row: 0, col: 1 },
    ];
    for (const pos of positions) {
      small.set(state([createPiece('w1', 'white', pos)]), 1, 1, 'exact');
    }
    expect(small.getStats().size).toBe(10);
  });
});
