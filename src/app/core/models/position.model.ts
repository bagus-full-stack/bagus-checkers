/**
 * Represents a position on the checkers board
 */
export interface Position {
  readonly row: number;
  readonly col: number;
}

/**
 * Creates a new position
 */
export function createPosition(row: number, col: number): Position {
  return { row, col };
}

/**
 * Checks if two positions are equal
 */
export function positionsEqual(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

/**
 * Checks if a position is within board bounds
 */
export function isValidPosition(pos: Position, boardSize: number): boolean {
  return pos.row >= 0 && pos.row < boardSize && pos.col >= 0 && pos.col < boardSize;
}

/**
 * Checks if a position is on a dark square (playable)
 */
export function isDarkSquare(pos: Position): boolean {
  return (pos.row + pos.col) % 2 === 1;
}

/**
 * Converts position to Manoury notation (used in International Draughts)
 * Dark squares are numbered 1-50 for a 10x10 board
 */
export function toManouryNotation(pos: Position, boardSize: number = 10): number {
  if (!isDarkSquare(pos)) {
    throw new Error('Manoury notation only applies to dark squares');
  }
  return Math.floor(pos.row * (boardSize / 2)) + Math.floor(pos.col / 2) + 1;
}

/**
 * Converts Manoury notation back to position
 */
export function fromManouryNotation(notation: number, boardSize: number = 10): Position {
  const index = notation - 1;
  const row = Math.floor(index / (boardSize / 2));
  const col = (index % (boardSize / 2)) * 2 + (row % 2 === 0 ? 1 : 0);
  return createPosition(row, col);
}

