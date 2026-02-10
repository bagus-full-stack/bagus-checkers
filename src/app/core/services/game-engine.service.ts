import { Injectable, inject, signal, computed } from '@angular/core';
import {
  Position,
  Piece,
  PlayerColor,
  Move,
  GameState,
  GameStatus,
  GameResult,
  createPosition,
  createPiece,
  isDarkSquare,
  positionsEqual,
  createInitialGameState,
  movePiece,
  promotePiece,
  shouldPromote,
  TimeMode,
} from '../models';
import { GameVariantService } from './game-variant.service';
import { MoveValidatorService } from './move-validator.service';
import { MoveHistoryService } from './move-history.service';
import { TimerService } from './timer.service';
import { GameStatsService } from './game-stats.service';
import { AudioService } from './audio.service';

/**
 * Main game engine service - manages game state and logic
 */
@Injectable({
  providedIn: 'root',
})
export class GameEngineService {
  private readonly variantService = inject(GameVariantService);
  private readonly moveValidator = inject(MoveValidatorService);
  private readonly historyService = inject(MoveHistoryService);
  private readonly timerService = inject(TimerService);
  private readonly statsService = inject(GameStatsService);
  private readonly audioService = inject(AudioService);

  private readonly _gameState = signal<GameState | null>(null);
  private _timeMode: TimeMode = 'unlimited';

  /** Current game state (readonly) */
  readonly gameState = this._gameState.asReadonly();

  /** Current player */
  readonly currentPlayer = computed(() => this._gameState()?.currentPlayer ?? 'white');

  /** Game status */
  readonly status = computed(() => this._gameState()?.status ?? 'waiting');

  /** Selected piece */
  readonly selectedPiece = computed(() => this._gameState()?.selectedPiece);

  /** Valid moves for selected piece */
  readonly validMoves = computed(() => this._gameState()?.validMoves ?? []);

  /** Must capture flag */
  readonly mustCapture = computed(() => this._gameState()?.mustCapture ?? false);

  /** Pieces on the board */
  readonly pieces = computed(() => this._gameState()?.pieces ?? []);

  /** Move history */
  readonly moveHistory = computed(() => this._gameState()?.moveHistory ?? []);

  /** Game result */
  readonly gameResult = computed(() => this._gameState()?.result);

  /** Board as 2D grid (computed for display) */
  readonly board = computed(() => {
    const state = this._gameState();
    if (!state) return [];

    const boardSize = this.variantService.boardSize();
    const grid: (Piece | null)[][] = [];

    for (let row = 0; row < boardSize; row++) {
      grid[row] = [];
      for (let col = 0; col < boardSize; col++) {
        const piece = state.pieces.find(
          (p) => p.position.row === row && p.position.col === col
        );
        grid[row][col] = piece ?? null;
      }
    }

    return grid;
  });

  /**
   * Starts a new game
   */
  startNewGame(timeMode: TimeMode = 'unlimited'): void {
    this._timeMode = timeMode;
    const pieces = this.createInitialPieces();
    const state = createInitialGameState(pieces);

    // Calculate initial valid moves
    const mustCapture = this.moveValidator.mustCapture('white', state);
    const updatedState: GameState = { ...state, mustCapture };

    this._gameState.set(updatedState);
    this.historyService.initialize(updatedState);

    // Initialize timer and stats
    this.timerService.initialize(timeMode);
    this.statsService.initialize(updatedState);

    // Start timer for white
    if (timeMode !== 'unlimited') {
      this.timerService.startTimer('white');
    }

    // Play game start sound
    this.audioService.playGameStart();
  }

  /**
   * Creates initial piece positions
   */
  private createInitialPieces(): Piece[] {
    const pieces: Piece[] = [];
    const boardSize = this.variantService.boardSize();
    const initialRows = this.variantService.getInitialRows();

    let pieceId = 0;

    // Black pieces (top of board)
    for (let row = 0; row < initialRows; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (isDarkSquare(createPosition(row, col))) {
          pieces.push(
            createPiece(`black-${pieceId++}`, 'black', createPosition(row, col))
          );
        }
      }
    }

