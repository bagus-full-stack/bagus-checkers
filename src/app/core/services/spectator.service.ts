import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { GameState } from '../models/game-state.model';
import { Move } from '../models/move.model';
import { PlayerColor } from '../models/piece.model';

export interface SpectatorGame {
  id: string;
  roomId: string;
  whitePlayer: SpectatorPlayer;
  blackPlayer: SpectatorPlayer;
  status: 'playing' | 'finished';
  currentPlayer: PlayerColor;
  moveCount: number;
  spectatorCount: number;
  startedAt: string;
  variant: string;
  timeMode: string;
  isHighLevel: boolean; // Both players have high ELO
  isFeatured: boolean;  // Manually featured by admin
}

export interface SpectatorPlayer {
  id: string;
  name: string;
  rating: number;
  avatar?: string;
}

export interface SpectatorComment {
  id: string
  oderId: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: string;
  isHighlighted?: boolean;
}

export interface SpectatorState {
  game: SpectatorGame;
  gameState: GameState;
  comments: SpectatorComment[];
  liveViewers: number;
}

const MIN_RATING_FOR_HIGH_LEVEL = 1600;

/**
 * Service for spectating live games
 */
@Injectable({
  providedIn: 'root',
})
export class SpectatorService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private socket: Socket | null = null;

  private readonly _liveGames = signal<SpectatorGame[]>([]);
  private readonly _currentSpectating = signal<SpectatorState | null>(null);
  private readonly _comments = signal<SpectatorComment[]>([]);
  private readonly _isConnected = signal(false);
  private readonly _isLoading = signal(false);

  /** List of live games available to spectate */
  readonly liveGames = this._liveGames.asReadonly();

  /** Currently spectating game state */
  readonly currentSpectating = this._currentSpectating.asReadonly();

  /** Comments for current game */
  readonly comments = this._comments.asReadonly();

  /** Is connected to spectator server */
  readonly isConnected = this._isConnected.asReadonly();

  /** Is loading */
  readonly isLoading = this._isLoading.asReadonly();

  /** High-level games (both players > 1600 ELO) */
  readonly highLevelGames = computed(() =>
    this._liveGames().filter(g => g.isHighLevel)
  );

  /** Featured games */
  readonly featuredGames = computed(() =>
    this._liveGames().filter(g => g.isFeatured)
  );

  /** Total spectators across all games */
  readonly totalSpectators = computed(() =>
    this._liveGames().reduce((sum, g) => sum + g.spectatorCount, 0)
  );

  constructor() {
    if (this.isBrowser) {
      this.connect();
    }
  }

  /**
   * Connects to spectator server
   */
  connect(): void {
    if (!this.isBrowser || this.socket?.connected) return;

    const wsUrl = environment.wsUrl || window.location.origin;

    this.socket = io(`${wsUrl}/spectator`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.setupSocketListeners();
  }

  /**
   * Disconnects from spectator server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this._isConnected.set(false);
  }

  /**
   * Sets up socket event listeners
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this._isConnected.set(true);
      this.refreshLiveGames();
    });

    this.socket.on('disconnect', () => {
      this._isConnected.set(false);
    });

    // Live games list updates
    this.socket.on('liveGames', (games: SpectatorGame[]) => {
      this._liveGames.set(games.map(g => ({
        ...g,
        isHighLevel: g.whitePlayer.rating >= MIN_RATING_FOR_HIGH_LEVEL &&
                     g.blackPlayer.rating >= MIN_RATING_FOR_HIGH_LEVEL,
      })));
      this._isLoading.set(false);
    });

    // Game started
    this.socket.on('gameStarted', (game: SpectatorGame) => {
      this._liveGames.update(games => {
        const filtered = games.filter(g => g.id !== game.id);
        return [...filtered, {
          ...game,
          isHighLevel: game.whitePlayer.rating >= MIN_RATING_FOR_HIGH_LEVEL &&
                       game.blackPlayer.rating >= MIN_RATING_FOR_HIGH_LEVEL,
        }];
      });
    });

    // Game ended
    this.socket.on('gameEnded', (gameId: string) => {
      this._liveGames.update(games => games.filter(g => g.id !== gameId));

      const current = this._currentSpectating();
      if (current?.game.id === gameId) {
        // Mark current game as finished
        this._currentSpectating.update(s => s ? {
          ...s,
          game: { ...s.game, status: 'finished' }
        } : null);
      }
    });

    // Spectating game state update
    this.socket.on('spectatorState', (state: SpectatorState) => {
      this._currentSpectating.set(state);
      this._comments.set(state.comments);
    });

    // Move made in spectated game
    this.socket.on('moveMade', (data: { gameId: string; move: Move; gameState: GameState }) => {
      const current = this._currentSpectating();
      if (current?.game.id === data.gameId) {
        this._currentSpectating.update(s => s ? {
          ...s,
          gameState: data.gameState,
          game: {
            ...s.game,
            moveCount: s.game.moveCount + 1,
            currentPlayer: data.gameState.currentPlayer,
          }
        } : null);
      }
    });

    // New comment
    this.socket.on('newComment', (comment: SpectatorComment) => {
      this._comments.update(comments => [...comments, comment].slice(-100)); // Keep last 100
    });

    // Spectator count update
    this.socket.on('spectatorCount', (data: { gameId: string; count: number }) => {
      this._liveGames.update(games =>
        games.map(g => g.id === data.gameId
          ? { ...g, spectatorCount: data.count }
          : g
        )
      );

      const current = this._currentSpectating();
      if (current?.game.id === data.gameId) {
        this._currentSpectating.update(s => s ? {
          ...s,
          liveViewers: data.count
        } : null);
      }
    });
  }

  /**
   * Refreshes the list of live games
   */
  refreshLiveGames(): void {
    if (!this.socket?.connected) return;
    this._isLoading.set(true);
    this.socket.emit('getLiveGames');
  }

  /**
   * Starts spectating a game
   */
  spectateGame(gameId: string): void {
    if (!this.socket?.connected) return;

    // Leave previous game if any
    const current = this._currentSpectating();
    if (current) {
      this.stopSpectating();
    }

    this._isLoading.set(true);
    this.socket.emit('spectateGame', gameId);
  }

  /**
   * Stops spectating current game
   */
  stopSpectating(): void {
    const current = this._currentSpectating();
    if (!this.socket?.connected || !current) return;

    this.socket.emit('stopSpectating', current.game.id);
    this._currentSpectating.set(null);
    this._comments.set([]);
  }

  /**
   * Sends a comment to the spectator chat
   */
  sendComment(message: string): void {
    const current = this._currentSpectating();
    if (!this.socket?.connected || !current) return;

    this.socket.emit('sendComment', {
      gameId: current.game.id,
      message: message.trim(),
    });
  }

  /**
   * Requests to feature a game (admin only)
   */
  featureGame(gameId: string, featured: boolean): void {
    if (!this.socket?.connected) return;
    this.socket.emit('featureGame', { gameId, featured });
  }

  /**
   * Gets game by ID from live games
   */
  getGameById(gameId: string): SpectatorGame | undefined {
    return this._liveGames().find(g => g.id === gameId);
  }

  /**
   * Formats player info for display
   */
  formatPlayerInfo(player: SpectatorPlayer): string {
    return `${player.name} (${player.rating})`;
  }

  /**
   * Gets rating class for styling
   */
  getRatingClass(rating: number): string {
    if (rating >= 2000) return 'master';
    if (rating >= 1800) return 'expert';
    if (rating >= 1600) return 'advanced';
    if (rating >= 1400) return 'intermediate';
    return 'beginner';
  }
}

