import { Injectable, inject, signal, computed } from '@angular/core';
import { Position, positionsEqual } from '../models/position.model';
import {
  Piece,
  PlayerColor,
  createPiece
} from '../models/piece.model';
import { LudoGameState, LudoPhase, LUDO_BASES, LUDO_START_INDEX } from '../models/ludo.model';
import { AudioService } from './audio.service';

@Injectable({
  providedIn: 'root',
})
export class LudoEngineService {
  private readonly audioService = inject(AudioService);
  private readonly _gameState = signal<LudoGameState | null>(null);

  readonly gameState = this._gameState.asReadonly();
  readonly currentPlayer = computed(() => this._gameState()?.currentPlayer ?? 'red');
  readonly status = computed(() => this._gameState()?.status ?? 'waiting');
  readonly pieces = computed(() => this._gameState()?.pieces ?? []);
  readonly phase = computed(() => this._gameState()?.phase ?? 'rolling');
  readonly diceRoll = computed(() => this._gameState()?.lastDiceRoll);

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

  rollDice(): void {
    const state = this._gameState();
    if (!state || state.status !== 'playing' || state.phase !== 'rolling') return;

    const roll = Math.floor(Math.random() * 6) + 1; // 1-6
    // this.audioService.playDiceRoll(); // Assuming audioService supports it, fallback to default move
    this.audioService.playMove();

    // Check if player has valid moves given this roll
    // If not, immediately pass turn
    const hasValidMove = this.hasAnyValidMove(state.currentPlayer, roll, state.pieces);

    if (hasValidMove) {
      this._gameState.set({
        ...state,
        lastDiceRoll: roll,
        phase: 'moving',
        consecutiveSixes: roll === 6 ? state.consecutiveSixes + 1 : 0
      });
    } else {
      this.nextTurn(state, roll);
    }
  }

  private hasAnyValidMove(color: PlayerColor, roll: number, pieces: Piece[]): boolean {
    const playerPieces = pieces.filter(p => p.color === color);

    for (const p of playerPieces) {
      // In base needs a 6 to move out
      if (this.isInBase(p) && roll === 6) return true;
      // On track simply needs to not overshoot home
      if (!this.isInBase(p) && !this.isInHome(p)) return true;
    }
    return false;
  }

  private isInBase(piece: Piece): boolean {
    // Check if piece position matches any base position for its color
    return LUDO_BASES[piece.color]?.some(pos => positionsEqual(pos, piece.position)) ?? false;
  }

  private isInHome(piece: Piece): boolean {
    // Stub: determine if piece reached the center goals (triangles)
    // To complete this logic, a strict coordinate path is needed.
    return false;
  }

  moveTo(piece: Piece, targetPosition: Position): boolean {
    const state = this._gameState();
    if (!state || state.status !== 'playing' || state.phase !== 'moving' || state.currentPlayer !== piece.color || !state.lastDiceRoll) {
      return false;
    }

    // Stub: compute actual track index movement, capture logic vs safe zones, etc.
    const movedPiece = { ...piece, position: targetPosition };

    // Check Capture (opponent tokens on that spot go back to base)
    const opponents = state.pieces.filter(p => p.color !== piece.color && positionsEqual(p.position, targetPosition));
    const capturedPieces = opponents.map(p => {
      // Send back to available base slot
      const baseSpots = LUDO_BASES[p.color];
      // Placeholder: just take the first spot for now
      return { ...p, position: baseSpots[0] };
    });

    // Rebuild pieces
    const otherPieces = state.pieces.filter(p => p.id !== piece.id && !opponents.some(o => o.id === p.id));
    const newPieces = [...otherPieces, movedPiece, ...capturedPieces];

    if (capturedPieces.length > 0) {
      this.audioService.playCapture();
    } else {
      this.audioService.playMove();
    }

    this.nextTurn({...state, pieces: newPieces}, state.lastDiceRoll);
    return true;
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
