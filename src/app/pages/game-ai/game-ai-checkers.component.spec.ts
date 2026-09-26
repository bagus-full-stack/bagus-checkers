import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GameAiCheckersComponent } from './game-ai-checkers.component';
import { GameEngineService, AiService, ReplayService } from '../../core/services';

describe('GameAiCheckersComponent', () => {
  let gameEngine: GameEngineService;
  let aiService: AiService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    gameEngine = TestBed.inject(GameEngineService);
    aiService = TestBed.inject(AiService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setup() {
    const fixture = TestBed.createComponent(GameAiCheckersComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('starts a new game against the AI on init, with the human playing white', () => {
    const fixture = setup();
    expect(gameEngine.status()).toBe('playing');
    expect(fixture.componentInstance.playerColor()).toBe('white');
    expect(fixture.componentInstance.aiColor()).toBe('black');
  });

  it('does not show the game-over modal while playing', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('app-game-over-modal')).toBeNull();
  });

  it('lets the AI play its move once it becomes its turn', () => {
    setup();
    const getBestMoveSpy = vi.spyOn(aiService, 'getBestMove');

    for (const piece of gameEngine.pieces().filter((p) => p.color === 'white')) {
      gameEngine.selectPiece(piece);
      if (gameEngine.validMoves().length > 0) break;
    }
    gameEngine.executeMove(gameEngine.validMoves()[0]);

    expect(gameEngine.currentPlayer()).toBe('black');
    vi.advanceTimersByTime(500);

    expect(getBestMoveSpy).toHaveBeenCalled();
  });

  it('switches the player color and restarts the game', () => {
    const fixture = setup();
    fixture.componentInstance.setPlayerColor('black');

    expect(fixture.componentInstance.playerColor()).toBe('black');
    expect(fixture.componentInstance.aiColor()).toBe('white');
    expect(gameEngine.status()).toBe('playing');
  });

  it('changes the difficulty via the select and updates the label', () => {
    const fixture = setup();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('.difficulty-select');
    select.value = 'expert';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.difficulty()).toBe('expert');
    expect(fixture.componentInstance.getDifficultyLabel()).toBe('Expert');
    expect(fixture.nativeElement.querySelectorAll('.setting-value')[1].textContent).toBe('Expert');
  });

  it('changes the time mode via the select and updates the label', () => {
    const fixture = setup();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('.time-select');
    select.value = 'blitz';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedTimeMode()).toBe('blitz');
    expect(fixture.nativeElement.querySelectorAll('.setting-value')[2].textContent).toBe(
      fixture.componentInstance.getTimeModeLabel(),
    );
  });

  it('shows the game-over modal once the game finishes, and closeModal hides it', () => {
    const fixture = setup();
    gameEngine.resign();
    fixture.detectChanges();

    expect(fixture.componentInstance.isGameOver()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-game-over-modal')).not.toBeNull();

    fixture.componentInstance.closeModal();
    fixture.detectChanges();
    expect(fixture.componentInstance.isGameOver()).toBe(false);
  });

  it('opens the analysis panel and closes it', () => {
    const fixture = setup();
    gameEngine.resign();
    fixture.detectChanges();

    fixture.componentInstance.analyzeGame();
    fixture.detectChanges();

    expect(fixture.componentInstance.showModal()).toBe(false);
    expect(fixture.componentInstance.showAnalysis()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-game-analysis')).not.toBeNull();

    fixture.componentInstance.closeAnalysis();
    fixture.detectChanges();
    expect(fixture.componentInstance.showAnalysis()).toBe(false);
  });

  it('saves a replay once the game has finished', () => {
    const fixture = setup();
    gameEngine.resign();
    fixture.detectChanges();

    const saveGameSpy = vi.spyOn(TestBed.inject(ReplayService), 'saveGame');
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    fixture.componentInstance.saveReplay();
    expect(saveGameSpy).toHaveBeenCalled();
  });

  it('starts a fresh game and re-shows the modal flag when newGame is called', () => {
    const fixture = setup();
    gameEngine.resign();
    fixture.componentInstance.closeModal();

    fixture.componentInstance.newGame();
    expect(fixture.componentInstance.showModal()).toBe(true);
    expect(gameEngine.status()).toBe('playing');
  });
});
