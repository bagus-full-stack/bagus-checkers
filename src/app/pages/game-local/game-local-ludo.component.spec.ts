import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GameLocalLudoComponent } from './game-local-ludo.component';
import { LudoEngineService } from '../../core/services';

function mockRandomForRoll(roll: number) {
  vi.spyOn(Math, 'random').mockReturnValue((roll - 1) / 6);
}

describe('GameLocalLudoComponent', () => {
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
    const fixture = TestBed.createComponent(GameLocalLudoComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('starts a 4-player game on init', () => {
    setup();
    expect(ludoEngine.status()).toBe('playing');
    expect(ludoEngine.currentPlayer()).toBe('red');
  });

  it('does not show the game-over modal while the game is playing', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('app-game-over-modal-ludo')).toBeNull();
  });

  it('rolls the dice after the animation delay and updates the displayed value', () => {
    const fixture = setup();
    mockRandomForRoll(6); // a six always offers a base-exit move, so lastDiceRoll is retained

    fixture.componentInstance.onRollDice();
    expect(fixture.componentInstance.isRolling()).toBe(true);

    vi.advanceTimersByTime(500);
    fixture.detectChanges();

    expect(fixture.componentInstance.isRolling()).toBe(false);
    expect(ludoEngine.diceRoll()).toBe(6);
  });

  it('ignores a second roll request while already rolling', () => {
    const fixture = setup();
    mockRandomForRoll(6);
    const rollDiceSpy = vi.spyOn(ludoEngine, 'rollDice');

    fixture.componentInstance.onRollDice();
    fixture.componentInstance.onRollDice();
    vi.advanceTimersByTime(500);

    expect(rollDiceSpy).toHaveBeenCalledTimes(1);
  });

  it('moves a piece when it is a valid movable option', () => {
    const fixture = setup();
    mockRandomForRoll(6); // six always offers a base-exit move
    ludoEngine.rollDice();

    const option = ludoEngine.movableOptions()[0];
    fixture.componentInstance.onPieceClicked(option.piece);

    expect(ludoEngine.board().flat().some((cell) => cell?.id === option.piece.id)).toBe(true);
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
