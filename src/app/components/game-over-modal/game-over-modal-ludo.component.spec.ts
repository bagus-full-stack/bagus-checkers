import { TestBed } from '@angular/core/testing';
import { GameOverModalLudoComponent } from './game-over-modal-ludo.component';

describe('GameOverModalLudoComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  function setup(winner: string | null = null, reason = 'Partie terminée') {
    const fixture = TestBed.createComponent(GameOverModalLudoComponent);
    fixture.componentRef.setInput('winner', winner);
    fixture.componentRef.setInput('reason', reason);
    fixture.detectChanges();
    return fixture;
  }

  it('shows a generic title and no winner badge when there is no winner', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('.modal-title').textContent.trim()).toBe('Partie Terminée');
    expect(fixture.nativeElement.querySelector('.winner-animation')).toBeNull();
  });

  it('shows the victory title and winner badge with the player name in color', () => {
    const fixture = setup('red', 'Tous les pions sont arrivés');
    expect(fixture.nativeElement.querySelector('.modal-title').textContent.trim()).toBe('Victoire !');
    expect(fixture.nativeElement.querySelector('.winner-text').textContent).toContain('Rouge');
    expect(fixture.nativeElement.querySelector('.winner-badge').style.color).toBe('rgb(239, 68, 68)');
    expect(fixture.nativeElement.querySelector('.reason-text').textContent.trim()).toBe('Tous les pions sont arrivés');
  });

  it.each([
    ['red', 'Rouge', '#ef4444'],
    ['blue', 'Bleu', '#3b82f6'],
    ['green', 'Vert', '#22c55e'],
    ['yellow', 'Jaune', '#eab308'],
  ])('maps color %s to name %s and hex %s', (color, name, hex) => {
    const fixture = setup();
    expect(fixture.componentInstance.getPlayerName(color)).toBe(name);
    expect(fixture.componentInstance.getColorHex(color)).toBe(hex);
  });

  it('emits newGame and close when the corresponding buttons are clicked', () => {
    const fixture = setup();
    const newGame = vi.fn();
    const close = vi.fn();
    fixture.componentInstance.newGame.subscribe(newGame);
    fixture.componentInstance.close.subscribe(close);

    fixture.nativeElement.querySelector('.btn-primary').click();
    expect(newGame).toHaveBeenCalled();

    fixture.nativeElement.querySelector('.modal-btn.secondary').click();
    expect(close).toHaveBeenCalled();
  });

  it('closes on backdrop click but not when clicking inside the modal content', () => {
    const fixture = setup();
    const close = vi.fn();
    fixture.componentInstance.close.subscribe(close);

    fixture.nativeElement.querySelector('.modal-content').click();
    expect(close).not.toHaveBeenCalled();

    fixture.nativeElement.querySelector('.modal-backdrop').click();
    expect(close).toHaveBeenCalled();
  });
});
