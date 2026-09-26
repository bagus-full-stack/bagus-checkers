import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { convertToParamMap } from '@angular/router';
import { GameOnlineComponent } from './game-online.component';
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

function routeWithRoomId(roomId: string | null) {
  return {
    snapshot: {
      paramMap: convertToParamMap(roomId ? { roomId } : {}),
    },
  };
}

describe('GameOnlineComponent', () => {
  beforeEach(() => {
    mockSocket = createMockSocket();
  });

  function configure(roomId: string | null = null) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: routeWithRoomId(roomId) },
      ],
    });
    return TestBed.inject(OnlineService);
  }

  function createFixture() {
    const fixture = TestBed.createComponent(GameOnlineComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the connecting overlay when not connected to a room', () => {
    configure();
    const fixture = createFixture();
    expect(fixture.nativeElement.textContent).toContain('Connexion au lobby');
    expect(fixture.nativeElement.querySelector('app-game-online-checkers')).toBeNull();
  });

  it('redirects to the lobby when a roomId is present but not connected', () => {
    configure('room1');
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');
    createFixture();
    expect(navigateSpy).toHaveBeenCalledWith(['/lobby']);
  });

  it('joins the room when a roomId is present and already connected', () => {
    const onlineService = configure('room1');
    onlineService.connect('Alice');
    mockSocket.connected = true;
    mockSocket.trigger('connect');

    const joinRoomSpy = vi.spyOn(onlineService, 'joinRoom');
    createFixture();
    expect(joinRoomSpy).toHaveBeenCalledWith('room1');
  });

  it('shows the checkers interface once connected to a non-ludo room', () => {
    const onlineService = configure();
    onlineService.connect('Alice');
    mockSocket.connected = true;
    mockSocket.trigger('connect');
    mockSocket.trigger('room:joined', { room: room(), player: { id: 'p1', name: 'Alice' } });

    const fixture = createFixture();
    expect(fixture.nativeElement.querySelector('app-game-online-checkers')).not.toBeNull();
  });

  it('shows the ludo interface once connected to a ludo room', () => {
    const onlineService = configure();
    onlineService.connect('Alice');
    mockSocket.connected = true;
    mockSocket.trigger('connect');
    mockSocket.trigger('room:joined', { room: room({ variant: 'ludo' }), player: { id: 'p1', name: 'Alice' } });

    const fixture = createFixture();
    expect(fixture.nativeElement.querySelector('app-game-online-ludo')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-game-online-checkers')).toBeNull();
  });
});
