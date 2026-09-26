import { Injectable, inject, signal, computed } from '@angular/core';
import { Position, positionsEqual } from '../models/position.model';
import {
  Piece,
  PlayerColor,
  createPiece
} from '../models/piece.model';
import {
  LudoGameState,
  LUDO_BASES,
  LUDO_TOTAL_STEPS,
  LUDO_SAFE_INDICES,
  LUDO_START_INDEX,
  LUDO_TRACK_LENGTH,
  ludoPositionForSteps
} from '../models/ludo.model';
import { AudioService } from './audio.service';

export interface LudoMoveOption {
  piece: Piece;
  steps: number;
  destination: Position;
  capturedPieceIds: string[];
}

@Injectable({
  providedIn: 'root',
})
export class LudoEngineService {
  private readonly audioService = inject(AudioService);
  private readonly _gameState = signal<LudoGameState | null>(null);

  readonly gameState = this._gameState.asReadonly();
  readonly currentPlayer = computed(() => this._gameState()?.currentPlayer ?? 'red');
  readonly status = computed(() => this._gameState()?.status ?? 'waiting');
  readonly result = computed(() => this._gameState()?.result);
  readonly pieces = computed(() => this._gameState()?.pieces ?? []);
  readonly phase = computed(() => this._gameState()?.phase ?? 'rolling');
  readonly diceRoll = computed(() => this._gameState()?.lastDiceRoll);

  /** Pieces the current player can legally move with the last dice roll. */
  readonly movableOptions = computed<LudoMoveOption[]>(() => {
    const state = this._gameState();
    if (!state || state.phase !== 'moving' || !state.lastDiceRoll) return [];
    return this.getMoveOptions(state, state.currentPlayer, state.lastDiceRoll);
  });

  /** Calculate board (15x15 for Ludo) */
  readonly board = computed(() => {
    const state = this._gameState();
    if (!state) return [];
    const grid: (Piece | null)[][] = [];
    for (let row = 0; row < 15; row++) {
      grid[row] = [];
      for (let col = 0; col < 15; col++) {
        grid[row][col] = state.pieces.find(p => p.position.row === row && p.position.col === col) ?? null;
      }
    }
    return grid;
  });

  startNewGame(players: PlayerColor[] = ['red', 'green', 'yellow', 'blue']): void {
    const pieces: Piece[] = [];
    let pieceId = 0;

    players.forEach(color => {
      const basePositions = LUDO_BASES[color];
      if (basePositions) {
        basePositions.forEach(pos => {
          pieces.push(createPiece(`${color}-${pieceId++}`, color, pos, 'token'));
        });
      }
    });

    this._gameState.set({
      pieces,
      currentPlayer: players[0],
      status: 'playing',
      moveHistory: [],
      phase: 'rolling',
      consecutiveSixes: 0,
      players
    });

    this.audioService.playGameStart();
  }

  rollDice(): number | null {
    const state = this._gameState();
    if (!state || state.status !== 'playing' || state.phase !== 'rolling') return null;

    const roll = Math.floor(Math.random() * 6) + 1; // 1-6
    this.audioService.playMove();

    const options = this.getMoveOptions(state, state.currentPlayer, roll);

    if (options.length > 0) {
      this._gameState.set({
        ...state,
        lastDiceRoll: roll,
        phase: 'moving',
        consecutiveSixes: roll === 6 ? state.consecutiveSixes + 1 : 0
      });
    } else {
      this.nextTurn(state, roll);
    }
    return roll;
  }

  private isInBase(piece: Piece): boolean {
    return piece.trackIndex === undefined;
  }

  private isFinished(piece: Piece): boolean {
    return piece.trackIndex === LUDO_TOTAL_STEPS;
  }

