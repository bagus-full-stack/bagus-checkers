import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GameLocalCheckersComponent } from './game-local-checkers.component';
import { GameEngineService, ReplayService } from '../../core/services';

describe('GameLocalCheckersComponent', () => {
  let gameEngine: GameEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    gameEngine = TestBed.inject(GameEngineService);
  });

  function setup() {
    const fixture = TestBed.createComponent(GameLocalCheckersComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('starts a new unlimited game on init', () => {
    setup();
    expect(gameEngine.status()).toBe('playing');
  });

  it('does not show the game-over modal while playing', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('app-game-over-modal')).toBeNull();
  });

  it('changes the time mode and updates the label', () => {
    const fixture = setup();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('.time-select');
    select.value = 'blitz';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedTimeMode()).toBe('blitz');
    const settingValues = fixture.nativeElement.querySelectorAll('.setting-value');
    expect(settingValues[1].textContent).toBe(fixture.componentInstance.getTimeModeLabel());
  });

  it('finishes the game by timeout once a player runs out of time', () => {
    vi.useFakeTimers();
    const fixture = setup();
    gameEngine.startNewGame('blitz');

    vi.advanceTimersByTime(3 * 60 * 1000 + 200);
    fixture.detectChanges();

    expect(gameEngine.status()).toBe('finished');
    expect(gameEngine.gameResult()?.reason).toBe('timeout');
    vi.useRealTimers();
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

  it('starts a fresh game and re-shows the modal flag when newGame is called', () => {
    const fixture = setup();
    gameEngine.resign();
    fixture.componentInstance.closeModal();

    fixture.componentInstance.newGame();
    expect(fixture.componentInstance.showModal()).toBe(true);
    expect(gameEngine.status()).toBe('playing');
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
});
