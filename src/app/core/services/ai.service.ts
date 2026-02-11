import { Injectable, inject, signal } from '@angular/core';
import {
  Piece,
  Move,
  GameState,
  PlayerColor,
  AIDifficulty,
} from '../models';
import { MoveValidatorService } from './move-validator.service';
import { GameVariantService } from './game-variant.service';
import {
  MCTS,
  openingBook,
  transpositionTable,
  GameAnalyzer,
  GameAnalysis,
  MoveAnalysis,
} from '../ai';

/** Extended difficulty levels */
export type ExtendedDifficulty = AIDifficulty | 'expert' | 'master';

/**
 * AI Service for computer opponents
 * Now includes MCTS, transposition tables, opening book, and analysis
 */
@Injectable({
  providedIn: 'root',
})
export class AiService {
  private readonly moveValidator = inject(MoveValidatorService);
  private readonly variantService = inject(GameVariantService);

  /** Move counter for opening book */
  private moveCount = 0;

  /** MCTS instance */
  private mcts: MCTS | null = null;

  /** Last game analysis */
  private readonly _lastAnalysis = signal<GameAnalysis | null>(null);
  readonly lastAnalysis = this._lastAnalysis.asReadonly();

  /** Transposition table stats */
  readonly ttStats = signal({ size: 0, hits: 0, misses: 0, hitRate: 0 });

  constructor() {
    this.initMCTS();
  }

  /**
   * Initialize MCTS with bound methods
   */
  private initMCTS(): void {
    this.mcts = new MCTS(
      (state, color) => this.getAllMoves(state, color),
      (state, move) => this.applyMove(state, move),
      (state, color) => this.evaluate(state, color),
      {
        maxIterations: 5000,
        explorationConstant: 1.414,
        maxSimulationDepth: 80,
        timeLimit: 2000,
      }
    );
  }

  /**
   * Resets the AI state for a new game
   */
  resetForNewGame(): void {
    this.moveCount = 0;
    openingBook.reset();
    transpositionTable.clear();
  }

  /**
   * Gets the best move for the AI at a given difficulty level
   */
  getBestMove(
    state: GameState,
    color: PlayerColor,
    difficulty: ExtendedDifficulty
  ): Move | null {
    const allMoves = this.getAllMoves(state, color);
    if (allMoves.length === 0) return null;

    // Try opening book first (for medium+ difficulties)
    if (difficulty !== 'easy' && this.moveCount < 8) {
      const bookMove = this.getOpeningBookMove(state, color, allMoves);
      if (bookMove) {
        this.moveCount++;
        return bookMove;
      }
    }

    this.moveCount++;

    switch (difficulty) {
      case 'easy':
        return this.getRandomMove(allMoves);
      case 'medium':
        return this.getMinimaxMove(state, color, 3);
      case 'hard':
        return this.getAlphaBetaWithTTMove(state, color, 5);
      case 'expert':
        return this.getAlphaBetaWithTTMove(state, color, 7);
      case 'master':
        return this.getMCTSMove(state, color);
      default:
        return this.getRandomMove(allMoves);
    }
  }

  /**
   * Gets an opening book move if available
   */
  private getOpeningBookMove(
    state: GameState,
    color: PlayerColor,
    validMoves: Move[]
  ): Move | null {
    const bookMove = openingBook.getBookMove(color, this.moveCount);
    if (!bookMove) return null;

    // Find the corresponding valid move
    const matchingMove = validMoves.find(
      m =>
        m.from.row === bookMove.from.row &&
        m.from.col === bookMove.from.col &&
        m.to.row === bookMove.to.row &&
        m.to.col === bookMove.to.col
    );

    if (matchingMove) {
      openingBook.recordMove(matchingMove.from, matchingMove.to);
      return matchingMove;
    }

    return null;
  }

  /**
   * Easy level: Random move selection
   */
  private getRandomMove(moves: Move[]): Move {
    // Prefer captures if available
    const captures = moves.filter(m => m.capturedPieces.length > 0);
    const pool = captures.length > 0 ? captures : moves;
    const index = Math.floor(Math.random() * pool.length);
    return pool[index];
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
   * Hard/Expert level: Alpha-Beta with Transposition Table
   */
  private getAlphaBetaWithTTMove(
    state: GameState,
    color: PlayerColor,
    depth: number
  ): Move | null {
    const allMoves = this.getAllMoves(state, color);
    if (allMoves.length === 0) return null;

    // Order moves for better pruning
    const orderedMoves = this.orderMoves(state, allMoves);

    let bestMove: Move | null = null;
    let bestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    for (const move of orderedMoves) {
      const newState = this.applyMove(state, move);
      const score = this.alphaBetaWithTT(newState, depth - 1, alpha, beta, false, color);

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, bestScore);
    }

    // Update stats
    this.ttStats.set(transpositionTable.getStats());

    return bestMove;
  }

