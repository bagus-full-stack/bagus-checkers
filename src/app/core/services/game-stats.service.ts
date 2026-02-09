import { Injectable, signal, computed, inject } from '@angular/core';
import { GameState, countPieces } from '../models/game-state.model';
import { MaterialSnapshot, GameStatistics } from '../models/replay.model';
import { Move } from '../models/move.model';

/**
 * Service for tracking game statistics in real-time
 */
@Injectable({
  providedIn: 'root',
})
export class GameStatsService {
  private readonly _materialHistory = signal<MaterialSnapshot[]>([]);
  private readonly _moveTimestamps = signal<number[]>([]);
  private readonly _gameStartTime = signal<number>(0);

  /** Material history over the game */
  readonly materialHistory = this._materialHistory.asReadonly();

  /** Current material snapshot */
  readonly currentMaterial = computed(() => {
    const history = this._materialHistory();
    return history.length > 0 ? history[history.length - 1] : null;
  });

  /** Material advantage (positive = white) */
  readonly materialAdvantage = computed(() => {
    const current = this.currentMaterial();
    if (!current) return 0;
    return current.advantage;
  });

  /** Game duration in seconds */
  readonly gameDuration = computed(() => {
    const startTime = this._gameStartTime();
    if (startTime === 0) return 0;
    return Math.floor((Date.now() - startTime) / 1000);
  });

  /**
   * Initializes stats tracking for a new game
   */
  initialize(initialState: GameState): void {
    const pieces = countPieces(initialState);
    const initialSnapshot: MaterialSnapshot = {
      moveNumber: 0,
      whitePawns: pieces.white.pawns,
      whiteKings: pieces.white.kings,
      blackPawns: pieces.black.pawns,
      blackKings: pieces.black.kings,
      advantage: this.calculateAdvantage(pieces),
    };

    this._materialHistory.set([initialSnapshot]);
    this._moveTimestamps.set([Date.now()]);
    this._gameStartTime.set(Date.now());
  }

  /**
   * Records state after a move
   */
  recordMove(state: GameState, move: Move): void {
    const pieces = countPieces(state);
    const history = this._materialHistory();

    const snapshot: MaterialSnapshot = {
      moveNumber: history.length,
      whitePawns: pieces.white.pawns,
      whiteKings: pieces.white.kings,
      blackPawns: pieces.black.pawns,
      blackKings: pieces.black.kings,
      advantage: this.calculateAdvantage(pieces),
    };

    this._materialHistory.update(h => [...h, snapshot]);
    this._moveTimestamps.update(t => [...t, Date.now()]);
  }

  /**
   * Gets final statistics
   */
  getStatistics(moves: readonly Move[]): GameStatistics {
    let whiteCaptures = 0;
    let blackCaptures = 0;
    let whiteKingsPromoted = 0;
    let blackKingsPromoted = 0;
    let longestCaptureChain = 0;
    let whiteMoves = 0;
    let blackMoves = 0;

    for (const move of moves) {
      const captureCount = move.capturedPieces.length;

      if (move.piece.color === 'white') {
        whiteMoves++;
        whiteCaptures += captureCount;
        if (move.isPromotion) whiteKingsPromoted++;
      } else {
        blackMoves++;
        blackCaptures += captureCount;
        if (move.isPromotion) blackKingsPromoted++;
      }

      longestCaptureChain = Math.max(longestCaptureChain, captureCount);
    }

    const timestamps = this._moveTimestamps();
    const totalTime = timestamps.length > 1
      ? (timestamps[timestamps.length - 1] - timestamps[0]) / 1000
      : 0;

    return {
      totalMoves: moves.length,
      whiteMoves,
      blackMoves,
      whiteCaptures,
      blackCaptures,
      whiteKingsPromoted,
      blackKingsPromoted,
      longestCaptureChain,
      averageMoveTime: moves.length > 0 ? totalTime / moves.length : 0,
      duration: totalTime,
      materialHistory: this._materialHistory(),
    };
  }

  /**
   * Resets all statistics
   */
  reset(): void {
    this._materialHistory.set([]);
    this._moveTimestamps.set([]);
    this._gameStartTime.set(0);
  }

  private calculateAdvantage(pieces: {
    white: { pawns: number; kings: number };
    black: { pawns: number; kings: number };
  }): number {
    const whiteValue = pieces.white.pawns * 1 + pieces.white.kings * 3;
    const blackValue = pieces.black.pawns * 1 + pieces.black.kings * 3;
    return whiteValue - blackValue;
  }
}

