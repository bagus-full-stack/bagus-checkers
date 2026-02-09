import { Injectable, inject } from '@angular/core';
import {
  Piece,
  Move,
  GameState,
  PlayerColor,
  AIDifficulty,
} from '../models';
import { MoveValidatorService } from './move-validator.service';
import { GameVariantService } from './game-variant.service';

/**
 * AI Service for computer opponents
 */
@Injectable({
  providedIn: 'root',
})
export class AiService {
  private readonly moveValidator = inject(MoveValidatorService);
  private readonly variantService = inject(GameVariantService);

  /**
   * Gets the best move for the AI at a given difficulty level
   */
  getBestMove(
    state: GameState,
    color: PlayerColor,
    difficulty: AIDifficulty
  ): Move | null {
    const allMoves = this.getAllMoves(state, color);
    if (allMoves.length === 0) return null;

    switch (difficulty) {
      case 'easy':
        return this.getRandomMove(allMoves);
      case 'medium':
        return this.getMinimaxMove(state, color, 3);
      case 'hard':
        return this.getAlphaBetaMove(state, color, 5);
      default:
        return this.getRandomMove(allMoves);
    }
  }

  /**
   * Easy level: Random move selection
   */
  private getRandomMove(moves: Move[]): Move {
    const index = Math.floor(Math.random() * moves.length);
    return moves[index];
  }

