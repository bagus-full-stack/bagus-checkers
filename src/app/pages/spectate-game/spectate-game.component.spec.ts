import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { SpectateGameComponent } from './spectate-game.component';
import { SpectatorGame, SpectatorState } from '../../core/services/spectator.service';
import { GameState, createPosition, Piece } from '../../core/models';

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
    whitePlayer: { id: 'w', name: 'Alice', rating: 1200 },
    blackPlayer: { id: 'b', name: 'Bob', rating: 1200 },
    status: 'playing',
    currentPlayer: 'white',
    moveCount: 0,
    spectatorCount: 0,
    startedAt: new Date().toISOString(),
    variant: 'international',
    timeMode: 'rapid',
    isHighLevel: false,
    isFeatured: false,
    ...overrides,
  };
}

function piece(overrides: Partial<Piece> = {}): Piece {
  return { id: 'w-0', color: 'white', type: 'pawn', position: createPosition(0, 0), ...overrides };
}

function gameState(overrides: Partial<GameState> = {}): GameState {
  return {
    pieces: [piece()],
    currentPlayer: 'white',
    status: 'playing',
    moveHistory: [],
    validMoves: [],
    mustCapture: false,
    ...overrides,
  };
}

function spectatorState(overrides: Partial<SpectatorState> = {}): SpectatorState {
  return {
    game: game(),
    gameState: gameState(),
    comments: [],
    liveViewers: 1,
    ...overrides,
  };
}

function routeWithId(id: string | null) {
  return { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } };
}

describe('SpectateGameComponent', () => {
  beforeEach(() => {
    mockSocket = createMockSocket();
  });

  function setup(id: string | null = 'g1') {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ActivatedRoute, useValue: routeWithId(id) }],
    });
    const fixture = TestBed.createComponent(SpectateGameComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('redirects to /spectate when no game id is present in the route', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ActivatedRoute, useValue: routeWithId(null) }],
    });
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');
    const fixture = TestBed.createComponent(SpectateGameComponent);
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['/spectate']);
    expect(mockSocket.emit).not.toHaveBeenCalledWith('spectateGame', expect.anything());
  });

  it('spectates the requested game id on init and shows the loading state until data arrives', () => {
    const fixture = setup('g1');
    expect(mockSocket.emit).toHaveBeenCalledWith('spectateGame', 'g1');
    expect(fixture.nativeElement.querySelector('.loading-state')).not.toBeNull();
  });

  it('renders both players once the spectator state arrives, highlighting whoever is to move', () => {
    const fixture = setup('g1');
    mockSocket.trigger('spectatorState', spectatorState());
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.loading-state')).toBeNull();
    const cards = fixture.nativeElement.querySelectorAll('.player-card');
    expect(cards[0].textContent).toContain('Alice');
    expect(cards[0].classList.contains('active')).toBe(true);
    expect(cards[1].textContent).toContain('Bob');
    expect(cards[1].classList.contains('active')).toBe(false);
  });

  it('shows an empty-comments message, then renders comments as they arrive', () => {
    const fixture = setup('g1');
    mockSocket.trigger('spectatorState', spectatorState());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.no-comments')).not.toBeNull();

    mockSocket.trigger('newComment', { id: 'c1', oderId: 'g1', playerId: 'p1', playerName: 'Zoe', message: 'Belle partie', timestamp: new Date().toISOString() });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.no-comments')).toBeNull();
    expect(fixture.nativeElement.querySelector('.comment').textContent).toContain('Zoe');
    expect(fixture.nativeElement.querySelector('.comment').textContent).toContain('Belle partie');
  });

  it('disables the send button until text is entered, and sends + clears the comment on submit', () => {
    const fixture = setup('g1');
    mockSocket.trigger('spectatorState', spectatorState());
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.send-btn');
    expect(button.disabled).toBe(true);

    fixture.componentInstance.commentInput.set('  hello  ');
    fixture.detectChanges();
    expect(button.disabled).toBe(false);

    fixture.componentInstance.sendComment({ preventDefault: () => {} } as unknown as Event);
    expect(mockSocket.emit).toHaveBeenCalledWith('sendComment', { gameId: 'g1', message: 'hello' });
    expect(fixture.componentInstance.commentInput()).toBe('');
  });

  it('shows the game-over overlay with the winner once the game finishes', () => {
    const fixture = setup('g1');
    mockSocket.trigger('spectatorState', spectatorState({
      game: game({ status: 'finished' }),
      gameState: gameState({ status: 'finished', result: { winner: 'white', reason: 'resignation' } }),
    }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.game-over-overlay')).not.toBeNull();
    expect(fixture.componentInstance.getWinnerText()).toBe('Alice a gagné !');
  });

  it('computes the captured piece count from remaining pieces on a 10x10 board', () => {
    const fixture = setup('g1');
    mockSocket.trigger('spectatorState', spectatorState({
      gameState: gameState({ pieces: [piece({ id: 'w-0' }), piece({ id: 'w-1' })] }),
    }));
    fixture.detectChanges();

    expect(fixture.componentInstance.getCapturedCount('white')).toHaveLength(18);
  });

  it('emits stopSpectating when leaving the page', () => {
    const fixture = setup('g1');
    mockSocket.trigger('spectatorState', spectatorState());
    fixture.detectChanges();

    fixture.componentInstance.stopSpectating();
    expect(mockSocket.emit).toHaveBeenCalledWith('stopSpectating', 'g1');
  });
});
