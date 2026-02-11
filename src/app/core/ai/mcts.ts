/**
 * Monte Carlo Tree Search (MCTS) Algorithm for Checkers AI
 * Provides strong play through simulation-based search
 */

import { GameState, Move, PlayerColor, Piece } from '../models';

interface MCTSNode {
  state: GameState;
  move: Move | null; // The move that led to this state
  parent: MCTSNode | null;
  children: MCTSNode[];
  visits: number;
  wins: number;
  untriedMoves: Move[];
  playerJustMoved: PlayerColor;
}

export interface MCTSConfig {
  maxIterations: number;
  explorationConstant: number; // UCB1 exploration parameter (typically sqrt(2))
  maxSimulationDepth: number;
  timeLimit: number; // Maximum time in milliseconds
}

const DEFAULT_CONFIG: MCTSConfig = {
  maxIterations: 10000,
  explorationConstant: 1.414,
  maxSimulationDepth: 100,
  timeLimit: 3000, // 3 seconds
};

/**
 * Monte Carlo Tree Search implementation
 */
export class MCTS {
  private config: MCTSConfig;
  private getAllMovesFn: (state: GameState, color: PlayerColor) => Move[];
  private applyMoveFn: (state: GameState, move: Move) => GameState;
  private evaluateFn: (state: GameState, color: PlayerColor) => number;

