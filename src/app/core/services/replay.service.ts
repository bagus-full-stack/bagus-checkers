import { Injectable, signal, computed, inject, PLATFORM_ID, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  SavedGame,
  SavedGameMetadata,
  MaterialSnapshot,
  GameStatistics,
  ReplayState,
  generateGameId,
  exportGameToJson,
  importGameFromJson,
} from '../models/replay.model';
import { GameState } from '../models/game-state.model';
import { Move } from '../models/move.model';
import { PlayerColor } from '../models/piece.model';
import { SupabaseService, DbGameHistory } from './supabase.service';

const STORAGE_KEY = 'checkers_saved_games';
const MAX_SAVED_GAMES = 50;

/**
 * Service for managing game replays and saved games
 * Uses Supabase when authenticated, falls back to localStorage
 */
@Injectable({
  providedIn: 'root',
})
export class ReplayService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly supabaseService = inject(SupabaseService);

  private readonly _savedGames = signal<SavedGameMetadata[]>(this.loadGamesList());
  private readonly _replayState = signal<ReplayState | null>(null);
  private readonly _currentGame = signal<SavedGame | null>(null);
  private readonly _isOnline = signal(false);

  /** List of saved games metadata */
  readonly savedGames = this._savedGames.asReadonly();

  /** Current replay state */
  readonly replayState = this._replayState.asReadonly();

  /** Current loaded game */
  readonly currentGame = this._currentGame.asReadonly();

  /** Is replay active */
  readonly isReplaying = computed(() => this._replayState() !== null);

  /** Current move index in replay */
  readonly currentMoveIndex = computed(() => this._replayState()?.currentMoveIndex ?? -1);

  /** Is auto-playing */
  readonly isAutoPlaying = computed(() => this._replayState()?.isPlaying ?? false);

  constructor() {
    // Watch for Supabase auth changes
    effect(() => {
      const isAuthenticated = this.supabaseService.isAuthenticated();
      this._isOnline.set(isAuthenticated);

      if (isAuthenticated) {
        this.loadGamesFromSupabase();
      }
    });
  }

  /**
   * Saves a completed game
   */
  async saveGame(
    moves: readonly Move[],
    materialHistory: readonly MaterialSnapshot[],
    whitePlayer: string,
    blackPlayer: string,
    winner: PlayerColor | 'draw' | null,
    reason: string,
    variant: string,
    duration: number,
    whitePlayerId?: string,
    blackPlayerId?: string,
    whiteRatingBefore?: number,
    blackRatingBefore?: number,
    whiteRatingAfter?: number,
    blackRatingAfter?: number
  ): Promise<string> {
    const id = generateGameId();
    const metadata: SavedGameMetadata = {
      id,
      date: new Date().toISOString(),
      whitePlayer,
      blackPlayer,
      winner,
      reason,
      variant,
      totalMoves: moves.length,
      duration,
    };

    const game: SavedGame = {
      metadata,
      moves,
      materialHistory,
    };

    // Save to Supabase if online
    if (this._isOnline() && whitePlayerId && blackPlayerId) {
      const dbGame: Omit<DbGameHistory, 'id' | 'played_at'> = {
        white_player_id: whitePlayerId,
        black_player_id: blackPlayerId,
        white_player_name: whitePlayer,
        black_player_name: blackPlayer,
        winner: winner,
        reason: reason,
        variant: variant,
        total_moves: moves.length,
        duration: duration,
        moves_json: JSON.stringify(moves),
        material_history_json: JSON.stringify(materialHistory),
        white_rating_before: whiteRatingBefore ?? 1200,
        black_rating_before: blackRatingBefore ?? 1200,
        white_rating_after: whiteRatingAfter ?? 1200,
        black_rating_after: blackRatingAfter ?? 1200,
      };

      const savedGame = await this.supabaseService.saveGameHistory(dbGame);
      if (savedGame) {
        await this.loadGamesFromSupabase();
        return savedGame.id;
      }
    }

    // Fallback to localStorage
    this.storeGame(game);
    return id;
  }

  /**
   * Loads games from Supabase
   */
  private async loadGamesFromSupabase(): Promise<void> {
    const user = this.supabaseService.currentUser();
    if (!user) return;

    const dbGames = await this.supabaseService.getUserGameHistory(user.id, 50);
    const games: SavedGameMetadata[] = dbGames.map(g => ({
      id: g.id,
      date: g.played_at,
      whitePlayer: g.white_player_name,
      blackPlayer: g.black_player_name,
      winner: g.winner,
      reason: g.reason,
      variant: g.variant,
      totalMoves: g.total_moves,
      duration: g.duration,
    }));

    this._savedGames.set(games);
  }

  /**
   * Loads a saved game
   */
  async loadGame(gameId: string): Promise<SavedGame | null> {
    // Try loading from Supabase first
    if (this._isOnline()) {
      const dbGame = await this.supabaseService.getGameById(gameId);
      if (dbGame) {
        const game: SavedGame = {
          metadata: {
            id: dbGame.id,
            date: dbGame.played_at,
            whitePlayer: dbGame.white_player_name,
            blackPlayer: dbGame.black_player_name,
            winner: dbGame.winner,
            reason: dbGame.reason,
            variant: dbGame.variant,
            totalMoves: dbGame.total_moves,
            duration: dbGame.duration,
          },
          moves: JSON.parse(dbGame.moves_json),
          materialHistory: JSON.parse(dbGame.material_history_json),
        };
        this._currentGame.set(game);
        return game;
      }
    }

    // Fallback to localStorage
    if (!this.isBrowser) return null;

    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${gameId}`);
      if (stored) {
        const game = JSON.parse(stored) as SavedGame;
        this._currentGame.set(game);
        return game;
      }
    } catch {
      console.warn('Failed to load game:', gameId);
    }
    return null;
  }

  /**
   * Deletes a saved game
   */
  deleteGame(gameId: string): void {
    if (!this.isBrowser) return;

    try {
      localStorage.removeItem(`${STORAGE_KEY}_${gameId}`);
      this._savedGames.update(games => games.filter(g => g.id !== gameId));
      this.saveGamesList();
    } catch {
      console.warn('Failed to delete game:', gameId);
    }
  }

  /**
   * Starts replay of a game
   */
  startReplay(game: SavedGame, speed: number = 1): void {
    this._currentGame.set(game);
    this._replayState.set({
      game,
      currentMoveIndex: -1,
      isPlaying: false,
      playbackSpeed: speed,
    });
  }

  /**
   * Stops replay
   */
  stopReplay(): void {
    this._replayState.set(null);
    this._currentGame.set(null);
  }

  /**
   * Goes to next move in replay
   */
  nextMove(): boolean {
    const state = this._replayState();
    if (!state) return false;

    const nextIndex = state.currentMoveIndex + 1;
    if (nextIndex >= state.game.moves.length) return false;

    this._replayState.set({
      ...state,
      currentMoveIndex: nextIndex,
    });
    return true;
  }

  /**
   * Goes to previous move in replay
   */
  previousMove(): boolean {
    const state = this._replayState();
    if (!state) return false;

    if (state.currentMoveIndex < 0) return false;

    this._replayState.set({
      ...state,
      currentMoveIndex: state.currentMoveIndex - 1,
    });
    return true;
  }

  /**
   * Goes to specific move in replay
   */
  goToMove(index: number): void {
    const state = this._replayState();
    if (!state) return;

    const clampedIndex = Math.max(-1, Math.min(index, state.game.moves.length - 1));
    this._replayState.set({
      ...state,
      currentMoveIndex: clampedIndex,
    });
  }

  /**
   * Toggles auto-play
   */
  toggleAutoPlay(): void {
    const state = this._replayState();
    if (!state) return;

    this._replayState.set({
      ...state,
      isPlaying: !state.isPlaying,
    });
  }

  /**
   * Sets playback speed
   */
  setPlaybackSpeed(speed: number): void {
    const state = this._replayState();
    if (!state) return;

    this._replayState.set({
      ...state,
      playbackSpeed: speed,
    });
  }

  /**
   * Exports game to JSON string
   */
  async exportGame(gameId: string): Promise<string | null> {
    const game = await this.loadGame(gameId);
    if (!game) return null;
    return exportGameToJson(game);
  }

  /**
   * Imports game from JSON string
   */
  importGame(json: string): string | null {
    const game = importGameFromJson(json);
    if (!game) return null;

    this.storeGame(game);
    return game.metadata.id;
  }

  /**
   * Calculates game statistics
   */
  calculateStatistics(game: SavedGame): GameStatistics {
    let whiteCaptures = 0;
    let blackCaptures = 0;
    let whiteKingsPromoted = 0;
    let blackKingsPromoted = 0;
    let longestCaptureChain = 0;
    let whiteMoves = 0;
    let blackMoves = 0;

    for (const move of game.moves) {
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

    return {
      totalMoves: game.moves.length,
      whiteMoves,
      blackMoves,
      whiteCaptures,
      blackCaptures,
      whiteKingsPromoted,
      blackKingsPromoted,
      longestCaptureChain,
      averageMoveTime: game.metadata.duration / Math.max(1, game.moves.length),
      duration: game.metadata.duration,
      materialHistory: game.materialHistory,
    };
  }

  private storeGame(game: SavedGame): void {
    if (!this.isBrowser) return;

    try {
      // Store the game
      localStorage.setItem(`${STORAGE_KEY}_${game.metadata.id}`, JSON.stringify(game));

      // Update games list
      this._savedGames.update(games => {
        const filtered = games.filter(g => g.id !== game.metadata.id);
        const updated = [game.metadata, ...filtered].slice(0, MAX_SAVED_GAMES);
        return updated;
      });

      this.saveGamesList();
    } catch {
      console.warn('Failed to store game');
    }
  }

  private loadGamesList(): SavedGameMetadata[] {
    if (!this.isBrowser) return [];

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      console.warn('Failed to load games list');
    }
    return [];
  }

  private saveGamesList(): void {
    if (!this.isBrowser) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._savedGames()));
    } catch {
      console.warn('Failed to save games list');
    }
  }
}

