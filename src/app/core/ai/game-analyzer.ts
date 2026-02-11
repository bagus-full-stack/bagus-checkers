/**
 * Post-Game Analysis Service
 * Analyzes completed games and provides improvement suggestions
 */

import { Move, GameState, PlayerColor, Piece, Position } from '../models';

export interface MoveAnalysis {
  moveNumber: number;
  move: Move;
  player: PlayerColor;
  evaluation: number;
  previousEvaluation: number;
  evaluationChange: number;
  classification: MoveClassification;
  suggestion?: Move;
  comment?: string;
}

export type MoveClassification =
  | 'brilliant'    // Exceptional move, much better than alternatives
  | 'great'        // Very good move
  | 'good'         // Solid move
  | 'book'         // Opening book move
  | 'inaccuracy'   // Slight mistake
  | 'mistake'      // Moderate error
  | 'blunder'      // Serious error, losing significant material/position
  | 'forced';      // Only legal move

export interface GameAnalysis {
  moves: MoveAnalysis[];
  summary: GameSummary;
  criticalMoments: CriticalMoment[];
  openingName?: string;
  suggestions: string[];
}

export interface GameSummary {
  totalMoves: number;
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteMistakes: number;
  blackMistakes: number;
  whiteBlunders: number;
  blackBlunders: number;
  averageEvaluationWhite: number;
  averageEvaluationBlack: number;
}

export interface CriticalMoment {
  moveNumber: number;
  description: string;
  evaluationSwing: number;
  type: 'turning_point' | 'missed_win' | 'blunder' | 'brilliant';
}

export interface AnalysisConfig {
  depth: number;
  includeAlternatives: boolean;
  evaluateFn: (state: GameState, color: PlayerColor) => number;
  getAllMovesFn: (state: GameState, color: PlayerColor) => Move[];
  applyMoveFn: (state: GameState, move: Move) => GameState;
}

/**
 * Thresholds for move classification (in centipawns)
 */
const THRESHOLDS = {
  BRILLIANT: 200,     // Move that's 200+ better than expected
  GREAT: 100,         // Very good move
  INACCURACY: -25,    // Small loss
  MISTAKE: -100,      // Moderate loss
  BLUNDER: -200,      // Serious loss
};

/**
 * Post-Game Analyzer
 */
export class GameAnalyzer {
  private config: AnalysisConfig;

  constructor(config: AnalysisConfig) {
    this.config = config;
  }

  /**
   * Analyzes a complete game
   */
  analyzeGame(
    initialState: GameState,
    moves: Move[],
    openingName?: string
  ): GameAnalysis {
    const moveAnalyses: MoveAnalysis[] = [];
    const criticalMoments: CriticalMoment[] = [];

    let currentState = initialState;
    let previousEval = 0;
    let currentPlayer: PlayerColor = 'white';

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const moveNumber = Math.floor(i / 2) + 1;

      // Evaluate position before move
      const evalBefore = this.config.evaluateFn(currentState, 'white');

      // Apply the move
      const newState = this.config.applyMoveFn(currentState, move);

      // Evaluate position after move
      const evalAfter = this.config.evaluateFn(newState, 'white');

      // Calculate the best move in the position
      const bestMove = this.findBestMove(currentState, currentPlayer);
      const bestMoveEval = bestMove
        ? this.config.evaluateFn(
            this.config.applyMoveFn(currentState, bestMove),
            'white'
          )
        : evalAfter;

      // Calculate evaluation change from player's perspective
      const playerPerspective = currentPlayer === 'white' ? 1 : -1;
      const evalChange = (evalAfter - evalBefore) * playerPerspective;
      const optimalEvalChange = (bestMoveEval - evalBefore) * playerPerspective;
      const accuracy = evalChange - optimalEvalChange;

      // Classify the move
      const classification = this.classifyMove(
        accuracy,
        move,
        bestMove,
        this.config.getAllMovesFn(currentState, currentPlayer).length,
        i < 8 // First 8 moves considered opening
      );

      const analysis: MoveAnalysis = {
        moveNumber,
        move,
        player: currentPlayer,
        evaluation: evalAfter,
        previousEvaluation: evalBefore,
        evaluationChange: evalChange,
        classification,
      };

      // Add suggestion if move wasn't optimal
      if (bestMove && this.movesDiffer(move, bestMove) && accuracy < THRESHOLDS.INACCURACY) {
        analysis.suggestion = bestMove;
        analysis.comment = this.generateComment(classification, accuracy);
      }

      moveAnalyses.push(analysis);

      // Check for critical moments
      const evalSwing = Math.abs(evalAfter - previousEval);
      if (evalSwing > 150) {
        criticalMoments.push({
          moveNumber,
          description: this.describeCriticalMoment(classification, evalSwing, currentPlayer),
          evaluationSwing: evalSwing,
          type: this.getCriticalMomentType(classification, evalSwing),
        });
      }

      // Update for next iteration
      currentState = newState;
      previousEval = evalAfter;
      currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    }

