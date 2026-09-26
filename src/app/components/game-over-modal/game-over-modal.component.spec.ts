import { TestBed } from '@angular/core/testing';
import { GameOverModalComponent } from './game-over-modal.component';
import { GameStatistics } from '../../core/models/replay.model';

function stats(overrides: Partial<GameStatistics> = {}): GameStatistics {
  return {
    totalMoves: 42,
    whiteMoves: 21,
    blackMoves: 21,
    whiteCaptures: 3,
    blackCaptures: 2,
    whiteKingsPromoted: 1,
    blackKingsPromoted: 0,
    longestCaptureChain: 2,
    averageMoveTime: 5,
    duration: 125,
    materialHistory: [],
    ...overrides,
  };
}

describe('GameOverModalComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  function setup() {
    return TestBed.createComponent(GameOverModalComponent);
  }

  it('shows a draw badge and title with no winner', () => {
    const fixture = setup();
    fixture.componentRef.setInput('winner', 'draw');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.modal-title').textContent.trim()).toBe('Match Nul !');
    expect(fixture.nativeElement.querySelector('.draw-badge')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.winner-badge')).toBeNull();
  });

  it('shows the winner badge and title for a decisive result', () => {
    const fixture = setup();
    fixture.componentRef.setInput('winner', 'white');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.modal-title').textContent.trim()).toBe('Partie Terminée !');
    expect(fixture.nativeElement.querySelector('.winner-badge').classList.contains('white')).toBe(true);
    expect(fixture.nativeElement.querySelector('.winner-text').textContent).toContain('Blancs gagnent');
  });

  it('shows the default "Fin de Partie" title with no winner input at all', () => {
    const fixture = setup();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.modal-title').textContent.trim()).toBe('Fin de Partie');
  });

  it.each([
    ['no-pieces', 'Toutes les pièces adverses ont été capturées'],
    ['no-moves', "L'adversaire ne peut plus jouer"],
    ['resignation', 'Abandon'],
    ['timeout', 'Temps écoulé'],
    ['disconnect', 'Déconnexion de l\'adversaire'],
  ])('translates reason %s to "%s"', (reason, text) => {
    const fixture = setup();
    fixture.componentRef.setInput('winner', 'white');
    fixture.componentRef.setInput('reason', reason);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.reason-text').textContent.trim()).toBe(text);
  });

  it('shows no stats section when stats is not provided', () => {
    const fixture = setup();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.stats-section')).toBeNull();
  });

  it('shows the stats grid with formatted duration, and the material graph only with enough history', () => {
    const fixture = setup();
    fixture.componentRef.setInput('stats', stats());
    fixture.detectChanges();

    const values = fixture.nativeElement.querySelectorAll('.stat-value');
    expect(values[0].textContent.trim()).toBe('42');
    expect(values[1].textContent.trim()).toBe('2:05');
    expect(values[2].textContent.trim()).toBe('3');
    expect(values[3].textContent.trim()).toBe('2');
    expect(fixture.nativeElement.querySelector('app-material-graph')).toBeNull();

    fixture.componentRef.setInput('stats', stats({
      materialHistory: [
        { moveNumber: 1, whitePawns: 20, whiteKings: 0, blackPawns: 20, blackKings: 0, advantage: 0 },
        { moveNumber: 2, whitePawns: 20, whiteKings: 0, blackPawns: 19, blackKings: 0, advantage: 1 },
      ],
    }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-material-graph')).not.toBeNull();
  });

  it('shows the ELO change with a sign and class only when provided', () => {
    const fixture = setup();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.elo-section')).toBeNull();

    fixture.componentRef.setInput('eloChange', 12);
    fixture.detectChanges();
    const positive = fixture.nativeElement.querySelector('.elo-change');
    expect(positive.textContent.trim()).toBe('+12');
    expect(positive.classList.contains('positive')).toBe(true);

    fixture.componentRef.setInput('eloChange', -8);
    fixture.detectChanges();
    const negative = fixture.nativeElement.querySelector('.elo-change');
    expect(negative.textContent.trim()).toBe('-8');
    expect(negative.classList.contains('negative')).toBe(true);
  });

  it('shows the rematch button only when showRematch is true, and emits on click', () => {
    const fixture = setup();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.btn-primary')).toBeNull();

    fixture.componentRef.setInput('showRematch', true);
    fixture.detectChanges();

    const rematch = vi.fn();
    fixture.componentInstance.rematch.subscribe(rematch);
    fixture.nativeElement.querySelector('.btn-primary').click();
    expect(rematch).toHaveBeenCalled();
  });

  it('emits newGame, analyze, saveReplay and close from their respective buttons', () => {
    const fixture = setup();
    fixture.detectChanges();

    const newGame = vi.fn();
    const analyze = vi.fn();
    const saveReplay = vi.fn();
    const close = vi.fn();
    fixture.componentInstance.newGame.subscribe(newGame);
    fixture.componentInstance.analyze.subscribe(analyze);
    fixture.componentInstance.saveReplay.subscribe(saveReplay);
    fixture.componentInstance.close.subscribe(close);

    fixture.nativeElement.querySelector('.btn-secondary').click();
    expect(newGame).toHaveBeenCalled();

    const outlineButtons = fixture.nativeElement.querySelectorAll('.btn-outline');
    outlineButtons[0].click();
    expect(analyze).toHaveBeenCalled();
    outlineButtons[1].click();
    expect(saveReplay).toHaveBeenCalled();

    fixture.nativeElement.querySelector('.btn-ghost').click();
    expect(close).toHaveBeenCalled();
  });

  it('closes only when the backdrop itself, not its content, is the click target', () => {
    const fixture = setup();
    fixture.detectChanges();
    const close = vi.fn();
    fixture.componentInstance.close.subscribe(close);

    fixture.nativeElement.querySelector('.modal-content').click();
    expect(close).not.toHaveBeenCalled();

    fixture.nativeElement.querySelector('.modal-backdrop').click();
    expect(close).toHaveBeenCalled();
  });
});
