import { TestBed } from '@angular/core/testing';
import { GameInfoComponent } from './game-info.component';
import { GameEngineService, GameVariantService } from '../../core/services';

describe('GameInfoComponent', () => {
  let engine: GameEngineService;
  let variantService: GameVariantService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    engine = TestBed.inject(GameEngineService);
    variantService = TestBed.inject(GameVariantService);
  });

  function setup() {
    const fixture = TestBed.createComponent(GameInfoComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the waiting message before a game has started', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('.status-text').textContent.trim()).toBe('En attente...');
  });

  it('shows the current player turn and the starting piece counts once the game starts', () => {
    engine.startNewGame();
    const fixture = setup();

    expect(fixture.nativeElement.querySelector('.status-text').textContent.trim()).toBe('Tour des Blancs');
    expect(fixture.nativeElement.querySelector('.white-player').classList.contains('active')).toBe(true);
    expect(fixture.nativeElement.querySelector('.black-player').classList.contains('active')).toBe(false);

    const counts = fixture.nativeElement.querySelectorAll('.piece-count span');
    // Black pawns, black kings, white pawns, white kings, in DOM order.
    expect(counts[0].textContent).toContain('20');
    expect(counts[1].textContent).toContain('0');
    expect(counts[2].textContent).toContain('20');
    expect(counts[3].textContent).toContain('0');
  });

  it('shows the winner and reason once the game is finished by resignation', () => {
    engine.startNewGame();
    const fixture = setup();

    engine.resign(); // white resigns -> black wins
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.result-text').textContent).toContain('Noirs gagnent');
    expect(fixture.nativeElement.querySelector('.result-reason').textContent.trim()).toBe('Abandon');
  });

  it('shows a draw message without a winner label', () => {
    engine.startNewGame();
    const fixture = setup();

    engine.syncState({ ...engine.gameState()!, status: 'finished', result: { winner: 'draw', reason: 'no-moves' } });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.result-text').textContent.trim()).toBe('Match nul !');
    expect(fixture.nativeElement.querySelector('.result-reason').textContent.trim()).toBe('Aucun coup possible');
  });

  it('shows the current variant name', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('.variant-name').textContent.trim())
      .toBe(variantService.currentVariant().name);
  });
});
