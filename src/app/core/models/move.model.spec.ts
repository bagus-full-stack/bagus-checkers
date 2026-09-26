import { createMove, createCaptureMove, moveToNotation } from './move.model';
import { createPiece } from './piece.model';

describe('move.model', () => {
  it('creates a simple move from the piece current position', () => {
    const piece = createPiece('p1', 'white', { row: 5, col: 5 });
    const move = createMove(piece, { row: 4, col: 4 });
    expect(move.from).toEqual({ row: 5, col: 5 });
    expect(move.to).toEqual({ row: 4, col: 4 });
    expect(move.capturedPieces).toEqual([]);
    expect(move.isPromotion).toBe(false);
  });

  it('creates a capture move carrying the captured pieces and path', () => {
    const piece = createPiece('p1', 'white', { row: 5, col: 5 });
    const captured = createPiece('p2', 'black', { row: 4, col: 4 });
    const move = createCaptureMove(piece, { row: 3, col: 3 }, [captured], true, [{ row: 4, col: 4 }]);
    expect(move.capturedPieces).toEqual([captured]);
    expect(move.isPromotion).toBe(true);
    expect(move.path).toEqual([{ row: 4, col: 4 }]);
  });

  describe('moveToNotation', () => {
    it('uses a dash separator for a simple move', () => {
      const piece = createPiece('p1', 'white', { row: 9, col: 0 });
      const move = createMove(piece, { row: 8, col: 1 });
      expect(moveToNotation(move, 10)).toBe('46-41');
    });

    it('uses an x separator for a capture', () => {
      const piece = createPiece('p1', 'white', { row: 9, col: 0 });
      const captured = createPiece('p2', 'black', { row: 8, col: 1 });
      const move = createCaptureMove(piece, { row: 7, col: 2 }, [captured]);
      expect(moveToNotation(move, 10)).toContain('x');
    });
  });
});
