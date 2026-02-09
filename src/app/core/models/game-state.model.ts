import { Piece, PlayerColor } from './piece.model';
import { Move } from './move.model';

/**
 * Game status
 */
export type GameStatus = 'waiting' | 'playing' | 'paused' | 'finished';

/**
 * Game result when finished
 */
export interface GameResult {
  readonly winner: PlayerColor | 'draw';
  readonly reason: 'no-pieces' | 'no-moves' | 'resignation' | 'timeout' | 'draw-agreement' | 'draw-repetition';
}

/**
 * Game mode
 */
export type GameMode = 'local' | 'ai' | 'online';

/**
 * AI difficulty level
 */
export type AIDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Complete game state
 */
export interface GameState {
  readonly pieces: readonly Piece[];
  readonly currentPlayer: PlayerColor;
  readonly status: GameStatus;
  readonly result?: GameResult;
  readonly moveHistory: readonly Move[];
  readonly selectedPiece?: Piece;
  readonly validMoves: readonly Move[];
  readonly mustCapture: boolean;
  readonly captureSequence?: {
    readonly piece: Piece;
    readonly capturedSoFar: readonly Piece[];
    readonly currentPosition: Position;
  };
}

import { Position } from './position.model';

/**
 * Creates the initial game state
 */
export function createInitialGameState(pieces: readonly Piece[]): GameState {
  return {
    pieces,
    currentPlayer: 'white',
    status: 'playing',
    moveHistory: [],
    validMoves: [],
    mustCapture: false,
  };
}

/**
 * Gets all pieces for a specific player
 */
export function getPlayerPieces(state: GameState, color: PlayerColor): readonly Piece[] {
  return state.pieces.filter(p => p.color === color);
}

/**
 * Gets a piece at a specific position
 */
export function getPieceAtPosition(state: GameState, position: Position): Piece | undefined {
  return state.pieces.find(p => p.position.row === position.row && p.position.col === position.col);
}

/**
 * Counts pieces by type and color
 */
export function countPieces(state: GameState): {
  white: { pawns: number; kings: number };
  black: { pawns: number; kings: number };
} {
  const result = {
    white: { pawns: 0, kings: 0 },
    black: { pawns: 0, kings: 0 },
  };

  for (const piece of state.pieces) {
    if (piece.type === 'pawn') {
      result[piece.color].pawns++;
    } else {
      result[piece.color].kings++;
    }
  }

  return result;
}

