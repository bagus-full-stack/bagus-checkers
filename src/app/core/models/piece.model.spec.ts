import {
  createPiece,
  promotePiece,
  movePiece,
  shouldPromote,
  getForwardDirection,
} from './piece.model';

describe('piece.model', () => {
  it('creates a pawn by default', () => {
    const piece = createPiece('p1', 'white', { row: 9, col: 1 });
    expect(piece).toEqual({ id: 'p1', color: 'white', type: 'pawn', position: { row: 9, col: 1 } });
  });

  it('promotes a piece to king without mutating the original', () => {
    const pawn = createPiece('p1', 'white', { row: 0, col: 1 });
    const king = promotePiece(pawn);
    expect(king.type).toBe('king');
    expect(pawn.type).toBe('pawn');
  });

  it('moves a piece to a new position without mutating the original', () => {
    const piece = createPiece('p1', 'white', { row: 5, col: 5 });
    const moved = movePiece(piece, { row: 4, col: 4 });
    expect(moved.position).toEqual({ row: 4, col: 4 });
    expect(piece.position).toEqual({ row: 5, col: 5 });
  });

  describe('shouldPromote', () => {
    it('promotes white pawns on row 0', () => {
      expect(shouldPromote(createPiece('p1', 'white', { row: 0, col: 1 }), 10)).toBe(true);
      expect(shouldPromote(createPiece('p1', 'white', { row: 1, col: 1 }), 10)).toBe(false);
    });

    it('promotes black pawns on the last row', () => {
      expect(shouldPromote(createPiece('p1', 'black', { row: 9, col: 1 }), 10)).toBe(true);
      expect(shouldPromote(createPiece('p1', 'black', { row: 8, col: 1 }), 10)).toBe(false);
    });

    it('never promotes an already-king piece', () => {
      const king = createPiece('p1', 'white', { row: 0, col: 1 }, 'king');
      expect(shouldPromote(king, 10)).toBe(false);
    });
  });

  describe('getForwardDirection', () => {
    it('white moves toward decreasing rows', () => {
      expect(getForwardDirection('white')).toBe(-1);
    });

    it('black moves toward increasing rows', () => {
      expect(getForwardDirection('black')).toBe(1);
    });

    it('has no forward direction for ludo colors', () => {
      expect(getForwardDirection('red')).toBe(0);
    });
  });
});
