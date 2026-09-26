import { TestBed } from '@angular/core/testing';
import { TimerService } from './timer.service';

describe('TimerService', () => {
  let service: TimerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TimerService);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('unlimited mode has no timer state', () => {
    service.initialize('unlimited');
    expect(service.timerState()).toBeNull();
    expect(service.timeMode()).toBe('unlimited');
  });

  it('a timed mode sets up remaining time for both players', () => {
    service.initialize('blitz');
    const state = service.timerState();
    expect(state).not.toBeNull();
    expect(state!.white.remainingTimeMs).toBeGreaterThan(0);
    expect(state!.black.remainingTimeMs).toBe(state!.white.remainingTimeMs);
  });

  it('startTimer marks the given player as running and the other as not', () => {
    service.initialize('blitz');
    service.startTimer('white');
    expect(service.timerState()!.white.isRunning).toBe(true);
    expect(service.timerState()!.black.isRunning).toBe(false);
    expect(service.isRunning()).toBe(true);
  });

  it('startTimer is a no-op in unlimited mode', () => {
    service.initialize('unlimited');
    service.startTimer('white');
    expect(service.timerState()).toBeNull();
  });

  it('ticks down the running player time as real time elapses', () => {
    service.initialize('blitz');
    service.startTimer('white');
    const initial = service.whiteTime();

    vi.advanceTimersByTime(1000);

    expect(service.whiteTime()).toBeLessThan(initial);
    expect(service.blackTime()).toBe(service.timerState()!.black.remainingTimeMs);
  });

  it('switchPlayer moves the running flag to the new active player', () => {
    service.initialize('blitz');
    service.startTimer('white');
    service.switchPlayer('black');

    expect(service.timerState()!.white.isRunning).toBe(false);
    expect(service.timerState()!.black.isRunning).toBe(true);
  });

  it('switchPlayer applies increment time to the player who just moved', () => {
    service.initialize('rapid'); // has a 5s increment
    service.startTimer('white');
    const before = service.whiteTime();

    service.switchPlayer('black');

    expect(service.whiteTime()).toBe(before + 5000);
  });

  it('pauseTimer stops both players from running', () => {
    service.initialize('blitz');
    service.startTimer('white');
    service.pauseTimer();

    expect(service.timerState()!.white.isRunning).toBe(false);
    expect(service.timerState()!.black.isRunning).toBe(false);
    expect(service.isRunning()).toBe(false);
  });

  it('marks a player as timed out once their time reaches zero', () => {
    service.initialize('blitz'); // 3 minutes
    service.startTimer('white');

    vi.advanceTimersByTime(181_000);

    expect(service.whiteTime()).toBe(0);
    expect(service.timedOutPlayer()).toBe('white');
  });

  it('stopTimer clears the timer state entirely', () => {
    service.initialize('blitz');
    service.startTimer('white');
    service.stopTimer();

    expect(service.timerState()).toBeNull();
    expect(service.timedOutPlayer()).toBeNull();
  });

  it('resumeTimer restarts the active player from the stored state', () => {
    service.initialize('blitz');
    service.startTimer('white');
    service.pauseTimer();
    service.resumeTimer();

    expect(service.timerState()!.white.isRunning).toBe(true);
  });
});