  /** All legal (piece, destination) moves for `color` given `roll`. */
  private getMoveOptions(state: LudoGameState, color: PlayerColor, roll: number): LudoMoveOption[] {
    const playerPieces = state.pieces.filter(p => p.color === color);
    const options: LudoMoveOption[] = [];

    for (const piece of playerPieces) {
      if (this.isFinished(piece)) continue;

      if (this.isInBase(piece)) {
        if (roll !== 6) continue;
        // Can't exit onto a square already occupied by 2+ of your own tokens (blocked) -
        // simplification: a single own token there is fine (stacks), matches base-slot behavior.
        const destination = ludoPositionForSteps(color, 0);
        options.push({
          piece,
          steps: 0,
          destination,
          capturedPieceIds: this.capturesAt(state, color, destination, 0),
        });
        continue;
      }

      const newSteps = piece.trackIndex! + roll;
      if (newSteps > LUDO_TOTAL_STEPS) continue; // must roll the exact number to finish

      const destination = ludoPositionForSteps(color, newSteps);
      options.push({
        piece,
        steps: newSteps,
        destination,
        capturedPieceIds: this.capturesAt(state, color, destination, newSteps),
      });
    }

    return options;
  }

  private capturesAt(state: LudoGameState, color: PlayerColor, destination: Position, newSteps: number): string[] {
    // Home column squares are private - no captures there. Only the shared track has captures.
    if (newSteps >= LUDO_TRACK_LENGTH) return [];
    const globalIndex = (LUDO_START_INDEX[color] + newSteps) % LUDO_TRACK_LENGTH;
    if (LUDO_SAFE_INDICES.has(globalIndex)) return [];

    return state.pieces
      .filter(p => p.color !== color && !this.isInBase(p) && positionsEqual(p.position, destination))
      .map(p => p.id);
  }

  moveTo(piece: Piece, targetPosition: Position): boolean {
    const state = this._gameState();
    if (!state || state.status !== 'playing' || state.phase !== 'moving' || state.currentPlayer !== piece.color || !state.lastDiceRoll) {
      return false;
    }

    const option = this.getMoveOptions(state, piece.color, state.lastDiceRoll)
      .find(o => o.piece.id === piece.id && positionsEqual(o.destination, targetPosition));
    if (!option) return false;

    const movedPiece: Piece = { ...piece, position: option.destination, trackIndex: option.steps };

    // Send each captured piece back to its own first free base slot (not all onto slot 0).
    const capturedIds = new Set(option.capturedPieceIds);
    const takenBaseSlots = new Set<string>();
    const newPieces = state.pieces.map(p => {
      if (p.id === piece.id) return movedPiece;
      if (!capturedIds.has(p.id)) return p;

      const baseSpots = LUDO_BASES[p.color];
      const freeSpot = baseSpots.find(spot => {
        const key = `${p.color}:${spot.row},${spot.col}`;
        if (takenBaseSlots.has(key)) return false;
        const occupied = state.pieces.some(op => op.color === p.color && op.trackIndex === undefined && positionsEqual(op.position, spot));
        return !occupied;
      }) ?? baseSpots[0];
      takenBaseSlots.add(`${p.color}:${freeSpot.row},${freeSpot.col}`);
      return { ...p, position: freeSpot, trackIndex: undefined };
    });

    if (capturedIds.size > 0) {
      this.audioService.playCapture();
    } else {
      this.audioService.playMove();
    }

    const nextState: LudoGameState = { ...state, pieces: newPieces };
    const winner = this.checkWinner(nextState, piece.color);
    if (winner) {
      this._gameState.set({ ...nextState, status: 'finished', result: { winner, reason: 'all-pieces-home' }, phase: 'rolling' });
      this.audioService.playGameEnd();
      return true;
    }

    this.nextTurn(nextState, state.lastDiceRoll);
    return true;
  }

  private checkWinner(state: LudoGameState, color: PlayerColor): PlayerColor | null {
    const allHome = state.pieces.filter(p => p.color === color).every(p => this.isFinished(p));
    return allHome ? color : null;
  }

  private nextTurn(state: LudoGameState, lastRoll: number): void {
    // If rolled a 6 and hasn't rolled three 6s, they roll again
    if (lastRoll === 6 && state.consecutiveSixes < 3) {
      this._gameState.set({
        ...state,
        phase: 'rolling'
      });
      return;
    }

    // Switch player
    const currentIndex = state.players.indexOf(state.currentPlayer);
    const nextPlayer = state.players[(currentIndex + 1) % state.players.length];

    this._gameState.set({
      ...state,
      currentPlayer: nextPlayer,
      phase: 'rolling',
      consecutiveSixes: 0,
      lastDiceRoll: undefined
    });
  }
}
