import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { LobbyComponent } from './lobby.component';
import { OnlineService } from '../../core/services';
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

function room(overrides: Partial<GameRoom> = {}): GameRoom {
  return {
    id: 'room1',
    name: 'Room',
    isPrivate: false,
    variant: 'international',
    hostPlayer: { id: 'p1', name: 'Alice' } as OnlinePlayer,
    players: [],
    status: 'waiting',
    ...overrides,
  } as GameRoom;
}

function routeWithVariant(variant: string | null) {
  return {
    snapshot: {
      queryParamMap: convertToParamMap(variant ? { variant } : {}),
    },
  };
}

describe('LobbyComponent', () => {
  let onlineService: OnlineService;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSocket = createMockSocket();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: routeWithVariant(null) },
      ],
    });
    onlineService = TestBed.inject(OnlineService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setup() {
    const fixture = TestBed.createComponent(LobbyComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the connect form with the submit button disabled until a name is entered', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('.connect-form')).not.toBeNull();

    const submit = fixture.nativeElement.querySelector('.connect-form button[type=submit]');
    expect(submit.disabled).toBe(true);

    fixture.componentInstance.playerName.set('Alice');
    fixture.detectChanges();
    expect(submit.disabled).toBe(false);
  });

  it('connects with the trimmed player name on submit', () => {
    const fixture = setup();
    const connectSpy = vi.spyOn(onlineService, 'connect');
    fixture.componentInstance.playerName.set('  Alice  ');

    fixture.componentInstance.connect({ preventDefault: () => {} } as unknown as Event);

    expect(connectSpy).toHaveBeenCalledWith('Alice');
  });

  it('shows the room list and player info once connected', () => {
    const fixture = setup();
    onlineService.connect('Alice');
    mockSocket.trigger('connect');
    mockSocket.trigger('player:info', { id: 'p1', name: 'Alice' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.player-name').textContent).toBe('Alice');
    expect(fixture.nativeElement.querySelector('.empty-message')).not.toBeNull();

    mockSocket.trigger('room:list', { rooms: [room({ id: 'r1', status: 'waiting' }), room({ id: 'r2', status: 'playing' })] });
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.room-card');
    expect(cards.length).toBe(2);
    expect(cards[0].querySelector('button').disabled).toBe(false);
    expect(cards[1].querySelector('button').disabled).toBe(true);
  });

  it('creates a room with the entered settings, defaulting the name when left blank', () => {
    const fixture = setup();
    onlineService.connect('Alice');
    mockSocket.trigger('connect');
    mockSocket.trigger('player:info', { id: 'p1', name: 'Alice' });
    fixture.detectChanges();

    const createRoomSpy = vi.spyOn(onlineService, 'createRoom');
    fixture.componentInstance.selectedVariant.set('ludo');
    fixture.componentInstance.isPrivate.set(true);

    fixture.componentInstance.createRoom({ preventDefault: () => {} } as unknown as Event);

    expect(createRoomSpy).toHaveBeenCalledWith('Partie de Alice', true, 'ludo', undefined);
  });

  it('joins a room and navigates once the server confirms the join', () => {
    const fixture = setup();
    onlineService.connect('Alice');
    mockSocket.trigger('connect');
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    fixture.componentInstance.joinRoom('r1');
    expect(mockSocket.emit).toHaveBeenCalledWith('room:join', { roomId: 'r1' });

    mockSocket.trigger('room:joined', { room: room({ id: 'r1' }), player: { id: 'p1', name: 'Alice' } });
    vi.advanceTimersByTime(100);

    expect(navigateSpy).toHaveBeenCalledWith(['/game/online', 'r1']);
  });

  it('sets the ludo variant from the query param on init', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: routeWithVariant('ludo') },
      ],
    });
    const fixture = setup();
    expect(fixture.componentInstance.selectedVariant()).toBe('ludo');
  });

  it('getStatusText reflects the "disconnected" status before connecting', () => {
    const fixture = setup();
    expect(fixture.componentInstance.getStatusText()).toBe('Déconnecté');
  });

  it('getStatusText reflects the "connecting" status right after calling connect', () => {
    const fixture = setup();
    onlineService.connect('Alice');
    expect(fixture.componentInstance.getStatusText()).toBe('Connexion...');
  });

  it('getStatusText reflects the "connected" status once the socket connects', () => {
    const fixture = setup();
    onlineService.connect('Alice');
    mockSocket.trigger('connect');
    expect(fixture.componentInstance.getStatusText()).toBe('Connecté');
  });

  it('getStatusText reflects the "reconnecting" status', () => {
    const fixture = setup();
    onlineService.connect('Alice');
    mockSocket.trigger('reconnecting');
    expect(fixture.componentInstance.getStatusText()).toBe('Reconnexion...');
  });

  it('getStatusText reflects the "error" status on a connection error', () => {
    const fixture = setup();
    onlineService.connect('Alice');
    mockSocket.trigger('connect_error', new Error('nope'));
    expect(fixture.componentInstance.getStatusText()).toBe('Erreur');
  });

  it.each([
    ['waiting' as const, 'En attente'],
    ['playing' as const, 'En cours'],
    ['finished' as const, 'Terminée'],
  ])('getRoomStatusText maps %s to "%s"', (status, expected) => {
    const fixture = setup();
    expect(fixture.componentInstance.getRoomStatusText(room({ status }))).toBe(expected);
  });

  it('disconnects and stops refreshing rooms', () => {
    const fixture = setup();
    onlineService.connect('Alice');
    mockSocket.trigger('connect');
    fixture.detectChanges();

    const disconnectSpy = vi.spyOn(onlineService, 'disconnect');
    fixture.componentInstance.disconnect();

    expect(disconnectSpy).toHaveBeenCalled();
  });
});
