import { TestBed } from '@angular/core/testing';
import { SquareComponent } from './square.component';
import { createPiece } from '../../core/models/piece.model';

describe('SquareComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  function setup(position = { row: 0, col: 0 }) {
    const fixture = TestBed.createComponent(SquareComponent);
    fixture.componentRef.setInput('position', position);
    fixture.detectChanges();
    return fixture;
  }

  it('applies the dark/light class based on the checkerboard pattern', () => {
    const dark = setup({ row: 0, col: 1 });
    expect(dark.nativeElement.className).toContain('dark');

    const light = setup({ row: 0, col: 0 });
    expect(light.nativeElement.className).toContain('light');
  });

  it('adds valid-target and has-piece classes when applicable', () => {
    const fixture = setup();
    fixture.componentRef.setInput('isValidTarget', true);
    fixture.componentRef.setInput('piece', createPiece('w1', 'white', { row: 0, col: 0 }));
    fixture.detectChanges();
    expect(fixture.nativeElement.className).toContain('valid-target');
    expect(fixture.nativeElement.className).toContain('has-piece');
  });

  it('builds a French aria-label describing the square, piece and destination status', () => {
    const fixture = setup({ row: 2, col: 2 }); // row 3, col C
    fixture.componentRef.setInput('piece', createPiece('w1', 'white', { row: 2, col: 2 }, 'king'));
    fixture.componentRef.setInput('isValidTarget', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.getAttribute('aria-label')).toBe('Case C3, Dame blanc, destination possible');
  });

  it('is interactive (tabindex 0) when it has a piece or is a valid target, and not otherwise', () => {
    const empty = setup();
    expect(empty.nativeElement.getAttribute('tabindex')).toBe('-1');

    const withPiece = setup();
    withPiece.componentRef.setInput('piece', createPiece('w1', 'white', { row: 0, col: 0 }));
    withPiece.detectChanges();
    expect(withPiece.nativeElement.getAttribute('tabindex')).toBe('0');
  });

  it('clicking an empty square emits only squareClicked', () => {
    const fixture = setup({ row: 1, col: 1 });
    const squareClicked = vi.fn();
    const pieceClicked = vi.fn();
    fixture.componentInstance.squareClicked.subscribe(squareClicked);
    fixture.componentInstance.pieceClicked.subscribe(pieceClicked);

    fixture.nativeElement.click();

    expect(squareClicked).toHaveBeenCalledWith({ row: 1, col: 1 });
    expect(pieceClicked).not.toHaveBeenCalled();
  });

  it('clicking a square with a piece emits both pieceClicked and squareClicked', () => {
    const fixture = setup({ row: 1, col: 1 });
    const piece = createPiece('w1', 'white', { row: 1, col: 1 });
    fixture.componentRef.setInput('piece', piece);
    fixture.detectChanges();

    const squareClicked = vi.fn();
    const pieceClicked = vi.fn();
    fixture.componentInstance.squareClicked.subscribe(squareClicked);
    fixture.componentInstance.pieceClicked.subscribe(pieceClicked);

    fixture.nativeElement.click();

    expect(pieceClicked).toHaveBeenCalledWith(piece);
    expect(squareClicked).toHaveBeenCalledWith({ row: 1, col: 1 });
  });
});
