import { signal } from '@angular/core';
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

  it('starts a four-seat game, human red first, against three AI seats on init', () => {
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
    mockRandomForRoll(3); // no base-exit move -> turn passes straight to the AI (green)

    fixture.componentInstance.onPlayerRollDice();
    vi.advanceTimersByTime(500);
    fixture.detectChanges();

    expect(ludoEngine.currentPlayer()).toBe('green');
    expect(fixture.componentInstance.isAiThinking()).toBe(true);

    const rollDiceSpy = vi.spyOn(ludoEngine, 'rollDice');
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();

    expect(rollDiceSpy).toHaveBeenCalled();
    // green had no move, so the next AI seat (yellow) is up and starts thinking right away
    expect(ludoEngine.currentPlayer()).toBe('yellow');
  });

  it('automatically moves the AI piece out of its base after rolling a six', async () => {
    const fixture = setup();
    mockRandomForRoll(3);
    fixture.componentInstance.onPlayerRollDice();
    vi.advanceTimersByTime(500);
    fixture.detectChanges();
    expect(ludoEngine.currentPlayer()).toBe('green');

    mockRandomForRoll(6);
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(ludoEngine.phase()).toBe('moving');
    expect(fixture.componentInstance.isAiThinking()).toBe(true);

    await vi.advanceTimersByTimeAsync(1000); // the AI answers through a promise
    fixture.detectChanges();

    const greenLeftBase = ludoEngine
      .board()
      .flat()
      .some((piece) => piece?.color === 'green' && piece.trackIndex !== undefined);
    expect(greenLeftBase).toBe(true);
    // rolling a six grants the AI another turn, so it immediately queues another roll
    expect(ludoEngine.currentPlayer()).toBe('green');
  });

  function pick(fixture: ReturnType<typeof setup>, selector: string, value: string) {
    const el: HTMLSelectElement = fixture.nativeElement.querySelector(selector);
    el.value = value;
    el.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('lets the human choose 2, 3 or 4 players (two sit opposite each other)', () => {
    const fixture = setup();
    pick(fixture, 'select[aria-label="Nombre de joueurs"]', '2');
    expect(ludoEngine.gameState()!.players).toEqual(['red', 'yellow']);
    expect(fixture.nativeElement.querySelectorAll('.ai-setup .setup-field').length).toBe(3); // count + all + 1 AI seat

    pick(fixture, 'select[aria-label="Nombre de joueurs"]', '3');
    expect(ludoEngine.gameState()!.players).toEqual(['red', 'green', 'yellow']);

    fixture.componentInstance.setPlayerColor('blue');
    expect(ludoEngine.gameState()!.players).toEqual(['blue', 'red', 'green']);
  });

  it('gives each AI seat its own algorithm, or one for all at once', () => {
    const fixture = setup();
    const c = fixture.componentInstance;
    pick(fixture, 'select[aria-label="Algorithme IA Vert"]', 'easy');
    expect(c.difficulties()).toMatchObject({ green: 'easy', yellow: 'medium', blue: 'medium' });

    pick(fixture, 'select[aria-label="Même algorithme pour tous les IA"]', 'hard');
    expect(c.difficulties()).toEqual({ red: 'hard', green: 'hard', yellow: 'hard', blue: 'hard' });
  });

  it('plays a single legal move by itself, but waits when there is a choice', () => {
    const one = [{ piece: { id: 'r-0' }, steps: 3, destination: { row: 1, col: 1 }, capturedPieceIds: [] }];
    const two = [...one, { piece: { id: 'r-1' }, steps: 4, destination: { row: 2, col: 2 }, capturedPieceIds: [] }];
    const options = signal<unknown[]>(two);
    vi.spyOn(ludoEngine, 'movableOptions').mockImplementation((() => options()) as never);
    const move = vi.spyOn(ludoEngine, 'moveTo').mockReturnValue(true);
    setup();
    TestBed.tick();
    vi.advanceTimersByTime(1000);
    expect(move).not.toHaveBeenCalled();

    options.set(one);
    TestBed.tick();
    vi.advanceTimersByTime(1000);
    expect(move).toHaveBeenCalledTimes(1);
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
