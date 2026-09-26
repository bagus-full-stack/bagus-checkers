import { TestBed } from '@angular/core/testing';
import { BoardComponent } from './board.component';
import { GameEngineService, GameVariantService } from '../../core/services';
import { createInitialGameState, createPiece } from '../../core/models';

describe('BoardComponent', () => {
  let engine: GameEngineService;
  let variantService: GameVariantService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    engine = TestBed.inject(GameEngineService);
    variantService = TestBed.inject(GameVariantService);
    engine.startNewGame();
  });

  function setup() {
    const fixture = TestBed.createComponent(BoardComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders one square per cell of the board', () => {
    const fixture = setup();
    const size = variantService.boardSize();
    expect(fixture.nativeElement.querySelectorAll('app-square').length).toBe(size * size);
  });

  it('selects a piece on click and shows it as selected', () => {
    const fixture = setup();
    const piece = engine.getMovablePieces()[0];

    fixture.componentInstance.onPieceClick(piece);
    fixture.detectChanges();

    expect(fixture.componentInstance.isSelectedPiece(piece)).toBe(true);
    expect(engine.selectedPiece()?.id).toBe(piece.id);
  });

  it('deselects an already-selected piece on a second click', () => {
    const fixture = setup();
    const piece = engine.getMovablePieces()[0];

    fixture.componentInstance.onPieceClick(piece);
    fixture.componentInstance.onPieceClick(piece);

    expect(engine.selectedPiece()).toBeUndefined();
  });

  it('moves the selected piece and emits moveExecuted when a valid target square is clicked', () => {
    const fixture = setup();
    const piece = engine.getMovablePieces()[0];
    engine.selectPiece(piece);
    const move = engine.validMoves()[0];

    const emitted = vi.fn();
    fixture.componentInstance.moveExecuted.subscribe(emitted);

    fixture.componentInstance.onSquareClick(move.to);

    expect(emitted).toHaveBeenCalledWith(move);
    expect(engine.currentPlayer()).toBe('black');
  });

  it('shows the mandatory-capture warning only when a capture is forced', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('.capture-warning')).toBeNull();

    const wCapturer = createPiece('w1', 'white', { row: 4, col: 4 });
    const bTarget = createPiece('b1', 'black', { row: 3, col: 3 });
    engine.syncState(createInitialGameState([wCapturer, bTarget]));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.capture-warning')).not.toBeNull();
  });

  it('does not allow dragging a piece belonging to the opponent', () => {
    const fixture = setup();
    const blackPiece = engine.pieces().find((p) => p.color === 'black')!;
    expect(fixture.componentInstance.canDragPiece(blackPiece)).toBe(false);
  });
});
