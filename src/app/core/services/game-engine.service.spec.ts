import { TestBed } from '@angular/core/testing';
import { GameEngineService } from './game-engine.service';
import { createPiece } from '../models/piece.model';
import { createInitialGameState } from '../models/game-state.model';
import { createMove } from '../models/move.model';
import { GameState } from '../models/game-state.model';

describe('GameEngineService', () => {
  let engine: GameEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    engine = TestBed.inject(GameEngineService);
  });

  describe('startNewGame', () => {
    it('sets up the full international draughts board', () => {
      engine.startNewGame();
      expect(engine.pieces()).toHaveLength(40);
      expect(engine.pieces().filter((p) => p.color === 'white')).toHaveLength(20);
      expect(engine.pieces().filter((p) => p.color === 'black')).toHaveLength(20);
      expect(engine.currentPlayer()).toBe('white');
      expect(engine.status()).toBe('playing');
      expect(engine.mustCapture()).toBe(false);
    });
  });

  describe('with a custom, small board (via syncState)', () => {
    function setBoard(...pieces: ReturnType<typeof createPiece>[]) {
      const state: GameState = { ...createInitialGameState(pieces), status: 'playing' };
      engine.syncState(state);
    }

    it('selectPiece only allows selecting the current player color', () => {
      const white = createPiece('w1', 'white', { row: 9, col: 0 });
      const black = createPiece('b1', 'black', { row: 0, col: 1 });
      setBoard(white, black);

      engine.selectPiece(black);
      expect(engine.selectedPiece()).toBeUndefined();

      engine.selectPiece(white);
      expect(engine.selectedPiece()).toEqual(white);
      expect(engine.validMoves().length).toBeGreaterThan(0);
    });

    it('refuses to select a non-capturing piece when a capture is mandatory', () => {
      const capturer = createPiece('w1', 'white', { row: 9, col: 0 });
      const enemy = createPiece('b1', 'black', { row: 8, col: 1 });
      const bystander = createPiece('w2', 'white', { row: 9, col: 8 });
      setBoard(capturer, enemy, bystander);

      expect(engine.mustCapture()).toBe(true);
      engine.selectPiece(bystander);
      expect(engine.selectedPiece()).toBeUndefined();

      engine.selectPiece(capturer);
      expect(engine.selectedPiece()).toEqual(capturer);
    });

    it('moveTo returns false for a position with no matching valid move', () => {
      const white = createPiece('w1', 'white', { row: 9, col: 0 });
      setBoard(white);
      engine.selectPiece(white);
      expect(engine.moveTo({ row: 0, col: 0 })).toBe(false);
    });

    it('moveTo executes a simple move and switches the current player', () => {
      const white = createPiece('w1', 'white', { row: 9, col: 0 });
      const black = createPiece('b1', 'black', { row: 0, col: 1 });
      setBoard(white, black);
      engine.selectPiece(white);

      expect(engine.moveTo({ row: 8, col: 1 })).toBe(true);
      expect(engine.currentPlayer()).toBe('black');
      expect(engine.selectedPiece()).toBeUndefined();
      expect(engine.moveHistory()).toHaveLength(1);
      expect(engine.pieces().find((p) => p.id === 'w1')?.position).toEqual({ row: 8, col: 1 });
    });

    it('executeMove removes captured pieces from the board', () => {
      const capturer = createPiece('w1', 'white', { row: 9, col: 0 });
      const enemy = createPiece('b1', 'black', { row: 8, col: 1 });
      setBoard(capturer, enemy);
      engine.selectPiece(capturer);

      const move = engine.validMoves()[0];
      expect(engine.executeMove(move)).toBe(true);
      expect(engine.pieces().some((p) => p.id === 'b1')).toBe(false);
      expect(engine.pieces().find((p) => p.id === 'w1')?.position).toEqual({ row: 7, col: 2 });
    });

    it('promotes a piece that reaches the last row', () => {
      const pawn = createPiece('w1', 'white', { row: 1, col: 0 });
      setBoard(pawn);
      engine.selectPiece(pawn);

      const move = engine.validMoves().find((m) => m.to.row === 0)!;
      engine.executeMove(move);
      expect(engine.pieces().find((p) => p.id === 'w1')?.type).toBe('king');
    });

    it('declares the mover the winner when the opponent has no pieces left', () => {
      const white = createPiece('w1', 'white', { row: 9, col: 0 });
      const black = createPiece('b1', 'black', { row: 8, col: 1 });
      setBoard(white, black);
      engine.selectPiece(white);

      engine.executeMove(engine.validMoves()[0]);
      expect(engine.status()).toBe('finished');
      expect(engine.gameResult()).toEqual({ winner: 'white', reason: 'no-pieces' });
    });

    it('getMovablePieces only returns pieces with a capture when a capture is mandatory', () => {
      const capturer = createPiece('w1', 'white', { row: 9, col: 0 });
      const enemy = createPiece('b1', 'black', { row: 8, col: 1 });
      const bystander = createPiece('w2', 'white', { row: 9, col: 8 });
      setBoard(capturer, enemy, bystander);

      const movable = engine.getMovablePieces();
      expect(movable.map((p) => p.id)).toEqual(['w1']);
    });

    it('isValidMoveTarget reflects the currently selected piece moves', () => {
      const white = createPiece('w1', 'white', { row: 9, col: 0 });
      setBoard(white);
      expect(engine.isValidMoveTarget({ row: 8, col: 1 })).toBe(false);

      engine.selectPiece(white);
      expect(engine.isValidMoveTarget({ row: 8, col: 1 })).toBe(true);
    });

    it('deselectPiece clears the selection', () => {
      const white = createPiece('w1', 'white', { row: 9, col: 0 });
      setBoard(white);
      engine.selectPiece(white);
      engine.deselectPiece();
      expect(engine.selectedPiece()).toBeUndefined();
      expect(engine.validMoves()).toEqual([]);
    });
  });

  describe('resign and timeout', () => {
    it('resign ends the game with the other player as winner', () => {
      engine.startNewGame();
      engine.resign();
      expect(engine.status()).toBe('finished');
      expect(engine.gameResult()).toEqual({ winner: 'black', reason: 'resignation' });
    });

    it('handleTimeout ends the game with the non-timed-out player as winner', () => {
      engine.startNewGame();
      engine.handleTimeout('white');
      expect(engine.status()).toBe('finished');
      expect(engine.gameResult()).toEqual({ winner: 'black', reason: 'timeout' });
    });
  });

  describe('undo/redo', () => {
    it('undo restores the previous state and redo re-applies the move', () => {
      engine.startNewGame();
      const piece = engine.getMovablePieces()[0];
      engine.selectPiece(piece);
      const move = engine.validMoves()[0];
      engine.executeMove(move);

      expect(engine.currentPlayer()).toBe('black');
      expect(engine.undo()).toBe(true);
      expect(engine.currentPlayer()).toBe('white');

      expect(engine.redo()).toBe(true);
      expect(engine.currentPlayer()).toBe('black');
    });

    it('canUndo/canRedo reflect history position', () => {
      engine.startNewGame();
      expect(engine.canUndo()).toBe(false);
      expect(engine.canRedo()).toBe(false);
    });
  });

  it('syncState appends the given move to history without duplicating existing entries', () => {
    const white = createPiece('w1', 'white', { row: 9, col: 0 });
    const state: GameState = { ...createInitialGameState([white]), status: 'playing' };
    engine.syncState(state);

    const move = createMove(white, { row: 8, col: 1 });
    const movedPiece = { ...white, position: { row: 8, col: 1 } };
    const nextState: GameState = { ...createInitialGameState([movedPiece]), status: 'playing', currentPlayer: 'black' };
    engine.syncState(nextState, move);

    expect(engine.moveHistory()).toEqual([move]);
  });

  it('board() produces a grid with pieces placed at their positions', () => {
    const white = createPiece('w1', 'white', { row: 9, col: 0 });
    const state: GameState = { ...createInitialGameState([white]), status: 'playing' };
    engine.syncState(state);

    const grid = engine.board();
    expect(grid[9][0]?.id).toBe('w1');
    expect(grid[0][0]).toBeNull();
  });
});
