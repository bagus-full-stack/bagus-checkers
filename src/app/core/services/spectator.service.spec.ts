import { TestBed } from '@angular/core/testing';
import { SpectatorService, SpectatorGame, SpectatorState } from './spectator.service';

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

// SpectatorService opens a real socket.io connection from its constructor -
// replace the client library so tests drive the registered listeners directly.
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

describe('SpectatorService', () => {
  let service: SpectatorService;

  beforeEach(() => {
    mockSocket = createMockSocket();
    TestBed.configureTestingModule({});
    service = TestBed.inject(SpectatorService);
  });

  it('connects and registers listeners on construction', () => {
    expect(mockSocket.on).toHaveBeenCalledWith('liveGames', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('spectatorState', expect.any(Function));
  });

  it('marks itself connected and refreshes live games on the socket "connect" event', () => {
    mockSocket.trigger('connect');
    expect(service.isConnected()).toBe(true);
    expect(mockSocket.emit).toHaveBeenCalledWith('getLiveGames');
  });

  it('marks itself disconnected on the socket "disconnect" event', () => {
    mockSocket.trigger('connect');
    mockSocket.trigger('disconnect');
    expect(service.isConnected()).toBe(false);
  });

  it('liveGames flags high-level games (both players >= 1600) and computes aggregates', () => {
    const highLevel = game({ id: 'hl', whitePlayer: { id: 'w', name: 'W', rating: 1700 }, blackPlayer: { id: 'b', name: 'B', rating: 1650 }, spectatorCount: 5 });
    const casual = game({ id: 'cas', isFeatured: true, spectatorCount: 2 });
    mockSocket.trigger('liveGames', [highLevel, casual]);

    expect(service.liveGames().find((g) => g.id === 'hl')?.isHighLevel).toBe(true);
    expect(service.liveGames().find((g) => g.id === 'cas')?.isHighLevel).toBe(false);
    expect(service.highLevelGames()).toHaveLength(1);
    expect(service.featuredGames()).toHaveLength(1);
    expect(service.totalSpectators()).toBe(7);
    expect(service.isLoading()).toBe(false);
  });

  it('gameStarted replaces an existing entry with the same id', () => {
    mockSocket.trigger('liveGames', [game({ id: 'g1', moveCount: 3 })]);
    mockSocket.trigger('gameStarted', game({ id: 'g1', moveCount: 0 }));
    expect(service.liveGames()).toHaveLength(1);
    expect(service.liveGames()[0].moveCount).toBe(0);
  });

  it('gameEnded removes the game from the live list and marks a currently spectated match as finished', () => {
    mockSocket.trigger('liveGames', [game({ id: 'g1' })]);
    mockSocket.trigger('spectatorState', {
      game: game({ id: 'g1' }),
      gameState: {} as SpectatorState['gameState'],
      comments: [],
      liveViewers: 1,
    });

    mockSocket.trigger('gameEnded', 'g1');

    expect(service.liveGames()).toHaveLength(0);
    expect(service.currentSpectating()?.game.status).toBe('finished');
  });

  it('spectatorState sets the current spectating state and comments', () => {
    const state: SpectatorState = {
      game: game({ id: 'g1' }),
      gameState: {} as SpectatorState['gameState'],
      comments: [{ id: 'c1', oderId: 'g1', playerId: 'p1', playerName: 'P', message: 'hi', timestamp: '' }],
      liveViewers: 4,
    };
    mockSocket.trigger('spectatorState', state);
    expect(service.currentSpectating()).toEqual(state);
    expect(service.comments()).toEqual(state.comments);
  });

  it('moveMade updates game state and move count only for the currently spectated game', () => {
    mockSocket.trigger('spectatorState', {
      game: game({ id: 'g1', moveCount: 0 }),
      gameState: { currentPlayer: 'white' } as SpectatorState['gameState'],
      comments: [],
      liveViewers: 0,
    });

    mockSocket.trigger('moveMade', {
      gameId: 'g1',
      move: {},
      gameState: { currentPlayer: 'black' },
    });

    expect(service.currentSpectating()?.game.moveCount).toBe(1);
    expect(service.currentSpectating()?.game.currentPlayer).toBe('black');
  });

  it('newComment appends to the comment list', () => {
    mockSocket.trigger('spectatorState', { game: game(), gameState: {} as SpectatorState['gameState'], comments: [], liveViewers: 0 });
    mockSocket.trigger('newComment', { id: 'c1', oderId: 'g1', playerId: 'p1', playerName: 'P', message: 'hello', timestamp: '' });
    expect(service.comments()).toHaveLength(1);
  });

  it('spectatorCount updates the matching game and the current spectating viewer count', () => {
    mockSocket.trigger('liveGames', [game({ id: 'g1', spectatorCount: 0 })]);
    mockSocket.trigger('spectatorState', { game: game({ id: 'g1' }), gameState: {} as SpectatorState['gameState'], comments: [], liveViewers: 0 });

    mockSocket.trigger('spectatorCount', { gameId: 'g1', count: 9 });

    expect(service.liveGames()[0].spectatorCount).toBe(9);
    expect(service.currentSpectating()?.liveViewers).toBe(9);
  });

  it('refreshLiveGames is a no-op when the socket is not connected', () => {
    mockSocket.connected = false;
    service.refreshLiveGames();
    expect(mockSocket.emit).not.toHaveBeenCalledWith('getLiveGames');
  });

  it('spectateGame stops any previous spectating session and emits the new request', () => {
    mockSocket.trigger('spectatorState', { game: game({ id: 'old' }), gameState: {} as SpectatorState['gameState'], comments: [], liveViewers: 0 });
    service.spectateGame('new-game');
    expect(mockSocket.emit).toHaveBeenCalledWith('stopSpectating', 'old');
    expect(mockSocket.emit).toHaveBeenCalledWith('spectateGame', 'new-game');
  });

  it('stopSpectating emits and clears local state', () => {
    mockSocket.trigger('spectatorState', { game: game({ id: 'g1' }), gameState: {} as SpectatorState['gameState'], comments: [{ id: 'c1', oderId: 'g1', playerId: 'p1', playerName: 'P', message: 'x', timestamp: '' }], liveViewers: 0 });
    service.stopSpectating();
    expect(mockSocket.emit).toHaveBeenCalledWith('stopSpectating', 'g1');
    expect(service.currentSpectating()).toBeNull();
    expect(service.comments()).toEqual([]);
  });

  it('sendComment trims the message and is a no-op without an active spectating session', () => {
    service.sendComment('  hi  ');
    expect(mockSocket.emit).not.toHaveBeenCalledWith('sendComment', expect.anything());

    mockSocket.trigger('spectatorState', { game: game({ id: 'g1' }), gameState: {} as SpectatorState['gameState'], comments: [], liveViewers: 0 });
    service.sendComment('  hi  ');
    expect(mockSocket.emit).toHaveBeenCalledWith('sendComment', { gameId: 'g1', message: 'hi' });
  });

  it('featureGame emits the feature request', () => {
    service.featureGame('g1', true);
    expect(mockSocket.emit).toHaveBeenCalledWith('featureGame', { gameId: 'g1', featured: true });
  });

  it('getGameById finds a game from the live list', () => {
    mockSocket.trigger('liveGames', [game({ id: 'g1' })]);
    expect(service.getGameById('g1')?.id).toBe('g1');
    expect(service.getGameById('missing')).toBeUndefined();
  });

  it('formatPlayerInfo formats name and rating', () => {
    expect(service.formatPlayerInfo({ id: 'p', name: 'Alice', rating: 1500 })).toBe('Alice (1500)');
  });

  it.each([
    [2100, 'master'],
    [1900, 'expert'],
    [1700, 'advanced'],
    [1500, 'intermediate'],
    [1000, 'beginner'],
  ])('getRatingClass(%i) returns %s', (rating, expected) => {
    expect(service.getRatingClass(rating)).toBe(expected);
  });

  it('disconnect stops the socket and marks the service disconnected', () => {
    mockSocket.trigger('connect');
    service.disconnect();
    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(service.isConnected()).toBe(false);
  });
});