  /**
   * Master level: Monte Carlo Tree Search
   */
  private getMCTSMove(state: GameState, color: PlayerColor): Move | null {
    if (!this.mcts) {
      this.initMCTS();
    }
    return this.mcts!.findBestMove(state, color);
  }

  /**
   * Orders moves for better alpha-beta pruning
   */
  private orderMoves(state: GameState, moves: Move[]): Move[] {
    // Check transposition table for best move
    const ttBestMoveKey = transpositionTable.getBestMoveKey(state);

    return moves.sort((a, b) => {
      // TT best move first
      if (ttBestMoveKey) {
        const aKey = this.getMoveKey(a);
        const bKey = this.getMoveKey(b);
        if (aKey === ttBestMoveKey) return -1;
        if (bKey === ttBestMoveKey) return 1;
      }

      // Then captures (more captures first)
      const captureDiff = b.capturedPieces.length - a.capturedPieces.length;
      if (captureDiff !== 0) return captureDiff;

      // Then promotions
      if (a.isPromotion && !b.isPromotion) return -1;
      if (!a.isPromotion && b.isPromotion) return 1;

      return 0;
    });
  }

  /**
   * Creates a unique key for a move
   */
  private getMoveKey(move: Move): string {
    return `${move.from.row},${move.from.col}-${move.to.row},${move.to.col}`;
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
   * Alpha-Beta with Transposition Table
   */
  private alphaBetaWithTT(
    state: GameState,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    aiColor: PlayerColor
  ): number {
    const alphaOrig = alpha;

    // Check transposition table
    const ttResult = transpositionTable.probe(state, depth, alpha, beta);
    if (ttResult.valid) {
      return ttResult.score;
    }

    if (depth === 0 || this.isTerminal(state)) {
      const score = this.evaluate(state, aiColor);
      transpositionTable.set(state, depth, score, 'exact');
      return score;
    }

    const currentColor = isMaximizing
      ? aiColor
      : this.oppositeColor(aiColor);
    const moves = this.orderMoves(state, this.getAllMoves(state, currentColor));

    if (moves.length === 0) {
      const score = isMaximizing ? -10000 + depth : 10000 - depth;
      transpositionTable.set(state, depth, score, 'exact');
      return score;
    }

    let bestScore: number;
    let bestMoveKey: string | undefined;

    if (isMaximizing) {
      bestScore = -Infinity;
      for (const move of moves) {
        const newState = this.applyMove(state, move);
        const score = this.alphaBetaWithTT(newState, depth - 1, alpha, beta, false, aiColor);

        if (score > bestScore) {
          bestScore = score;
          bestMoveKey = this.getMoveKey(move);
        }
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
    } else {
      bestScore = Infinity;
      for (const move of moves) {
        const newState = this.applyMove(state, move);
        const score = this.alphaBetaWithTT(newState, depth - 1, alpha, beta, true, aiColor);

        if (score < bestScore) {
          bestScore = score;
          bestMoveKey = this.getMoveKey(move);
        }
        beta = Math.min(beta, score);
        if (beta <= alpha) break;
      }
    }

    // Store in transposition table
    let flag: 'exact' | 'lowerbound' | 'upperbound';
    if (bestScore <= alphaOrig) {
      flag = 'upperbound';
    } else if (bestScore >= beta) {
      flag = 'lowerbound';
    } else {
      flag = 'exact';
    }
    transpositionTable.set(state, depth, bestScore, flag, bestMoveKey);

    return bestScore;
  }

  /**
   * Analyzes a completed game
   */
  analyzeGame(initialState: GameState, moves: Move[]): GameAnalysis {
    const analyzer = new GameAnalyzer({
      depth: 4,
      includeAlternatives: true,
      evaluateFn: (state, color) => this.evaluate(state, color),
      getAllMovesFn: (state, color) => this.getAllMoves(state, color),
      applyMoveFn: (state, move) => this.applyMove(state, move),
    });

    const openingName = openingBook.getOpeningName() ?? undefined;
    const analysis = analyzer.analyzeGame(initialState, moves, openingName);

    this._lastAnalysis.set(analysis);
    return analysis;
  }

  /**
   * Gets analysis for a specific move
   */
  analyzeSingleMove(
    state: GameState,
    move: Move,
    color: PlayerColor
  ): MoveAnalysis {
    const evalBefore = this.evaluate(state, color);
    const newState = this.applyMove(state, move);
    const evalAfter = this.evaluate(newState, color);

    const allMoves = this.getAllMoves(state, color);
    const bestMove = this.getAlphaBetaWithTTMove(state, color, 4);

    return {
      moveNumber: 0,
      move,
      player: color,
      evaluation: evalAfter,
      previousEvaluation: evalBefore,
      evaluationChange: evalAfter - evalBefore,
      classification: allMoves.length === 1 ? 'forced' : 'good',
      suggestion: bestMove !== move ? bestMove ?? undefined : undefined,
    };
  }
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

