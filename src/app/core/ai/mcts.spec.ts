import { MCTS } from './mcts';
import { GameState, Move, PlayerColor } from '../models';
import { createPiece } from '../models/piece.model';
import { createMove } from '../models/move.model';

/**
 * A trivial "game": each state just tracks a numeric score. Moving adds a
 * fixed delta and ends the game once `stepsLeft` hits zero, letting MCTS run
 * a real (but tiny) search without needing full checkers rules.
 */
interface ToyState extends GameState {
  score: number;
  stepsLeft: number;
}

function toyState(score = 0, stepsLeft = 2): ToyState {
  return {
    // isTerminal() short-circuits on an empty board, so give it one piece per
    // side to keep the toy game "alive" until stepsLeft runs out.
    pieces: [createPiece('w0', 'white', { row: 9, col: 0 }), createPiece('b0', 'black', { row: 0, col: 1 })],
    currentPlayer: 'white',
    status: 'playing',
    moveHistory: [],
    validMoves: [],
    mustCapture: false,
    score,
    stepsLeft,
  };
}

function toyMove(delta: number, id: string): Move {
  const piece = createPiece(id, 'white', { row: 0, col: 0 });
  return { ...createMove(piece, { row: 1, col: 1 }), delta } as Move & { delta: number };
}

function getAllMoves(state: GameState, _color: PlayerColor): Move[] {
  const s = state as ToyState;
  if (s.stepsLeft <= 0) return [];
  return [toyMove(1, 'gain'), toyMove(-1, 'loss')];
}

function applyMove(state: GameState, move: Move): GameState {
  const s = state as ToyState;
  const delta = (move as Move & { delta: number }).delta;
  const next: ToyState = { ...s, score: s.score + delta, stepsLeft: s.stepsLeft - 1 };
  return next;
}

function evaluate(state: GameState, _color: PlayerColor): number {
  return (state as ToyState).score;
}

describe('MCTS', () => {
  it('returns null when there are no legal moves', () => {
    const mcts = new MCTS(getAllMoves, applyMove, evaluate, { maxIterations: 10, timeLimit: 50 });
    const move = mcts.findBestMove(toyState(0, 0), 'white');
    expect(move).toBeNull();
  });

  it('returns the only move immediately without searching', () => {
    const single = () => [toyMove(1, 'only')];
    const mcts = new MCTS(single, applyMove, evaluate, { maxIterations: 10, timeLimit: 50 });
    const move = mcts.findBestMove(toyState(), 'white');
    expect(move).not.toBeNull();
  });

  it('runs a full search and returns one of the legal root moves', () => {
    const mcts = new MCTS(getAllMoves, applyMove, evaluate, {
      maxIterations: 200,
      timeLimit: 500,
      maxSimulationDepth: 5,
    });
    const move = mcts.findBestMove(toyState(0, 3), 'white');
    expect(move).not.toBeNull();
    expect([1, -1]).toContain((move as Move & { delta: number }).delta);
  });
});
