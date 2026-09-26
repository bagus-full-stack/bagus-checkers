import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { GameOnlineLudoComponent } from './game-online-ludo.component';
import { OnlineService, LudoEngineService } from '../../core/services';
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
    players: [player({ id: 'p1', name: 'Alice', color: 'red' }), player({ id: 'p2', name: 'Bob', color: 'blue' })],
    status: 'playing',
    createdAt: Date.now(),
    isPrivate: false,
    variant: 'ludo',
    ...overrides,
  };
}

function routeWithRoomId(roomId: string | null) {
  return { snapshot: { paramMap: convertToParamMap(roomId ? { roomId } : {}) } };
}

describe('GameOnlineLudoComponent', () => {
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
    const fixture = TestBed.createComponent(GameOnlineLudoComponent);
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

  it('resolves the player\'s color from the room\'s player list', () => {
    configure(null);
    connectAsHost();
    const fixture = createFixture();

    expect(fixture.componentInstance.myColor()).toBe('red');
  });

  it('syncs the ludo engine state from the server on "game:started" and "game:ludo:update"', () => {
    configure(null);
    connectAsHost();
    const fixture = createFixture();
    const ludoEngine = TestBed.inject(LudoEngineService);

    mockSocket.trigger('game:started', {
      room: room(),
      initialState: { pieces: [], currentPlayer: 'red', status: 'playing', phase: 'rolling', consecutiveSixes: 0, players: ['red', 'blue'] },
    });
    fixture.detectChanges();
    expect(ludoEngine.status()).toBe('playing');
    expect(ludoEngine.currentPlayer()).toBe('red');

    mockSocket.trigger('game:ludo:update', {
      gameState: { pieces: [], currentPlayer: 'blue', status: 'playing', phase: 'rolling', consecutiveSixes: 0, players: ['red', 'blue'] },
    });
    fixture.detectChanges();
    expect(ludoEngine.currentPlayer()).toBe('blue');
  });

  it('toggles ready state via the checkbox, and shows the room code for the host', () => {
    configure(null);
    connectAsHost({ status: 'waiting' });
    const fixture = createFixture();

    const setReadySpy = vi.spyOn(onlineService, 'setReady');
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('.ready-toggle input');
    checkbox.dispatchEvent(new Event('change'));

    expect(fixture.componentInstance.isReady()).toBe(true);
    expect(setReadySpy).toHaveBeenCalledWith(true);
    expect(fixture.nativeElement.querySelector('.room-code').textContent).toContain('room1');
  });

  it('copies the room code to the clipboard', () => {
    configure(null);
    connectAsHost({ status: 'waiting' });
    const fixture = createFixture();

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    fixture.componentInstance.copyRoomCode();
    expect(writeText).toHaveBeenCalledWith('room1');
  });

  it('rolls the dice on the current player\'s turn, disabling the dice while rolling', () => {
    configure(null);
    connectAsHost();
    const fixture = createFixture();

    mockSocket.trigger('game:started', {
      room: room(),
      initialState: { pieces: [], currentPlayer: 'red', status: 'playing', phase: 'rolling', consecutiveSixes: 0, players: ['red', 'blue'] },
    });
    fixture.detectChanges();

    vi.useFakeTimers();
    const sendLudoRollSpy = vi.spyOn(onlineService, 'sendLudoRoll');
    fixture.componentInstance.onRollDice();
    expect(fixture.componentInstance.isRollingDice()).toBe(true);

    vi.advanceTimersByTime(500);
    expect(sendLudoRollSpy).toHaveBeenCalled();
    expect(fixture.componentInstance.isRollingDice()).toBe(false);
    vi.useRealTimers();
  });

  it('does not roll the dice when it is not the player\'s turn', () => {
    configure(null);
    connectAsHost();
    const fixture = createFixture();

    mockSocket.trigger('game:started', {
      room: room(),
      initialState: { pieces: [], currentPlayer: 'blue', status: 'playing', phase: 'rolling', consecutiveSixes: 0, players: ['red', 'blue'] },
    });
    fixture.detectChanges();

    const sendLudoRollSpy = vi.spyOn(onlineService, 'sendLudoRoll');
    fixture.componentInstance.onRollDice();
    expect(sendLudoRollSpy).not.toHaveBeenCalled();
  });

  it('sends the selected piece to the server when a movable piece is clicked', () => {
    configure(null);
    connectAsHost();
    const fixture = createFixture();
    const ludoEngine = TestBed.inject(LudoEngineService);

    mockSocket.trigger('game:started', {
      room: room(),
      initialState: { pieces: [], currentPlayer: 'red', status: 'playing', phase: 'moving', consecutiveSixes: 0, players: ['red', 'blue'] },
    });
    fixture.detectChanges();

    const piece = { id: 'r-0', color: 'red' as const, type: 'pawn' as const, position: { row: 2, col: 2 } };
    vi.spyOn(ludoEngine, 'movableOptions').mockReturnValue([{ piece, steps: 3, destination: { row: 2, col: 5 }, capturedPieceIds: [] }]);

    const sendLudoMoveSpy = vi.spyOn(onlineService, 'sendLudoMove');
    fixture.componentInstance.onPieceClicked(piece);
    expect(sendLudoMoveSpy).toHaveBeenCalledWith('r-0');
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

  it('shows the game-over modal once finished, and closeModal/requestRematch reset local state', () => {
    configure(null);
    connectAsHost();
    const fixture = createFixture();

    mockSocket.trigger('game:started', {
      room: room(),
      initialState: { pieces: [], currentPlayer: 'red', status: 'finished', phase: 'rolling', consecutiveSixes: 0, players: ['red', 'blue'], winner: 'red' },
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.isGameOver()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-game-over-modal')).not.toBeNull();

    vi.spyOn(window, 'alert').mockImplementation(() => {});
    fixture.componentInstance.saveReplay();
    expect(window.alert).toHaveBeenCalled();

    fixture.componentInstance.closeModal();
    expect(fixture.componentInstance.showModal()).toBe(false);

    fixture.componentInstance.requestRematch();
    expect(fixture.componentInstance.isReady()).toBe(false);
  });
});
