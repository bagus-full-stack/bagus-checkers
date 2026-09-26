import { TestBed } from '@angular/core/testing';
import { MoveHistoryService } from './move-history.service';
import { createPiece } from '../models/piece.model';
import { createInitialGameState } from '../models/game-state.model';
import { createMove } from '../models/move.model';
import { GameState } from '../models/game-state.model';

describe('MoveHistoryService', () => {
  let service: MoveHistoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MoveHistoryService);
  });

  function state(): GameState {
    return createInitialGameState([createPiece('w1', 'white', { row: 9, col: 0 })]);
  }

  it('starts with no undo/redo available', () => {
    expect(service.canUndo()).toBe(false);
    expect(service.canRedo()).toBe(false);
  });

  it('initialize records the starting state as the only history entry', () => {
    service.initialize(state());
    expect(service.canUndo()).toBe(false);
    expect(service.canRedo()).toBe(false);
    expect(service.getMoves()).toEqual([]);
  });

  it('recordMove appends a move and makes undo available', () => {
    const s0 = state();
    service.initialize(s0);
    const piece = s0.pieces[0];
    const move = createMove(piece, { row: 8, col: 1 });
    const s1: GameState = { ...s0, moveHistory: [move] };

    service.recordMove(s1, move);
    expect(service.canUndo()).toBe(true);
    expect(service.canRedo()).toBe(false);
    expect(service.getMoves()).toEqual([move]);
    expect(service.getLastMove()).toEqual(move);
  });

  it('undo returns the previous state and enables redo', () => {
    const s0 = state();
    service.initialize(s0);
    const piece = s0.pieces[0];
    const move = createMove(piece, { row: 8, col: 1 });
    const s1: GameState = { ...s0, moveHistory: [move] };
    service.recordMove(s1, move);

    const previous = service.undo();
    expect(previous?.moveHistory).toEqual([]);
    expect(service.canRedo()).toBe(true);
  });

  it('redo re-applies an undone move', () => {
    const s0 = state();
    service.initialize(s0);
    const piece = s0.pieces[0];
    const move = createMove(piece, { row: 8, col: 1 });
    const s1: GameState = { ...s0, moveHistory: [move] };
    service.recordMove(s1, move);
    service.undo();

    const restored = service.redo();
    expect(restored?.moveHistory).toEqual([move]);
    expect(service.canRedo()).toBe(false);
  });

  it('recordMove after an undo discards the redo branch', () => {
    const s0 = state();
    service.initialize(s0);
    const piece = s0.pieces[0];
    const moveA = createMove(piece, { row: 8, col: 1 });
    service.recordMove({ ...s0, moveHistory: [moveA] }, moveA);
    service.undo();

    const moveB = createMove(piece, { row: 8, col: 1 });
    service.recordMove({ ...s0, moveHistory: [moveB] }, moveB);

    expect(service.canRedo()).toBe(false);
    expect(service.getMoves()).toEqual([moveB]);
  });

  it('deep clones state so later mutation of the original object does not corrupt history', () => {
    const s0 = state();
    service.initialize(s0);
    const piece = s0.pieces[0];
    const move = createMove(piece, { row: 8, col: 1 });
    service.recordMove({ ...s0, moveHistory: [move] }, move);

    (s0.pieces[0].position as { row: number }).row = -1; // mutate the original reference after it was stored

    const previous = service.undo();
    expect(previous?.pieces[0].position.row).toBe(9);
  });

  it('clear resets history and undo/redo availability', () => {
    service.initialize(state());
    service.clear();
    expect(service.canUndo()).toBe(false);
    expect(service.canRedo()).toBe(false);
    expect(service.getMoves()).toEqual([]);
  });
});
