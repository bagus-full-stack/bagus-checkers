import { TestBed } from '@angular/core/testing';
import { MoveValidatorService } from './move-validator.service';
import { GameVariantService } from './game-variant.service';
import { createPiece } from '../models/piece.model';
import { createInitialGameState } from '../models/game-state.model';
import { Piece } from '../models/piece.model';
import { GameState } from '../models/game-state.model';
import { positionsEqual } from '../models/position.model';

describe('MoveValidatorService', () => {
  let validator: MoveValidatorService;
  let variantService: GameVariantService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    validator = TestBed.inject(MoveValidatorService);
    variantService = TestBed.inject(GameVariantService);
  });

  function state(pieces: Piece[]): GameState {
    return createInitialGameState(pieces);
  }

  describe('simple pawn moves (international, 10x10)', () => {
    it('offers only the diagonal moves that stay on the board', () => {
      const pawn = createPiece('w1', 'white', { row: 9, col: 0 });
      const moves = validator.getValidMoves(pawn, state([pawn]));
      expect(moves).toHaveLength(1);
      expect(moves[0].to).toEqual({ row: 8, col: 1 });
    });

    it('does not offer a move onto an occupied square', () => {
      const pawn = createPiece('w1', 'white', { row: 9, col: 0 });
      const blocker = createPiece('w2', 'white', { row: 8, col: 1 });
      expect(validator.getValidMoves(pawn, state([pawn, blocker]))).toEqual([]);
    });

    it('black pawns move toward increasing rows', () => {
      const pawn = createPiece('b1', 'black', { row: 0, col: 1 });
      const moves = validator.getValidMoves(pawn, state([pawn]));
      expect(moves.map((m) => m.to)).toEqual(
        expect.arrayContaining([{ row: 1, col: 0 }, { row: 1, col: 2 }])
      );
    });
  });

  describe('king moves', () => {
    it('a flying king can move any distance along a clear diagonal', () => {
      const king = createPiece('w1', 'white', { row: 5, col: 5 }, 'king');
      const moves = validator.getValidMoves(king, state([king]));
      expect(moves).toHaveLength(17); // 5 + 4 + 4 + 4, bounded by the 10x10 edges
    });

    it('a flying king stops at the first piece encountered', () => {
      const king = createPiece('w1', 'white', { row: 5, col: 5 }, 'king');
      const blocker = createPiece('w2', 'white', { row: 3, col: 3 }, 'king');
      const moves = validator.getValidMoves(king, state([king, blocker]));
      expect(moves.map((m) => m.to)).not.toContainEqual({ row: 2, col: 2 });
      expect(moves.map((m) => m.to)).toContainEqual({ row: 4, col: 4 });
    });

    it('a non-flying king (English draughts) only moves one square', () => {
      variantService.setVariant('english');
      const king = createPiece('w1', 'white', { row: 4, col: 4 }, 'king');
      const moves = validator.getValidMoves(king, state([king]));
      expect(moves).toHaveLength(4);
      for (const move of moves) {
        expect(Math.abs(move.to.row - 4)).toBe(1);
        expect(Math.abs(move.to.col - 4)).toBe(1);
      }
    });
  });

  describe('mustCapture / mandatory capture', () => {
    it('is false when no piece can capture', () => {
      const pawn = createPiece('w1', 'white', { row: 9, col: 0 });
      expect(validator.mustCapture('white', state([pawn]))).toBe(false);
    });

    it('is true when a capture is available', () => {
      const pawn = createPiece('w1', 'white', { row: 9, col: 0 });
      const enemy = createPiece('b1', 'black', { row: 8, col: 1 });
      expect(validator.mustCapture('white', state([pawn, enemy]))).toBe(true);
    });

    it('returns the capture move instead of simple moves when a capture is available', () => {
      const pawn = createPiece('w1', 'white', { row: 9, col: 0 });
      const enemy = createPiece('b1', 'black', { row: 8, col: 1 });
      const moves = validator.getValidMoves(pawn, state([pawn, enemy]));
      expect(moves).toHaveLength(1);
      expect(moves[0].to).toEqual({ row: 7, col: 2 });
      expect(moves[0].capturedPieces).toEqual([enemy]);
    });

    it('forbids a non-capturing piece from moving when another piece of the same color must capture', () => {
      const capturer = createPiece('w1', 'white', { row: 9, col: 0 });
      const enemy = createPiece('b1', 'black', { row: 8, col: 1 });
      const bystander = createPiece('w2', 'white', { row: 9, col: 8 });
      const s = state([capturer, enemy, bystander]);
      expect(validator.getValidMoves(bystander, s)).toEqual([]);
    });

    it('with mandatory max capture, a piece with a shorter capture chain is excluded once a longer one exists', () => {
      // w1 can only make a single capture; w2 can chain two captures.
      const w1 = createPiece('w1', 'white', { row: 9, col: 8 });
      const shortEnemy = createPiece('b1', 'black', { row: 8, col: 7 });

      const w2 = createPiece('w2', 'white', { row: 9, col: 0 });
      const enemyA = createPiece('b2', 'black', { row: 8, col: 1 });
      const enemyB = createPiece('b3', 'black', { row: 6, col: 3 });

      const s = state([w1, shortEnemy, w2, enemyA, enemyB]);
      expect(validator.getValidMoves(w1, s)).toEqual([]);
      const w2Moves = validator.getValidMoves(w2, s);
      expect(w2Moves).toHaveLength(1);
      expect(w2Moves[0].capturedPieces).toHaveLength(2);
      expect(w2Moves[0].to).toEqual({ row: 5, col: 4 });
    });
  });

  describe('multi-capture chains', () => {
    it('chains through a backward capture (allowed for pawns in international draughts)', () => {
      const pawn = createPiece('w1', 'white', { row: 9, col: 0 });
      const enemyA = createPiece('b1', 'black', { row: 8, col: 1 }); // captured going forward
      const enemyB = createPiece('b2', 'black', { row: 6, col: 3 }); // captured going backward from (7,2)
      const s = state([pawn, enemyA, enemyB]);

      const moves = validator.getValidMoves(pawn, s);
      expect(moves).toHaveLength(1);
      expect(moves[0].capturedPieces).toHaveLength(2);
      expect(moves[0].to).toEqual({ row: 5, col: 4 });
    });

    it('does not allow a backward pawn capture in English draughts', () => {
      variantService.setVariant('english');
      const pawn = createPiece('w1', 'white', { row: 6, col: 1 }, 'pawn');
      const enemy = createPiece('b1', 'black', { row: 7, col: 2 }); // behind the pawn
      const s = state([pawn, enemy]);
      expect(validator.mustCapture('white', s)).toBe(false);
    });

    it('marks the landing move as a promotion when the chain ends on the last row', () => {
      const pawn = createPiece('w1', 'white', { row: 2, col: 3 });
      const enemy = createPiece('b1', 'black', { row: 1, col: 2 });
      const s = state([pawn, enemy]);
      const moves = validator.getValidMoves(pawn, s);
      expect(moves).toHaveLength(1);
      expect(moves[0].to).toEqual({ row: 0, col: 1 });
      expect(moves[0].isPromotion).toBe(true);
    });
  });

  describe('flying king captures', () => {
    it('captures an enemy piece from a distance and lands beyond it', () => {
      variantService.resetToDefault();
      const king = createPiece('w1', 'white', { row: 9, col: 9 }, 'king');
      const enemy = createPiece('b1', 'black', { row: 5, col: 5 });
      const s = state([king, enemy]);
      const moves = validator.getValidMoves(king, s);
      expect(moves.length).toBeGreaterThan(0);
      expect(moves.every((m) => m.capturedPieces.some((c) => c.id === 'b1'))).toBe(true);
      expect(moves.some((m) => positionsEqual(m.to, { row: 4, col: 4 }))).toBe(true);
    });

    it('cannot jump two enemies stacked back-to-back with no landing gap between them', () => {
      const king = createPiece('w1', 'white', { row: 9, col: 9 }, 'king');
      const enemy1 = createPiece('b1', 'black', { row: 7, col: 7 });
      const enemy2 = createPiece('b2', 'black', { row: 6, col: 6 }); // adjacent to enemy1, no gap to land in
      const s = state([king, enemy1, enemy2]);
      expect(validator.mustCapture('white', s)).toBe(false);
    });

    it('can chain two captures when a landing gap separates the enemies', () => {
      const king = createPiece('w1', 'white', { row: 9, col: 9 }, 'king');
      const enemy1 = createPiece('b1', 'black', { row: 6, col: 6 });
      const enemy2 = createPiece('b2', 'black', { row: 4, col: 4 }); // one empty square (5,5) separates them
      const s = state([king, enemy1, enemy2]);
      const moves = validator.getValidMoves(king, s);
      expect(moves.length).toBeGreaterThan(0);
      for (const m of moves) {
        expect(m.capturedPieces).toHaveLength(2);
      }
    });
  });
});
