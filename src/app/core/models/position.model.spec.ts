import {
  createPosition,
  positionsEqual,
  isValidPosition,
  isDarkSquare,
  toManouryNotation,
  fromManouryNotation,
} from './position.model';

describe('position.model', () => {
  it('creates a position', () => {
    expect(createPosition(3, 4)).toEqual({ row: 3, col: 4 });
  });

  it('compares positions by row and col', () => {
    expect(positionsEqual({ row: 1, col: 2 }, { row: 1, col: 2 })).toBe(true);
    expect(positionsEqual({ row: 1, col: 2 }, { row: 1, col: 3 })).toBe(false);
  });

  it('validates board bounds', () => {
    expect(isValidPosition({ row: 0, col: 0 }, 10)).toBe(true);
    expect(isValidPosition({ row: 9, col: 9 }, 10)).toBe(true);
    expect(isValidPosition({ row: -1, col: 0 }, 10)).toBe(false);
    expect(isValidPosition({ row: 0, col: 10 }, 10)).toBe(false);
  });

  it('identifies dark squares', () => {
    expect(isDarkSquare({ row: 0, col: 1 })).toBe(true);
    expect(isDarkSquare({ row: 0, col: 0 })).toBe(false);
  });

  it('converts to Manoury notation', () => {
    expect(toManouryNotation({ row: 0, col: 1 }, 10)).toBe(1);
    expect(toManouryNotation({ row: 9, col: 8 }, 10)).toBe(50);
  });

  it('throws when converting a light square to Manoury notation', () => {
    expect(() => toManouryNotation({ row: 0, col: 0 }, 10)).toThrow();
  });

  it('round-trips Manoury notation back to a position', () => {
    for (let n = 1; n <= 50; n++) {
      const pos = fromManouryNotation(n, 10);
      expect(isDarkSquare(pos)).toBe(true);
      expect(toManouryNotation(pos, 10)).toBe(n);
    }
  });
});