    // Generate summary
    const summary = this.generateSummary(moveAnalyses);
    const suggestions = this.generateSuggestions(moveAnalyses, summary);

    return {
      moves: moveAnalyses,
      summary,
      criticalMoments,
      openingName,
      suggestions,
    };
  }

  /**
   * Finds the best move in a position
   */
  private findBestMove(state: GameState, color: PlayerColor): Move | null {
    const moves = this.config.getAllMovesFn(state, color);
    if (moves.length === 0) return null;

    let bestMove: Move | null = null;
    let bestScore = -Infinity;

    for (const move of moves) {
      const newState = this.config.applyMoveFn(state, move);
      const score = this.config.evaluateFn(newState, color);

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  /**
   * Classifies a move based on its quality
   */
  private classifyMove(
    accuracy: number,
    playedMove: Move,
    bestMove: Move | null,
    legalMoves: number,
    isOpening: boolean
  ): MoveClassification {
    // Forced move
    if (legalMoves === 1) {
      return 'forced';
    }

    // Opening book move
    if (isOpening && accuracy >= THRESHOLDS.INACCURACY) {
      return 'book';
    }

    // Classification based on accuracy
    if (accuracy >= THRESHOLDS.BRILLIANT) {
      return 'brilliant';
    }
    if (accuracy >= THRESHOLDS.GREAT) {
      return 'great';
    }
    if (accuracy >= 0) {
      return 'good';
    }
    if (accuracy >= THRESHOLDS.INACCURACY) {
      return 'inaccuracy';
    }
    if (accuracy >= THRESHOLDS.MISTAKE) {
      return 'mistake';
    }
    return 'blunder';
  }

  /**
   * Checks if two moves are different
   */
  private movesDiffer(move1: Move, move2: Move): boolean {
    return (
      move1.from.row !== move2.from.row ||
      move1.from.col !== move2.from.col ||
      move1.to.row !== move2.to.row ||
      move1.to.col !== move2.to.col
    );
  }

  /**
   * Generates a comment for a move
   */
  private generateComment(classification: MoveClassification, accuracy: number): string {
    switch (classification) {
      case 'blunder':
        return `Erreur grave ! Perte de ${Math.abs(Math.round(accuracy / 100))} points.`;
      case 'mistake':
        return `Erreur. Un meilleur coup était disponible.`;
      case 'inaccuracy':
        return `Légère imprécision.`;
      default:
        return '';
    }
  }

  /**
   * Describes a critical moment
   */
  private describeCriticalMoment(
    classification: MoveClassification,
    evalSwing: number,
    player: PlayerColor
  ): string {
    const playerName = player === 'white' ? 'Blancs' : 'Noirs';

    switch (classification) {
      case 'blunder':
        return `${playerName} commettent une erreur grave.`;
      case 'brilliant':
        return `Coup brillant des ${playerName} !`;
      case 'mistake':
        return `Erreur des ${playerName}.`;
      default:
        return `Changement significatif de l'évaluation.`;
    }
  }

  /**
   * Gets the type of critical moment
   */
  private getCriticalMomentType(
    classification: MoveClassification,
    evalSwing: number
  ): CriticalMoment['type'] {
    if (classification === 'blunder') return 'blunder';
    if (classification === 'brilliant') return 'brilliant';
    if (evalSwing > 300) return 'turning_point';
    return 'turning_point';
  }

  /**
   * Generates a summary of the game
   */
  private generateSummary(moves: MoveAnalysis[]): GameSummary {
    const whiteMoves = moves.filter(m => m.player === 'white');
    const blackMoves = moves.filter(m => m.player === 'black');

    const countByClassification = (
      moveList: MoveAnalysis[],
      classifications: MoveClassification[]
    ) => moveList.filter(m => classifications.includes(m.classification)).length;

    const calculateAccuracy = (moveList: MoveAnalysis[]): number => {
      if (moveList.length === 0) return 100;

      const goodMoves = moveList.filter(m =>
        ['brilliant', 'great', 'good', 'book', 'forced'].includes(m.classification)
      ).length;

      return Math.round((goodMoves / moveList.length) * 100);
    };

    return {
      totalMoves: moves.length,
      whiteAccuracy: calculateAccuracy(whiteMoves),
      blackAccuracy: calculateAccuracy(blackMoves),
      whiteMistakes: countByClassification(whiteMoves, ['mistake']),
      blackMistakes: countByClassification(blackMoves, ['mistake']),
      whiteBlunders: countByClassification(whiteMoves, ['blunder']),
      blackBlunders: countByClassification(blackMoves, ['blunder']),
      averageEvaluationWhite: whiteMoves.length > 0
        ? whiteMoves.reduce((sum, m) => sum + m.evaluation, 0) / whiteMoves.length
        : 0,
      averageEvaluationBlack: blackMoves.length > 0
        ? blackMoves.reduce((sum, m) => sum + m.evaluation, 0) / blackMoves.length
        : 0,
    };
  }

  /**
   * Generates improvement suggestions based on the analysis
   */
  private generateSuggestions(
    moves: MoveAnalysis[],
    summary: GameSummary
  ): string[] {
    const suggestions: string[] = [];

    // Blunder analysis
    if (summary.whiteBlunders > 0 || summary.blackBlunders > 0) {
      suggestions.push(
        `Évitez les erreurs graves en vérifiant les menaces adverses avant chaque coup.`
      );
    }

    // Accuracy suggestions
    if (summary.whiteAccuracy < 70 || summary.blackAccuracy < 70) {
      suggestions.push(
        `Prenez plus de temps pour évaluer toutes les options disponibles.`
      );
    }

    // Opening suggestions
    const openingMoves = moves.slice(0, 8);
    const openingMistakes = openingMoves.filter(m =>
      ['mistake', 'blunder', 'inaccuracy'].includes(m.classification)
    ).length;

    if (openingMistakes > 2) {
      suggestions.push(
        `Étudiez les ouvertures classiques pour améliorer votre début de partie.`
      );
    }

    // Tactical suggestions
    const missedCaptures = moves.filter(m =>
      m.suggestion?.capturedPieces &&
      m.suggestion.capturedPieces.length > (m.move.capturedPieces?.length || 0)
    ).length;

    if (missedCaptures > 2) {
      suggestions.push(
        `Travaillez vos tactiques : plusieurs opportunités de prise ont été manquées.`
      );
    }

    // Endgame suggestions
    const endgameMoves = moves.slice(-10);
    const endgameMistakes = endgameMoves.filter(m =>
      ['mistake', 'blunder'].includes(m.classification)
    ).length;

    if (endgameMistakes > 2) {
      suggestions.push(
        `Concentrez-vous sur les techniques de fin de partie.`
      );
    }

    // General encouragement
    if (suggestions.length === 0) {
      suggestions.push(
        `Excellente partie ! Continuez à pratiquer pour maintenir votre niveau.`
      );
    }

    return suggestions;
  }
}

/**
 * Classification icons for display
 */
export const CLASSIFICATION_ICONS: Record<MoveClassification, string> = {
  brilliant: '!!',
  great: '!',
  good: '',
  book: '📖',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
  forced: '□',
};

/**
 * Classification colors for display
 */
export const CLASSIFICATION_COLORS: Record<MoveClassification, string> = {
  brilliant: '#1abc9c',
  great: '#3498db',
  good: '#95a5a6',
  book: '#9b59b6',
  inaccuracy: '#f39c12',
  mistake: '#e74c3c',
  blunder: '#c0392b',
  forced: '#7f8c8d',
};

