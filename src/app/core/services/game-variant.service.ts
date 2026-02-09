import { Injectable, computed, signal } from '@angular/core';
import { GameVariant, INTERNATIONAL_DRAUGHTS, getVariantById } from '../models';

/**
 * Service for managing game variant/rules configuration
 */
@Injectable({
  providedIn: 'root',
})
export class GameVariantService {
  private readonly _currentVariant = signal<GameVariant>(INTERNATIONAL_DRAUGHTS);

  /** Current game variant */
  readonly currentVariant = this._currentVariant.asReadonly();

  /** Board size from current variant */
  readonly boardSize = computed(() => this._currentVariant().boardSize);

  /** Number of pieces per player */
  readonly piecesPerPlayer = computed(() => this._currentVariant().piecesPerPlayer);

  /** Whether kings can fly (move multiple squares) */
  readonly flyingKings = computed(() => this._currentVariant().flyingKings);

  /** Whether pawns can capture backward */
  readonly backwardCapture = computed(() => this._currentVariant().backwardCapture);

  /** Whether maximum capture is mandatory */
  readonly mandatoryMaxCapture = computed(() => this._currentVariant().mandatoryMaxCapture);

  /**
   * Sets the current game variant
   */
  setVariant(variantId: string): void {
    this._currentVariant.set(getVariantById(variantId));
  }

  /**
   * Resets to default variant (International Draughts)
   */
  resetToDefault(): void {
    this._currentVariant.set(INTERNATIONAL_DRAUGHTS);
  }

  /**
   * Gets the number of rows where pieces are initially placed
   */
  getInitialRows(): number {
    const boardSize = this._currentVariant().boardSize;
    const piecesPerPlayer = this._currentVariant().piecesPerPlayer;
    // Calculate how many rows are needed based on pieces and board size
    const darkSquaresPerRow = boardSize / 2;
    return Math.ceil(piecesPerPlayer / darkSquaresPerRow);
  }
}