  constructor(
    getAllMoves: (state: GameState, color: PlayerColor) => Move[],
    applyMove: (state: GameState, move: Move) => GameState,
    evaluate: (state: GameState, color: PlayerColor) => number,
    config: Partial<MCTSConfig> = {}
  ) {
    this.getAllMovesFn = getAllMoves;
    this.applyMoveFn = applyMove;
    this.evaluateFn = evaluate;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Finds the best move using MCTS
   */
  findBestMove(state: GameState, color: PlayerColor): Move | null {
    const rootMoves = this.getAllMovesFn(state, color);
    if (rootMoves.length === 0) return null;
    if (rootMoves.length === 1) return rootMoves[0];

    const root = this.createNode(state, null, null, this.oppositeColor(color));
    root.untriedMoves = [...rootMoves];

    const startTime = Date.now();
    let iterations = 0;

    while (
      iterations < this.config.maxIterations &&
      Date.now() - startTime < this.config.timeLimit
    ) {
      // 1. Selection: traverse tree to find node to expand
      let node = this.select(root);

      // 2. Expansion: add a child node if possible
      if (node.untriedMoves.length > 0 && !this.isTerminal(node.state)) {
        node = this.expand(node);
      }

      // 3. Simulation: play out randomly from this position
      const result = this.simulate(node.state, node.playerJustMoved);

      // 4. Backpropagation: update statistics up the tree
      this.backpropagate(node, result, color);

      iterations++;
    }

    // Select best child (most visits)
    return this.selectBestChild(root, 0)?.move ?? rootMoves[0];
  }

  /**
   * Creates a new MCTS node
   */
  private createNode(
    state: GameState,
    move: Move | null,
    parent: MCTSNode | null,
    playerJustMoved: PlayerColor
  ): MCTSNode {
    const currentPlayer = this.oppositeColor(playerJustMoved);
    return {
      state,
      move,
      parent,
      children: [],
      visits: 0,
      wins: 0,
      untriedMoves: this.getAllMovesFn(state, currentPlayer),
      playerJustMoved,
    };
  }

  /**
   * Selection phase: traverse tree using UCB1
   */
  private select(node: MCTSNode): MCTSNode {
    while (node.untriedMoves.length === 0 && node.children.length > 0) {
      node = this.selectBestChild(node, this.config.explorationConstant)!;
    }
    return node;
  }

  /**
   * Expansion phase: add a new child node
   */
  private expand(node: MCTSNode): MCTSNode {
    const moveIndex = Math.floor(Math.random() * node.untriedMoves.length);
    const move = node.untriedMoves.splice(moveIndex, 1)[0];

    const newState = this.applyMoveFn(node.state, move);
    const currentPlayer = this.oppositeColor(node.playerJustMoved);

    const child = this.createNode(newState, move, node, currentPlayer);
    node.children.push(child);

    return child;
  }

  /**
   * Simulation phase: random playout
   */
  private simulate(state: GameState, playerJustMoved: PlayerColor): number {
    let currentState = state;
    let currentPlayer = this.oppositeColor(playerJustMoved);
    let depth = 0;

    while (depth < this.config.maxSimulationDepth) {
      const moves = this.getAllMovesFn(currentState, currentPlayer);

      if (moves.length === 0) {
        // Current player can't move, they lose
        return currentPlayer === playerJustMoved ? -1 : 1;
      }

      // Check for win by capturing all pieces
      const opponent = this.oppositeColor(currentPlayer);
      const opponentPieces = currentState.pieces.filter(p => p.color === opponent);
      if (opponentPieces.length === 0) {
        return currentPlayer === playerJustMoved ? 1 : -1;
      }

      // Smart random: prefer captures
      const captures = moves.filter(m => m.capturedPieces.length > 0);
      const movePool = captures.length > 0 ? captures : moves;

      const move = movePool[Math.floor(Math.random() * movePool.length)];
      currentState = this.applyMoveFn(currentState, move);
      currentPlayer = this.oppositeColor(currentPlayer);
      depth++;
    }

    // If we hit max depth, use evaluation function
    const score = this.evaluateFn(currentState, playerJustMoved);
    return score > 0 ? 1 : score < 0 ? -1 : 0;
  }

  /**
   * Backpropagation phase: update node statistics
   */
  private backpropagate(
    node: MCTSNode | null,
    result: number,
    rootColor: PlayerColor
  ): void {
    while (node !== null) {
      node.visits++;
      // Win from the perspective of the player who just moved
      if (node.playerJustMoved === rootColor) {
        node.wins += result > 0 ? 1 : result < 0 ? 0 : 0.5;
      } else {
        node.wins += result < 0 ? 1 : result > 0 ? 0 : 0.5;
      }
      node = node.parent;
    }
  }

  /**
   * Selects the best child using UCB1 formula
   */
  private selectBestChild(
    node: MCTSNode,
    explorationWeight: number
  ): MCTSNode | null {
    if (node.children.length === 0) return null;

    let bestScore = -Infinity;
    let bestChild: MCTSNode | null = null;

    for (const child of node.children) {
      // UCB1 formula
      const exploitation = child.wins / (child.visits + 1e-10);
      const exploration =
        explorationWeight *
        Math.sqrt(Math.log(node.visits + 1) / (child.visits + 1e-10));
      const score = exploitation + exploration;

      if (score > bestScore) {
        bestScore = score;
        bestChild = child;
      }
    }

    return bestChild;
  }

  /**
   * Checks if the game state is terminal
   */
  private isTerminal(state: GameState): boolean {
    const whitePieces = state.pieces.filter(p => p.color === 'white');
    const blackPieces = state.pieces.filter(p => p.color === 'black');

    if (whitePieces.length === 0 || blackPieces.length === 0) {
      return true;
    }

    const whiteMoves = this.getAllMovesFn(state, 'white');
    const blackMoves = this.getAllMovesFn(state, 'black');

    return whiteMoves.length === 0 || blackMoves.length === 0;
  }

  /**
   * Gets the opposite color
   */
  private oppositeColor(color: PlayerColor): PlayerColor {
    return color === 'white' ? 'black' : 'white';
  }

  /**
   * Gets statistics about the last search
   */
  getSearchStats(root: MCTSNode): {
    totalVisits: number;
    bestMove: Move | null;
    confidence: number;
  } {
    const bestChild = this.selectBestChild(root, 0);
    return {
      totalVisits: root.visits,
      bestMove: bestChild?.move ?? null,
      confidence: bestChild ? bestChild.visits / root.visits : 0,
    };
  }
}

