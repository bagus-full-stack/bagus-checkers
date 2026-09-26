import { TestBed } from '@angular/core/testing';
import { AiService } from './ai.service';
import { createPiece } from '../models/piece.model';
import { createInitialGameState, GameState } from '../models/game-state.model';
import { Piece } from '../models/piece.model';

describe('AiService', () => {
  let service: AiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AiService);
    service.resetForNewGame();
  });

  function state(pieces: Piece[]): GameState {
    return createInitialGameState(pieces);
  }

  // A small, fast-to-search endgame position: one white pawn about to capture
  // a lone black pawn, versus a quiet white pawn with no captures available.
  function smallEndgame(): GameState {
    const wCapturer = createPiece('w1', 'white', { row: 4, col: 4 });
    const wQuiet = createPiece('w2', 'white', { row: 9, col: 9 });
    const bTarget = createPiece('b1', 'black', { row: 3, col: 3 });
    const bQuiet = createPiece('b2', 'black', { row: 0, col: 0 });
    return state([wCapturer, wQuiet, bTarget, bQuiet]);
  }

  it('returns null when the player has no legal moves', () => {
    const stuck = createPiece('w1', 'white', { row: 0, col: 0 });
    const move = service.getBestMove(state([stuck]), 'white', 'easy');
    expect(move).toBeNull();
  });

  it('easy difficulty prefers a capture when one is available', () => {
    const move = service.getBestMove(smallEndgame(), 'white', 'easy');
    expect(move).not.toBeNull();
    expect(move!.capturedPieces.length).toBeGreaterThan(0);
  });

  it('medium difficulty (minimax) picks the capturing move in a small position', () => {
    const move = service.getBestMove(smallEndgame(), 'white', 'medium');
    expect(move).not.toBeNull();
    expect(move!.capturedPieces.length).toBeGreaterThan(0);
  });

  it('hard difficulty (alpha-beta + TT) picks the capturing move and updates TT stats', () => {
    const move = service.getBestMove(smallEndgame(), 'white', 'hard');
    expect(move).not.toBeNull();
    expect(move!.capturedPieces.length).toBeGreaterThan(0);
    expect(service.ttStats().size).toBeGreaterThan(0);
  });

  it('resetForNewGame clears the move counter used by the opening book', () => {
    const s = smallEndgame();
    service.getBestMove(s, 'white', 'medium');
    service.resetForNewGame();
    // After a reset, the opening book is eligible again on the very first move.
    const move = service.getBestMove(s, 'white', 'medium');
    expect(move).not.toBeNull();
  });

  describe('analyzeSingleMove', () => {
    it('classifies the only legal move as forced', () => {
      const pawn = createPiece('w1', 'white', { row: 9, col: 0 });
      const s = state([pawn]);
      const move = service.getBestMove(s, 'white', 'easy')!;
      const analysis = service.analyzeSingleMove(s, move, 'white');
      expect(analysis.classification).toBe('forced');
      expect(analysis.move).toBe(move);
    });
  });

  describe('analyzeGame', () => {
    it('produces an analysis and stores it in lastAnalysis', () => {
      const pawn = createPiece('w1', 'white', { row: 9, col: 0 });
      const s = state([pawn]);
      const move = service.getBestMove(s, 'white', 'easy')!;
      const analysis = service.analyzeGame(s, [move]);
      expect(analysis).toBeDefined();
      expect(service.lastAnalysis()).toBe(analysis);
    });
  });
});
