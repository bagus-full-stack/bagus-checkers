import { GameAnalyzer, MoveClassification } from './game-analyzer';
import { GameState, Move, PlayerColor } from '../models';
import { createPiece } from '../models/piece.model';
import { createMove } from '../models/move.model';

interface ScoredState extends GameState {
  value: number;
}

function initialState(): ScoredState {
  return {
    pieces: [],
    currentPlayer: 'white',
    status: 'playing',
    moveHistory: [],
    validMoves: [],
    mustCapture: false,
    value: 0,
  };
}

function move(delta: number, id: string): Move {
  const piece = createPiece(id, 'white', { row: 0, col: 0 });
  return { ...createMove(piece, { row: 1, col: 1 }), delta } as Move & { delta: number };
}

/** Two candidates so legalMoves > 1 (avoids the "forced" classification); the best always has delta 0. */
const BEST_CANDIDATES = [move(0, 'best'), move(-1000, 'far-worse')];

function makeAnalyzer(getAllMovesFn = (_s: GameState, _c: PlayerColor) => BEST_CANDIDATES) {
  return new GameAnalyzer({
    depth: 1,
    includeAlternatives: false,
    evaluateFn: (s) => (s as ScoredState).value,
    getAllMovesFn,
    applyMoveFn: (s, m): GameState => {
      const next: ScoredState = { ...(s as ScoredState), value: (s as ScoredState).value + (m as Move & { delta: number }).delta };
      return next;
    },
  });
}

/** Builds a played-move sequence: 8 neutral opening moves, then one move with the given delta. */
function sequenceEndingWith(delta: number): Move[] {
  const moves: Move[] = [];
  for (let i = 0; i < 8; i++) moves.push(move(0, `opening-${i}`));
  moves.push(move(delta, 'tested'));
  return moves;
}

describe('GameAnalyzer', () => {
  it('classifies the only legal move as forced, regardless of its evaluation', () => {
    const analyzer = makeAnalyzer(() => [move(-500, 'only')]);
    const result = analyzer.analyzeGame(initialState(), [move(-500, 'only')]);
    expect(result.moves[0].classification).toBe('forced');
  });

  it('classifies a neutral opening move as book', () => {
    const analyzer = makeAnalyzer();
    const result = analyzer.analyzeGame(initialState(), [move(0, 'opening')]);
    expect(result.moves[0].classification).toBe('book');
  });

  const cases: [number, MoveClassification][] = [
    [250, 'brilliant'],
    [150, 'great'],
    [50, 'good'],
    [-10, 'inaccuracy'],
    [-50, 'mistake'],
    [-150, 'blunder'],
  ];

  it.each(cases)('classifies a post-opening move with accuracy %i as %s', (delta, expected) => {
    const analyzer = makeAnalyzer();
    const result = analyzer.analyzeGame(initialState(), sequenceEndingWith(delta));
    expect(result.moves[8].classification).toBe(expected);
  });

  it('summarizes accuracy and mistake/blunder counts per color', () => {
    const analyzer = makeAnalyzer();
    // Evaluation is always from white's perspective, so a move that pushes the
    // score *up* is what counts as a blunder for black.
    const moves = [move(50, 'w1'), move(150, 'b1')]; // white good, black blunder
    const result = analyzer.analyzeGame(initialState(), moves);
    expect(result.summary.totalMoves).toBe(2);
    expect(result.summary.blackBlunders).toBe(1);
    expect(result.summary.whiteBlunders).toBe(0);
  });

  it('passes the opening name through unchanged', () => {
    const analyzer = makeAnalyzer();
    const result = analyzer.analyzeGame(initialState(), [move(0, 'm')], 'Roozenburg');
    expect(result.openingName).toBe('Roozenburg');
  });

  it('always returns at least one suggestion', () => {
    const analyzer = makeAnalyzer();
    const result = analyzer.analyzeGame(initialState(), [move(0, 'm')]);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});
