import { Piece } from './types';
import { getCheckersVariant, getValidMovesForPiece } from './checkers-rules';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function piece(id: string, color: 'white' | 'black', type: 'pawn' | 'king', row: number, col: number): Piece {
  return { id, color, type, position: { row, col } };
}

function main(): void {
  const variant = getCheckersVariant('international');

  // Mandatory capture: a white pawn with a jump available must take it, not
  // simply step forward.
  const capturablePieces = [
    piece('w1', 'white', 'pawn', 6, 4),
    piece('b1', 'black', 'pawn', 5, 3),
  ];
  const captureMoves = getValidMovesForPiece(capturablePieces[0], { pieces: capturablePieces }, variant);
  assert(captureMoves.length === 1, 'mandatory capture should yield exactly one move');
  assert(captureMoves[0].to.row === 4 && captureMoves[0].to.col === 2, 'capture should land past the captured piece');
  assert(captureMoves[0].capturedPieces.length === 1 && captureMoves[0].capturedPieces[0].id === 'b1', 'capture should record the jumped piece');

  // No capture available: normal diagonal steps only.
  const simplePieces = [piece('w2', 'white', 'pawn', 6, 4)];
  const simpleMoves = getValidMovesForPiece(simplePieces[0], { pieces: simplePieces }, variant);
  assert(simpleMoves.length === 2, 'a pawn with no captures should have two diagonal moves');

  // Flying king: can move/capture any distance along a clear diagonal.
  const kingPieces = [piece('wk', 'white', 'king', 9, 0), piece('bk', 'black', 'pawn', 5, 4)];
  const kingMoves = getValidMovesForPiece(kingPieces[0], { pieces: kingPieces }, variant);
  assert(kingMoves.some((m) => m.to.row === 3 && m.to.col === 6 && m.capturedPieces.length === 1), 'flying king should capture past a distant enemy');

  // An illegal destination (not reachable) must not appear in legal moves.
  const illegalTarget = { row: 0, col: 0 };
  assert(!simpleMoves.some((m) => m.to.row === illegalTarget.row && m.to.col === illegalTarget.col), 'unreachable square must not be a legal move');

  console.log('checkers-rules: all assertions passed');
}

main();
