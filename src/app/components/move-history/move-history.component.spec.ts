import { TestBed } from '@angular/core/testing';
import { MoveHistoryComponent } from './move-history.component';
import { GameEngineService } from '../../core/services';

function makeOneMove(engine: GameEngineService) {
  const piece = engine.getMovablePieces()[0];
  engine.selectPiece(piece);
  const move = engine.validMoves()[0];
  engine.moveTo(move.to);
}

describe('MoveHistoryComponent', () => {
  let engine: GameEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    engine = TestBed.inject(GameEngineService);
    engine.startNewGame();
  });

  function setup() {
    const fixture = TestBed.createComponent(MoveHistoryComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows an empty message and disabled undo/redo with no moves played', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('.empty-message')).not.toBeNull();
    const [undoBtn, redoBtn] = fixture.nativeElement.querySelectorAll('.control-btn');
    expect(undoBtn.disabled).toBe(true);
    expect(redoBtn.disabled).toBe(true);
  });

  it('groups moves into numbered white/black pairs', () => {
    makeOneMove(engine); // white move 1
    makeOneMove(engine); // black move 1
    makeOneMove(engine); // white move 2

    const fixture = setup();
    const pairs = fixture.nativeElement.querySelectorAll('.move-pair');
    expect(pairs.length).toBe(2);
    expect(pairs[0].querySelector('.move-number').textContent.trim()).toBe('1.');
    expect(pairs[0].querySelectorAll('.move').length).toBe(2); // white + black
    expect(pairs[1].querySelectorAll('.move').length).toBe(1); // white only, no black yet
  });

  it('enables undo after a move, and undo/redo call through to the engine', () => {
    makeOneMove(engine);
    const fixture = setup();

    const [undoBtn, redoBtn] = fixture.nativeElement.querySelectorAll('.control-btn');
    expect(undoBtn.disabled).toBe(false);
    expect(redoBtn.disabled).toBe(true);

    undoBtn.click();
    fixture.detectChanges();
    expect(engine.canRedo()).toBe(true);
    expect(fixture.nativeElement.querySelector('.empty-message')).not.toBeNull();

    const [, redoBtnAfter] = fixture.nativeElement.querySelectorAll('.control-btn');
    expect(redoBtnAfter.disabled).toBe(false);
    redoBtnAfter.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.move-pair').length).toBe(1);
  });
});
