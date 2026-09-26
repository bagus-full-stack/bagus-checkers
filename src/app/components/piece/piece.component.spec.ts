import { TestBed } from '@angular/core/testing';
import { PieceComponent } from './piece.component';
import { createPiece } from '../../core/models/piece.model';

describe('PieceComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  function setup(piece = createPiece('w1', 'white', { row: 0, col: 0 })) {
    const fixture = TestBed.createComponent(PieceComponent);
    fixture.componentRef.setInput('piece', piece);
    fixture.detectChanges();
    return fixture;
  }

  it('applies the piece color as a host class', () => {
    const fixture = setup(createPiece('b1', 'black', { row: 0, col: 0 }));
    expect(fixture.nativeElement.className).toBe('black');
  });

  it('adds selected and movable classes when set', () => {
    const fixture = setup();
    fixture.componentRef.setInput('isSelected', true);
    fixture.componentRef.setInput('isMovable', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.classList.contains('selected')).toBe(true);
    expect(fixture.nativeElement.classList.contains('movable')).toBe(true);
  });

  it('renders a crown for a king piece', () => {
    const fixture = setup(createPiece('w1', 'white', { row: 0, col: 0 }, 'king'));
    expect(fixture.nativeElement.querySelector('.crown')).not.toBeNull();
  });

  it('renders a token-inner marker for a Ludo token piece', () => {
    const fixture = setup(createPiece('r1', 'red', { row: 0, col: 0 }, 'token'));
    expect(fixture.nativeElement.querySelector('.token-inner')).not.toBeNull();
  });

  it('renders neither marker for a plain pawn', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('.crown')).toBeNull();
    expect(fixture.nativeElement.querySelector('.token-inner')).toBeNull();
  });

  it('builds a French aria-label from type and color', () => {
    const fixture = setup(createPiece('b1', 'black', { row: 0, col: 0 }, 'king'));
    expect(fixture.nativeElement.getAttribute('aria-label')).toBe('Dame noir');
  });
});
