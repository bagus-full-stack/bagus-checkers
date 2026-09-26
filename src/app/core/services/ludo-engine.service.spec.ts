import { TestBed } from '@angular/core/testing';
import { LudoEngineService } from './ludo-engine.service';
import { createPiece } from '../models/piece.model';
import {
  LudoGameState,
  LUDO_BASES,
  LUDO_TOTAL_STEPS,
  ludoPositionForSteps,
} from '../models/ludo.model';

function mockRandomForRoll(roll: number) {
  // rollDice() computes Math.floor(random() * 6) + 1
  vi.spyOn(Math, 'random').mockReturnValue((roll - 1) / 6);
}

function onTrack(id: string, color: 'red' | 'green' | 'yellow' | 'blue', steps: number) {
  return { ...createPiece(id, color, ludoPositionForSteps(color, steps), 'token'), trackIndex: steps };
}

describe('LudoEngineService', () => {
  let service: LudoEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LudoEngineService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('startNewGame places 4 pieces per player, all in base', () => {
    service.startNewGame();
    expect(service.pieces()).toHaveLength(16);
    expect(service.pieces().every((p) => p.trackIndex === undefined)).toBe(true);
    expect(service.currentPlayer()).toBe('red');
    expect(service.phase()).toBe('rolling');
  });

  it('startNewGame supports a custom subset of players', () => {
    service.startNewGame(['red', 'yellow']);
    expect(service.pieces()).toHaveLength(8);
    expect(service.pieces().every((p) => p.color === 'red' || p.color === 'yellow')).toBe(true);
  });

  it('board() places each piece at its board position', () => {
    service.startNewGame(['red']);
    const board = service.board();
    const piece = service.pieces()[0];
    expect(board[piece.position.row][piece.position.col]?.id).toBe(piece.id);
  });

  describe('rollDice', () => {
    it('rolling a non-six with no legal moves passes the turn immediately', () => {
      const stuck = onTrack('red-0', 'red', LUDO_TOTAL_STEPS - 2);
      const state: LudoGameState = {
        pieces: [stuck],
        currentPlayer: 'red',
        status: 'playing',
        moveHistory: [],
        phase: 'rolling',
        consecutiveSixes: 0,
        players: ['red', 'green'],
      };
      service.syncState(state);
      mockRandomForRoll(3); // newSteps would exceed LUDO_TOTAL_STEPS - no exact finish

      const roll = service.rollDice();

      expect(roll).toBe(3);
      expect(service.currentPlayer()).toBe('green');
      expect(service.phase()).toBe('rolling');
      expect(service.diceRoll()).toBeUndefined();
    });

    it('rolling a six with a piece in base offers an exit move', () => {
      service.startNewGame(['red', 'green']);
      mockRandomForRoll(6);

      const roll = service.rollDice();

      expect(roll).toBe(6);
      expect(service.phase()).toBe('moving');
      expect(service.movableOptions()).toHaveLength(4); // all 4 red pieces can exit base
    });

    it('rolling a non-six with all pieces in base offers no moves and passes the turn', () => {
      service.startNewGame(['red', 'green']);
      mockRandomForRoll(3);

      service.rollDice();

      expect(service.currentPlayer()).toBe('green');
      expect(service.phase()).toBe('rolling');
    });
  });

  describe('moveTo', () => {
    it('moves a piece out of base on a six and switches turn (no capture)', () => {
      service.startNewGame(['red', 'green']);
      mockRandomForRoll(6);
      service.rollDice();

      const piece = service.movableOptions()[0].piece;
      const destination = ludoPositionForSteps('red', 0);
      const moved = service.moveTo(piece, destination);

      expect(moved).toBe(true);
      const updated = service.gameState()!.pieces.find((p) => p.id === piece.id)!;
      expect(updated.trackIndex).toBe(0);
      expect(updated.position).toEqual(destination);
      // Rolled a six, so red plays again instead of passing to green.
      expect(service.currentPlayer()).toBe('red');
      expect(service.phase()).toBe('rolling');
    });

    it('returns false for a destination that is not a legal option', () => {
      service.startNewGame(['red', 'green']);
      mockRandomForRoll(3); // no moves available -> turn already passed to green
      service.rollDice();

      const piece = service.pieces()[0];
      expect(service.moveTo(piece, { row: 0, col: 0 })).toBe(false);
    });

    it('captures an opponent piece on a non-safe square and sends it back to base', () => {
      const redPiece = onTrack('red-0', 'red', 3);
      const targetPos = ludoPositionForSteps('red', 5); // global index 5, not a safe start square
      const greenPiece = { ...onTrack('green-0', 'green', 5), position: targetPos };

      service.syncState({
        pieces: [redPiece, greenPiece],
        currentPlayer: 'red',
        status: 'playing',
        moveHistory: [],
        phase: 'rolling',
        consecutiveSixes: 0,
        players: ['red', 'green'],
      });
      mockRandomForRoll(2);
      service.rollDice();

      const moved = service.moveTo(redPiece, targetPos);

      expect(moved).toBe(true);
      const finalState = service.gameState()!;
      const capturedGreen = finalState.pieces.find((p) => p.id === 'green-0')!;
      expect(capturedGreen.trackIndex).toBeUndefined();
      expect(LUDO_BASES['green']).toContainEqual(capturedGreen.position);
    });

    it('does not capture an opponent occupying a safe (start) square', () => {
      const redPiece = onTrack('red-0', 'red', 12);
      const targetPos = ludoPositionForSteps('red', 14); // global index 14 = green's start square, safe
      const greenPiece = { ...onTrack('green-0', 'green', 0), position: targetPos };

      service.syncState({
        pieces: [redPiece, greenPiece],
        currentPlayer: 'red',
        status: 'playing',
        moveHistory: [],
        phase: 'rolling',
        consecutiveSixes: 0,
        players: ['red', 'green'],
      });
      mockRandomForRoll(2);
      service.rollDice();

      service.moveTo(redPiece, targetPos);

      const finalState = service.gameState()!;
      const green = finalState.pieces.find((p) => p.id === 'green-0')!;
      expect(green.trackIndex).toBe(0); // untouched, still on the track
    });

    it('finishing all of a color pieces wins the game', () => {
      const finished = (n: number) => onTrack(`red-${n}`, 'red', LUDO_TOTAL_STEPS);
      const lastPiece = onTrack('red-3', 'red', LUDO_TOTAL_STEPS - 1);

      service.syncState({
        pieces: [finished(0), finished(1), finished(2), lastPiece],
        currentPlayer: 'red',
        status: 'playing',
        moveHistory: [],
        phase: 'rolling',
        consecutiveSixes: 0,
        players: ['red', 'green'],
      });
      mockRandomForRoll(1);
      service.rollDice();

      const destination = ludoPositionForSteps('red', LUDO_TOTAL_STEPS);
      const moved = service.moveTo(lastPiece, destination);

      expect(moved).toBe(true);
      expect(service.status()).toBe('finished');
      expect(service.result()).toEqual({ winner: 'red', reason: 'all-pieces-home' });
    });

    it('three consecutive sixes forfeits the turn after the third move', () => {
      const redPiece = onTrack('red-0', 'red', 0);
      const greenPiece = onTrack('green-0', 'green', 0);

      service.syncState({
        pieces: [redPiece, greenPiece],
        currentPlayer: 'red',
        status: 'playing',
        moveHistory: [],
        phase: 'rolling',
        consecutiveSixes: 0,
        players: ['red', 'green'],
      });

      for (let i = 0; i < 3; i++) {
        mockRandomForRoll(6);
        service.rollDice();
        const piece = service.gameState()!.pieces.find((p) => p.color === 'red')!;
        const steps = (piece.trackIndex ?? 0) + 6;
        service.moveTo(piece, ludoPositionForSteps('red', steps));
      }

      expect(service.currentPlayer()).toBe('green');
      expect(service.gameState()!.consecutiveSixes).toBe(0);
    });
  });
});
