/**
 * Opening Book for Checkers
 * Contains pre-computed optimal opening moves for International Draughts (10x10)
 */

import { Move, Position, PlayerColor } from '../models';

export interface OpeningMove {
  from: Position;
  to: Position;
  name?: string;
  frequency: number; // How often this move is played in master games
}

export interface OpeningLine {
  moves: OpeningMove[];
  name: string;
  description: string;
}

/**
 * Standard opening positions encoded as "fromRow,fromCol-toRow,toCol"
 */
const OPENING_MOVES_WHITE: Record<string, OpeningMove[]> = {
  // Initial position - common first moves for white
  'initial': [
    { from: { row: 6, col: 1 }, to: { row: 5, col: 2 }, name: '31-27', frequency: 35 },
    { from: { row: 6, col: 3 }, to: { row: 5, col: 4 }, name: '32-28', frequency: 30 },
    { from: { row: 6, col: 5 }, to: { row: 5, col: 6 }, name: '33-29', frequency: 20 },
    { from: { row: 6, col: 7 }, to: { row: 5, col: 8 }, name: '34-30', frequency: 10 },
    { from: { row: 7, col: 0 }, to: { row: 6, col: 1 }, name: '35-31', frequency: 5 },
  ],
};

const OPENING_MOVES_BLACK: Record<string, OpeningMove[]> = {
  // Response to 31-27
  '31-27': [
    { from: { row: 3, col: 2 }, to: { row: 4, col: 1 }, name: '17-22', frequency: 40 },
    { from: { row: 3, col: 2 }, to: { row: 4, col: 3 }, name: '17-21', frequency: 30 },
    { from: { row: 3, col: 4 }, to: { row: 4, col: 3 }, name: '18-22', frequency: 20 },
    { from: { row: 3, col: 4 }, to: { row: 4, col: 5 }, name: '18-23', frequency: 10 },
  ],
  // Response to 32-28
  '32-28': [
    { from: { row: 3, col: 4 }, to: { row: 4, col: 3 }, name: '18-22', frequency: 35 },
    { from: { row: 3, col: 4 }, to: { row: 4, col: 5 }, name: '18-23', frequency: 30 },
    { from: { row: 3, col: 6 }, to: { row: 4, col: 5 }, name: '19-23', frequency: 20 },
    { from: { row: 3, col: 2 }, to: { row: 4, col: 3 }, name: '17-21', frequency: 15 },
  ],
  // Response to 33-29
  '33-29': [
    { from: { row: 3, col: 6 }, to: { row: 4, col: 5 }, name: '19-23', frequency: 35 },
    { from: { row: 3, col: 6 }, to: { row: 4, col: 7 }, name: '19-24', frequency: 30 },
    { from: { row: 3, col: 4 }, to: { row: 4, col: 5 }, name: '18-23', frequency: 20 },
    { from: { row: 3, col: 8 }, to: { row: 4, col: 7 }, name: '20-24', frequency: 15 },
  ],
  // Initial position - common first moves for black (if black plays first)
  'initial': [
    { from: { row: 3, col: 2 }, to: { row: 4, col: 1 }, name: '17-22', frequency: 30 },
    { from: { row: 3, col: 2 }, to: { row: 4, col: 3 }, name: '17-21', frequency: 25 },
    { from: { row: 3, col: 4 }, to: { row: 4, col: 3 }, name: '18-22', frequency: 25 },
    { from: { row: 3, col: 4 }, to: { row: 4, col: 5 }, name: '18-23', frequency: 20 },
  ],
};

/**
 * Famous opening lines in International Draughts
 */