  /**
   * Medium level: Minimax algorithm
   */
  private getMinimaxMove(
    state: GameState,
    color: PlayerColor,
    depth: number
  ): Move | null {
    const allMoves = this.getAllMoves(state, color);
    if (allMoves.length === 0) return null;

    let bestMove: Move | null = null;
    let bestScore = -Infinity;

    for (const move of allMoves) {
      const newState = this.applyMove(state, move);
      const score = this.minimax(newState, depth - 1, false, color);

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  /**
   * Hard level: Alpha-Beta pruning
   */
  private getAlphaBetaMove(
    state: GameState,
    color: PlayerColor,
    depth: number
  ): Move | null {
    const allMoves = this.getAllMoves(state, color);
    if (allMoves.length === 0) return null;

    let bestMove: Move | null = null;
    let bestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    for (const move of allMoves) {
      const newState = this.applyMove(state, move);
      const score = this.alphaBeta(newState, depth - 1, alpha, beta, false, color);

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, bestScore);
    }

    return bestMove;
  }

  /**
   * Minimax algorithm
   */
  private minimax(
    state: GameState,
    depth: number,
    isMaximizing: boolean,
    aiColor: PlayerColor
  ): number {
    if (depth === 0 || this.isTerminal(state)) {
      return this.evaluate(state, aiColor);
    }

    const currentColor = isMaximizing
      ? aiColor
      : this.oppositeColor(aiColor);
    const moves = this.getAllMoves(state, currentColor);

    if (moves.length === 0) {
      return isMaximizing ? -1000 : 1000;
    }

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (const move of moves) {
        const newState = this.applyMove(state, move);
        const score = this.minimax(newState, depth - 1, false, aiColor);
        maxScore = Math.max(maxScore, score);
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      for (const move of moves) {
        const newState = this.applyMove(state, move);
        const score = this.minimax(newState, depth - 1, true, aiColor);
        minScore = Math.min(minScore, score);
      }
      return minScore;
    }
  }

  /**
   * Alpha-Beta pruning algorithm
   */
  private alphaBeta(
    state: GameState,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    aiColor: PlayerColor
  ): number {
    if (depth === 0 || this.isTerminal(state)) {
      return this.evaluate(state, aiColor);
    }

    const currentColor = isMaximizing
      ? aiColor
      : this.oppositeColor(aiColor);
    const moves = this.getAllMoves(state, currentColor);

    if (moves.length === 0) {
      return isMaximizing ? -1000 : 1000;
    }

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (const move of moves) {
        const newState = this.applyMove(state, move);
        const score = this.alphaBeta(newState, depth - 1, alpha, beta, false, aiColor);
        maxScore = Math.max(maxScore, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      for (const move of moves) {
        const newState = this.applyMove(state, move);
        const score = this.alphaBeta(newState, depth - 1, alpha, beta, true, aiColor);
        minScore = Math.min(minScore, score);
        beta = Math.min(beta, score);
        if (beta <= alpha) break;
      }
      return minScore;
    }
  }

  /**
   * Evaluates the board position for a given player
   */
  private evaluate(state: GameState, color: PlayerColor): number {
    const opponent = this.oppositeColor(color);
    let score = 0;

    const PAWN_VALUE = 100;
    const KING_VALUE = 300;
    const CENTER_BONUS = 5;
    const ADVANCEMENT_BONUS = 2;
    const BACK_ROW_BONUS = 10;

    const boardSize = this.variantService.boardSize();
    const center = boardSize / 2;

    for (const piece of state.pieces) {
      const baseValue = piece.type === 'king' ? KING_VALUE : PAWN_VALUE;
      let pieceScore = baseValue;

      const distanceFromCenter =
        Math.abs(piece.position.col - center) +
        Math.abs(piece.position.row - center);
      pieceScore += (boardSize - distanceFromCenter) * CENTER_BONUS / boardSize;

      if (piece.type === 'pawn') {
        // White advances toward row 0 (top), black advances toward boardSize-1 (bottom)
        const advancement =
          piece.color === 'white'
            ? boardSize - 1 - piece.position.row
            : piece.position.row;
        pieceScore += advancement * ADVANCEMENT_BONUS;
      }

      if (piece.type === 'pawn') {
        // Back row bonus: white's back row is at boardSize-1, black's back row is at 0
        if (
          (piece.color === 'white' && piece.position.row === boardSize - 1) ||
          (piece.color === 'black' && piece.position.row === 0)
        ) {
          pieceScore += BACK_ROW_BONUS;
        }
      }

      if (piece.color === color) {
        score += pieceScore;
      } else {
        score -= pieceScore;
      }
    }

    const myMoves = this.getAllMoves(state, color).length;
    const opponentMoves = this.getAllMoves(state, opponent).length;
    score += (myMoves - opponentMoves) * 2;

    return score;
  }

  /**
   * Checks if the game is in a terminal state
   */
  private isTerminal(state: GameState): boolean {
    const whitePieces = state.pieces.filter((p) => p.color === 'white');
    const blackPieces = state.pieces.filter((p) => p.color === 'black');

    if (whitePieces.length === 0 || blackPieces.length === 0) {
      return true;
    }

    const whiteMoves = this.getAllMoves(state, 'white');
    const blackMoves = this.getAllMoves(state, 'black');

    return whiteMoves.length === 0 || blackMoves.length === 0;
  }

  /**
   * Gets all valid moves for a player
   */
  private getAllMoves(state: GameState, color: PlayerColor): Move[] {
    const playerPieces = state.pieces.filter((p) => p.color === color);
    const allMoves: Move[] = [];

    for (const piece of playerPieces) {
      const moves = this.moveValidator.getValidMoves(piece, state);
      allMoves.push(...moves);
    }

    return allMoves;
  }

  /**
   * Applies a move to the state and returns new state
   */
  private applyMove(state: GameState, move: Move): GameState {
    let movedPiece: Piece = {
      ...move.piece,
      position: move.to,
    };

    if (move.isPromotion) {
      movedPiece = { ...movedPiece, type: 'king' };
    }

    const newPieces = state.pieces
      .filter((p) => p.id !== move.piece.id)
      .filter((p) => !move.capturedPieces.some((c) => c.id === p.id));

    const updatedPieces = [...newPieces, movedPiece];

    return {
      ...state,
      pieces: updatedPieces,
      currentPlayer: this.oppositeColor(state.currentPlayer),
    };
  }

  /**
   * Gets the opposite color
   */
  private oppositeColor(color: PlayerColor): PlayerColor {
    return color === 'white' ? 'black' : 'white';
  }
}

