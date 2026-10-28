import { TestBed } from '@angular/core/testing';
import { LudoBoardComponent } from './ludo-board.component';
import { createPiece } from '../../core/models/piece.model';
import { createMove } from '../../core/models/move.model';

function emptyBoard(): (ReturnType<typeof createPiece> | null)[][] {
  return Array.from({ length: 15 }, () => Array(15).fill(null));
}

describe('LudoBoardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  function setup(board = emptyBoard()) {
    const fixture = TestBed.createComponent(LudoBoardComponent);
    fixture.componentRef.setInput('board', board);
    fixture.detectChanges();
    return fixture;
  }

  it('getPieceAt returns the piece at that cell or null', () => {
    const board = emptyBoard();
    const piece = createPiece('r1', 'red', { row: 2, col: 2 }, 'token');
    board[2][2] = piece;
    const fixture = setup(board);

    expect(fixture.componentInstance.getPieceAt(2, 2)).toBe(piece);
    expect(fixture.componentInstance.getPieceAt(0, 0)).toBeNull();
  });

  it('isPieceMovable checks membership in movablePieces by id', () => {
    const fixture = setup();
    const piece = createPiece('r1', 'red', { row: 2, col: 2 }, 'token');
    fixture.componentRef.setInput('movablePieces', [piece]);
    fixture.detectChanges();

    expect(fixture.componentInstance.isPieceMovable(piece)).toBe(true);
    expect(fixture.componentInstance.isPieceMovable(createPiece('r2', 'red', { row: 0, col: 0 }, 'token'))).toBe(false);
  });

  it('isValidMoveTarget checks the destination of the current valid moves', () => {
    const fixture = setup();
    const piece = createPiece('r1', 'red', { row: 2, col: 2 }, 'token');
    fixture.componentRef.setInput('validMoves', [createMove(piece, { row: 3, col: 3 })]);
    fixture.detectChanges();

    expect(fixture.componentInstance.isValidMoveTarget(3, 3)).toBe(true);
    expect(fixture.componentInstance.isValidMoveTarget(4, 4)).toBe(false);
  });

  describe('onSquareClick', () => {
    it('emits pieceClicked and squareClicked when a piece occupies the cell', () => {
      const board = emptyBoard();
      const piece = createPiece('r1', 'red', { row: 2, col: 2 }, 'token');
      board[2][2] = piece;
      const fixture = setup(board);

      const pieceClicked = vi.fn();
      const squareClicked = vi.fn();
      fixture.componentInstance.pieceClicked.subscribe(pieceClicked);
      fixture.componentInstance.squareClicked.subscribe(squareClicked);

      fixture.componentInstance.onSquareClick(2, 2);

      expect(pieceClicked).toHaveBeenCalledWith(piece);
      expect(squareClicked).toHaveBeenCalledWith({ row: 2, col: 2 });
    });

    it('emits only squareClicked for an empty cell', () => {
      const fixture = setup();
      const pieceClicked = vi.fn();
      const squareClicked = vi.fn();
      fixture.componentInstance.pieceClicked.subscribe(pieceClicked);
      fixture.componentInstance.squareClicked.subscribe(squareClicked);

      fixture.componentInstance.onSquareClick(5, 5);

      expect(pieceClicked).not.toHaveBeenCalled();
      expect(squareClicked).toHaveBeenCalledWith({ row: 5, col: 5 });
    });
  });

  describe('getCellClasses', () => {
    it.each([
      [0, 0, 'base-red'],
      [0, 14, 'base-green'],
      [14, 0, 'base-blue'],
      [14, 14, 'base-yellow'],
      [7, 3, 'home-red'],
      [3, 7, 'home-green'],
      [7, 11, 'home-yellow'],
      [11, 7, 'home-blue'],
      [7, 7, 'center'],
      [6, 7, 'center'],
      [6, 6, 'center'], // inner corner: home, not track (standard 52-cell circuit)
      [1, 1, 'base-red nest'],
      [2, 2, 'base-red nest nest-spot'],
      [12, 12, 'base-yellow nest nest-spot'],
      [7, 0, 'track arrow arrow-red'],
      [14, 7, 'track arrow arrow-blue'],
      [6, 0, 'track start-red safe'],
      [0, 8, 'track start-green safe'],
      [8, 14, 'track start-yellow safe'],
      [14, 6, 'track start-blue safe'],
      [3, 6, 'track star safe'],
      [6, 11, 'track star safe'],
      [11, 8, 'track star safe'],
      [8, 3, 'track star safe'],
      [0, 7, 'track arrow arrow-green'], // shared track cell above the board, just before green's home column
      [0, 6, 'track'],
    ])('classifies (%i,%i) as %s', (row, col, expected) => {
      const fixture = setup();
      expect(fixture.componentInstance.getCellClasses(row, col)).toBe(expected);
    });
  });
});