    // White pieces (bottom of board)
    for (let row = boardSize - initialRows; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (isDarkSquare(createPosition(row, col))) {
          pieces.push(
            createPiece(`white-${pieceId++}`, 'white', createPosition(row, col))
          );
        }
      }
    }

    return pieces;
  }

  /**
   * Selects a piece
   */
  selectPiece(piece: Piece): void {
    const state = this._gameState();
    if (!state || state.status !== 'playing') return;
    if (piece.color !== state.currentPlayer) return;

    const validMoves = this.moveValidator.getValidMoves(piece, state);

    // If must capture, only allow selection of pieces that can capture
    if (state.mustCapture && validMoves.every((m) => m.capturedPieces.length === 0)) {
      return;
    }

    this._gameState.set({
      ...state,
      selectedPiece: piece,
      validMoves,
    });
  }

  /**
   * Deselects the current piece
   */
  deselectPiece(): void {
    const state = this._gameState();
    if (!state) return;

    this._gameState.set({
      ...state,
      selectedPiece: undefined,
      validMoves: [],
    });
  }

  /**
   * Attempts to move to a position
   */
  moveTo(position: Position): boolean {
    const state = this._gameState();
    if (!state || !state.selectedPiece) return false;

    // Find a valid move to this position
    const move = state.validMoves.find((m) =>
      positionsEqual(m.to, position)
    );

    if (!move) return false;

    return this.executeMove(move);
  }

  /**
   * Executes a move
   */
  executeMove(move: Move): boolean {
    const state = this._gameState();
    if (!state) return false;

    // Find the piece to move
    const piece = state.pieces.find((p) => p.id === move.piece.id);
    if (!piece) return false;

    // Move the piece
    let movedPiece = movePiece(piece, move.to);

    // Handle promotion
    if (move.isPromotion) {
      movedPiece = promotePiece(movedPiece);
    }

    // Remove captured pieces
    const remainingPieces = state.pieces
      .filter((p) => p.id !== piece.id)
      .filter((p) => !move.capturedPieces.some((c) => c.id === p.id));

    // Add moved piece
    const newPieces = [...remainingPieces, movedPiece];

    // Switch player
    const nextPlayer: PlayerColor =
      state.currentPlayer === 'white' ? 'black' : 'white';

    // Check for game over
    const tempState: GameState = {
      ...state,
      pieces: newPieces,
      currentPlayer: nextPlayer,
    };

    const nextPlayerMoves = this.getAllValidMoves(nextPlayer, tempState);
    const gameOver = nextPlayerMoves.length === 0;

    let newStatus: GameStatus = 'playing';
    let result: GameResult | undefined;

    if (gameOver) {
      newStatus = 'finished';
      const nextPlayerPieces = newPieces.filter((p) => p.color === nextPlayer);
      result = {
        winner: state.currentPlayer,
        reason: nextPlayerPieces.length === 0 ? 'no-pieces' : 'no-moves',
      };
    }

    const mustCapture = !gameOver && this.moveValidator.mustCapture(nextPlayer, tempState);

    const newState: GameState = {
      ...state,
      pieces: newPieces,
      currentPlayer: nextPlayer,
      status: newStatus,
      result,
      moveHistory: [...state.moveHistory, move],
      selectedPiece: undefined,
      validMoves: [],
      mustCapture,
    };

    this._gameState.set(newState);
    this.historyService.recordMove(newState, move);

    // Record stats
    this.statsService.recordMove(newState, move);

    // Play appropriate sound
    if (gameOver) {
      this.audioService.playGameEnd();
    } else if (move.isPromotion) {
      this.audioService.playPromotion();
    } else if (move.capturedPieces.length > 0) {
      this.audioService.playCapture();
    } else {
      this.audioService.playMove();
    }

    // Switch timer
    if (this._timeMode !== 'unlimited') {
      if (gameOver) {
        this.timerService.pauseTimer();
      } else {
        this.timerService.switchPlayer(nextPlayer);
      }
    }

    return true;
  }

  /**
   * Gets all valid moves for a player
   */
  private getAllValidMoves(color: PlayerColor, state: GameState): Move[] {
    const playerPieces = state.pieces.filter((p) => p.color === color);
    const allMoves: Move[] = [];

    for (const piece of playerPieces) {
      const moves = this.moveValidator.getValidMoves(piece, state);
      allMoves.push(...moves);
    }

    return allMoves;
  }

  /**
   * Undoes the last move
   */
  undo(): boolean {
    const previousState = this.historyService.undo();
    if (!previousState) return false;

    this._gameState.set(previousState);
    return true;
  }

  /**
   * Redoes a previously undone move
   */
  redo(): boolean {
    const nextState = this.historyService.redo();
    if (!nextState) return false;

    this._gameState.set(nextState);
    return true;
  }

  /**
   * Checks if undo is available
   */
  canUndo(): boolean {
    return this.historyService.canUndo();
  }

  /**
   * Checks if redo is available
   */
  canRedo(): boolean {
    return this.historyService.canRedo();
  }

  /**
   * Resigns the current game
   */
  resign(): void {
    const state = this._gameState();
    if (!state || state.status !== 'playing') return;

    const winner: PlayerColor =
      state.currentPlayer === 'white' ? 'black' : 'white';

    this._gameState.set({
      ...state,
      status: 'finished',
      result: {
        winner,
        reason: 'resignation',
      },
    });
  }

  /**
   * Gets pieces that can move (for highlighting)
   */
  getMovablePieces(): Piece[] {
    const state = this._gameState();
    if (!state || state.status !== 'playing') return [];

    const playerPieces = state.pieces.filter(
      (p) => p.color === state.currentPlayer
    );

    return playerPieces.filter((piece) => {
      const moves = this.moveValidator.getValidMoves(piece, state);
      if (state.mustCapture) {
        return moves.some((m) => m.capturedPieces.length > 0);
      }
      return moves.length > 0;
    });
  }

  /**
   * Checks if a position is a valid move target
   */
  isValidMoveTarget(position: Position): boolean {
    const state = this._gameState();
    if (!state) return false;

    return state.validMoves.some((m) => positionsEqual(m.to, position));
  }

  /**
   * Handles timeout - called when a player runs out of time
   */
  handleTimeout(timedOutPlayer: PlayerColor): void {
    const state = this._gameState();
    if (!state || state.status !== 'playing') return;

    const winner: PlayerColor = timedOutPlayer === 'white' ? 'black' : 'white';

    this._gameState.set({
      ...state,
      status: 'finished',
      result: {
        winner,
        reason: 'timeout',
      },
    });

    this.timerService.pauseTimer();
  }

  /**
   * Gets current game statistics
   */
  getGameStatistics() {
    const state = this._gameState();
    if (!state) return null;
    return this.statsService.getStatistics(state.moveHistory);
  }

  /**
   * Gets material history for graphs
   */
  getMaterialHistory() {
    return this.statsService.materialHistory();
  }
}

