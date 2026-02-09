import { Position } from './position.model';

/**
 * Player colors in the game
 */
export type PlayerColor = 'white' | 'black';

/**
 * Piece types
 */
export type PieceType = 'pawn' | 'king';

/**
 * Represents a piece on the board
 */
export interface Piece {
  readonly id: string;
  readonly color: PlayerColor;
  readonly type: PieceType;
  readonly position: Position;
}

/**
 * Creates a new piece
 */
export function createPiece(
  id: string,
  color: PlayerColor,
  position: Position,
  type: PieceType = 'pawn'
): Piece {
  return { id, color, type, position };
}

/**
 * Promotes a pawn to a king
 */
export function promotePiece(piece: Piece): Piece {
  return { ...piece, type: 'king' };
}

/**
 * Moves a piece to a new position
 */
export function movePiece(piece: Piece, newPosition: Position): Piece {
  return { ...piece, position: newPosition };
}

/**
 * Checks if a piece should be promoted (reached the opposite end)
 * White pieces promote when they reach row 0 (top)
 * Black pieces promote when they reach row boardSize-1 (bottom)
 */
export function shouldPromote(piece: Piece, boardSize: number): boolean {
  if (piece.type === 'king') return false;

  if (piece.color === 'white') {
    return piece.position.row === 0;
  } else {
    return piece.position.row === boardSize - 1;
  }
}

/**
 * Gets the forward direction for a player's pawns
 * White pieces start at the bottom (high row numbers) and move UP (decreasing row)
 * Black pieces start at the top (low row numbers) and move DOWN (increasing row)
 */
export function getForwardDirection(color: PlayerColor): number {
  return color === 'white' ? -1 : 1;
}

