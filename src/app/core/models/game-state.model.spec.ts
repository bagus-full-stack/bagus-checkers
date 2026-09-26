import { createInitialGameState, getPlayerPieces, getPieceAtPosition, countPieces } from './game-state.model';
import { createPiece } from './piece.model';

describe('game-state.model', () => {
  const pieces = [
    createPiece('w1', 'white', { row: 9, col: 0 }),
    createPiece('w2', 'white', { row: 8, col: 1 }, 'king'),
    createPiece('b1', 'black', { row: 0, col: 1 }),
  ];

  it('creates an initial playing state for white with empty history', () => {
    const state = createInitialGameState(pieces);
    expect(state.currentPlayer).toBe('white');
    expect(state.status).toBe('playing');
    expect(state.moveHistory).toEqual([]);
    expect(state.mustCapture).toBe(false);
    expect(state.pieces).toBe(pieces);
  });

  it('filters pieces by player color', () => {
    const state = createInitialGameState(pieces);
    expect(getPlayerPieces(state, 'white')).toEqual([pieces[0], pieces[1]]);
    expect(getPlayerPieces(state, 'black')).toEqual([pieces[2]]);
  });

  it('finds a piece at a position, or undefined if empty', () => {
    const state = createInitialGameState(pieces);
    expect(getPieceAtPosition(state, { row: 9, col: 0 })).toBe(pieces[0]);
    expect(getPieceAtPosition(state, { row: 5, col: 5 })).toBeUndefined();
  });

  it('counts pawns and kings per color', () => {
    const state = createInitialGameState(pieces);
    expect(countPieces(state)).toEqual({
      white: { pawns: 1, kings: 1 },
      black: { pawns: 1, kings: 0 },
    });
  });
});
