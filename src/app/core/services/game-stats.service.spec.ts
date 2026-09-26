import { TestBed } from '@angular/core/testing';
import { GameStatsService } from './game-stats.service';
import { createPiece } from '../models/piece.model';
import { createInitialGameState } from '../models/game-state.model';
import { createMove, createCaptureMove } from '../models/move.model';

describe('GameStatsService', () => {
  let service: GameStatsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GameStatsService);
  });

  function whitePawn(id: string) {
    return createPiece(id, 'white', { row: 9, col: 0 });
  }
  function blackPawn(id: string) {
    return createPiece(id, 'black', { row: 0, col: 1 });
  }
  function king(id: string, color: 'white' | 'black') {
    return createPiece(id, color, { row: 0, col: 0 }, 'king');
  }

  it('initialize records an initial material snapshot reflecting piece counts', () => {
    const state = createInitialGameState([whitePawn('w1'), whitePawn('w2'), blackPawn('b1')]);
    service.initialize(state);

    expect(service.materialHistory()).toHaveLength(1);
    expect(service.currentMaterial()).toEqual({
      moveNumber: 0,
      whitePawns: 2,
      whiteKings: 0,
      blackPawns: 1,
      blackKings: 0,
      advantage: 1,
    });
    expect(service.materialAdvantage()).toBe(1);
  });

  it('weighs kings at 3x the value of pawns in the advantage calculation', () => {
    const state = createInitialGameState([king('w1', 'white'), blackPawn('b1'), blackPawn('b2'), blackPawn('b3')]);
    service.initialize(state);
    expect(service.materialAdvantage()).toBe(0); // 1 king (3) vs 3 pawns (3)
  });

  it('recordMove appends a new snapshot with an incrementing move number', () => {
    const state = createInitialGameState([whitePawn('w1'), blackPawn('b1')]);
    service.initialize(state);

    const move = createMove(state.pieces[0], { row: 8, col: 1 });
    const nextState = createInitialGameState([whitePawn('w1'), blackPawn('b1')]);
    service.recordMove(nextState, move);

    expect(service.materialHistory()).toHaveLength(2);
    expect(service.materialHistory()[1].moveNumber).toBe(1);
  });

  it('currentMaterial is null before initialize is called', () => {
    expect(service.currentMaterial()).toBeNull();
    expect(service.materialAdvantage()).toBe(0);
  });

  describe('getStatistics', () => {
    it('aggregates captures, promotions, and the longest capture chain per color', () => {
      const w1 = whitePawn('w1');
      const b1 = blackPawn('b1');

      const simpleWhiteMove = createMove(w1, { row: 8, col: 1 });
      const doubleCaptureBlack = createCaptureMove(b1, { row: 4, col: 3 }, [w1, w1]);
      const promotingWhiteMove = createMove(w1, { row: 0, col: 1 }, true);

      const stats = service.getStatistics([simpleWhiteMove, doubleCaptureBlack, promotingWhiteMove]);

      expect(stats.totalMoves).toBe(3);
      expect(stats.whiteMoves).toBe(2);
      expect(stats.blackMoves).toBe(1);
      expect(stats.blackCaptures).toBe(2);
      expect(stats.whiteKingsPromoted).toBe(1);
      expect(stats.blackKingsPromoted).toBe(0);
      expect(stats.longestCaptureChain).toBe(2);
    });

    it('returns zeroed duration/averageMoveTime when there are no moves', () => {
      const stats = service.getStatistics([]);
      expect(stats.totalMoves).toBe(0);
      expect(stats.duration).toBe(0);
      expect(stats.averageMoveTime).toBe(0);
    });
  });

  it('reset clears material history and duration tracking', () => {
    service.initialize(createInitialGameState([whitePawn('w1')]));
    service.reset();
    expect(service.materialHistory()).toEqual([]);
    expect(service.currentMaterial()).toBeNull();
    expect(service.gameDuration()).toBe(0);
  });
});
