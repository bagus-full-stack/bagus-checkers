import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { GameOnlineCheckersComponent } from './game-online-checkers.component';
import { OnlineService, GameEngineService, ReplayService } from '../../core/services';
import { GameRoom, OnlinePlayer } from '../../core/models';

type Listener = (...args: unknown[]) => void;

function createMockSocket() {
  const listeners = new Map<string, Listener[]>();
  return {
    connected: false,
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

function player(overrides: Partial<OnlinePlayer> = {}): OnlinePlayer {
  return { id: 'p1', name: 'Alice', isReady: false, isConnected: true, ...overrides };
}

function room(overrides: Partial<GameRoom> = {}): GameRoom {
  return {
    id: 'room1',
    name: 'Room',
    hostPlayer: player({ id: 'p1', name: 'Alice' }),
    guestPlayer: player({ id: 'p2', name: 'Bob' }),
    status: 'playing',
    createdAt: Date.now(),
    isPrivate: false,
    variant: 'international',
    ...overrides,
  };
}

function routeWithRoomId(roomId: string | null) {
  return { snapshot: { paramMap: convertToParamMap(roomId ? { roomId } : {}) } };
}

describe('GameOnlineCheckersComponent', () => {
  let onlineService: OnlineService;

  beforeEach(() => {
    mockSocket = createMockSocket();
  });

  function configure(roomId: string | null = null) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ActivatedRoute, useValue: routeWithRoomId(roomId) }],
    });
    onlineService = TestBed.inject(OnlineService);
  }

  function connectAsHost(roomOverrides: Partial<GameRoom> = {}) {
    onlineService.connect('Alice');
    mockSocket.connected = true;
    mockSocket.trigger('connect');
    mockSocket.trigger('room:joined', { room: room(roomOverrides), player: player({ id: 'p1', name: 'Alice' }) });
  }

  function createFixture() {
    const fixture = TestBed.createComponent(GameOnlineCheckersComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('redirects to the lobby when there is no current room and no room id in the route', () => {
    configure(null);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');
    createFixture();

    expect(navigateSpy).toHaveBeenCalledWith(['/game/online']);
  });

  it('joins the room from the route param when connected but no room is set yet', () => {
    configure('room1');
    onlineService.connect('Alice');
    mockSocket.connected = true;
    mockSocket.trigger('connect');

    const joinRoomSpy = vi.spyOn(onlineService, 'joinRoom');
    createFixture();

    expect(joinRoomSpy).toHaveBeenCalledWith('room1');
  });

  it('syncs the game engine state from the server on "game:started" and "game:move"', () => {
    configure(null);
    connectAsHost();
    const fixture = createFixture();
    const gameEngine = TestBed.inject(GameEngineService);

    mockSocket.trigger('game:started', {
      room: room(),
      initialState: { pieces: [], currentPlayer: 'white', status: 'playing' },
    });
    fixture.detectChanges();
    expect(gameEngine.status()).toBe('playing');
    expect(gameEngine.currentPlayer()).toBe('white');

    mockSocket.trigger('game:move', {
      move: {
        piece: { id: 'w-0', color: 'white', type: 'pawn', position: { row: 0, col: 0 } },
        from: { row: 0, col: 0 },
        to: { row: 1, col: 1 },
        capturedPieces: [],
        isPromotion: false,
      },
      gameState: { pieces: [], currentPlayer: 'black', status: 'playing' },
    });
    fixture.detectChanges();
    expect(gameEngine.currentPlayer()).toBe('black');
    expect(gameEngine.moveHistory().length).toBe(1);
  });

  it('shows the board locked while it is not the host\'s turn', () => {
    configure(null);
    connectAsHost();
    const fixture = createFixture();

    mockSocket.trigger('game:started', {
      room: room(),
      initialState: { pieces: [], currentPlayer: 'black', status: 'playing' },
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.isMyTurn()).toBe(false);
    expect(fixture.nativeElement.querySelector('.board-section').classList.contains('locked')).toBe(true);
  });

  it('toggles ready state via the checkbox, calling the online service', () => {
    configure(null);
    connectAsHost({ status: 'waiting' });
    const fixture = createFixture();

    const setReadySpy = vi.spyOn(onlineService, 'setReady');
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('.ready-toggle input');
    checkbox.dispatchEvent(new Event('change'));

    expect(fixture.componentInstance.isReady()).toBe(true);
    expect(setReadySpy).toHaveBeenCalledWith(true);
  });

  it('shows the room code for the host and copies it to the clipboard', () => {
    configure(null);
    connectAsHost({ status: 'waiting', guestPlayer: undefined });
    const fixture = createFixture();

    expect(fixture.nativeElement.querySelector('.room-code').textContent).toContain('room1');

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    fixture.componentInstance.copyRoomCode();
    expect(writeText).toHaveBeenCalledWith('room1');
  });

  it('shows an empty chat message, then renders sent messages and clears the input', () => {
    configure(null);
    connectAsHost();
    const fixture = createFixture();
    expect(fixture.nativeElement.querySelector('.chat-empty')).not.toBeNull();

    const sendChatSpy = vi.spyOn(onlineService, 'sendChatMessage');
    fixture.componentInstance.chatInput.set('  hello  ');
    fixture.componentInstance.sendMessage({ preventDefault: () => {} } as unknown as Event);

    expect(sendChatSpy).toHaveBeenCalledWith('hello');
    expect(fixture.componentInstance.chatInput()).toBe('');

    mockSocket.trigger('chat:message', { id: 'm1', playerId: 'p2', playerName: 'Bob', message: 'hi', timestamp: Date.now() });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.chat-empty')).toBeNull();
    expect(fixture.nativeElement.querySelector('.chat-message').textContent).toContain('Bob');
  });

  it('leaves the room and navigates back to the lobby', () => {
    configure(null);
    connectAsHost();
    const fixture = createFixture();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');
    const leaveRoomSpy = vi.spyOn(onlineService, 'leaveRoom');

    fixture.componentInstance.leaveRoom();

    expect(leaveRoomSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/game/online']);
  });

  it('shows the game-over modal with the result, and lets the winning host save a replay', () => {
    configure(null);
    connectAsHost();
    const fixture = createFixture();

    mockSocket.trigger('game:started', {
      room: room(),
      initialState: { pieces: [], currentPlayer: 'white', status: 'playing' },
    });
    mockSocket.trigger('game:move', {
      move: {
        piece: { id: 'w-0', color: 'white', type: 'pawn', position: { row: 0, col: 0 } },
        from: { row: 0, col: 0 },
        to: { row: 1, col: 1 },
        capturedPieces: [],
        isPromotion: false,
      },
      gameState: { pieces: [], currentPlayer: 'white', status: 'finished', winner: 'white' },
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.isGameOver()).toBe(true);
    expect(fixture.componentInstance.isWinner()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-game-over-modal')).not.toBeNull();

    const saveGameSpy = vi.spyOn(TestBed.inject(ReplayService), 'saveGame');
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    fixture.componentInstance.saveReplay();
    expect(saveGameSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'Alice',
      'Bob',
      'white',
      expect.anything(),
      'Dames Internationales',
      expect.anything(),
    );

    fixture.componentInstance.closeModal();
    expect(fixture.componentInstance.showModal()).toBe(false);

    fixture.componentInstance.requestRematch();
    expect(fixture.componentInstance.isReady()).toBe(false);
  });
});
