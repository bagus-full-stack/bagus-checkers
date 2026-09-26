import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GameAiLudoComponent } from './game-ai-ludo.component';
import { LudoEngineService } from '../../core/services';

function mockRandomForRoll(roll: number) {
  vi.spyOn(Math, 'random').mockReturnValue((roll - 1) / 6);
}

describe('GameAiLudoComponent', () => {
  let ludoEngine: LudoEngineService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    ludoEngine = TestBed.inject(LudoEngineService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function setup() {
    const fixture = TestBed.createComponent(GameAiLudoComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('starts a red-vs-blue game against the AI on init', () => {
    const fixture = setup();
    expect(ludoEngine.status()).toBe('playing');
    expect(ludoEngine.currentPlayer()).toBe('red');
    expect(fixture.componentInstance.playerColor()).toBe('red');
  });

  it('does not show the game-over modal while playing', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('app-game-over-modal-ludo')).toBeNull();
  });

  it('rolls the dice for the human player after the animation delay', () => {
    const fixture = setup();
    mockRandomForRoll(6); // a six always offers a base-exit move

    fixture.componentInstance.onPlayerRollDice();
    expect(fixture.componentInstance.isRolling()).toBe(true);

    vi.advanceTimersByTime(500);
    fixture.detectChanges();

    expect(fixture.componentInstance.isRolling()).toBe(false);
    expect(ludoEngine.diceRoll()).toBe(6);
  });

  it('automatically rolls for the AI once it becomes their turn', () => {
    const fixture = setup();
    mockRandomForRoll(3); // no base-exit move -> turn passes straight to the AI (blue)

    fixture.componentInstance.onPlayerRollDice();
    vi.advanceTimersByTime(500);
    fixture.detectChanges();

    expect(ludoEngine.currentPlayer()).toBe('blue');
    expect(fixture.componentInstance.isAiThinking()).toBe(true);

    const rollDiceSpy = vi.spyOn(ludoEngine, 'rollDice');
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();

    expect(rollDiceSpy).toHaveBeenCalled();
    expect(fixture.componentInstance.isAiThinking()).toBe(false);
  });

  it('automatically moves the AI piece out of its base after rolling a six', () => {
    const fixture = setup();
    mockRandomForRoll(3);
    fixture.componentInstance.onPlayerRollDice();
    vi.advanceTimersByTime(500);
    fixture.detectChanges();
    expect(ludoEngine.currentPlayer()).toBe('blue');

    mockRandomForRoll(6);
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(ludoEngine.phase()).toBe('moving');
    expect(fixture.componentInstance.isAiThinking()).toBe(true);

    vi.advanceTimersByTime(1000);
    fixture.detectChanges();

    const blueLeftBase = ludoEngine
      .board()
      .flat()
      .some((piece) => piece?.color === 'blue' && piece.trackIndex !== undefined);
    expect(blueLeftBase).toBe(true);
    // rolling a six grants the AI another turn, so it immediately queues another roll
    expect(ludoEngine.currentPlayer()).toBe('blue');
  });

  it('switches the human player color and restarts the game', () => {
    const fixture = setup();
    fixture.componentInstance.setPlayerColor('blue');

    expect(fixture.componentInstance.playerColor()).toBe('blue');
    expect(ludoEngine.currentPlayer()).toBe('blue');
    expect(ludoEngine.status()).toBe('playing');
  });

  it('moves the human piece when a valid movable option is clicked', () => {
    const fixture = setup();
    mockRandomForRoll(6);
    ludoEngine.rollDice();

    const option = ludoEngine.movableOptions()[0];
    fixture.componentInstance.onPieceClicked(option.piece);

    expect(ludoEngine.board().flat().some((piece) => piece?.id === option.piece.id)).toBe(true);
  });

  it('starts a fresh game and re-shows the modal flag when newGame is called', () => {
    const fixture = setup();
    fixture.componentInstance.closeModal();
    expect(fixture.componentInstance.showModal()).toBe(false);

    fixture.componentInstance.newGame();
    expect(fixture.componentInstance.showModal()).toBe(true);
    expect(ludoEngine.status()).toBe('playing');
  });
});
