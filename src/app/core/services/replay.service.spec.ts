import { TestBed } from '@angular/core/testing';
import { ReplayService } from './replay.service';
import { SupabaseService } from './supabase.service';
import { SavedGame } from '../models/replay.model';
import { createPiece } from '../models/piece.model';
import { createMove, createCaptureMove } from '../models/move.model';

// SupabaseService creates a real client and hits the network from its
// constructor when running in a browser context - always mock it here.
function mockSupabaseService() {
  return {
    isAuthenticated: () => false,
    currentUser: () => null,
    getUserGameHistory: vi.fn(),
    getGameById: vi.fn(),
  };
}

function fixtureGame(): SavedGame {
  const w1 = createPiece('w1', 'white', { row: 9, col: 0 });
  const b1 = createPiece('b1', 'black', { row: 0, col: 1 });
  return {
    metadata: {
      id: 'game-1',
      date: new Date().toISOString(),
      whitePlayer: 'Alice',
      blackPlayer: 'Bob',
      winner: 'white',
      reason: 'no-moves',
      variant: 'international',
      totalMoves: 2,
      duration: 42,
    },
    moves: [createMove(w1, { row: 8, col: 1 }), createCaptureMove(b1, { row: 6, col: 3 }, [w1])],
    materialHistory: [],
  };
}

describe('ReplayService', () => {
  let service: ReplayService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: mockSupabaseService() }],
    });
    service = TestBed.inject(ReplayService);
  });

  it('starts with no active replay', () => {
    expect(service.isReplaying()).toBe(false);
    expect(service.currentMoveIndex()).toBe(-1);
  });

  describe('replay navigation', () => {
    it('startReplay initializes state at index -1, not playing, default speed', () => {
      service.startReplay(fixtureGame());
      expect(service.isReplaying()).toBe(true);
      expect(service.currentMoveIndex()).toBe(-1);
      expect(service.isAutoPlaying()).toBe(false);
      expect(service.replayState()?.playbackSpeed).toBe(1);
    });

    it('nextMove advances the index and returns true while moves remain', () => {
      service.startReplay(fixtureGame());
      expect(service.nextMove()).toBe(true);
      expect(service.currentMoveIndex()).toBe(0);
      expect(service.nextMove()).toBe(true);
      expect(service.currentMoveIndex()).toBe(1);
    });

    it('nextMove returns false once past the last move', () => {
      service.startReplay(fixtureGame());
      service.nextMove();
      service.nextMove();
      expect(service.nextMove()).toBe(false);
      expect(service.currentMoveIndex()).toBe(1);
    });

    it('previousMove decrements the index and returns false below -1', () => {
      service.startReplay(fixtureGame());
      service.nextMove();
      expect(service.previousMove()).toBe(true);
      expect(service.currentMoveIndex()).toBe(-1);
      expect(service.previousMove()).toBe(false);
    });

    it('goToMove clamps to the valid move range', () => {
      service.startReplay(fixtureGame());
      service.goToMove(100);
      expect(service.currentMoveIndex()).toBe(1); // clamped to moves.length - 1
      service.goToMove(-100);
      expect(service.currentMoveIndex()).toBe(-1);
    });

    it('toggleAutoPlay flips isPlaying', () => {
      service.startReplay(fixtureGame());
      service.toggleAutoPlay();
      expect(service.isAutoPlaying()).toBe(true);
      service.toggleAutoPlay();
      expect(service.isAutoPlaying()).toBe(false);
    });

    it('setPlaybackSpeed updates the stored speed', () => {
      service.startReplay(fixtureGame());
      service.setPlaybackSpeed(4);
      expect(service.replayState()?.playbackSpeed).toBe(4);
    });

    it('navigation is a no-op when no replay is active', () => {
      expect(service.nextMove()).toBe(false);
      expect(service.previousMove()).toBe(false);
      service.goToMove(5); // should not throw
      service.toggleAutoPlay();
      service.setPlaybackSpeed(2);
      expect(service.isReplaying()).toBe(false);
    });

    it('stopReplay clears the current game and replay state', () => {
      service.startReplay(fixtureGame());
      service.stopReplay();
      expect(service.isReplaying()).toBe(false);
      expect(service.currentGame()).toBeNull();
    });
  });

  describe('calculateStatistics', () => {
    it('aggregates move/capture counts from a saved game', () => {
      const stats = service.calculateStatistics(fixtureGame());
      expect(stats.totalMoves).toBe(2);
      expect(stats.whiteMoves).toBe(1);
      expect(stats.blackMoves).toBe(1);
      expect(stats.blackCaptures).toBe(1);
      expect(stats.longestCaptureChain).toBe(1);
    });
  });

  describe('saveGame', () => {
    it('resolves with a generated game id', async () => {
      const id = await service.saveGame([], [], 'Alice', 'Bob', 'white', 'no-moves', 'international', 10);
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe('import/export round trip', () => {
    it('importGame accepts a previously exported game and returns its id', () => {
      const game = fixtureGame();
      const json = JSON.stringify(game);
      const id = service.importGame(json);
      expect(id).toBe(game.metadata.id);
    });

    it('importGame returns null for malformed JSON', () => {
      expect(service.importGame('not json')).toBeNull();
    });

    it('importGame returns null when required fields are missing', () => {
      expect(service.importGame(JSON.stringify({ foo: 'bar' }))).toBeNull();
    });
  });
});
