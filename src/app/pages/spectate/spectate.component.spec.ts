import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SpectateComponent } from './spectate.component';
import { SpectatorService, SpectatorGame } from '../../core/services/spectator.service';

type Listener = (...args: unknown[]) => void;

function createMockSocket() {
  const listeners = new Map<string, Listener[]>();
  return {
    connected: true,
    on: vi.fn((event: string, cb: Listener) => {
      listeners.set(event, [...(listeners.get(event) ?? []), cb]);
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
    trigger(event: string, ...args: unknown[]) {
      (listeners.get(event) ?? []).forEach((cb) => cb(...args));
    },
  };
}

let mockSocket: ReturnType<typeof createMockSocket>;

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

function game(overrides: Partial<SpectatorGame> = {}): SpectatorGame {
  return {
    id: 'g1',
    roomId: 'room1',
    whitePlayer: { id: 'w', name: 'White', rating: 1200 },
    blackPlayer: { id: 'b', name: 'Black', rating: 1200 },
    status: 'playing',
    currentPlayer: 'white',
    moveCount: 5,
    spectatorCount: 3,
    startedAt: new Date().toISOString(),
    variant: 'international',
    timeMode: 'rapid',
    isHighLevel: false,
    isFeatured: false,
    ...overrides,
  };
}

describe('SpectateComponent', () => {
  beforeEach(() => {
    mockSocket = createMockSocket();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  function setup() {
    const fixture = TestBed.createComponent(SpectateComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the loading state before the live games list arrives', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('.loading')).not.toBeNull();
  });

  it('shows the empty state with a link to online play once loaded with no games', () => {
    const fixture = setup();
    mockSocket.trigger('liveGames', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.empty-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.empty-state a').getAttribute('href')).toBe('/game/online');
  });

  it('renders a game card per live game, with featured and high-level sections separated', () => {
    const fixture = setup();
    mockSocket.trigger('liveGames', [
      game({ id: 'featured', isFeatured: true }),
      game({ id: 'high-level', whitePlayer: { id: 'w', name: 'W', rating: 2100 }, blackPlayer: { id: 'b', name: 'B', rating: 2200 } }),
      game({ id: 'plain' }),
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.games-grid .game-card').length).toBe(5); // featured + high-level + 3 in the full list
    expect(fixture.nativeElement.querySelector('.games-section.featured')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('3 parties');
    expect(fixture.nativeElement.textContent).toContain('9 spectateurs');
  });

  it('navigates to the spectate route for a game when clicked', () => {
    const fixture = setup();
    mockSocket.trigger('liveGames', [game()]);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    fixture.nativeElement.querySelector('.game-card').click();
    expect(navigateSpy).toHaveBeenCalledWith(['/spectate', 'g1']);
  });

  it('exposes getRatingClass matching the spectator service thresholds', () => {
    const fixture = setup();
    const service = TestBed.inject(SpectatorService);
    expect(fixture.componentInstance.getRatingClass(2100)).toBe(service.getRatingClass(2100));
    expect(fixture.componentInstance.getRatingClass(1000)).toBe('beginner');
  });

  it('formats the game duration in minutes and hours', () => {
    const fixture = setup();
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    const twoHoursAgo = new Date(Date.now() - 125 * 60_000).toISOString();

    expect(fixture.componentInstance.formatDuration(new Date().toISOString())).toBe("À l'instant");
    expect(fixture.componentInstance.formatDuration(fiveMinAgo)).toBe('5 min');
    expect(fixture.componentInstance.formatDuration(twoHoursAgo)).toBe('2h 5min');
  });
});
