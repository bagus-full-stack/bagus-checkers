import { Move } from './move.model';
import { PlayerColor } from './piece.model';

/**
 * Saved game metadata
 */
export interface SavedGameMetadata {
  readonly id: string;
  readonly date: string;
  readonly whitePlayer: string;
  readonly blackPlayer: string;
  readonly winner: PlayerColor | 'draw' | null;
  readonly reason?: string;
  readonly variant: string;
  readonly totalMoves: number;
  readonly duration: number; // in seconds
}

/**
 * Material count at a point in time
 */
export interface MaterialSnapshot {
  readonly moveNumber: number;
  readonly whitePawns: number;
  readonly whiteKings: number;
  readonly blackPawns: number;
  readonly blackKings: number;
  readonly advantage: number; // positive = white advantage
}

/**
 * Complete saved game
 */
export interface SavedGame {
  readonly metadata: SavedGameMetadata;
  readonly moves: readonly Move[];
  readonly materialHistory: readonly MaterialSnapshot[];
  readonly initialPosition?: string; // For custom starting positions
}

/**
 * Game statistics
 */
export interface GameStatistics {
  readonly totalMoves: number;
  readonly whiteMoves: number;
  readonly blackMoves: number;
  readonly whiteCaptures: number;
  readonly blackCaptures: number;
  readonly whiteKingsPromoted: number;
  readonly blackKingsPromoted: number;
  readonly longestCaptureChain: number;
  readonly averageMoveTime: number;
  readonly duration: number;
  readonly materialHistory: readonly MaterialSnapshot[];
}

/**
 * Replay state
 */
export interface ReplayState {
  readonly game: SavedGame;
  readonly currentMoveIndex: number;
  readonly isPlaying: boolean;
  readonly playbackSpeed: number; // 1 = normal, 2 = 2x, etc.
}

/**
 * Creates a unique game ID
 */
export function generateGameId(): string {
  return `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calculates material advantage (positive = white)
 */
export function calculateMaterialAdvantage(snapshot: MaterialSnapshot): number {
  const whiteValue = snapshot.whitePawns * 1 + snapshot.whiteKings * 3;
  const blackValue = snapshot.blackPawns * 1 + snapshot.blackKings * 3;
  return whiteValue - blackValue;
}

/**
 * Exports game to JSON string
 */
export function exportGameToJson(game: SavedGame): string {
  return JSON.stringify(game, null, 2);
}

/**
 * Imports game from JSON string
 */
export function importGameFromJson(json: string): SavedGame | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed.metadata && parsed.moves) {
      return parsed as SavedGame;
    }
    return null;
  } catch {
    return null;
  }
}

