import { Position, positionsEqual } from './position.model';
import { Piece, PlayerColor } from './piece.model';
import { GameStatus, GameResult } from './game-state.model';
import { Move } from './move.model';

export type LudoPhase = 'rolling' | 'moving';

/**
 * State specific to a Ludo game
 */
export interface LudoGameState {
  pieces: Piece[];
  currentPlayer: PlayerColor;
  status: GameStatus;
  result?: GameResult;
  moveHistory: Move[];

  // Ludo specific state
  phase: LudoPhase;
  lastDiceRoll?: number;
  consecutiveSixes: number;
  players: PlayerColor[];
}

export const LUDO_TRACK_LENGTH = 52;
export const LUDO_HOME_LENGTH = 5;

// Ludo base starting positions for 4 players (corners of a 15x15 board)
export const LUDO_BASES: Record<PlayerColor, Position[]> = {
  red:    [{row: 2, col: 2}, {row: 2, col: 3}, {row: 3, col: 2}, {row: 3, col: 3}],
  green:  [{row: 2, col: 11}, {row: 2, col: 12}, {row: 3, col: 11}, {row: 3, col: 12}],
  yellow: [{row: 11, col: 11}, {row: 11, col: 12}, {row: 12, col: 11}, {row: 12, col: 12}],
  blue:   [{row: 11, col: 2}, {row: 11, col: 3}, {row: 12, col: 2}, {row: 12, col: 3}],
  white: [], black: [] // fallback for strict type checking
};

export const LUDO_START_INDEX: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
  white: 0, black: 0
};
