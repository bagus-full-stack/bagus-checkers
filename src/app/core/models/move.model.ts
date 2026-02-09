import { Position } from './position.model';
import { Piece } from './piece.model';

/**
 * Represents a single move or capture
 */
export interface Move {
  readonly piece: Piece;
  readonly from: Position;
  readonly to: Position;
  readonly capturedPieces: readonly Piece[];
  readonly isPromotion: boolean;
  readonly path?: readonly Position[]; // For multi-capture moves
}

/**
 * Represents a capture in a move sequence
 */
export interface Capture {
  readonly capturedPiece: Piece;
  readonly landingPosition: Position;
}

/**
 * Creates a simple move (no capture)
 */
export function createMove(piece: Piece, to: Position, isPromotion: boolean = false): Move {
  return {
    piece,
    from: piece.position,
    to,
    capturedPieces: [],
    isPromotion,
  };
}

/**
 * Creates a capture move
 */
export function createCaptureMove(
  piece: Piece,
  to: Position,
  capturedPieces: readonly Piece[],
  isPromotion: boolean = false,
  path?: readonly Position[]
): Move {
  return {
    piece,
    from: piece.position,
    to,
    capturedPieces,
    isPromotion,
    path,
  };
}

/**
 * Converts a move to Manoury notation string
 */
export function moveToNotation(move: Move, boardSize: number = 10): string {
  const fromSquare = toManouryNotationSafe(move.from, boardSize);
  const toSquare = toManouryNotationSafe(move.to, boardSize);
  const separator = move.capturedPieces.length > 0 ? 'x' : '-';
  return `${fromSquare}${separator}${toSquare}`;
}

/**
 * Safe conversion to Manoury notation
 */
function toManouryNotationSafe(pos: Position, boardSize: number): number {
  return Math.floor(pos.row * (boardSize / 2)) + Math.floor(pos.col / 2) + 1;
}

