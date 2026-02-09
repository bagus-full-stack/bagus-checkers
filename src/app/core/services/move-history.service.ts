import { Injectable, signal } from '@angular/core';
import { GameState, Move } from '../models';

interface HistoryEntry {
  state: GameState;
  move?: Move;
}

/**
 * Service for managing game history and undo/redo functionality
 */
@Injectable({
  providedIn: 'root',
})
export class MoveHistoryService {
  private readonly _history = signal<HistoryEntry[]>([]);
  private readonly _currentIndex = signal<number>(-1);

  /** Current history entries */
  readonly history = this._history.asReadonly();

  /** Current position in history */
  readonly currentIndex = this._currentIndex.asReadonly();

  /**
   * Checks if undo is available
   */
  canUndo(): boolean {
    return this._currentIndex() > 0;
  }

  /**
   * Checks if redo is available
   */
  canRedo(): boolean {
    return this._currentIndex() < this._history().length - 1;
  }

  /**
   * Initializes history with initial state
   */
  initialize(initialState: GameState): void {
    this._history.set([{ state: this.deepCloneState(initialState) }]);
    this._currentIndex.set(0);
  }

  /**
   * Records a new state after a move
   */
  recordMove(state: GameState, move: Move): void {
    const currentIndex = this._currentIndex();
    const history = this._history();

    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push({ state: this.deepCloneState(state), move });

    this._history.set(newHistory);
    this._currentIndex.set(newHistory.length - 1);
  }

  /**
   * Undoes the last move
   */
  undo(): GameState | null {
    if (!this.canUndo()) return null;

    const newIndex = this._currentIndex() - 1;
    this._currentIndex.set(newIndex);
    return this.deepCloneState(this._history()[newIndex].state);
  }

  /**
   * Redoes a previously undone move
   */
  redo(): GameState | null {
    if (!this.canRedo()) return null;

    const newIndex = this._currentIndex() + 1;
    this._currentIndex.set(newIndex);
    return this.deepCloneState(this._history()[newIndex].state);
  }

  /**
   * Gets all moves in order
   */
  getMoves(): Move[] {
    return this._history()
      .filter((entry) => entry.move !== undefined)
      .map((entry) => entry.move!);
  }

  /**
   * Gets the last move
   */
  getLastMove(): Move | undefined {
    const history = this._history();
    const currentIndex = this._currentIndex();
    return history[currentIndex]?.move;
  }

  /**
   * Clears all history
   */
  clear(): void {
    this._history.set([]);
    this._currentIndex.set(-1);
  }

  /**
   * Deep clones the game state to ensure immutability
   */
  private deepCloneState(state: GameState): GameState {
    return {
      ...state,
      pieces: state.pieces.map((p) => ({ ...p, position: { ...p.position } })),
      moveHistory: [...state.moveHistory],
      validMoves: state.validMoves.map((m) => ({
        ...m,
        capturedPieces: [...m.capturedPieces],
        path: m.path ? [...m.path] : undefined,
      })),
      selectedPiece: state.selectedPiece
        ? {
            ...state.selectedPiece,
            position: { ...state.selectedPiece.position },
          }
        : undefined,
      captureSequence: state.captureSequence
        ? {
            ...state.captureSequence,
            piece: {
              ...state.captureSequence.piece,
              position: { ...state.captureSequence.piece.position },
            },
            capturedSoFar: state.captureSequence.capturedSoFar.map((p) => ({
              ...p,
              position: { ...p.position },
            })),
            currentPosition: { ...state.captureSequence.currentPosition },
          }
        : undefined,
    };
  }
}