export const FAMOUS_OPENINGS: OpeningLine[] = [
  {
    name: 'Roozenburg',
    description: 'Aggressive central control opening',
    moves: [
      { from: { row: 6, col: 1 }, to: { row: 5, col: 2 }, frequency: 100 },
      { from: { row: 3, col: 2 }, to: { row: 4, col: 1 }, frequency: 100 },
      { from: { row: 6, col: 3 }, to: { row: 5, col: 4 }, frequency: 100 },
    ],
  },
  {
    name: 'Keller',
    description: 'Solid defensive setup',
    moves: [
      { from: { row: 6, col: 3 }, to: { row: 5, col: 4 }, frequency: 100 },
      { from: { row: 3, col: 4 }, to: { row: 4, col: 3 }, frequency: 100 },
      { from: { row: 6, col: 5 }, to: { row: 5, col: 6 }, frequency: 100 },
    ],
  },
  {
    name: 'Classical',
    description: 'Traditional balanced approach',
    moves: [
      { from: { row: 6, col: 5 }, to: { row: 5, col: 6 }, frequency: 100 },
      { from: { row: 3, col: 6 }, to: { row: 4, col: 5 }, frequency: 100 },
      { from: { row: 6, col: 3 }, to: { row: 5, col: 4 }, frequency: 100 },
    ],
  },
];

/**
 * Opening Book class for looking up pre-computed moves
 */
export class OpeningBook {
  private moveHistory: string[] = [];
  private readonly maxBookDepth = 8; // Use book for first 8 moves

  /**
   * Resets the opening book state
   */
  reset(): void {
    this.moveHistory = [];
  }

  /**
   * Records a move played
   */
  recordMove(from: Position, to: Position): void {
    const moveKey = `${from.row},${from.col}-${to.row},${to.col}`;
    this.moveHistory.push(moveKey);
  }

  /**
   * Gets an opening move from the book if available
   */
  getBookMove(color: PlayerColor, moveNumber: number): OpeningMove | null {
    // Only use book for early game
    if (moveNumber > this.maxBookDepth) {
      return null;
    }

    const book = color === 'white' ? OPENING_MOVES_WHITE : OPENING_MOVES_BLACK;

    // Get the key for the current position
    let positionKey = 'initial';
    if (this.moveHistory.length > 0) {
      // Use the last move as the key for response lookup
      const lastMove = this.moveHistory[this.moveHistory.length - 1];
      // Convert position to standard notation
      positionKey = this.getMoveNotation(lastMove);
    }

    const moves = book[positionKey] || book['initial'];
    if (!moves || moves.length === 0) {
      return null;
    }

    // Weighted random selection based on frequency
    return this.weightedRandomSelect(moves);
  }

  /**
   * Converts a position key to standard notation
   */
  private getMoveNotation(positionKey: string): string {
    // Extract from/to from the key
    const [from, to] = positionKey.split('-');
    const [fromRow, fromCol] = from.split(',').map(Number);
    const [toRow, toCol] = to.split(',').map(Number);

    // Convert to standard draughts notation (simplified)
    const fromSquare = this.positionToSquareNumber(fromRow, fromCol);
    const toSquare = this.positionToSquareNumber(toRow, toCol);

    return `${fromSquare}-${toSquare}`;
  }

  /**
   * Converts row/col to square number (1-50 for 10x10 board)
   */
  private positionToSquareNumber(row: number, col: number): number {
    // In international draughts, squares are numbered 1-50
    // Dark squares only, starting from top-left
    return Math.floor(row * 5 + col / 2) + 1;
  }

  /**
   * Weighted random selection based on frequency
   */
  private weightedRandomSelect(moves: OpeningMove[]): OpeningMove {
    const totalWeight = moves.reduce((sum, m) => sum + m.frequency, 0);
    let random = Math.random() * totalWeight;

    for (const move of moves) {
      random -= move.frequency;
      if (random <= 0) {
        return move;
      }
    }

    return moves[0];
  }

  /**
   * Gets the name of the current opening if recognized
   */
  getOpeningName(): string | null {
    if (this.moveHistory.length < 2) {
      return null;
    }

    for (const opening of FAMOUS_OPENINGS) {
      const isMatch = opening.moves.every((move, index) => {
        if (index >= this.moveHistory.length) return true;
        const historyMove = this.moveHistory[index];
        const expectedKey = `${move.from.row},${move.from.col}-${move.to.row},${move.to.col}`;
        return historyMove === expectedKey;
      });

      if (isMatch && this.moveHistory.length >= 2) {
        return opening.name;
      }
    }

    return null;
  }
}

export const openingBook = new OpeningBook();

