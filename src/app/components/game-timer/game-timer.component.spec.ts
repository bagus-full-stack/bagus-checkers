import { TestBed } from '@angular/core/testing';
import { GameTimerComponent } from './game-timer.component';
import { TimerService } from '../../core/services/timer.service';
import { TimerState } from '../../core/models/timer.model';

function timerState(overrides: Partial<TimerState> = {}): TimerState {
  return {
    mode: 'rapid',
    white: { remainingTimeMs: 600000, isRunning: false },
    black: { remainingTimeMs: 600000, isRunning: false },
    activePlayer: null,
    lastUpdateTimestamp: Date.now(),
    ...overrides,
  };
}

describe('GameTimerComponent', () => {
  let timerService: TimerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    timerService = TestBed.inject(TimerService);
  });

  function setup(player: 'white' | 'black' = 'white') {
    const fixture = TestBed.createComponent(GameTimerComponent);
    fixture.componentRef.setInput('player', player);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the infinity symbol and the "unlimited" class when there is no timer state', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('.time-display').textContent.trim()).toBe('∞');
    expect(fixture.nativeElement.querySelector('.time-display').classList.contains('unlimited')).toBe(true);
  });

  it('formats the remaining time for the given player', () => {
    timerService.syncFromServer(timerState({ white: { remainingTimeMs: 125000, isRunning: false } }));
    const fixture = setup('white');
    expect(fixture.nativeElement.querySelector('.time-display').textContent.trim()).toBe('02:05');
  });

  it('shows the French player label and active indicator only for the active player', () => {
    timerService.syncFromServer(timerState({ activePlayer: 'black' }));

    const white = setup('white');
    expect(white.nativeElement.querySelector('.player-label').textContent).toBe('Blancs');
    expect(white.nativeElement.querySelector('.active-indicator')).toBeNull();
    expect(white.nativeElement.className).not.toContain('active');

    const black = setup('black');
    expect(black.nativeElement.querySelector('.player-label').textContent).toBe('Noirs');
    expect(black.nativeElement.querySelector('.active-indicator')).not.toBeNull();
    expect(black.nativeElement.className).toContain('active');
  });

  it('applies low-time styling between 10s and 60s remaining', () => {
    timerService.syncFromServer(timerState({ white: { remainingTimeMs: 30000, isRunning: true } }));
    const fixture = setup('white');
    const display = fixture.nativeElement.querySelector('.time-display');
    expect(display.classList.contains('low-time')).toBe(true);
    expect(display.classList.contains('critical-time')).toBe(false);
  });

  it('applies critical-time styling under 10s remaining', () => {
    timerService.syncFromServer(timerState({ white: { remainingTimeMs: 5000, isRunning: true } }));
    const fixture = setup('white');
    const display = fixture.nativeElement.querySelector('.time-display');
    expect(display.classList.contains('critical-time')).toBe(true);
    expect(display.classList.contains('low-time')).toBe(false);
  });

  it('treats an unlimited mode as not low/critical even with a stored time value', () => {
    timerService.syncFromServer(timerState({ mode: 'unlimited', white: { remainingTimeMs: 5000, isRunning: false } }));
    const fixture = setup('white');
    const display = fixture.nativeElement.querySelector('.time-display');
    expect(display.classList.contains('critical-time')).toBe(false);
    expect(display.textContent.trim()).toBe('∞');
  });
});
