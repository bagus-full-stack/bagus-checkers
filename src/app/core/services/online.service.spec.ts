import { TestBed } from '@angular/core/testing';
import { OnlineService } from './online.service';
import { GameRoom, OnlinePlayer } from '../models';

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

describe('OnlineService', () => {
  let service: OnlineService;

  beforeEach(() => {
    mockSocket = createMockSocket();
    TestBed.configureTestingModule({});
    service = TestBed.inject(OnlineService);
  });

  it('starts disconnected with no room or player', () => {
    expect(service.connectionStatus()).toBe('disconnected');
    expect(service.isConnected()).toBe(false);
    expect(service.isInRoom()).toBe(false);
    expect(service.currentRoom()).toBeNull();
  });

  describe('connect', () => {
    it('creates a socket and moves to the connecting state', () => {
      service.connect('Alice');
      expect(service.connectionStatus()).toBe('connecting');
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    it('does not create a second socket if already connected', () => {
      service.connect('Alice');
      mockSocket.connected = true;
      const onCallsBefore = mockSocket.on.mock.calls.length;
      service.connect('Alice');
      expect(mockSocket.on.mock.calls.length).toBe(onCallsBefore);
    });
  });

  describe('connection events', () => {
    beforeEach(() => service.connect('Alice'));

    it('"connect" marks the service connected and clears any error', () => {
      mockSocket.trigger('connect');
      expect(service.connectionStatus()).toBe('connected');
      expect(service.isConnected()).toBe(true);
      expect(service.error()).toBeNull();
    });

    it('"disconnect" marks the service disconnected', () => {
      mockSocket.trigger('connect');
      mockSocket.trigger('disconnect');
      expect(service.connectionStatus()).toBe('disconnected');
    });

    it('"connect_error" sets an error status and message', () => {
      mockSocket.trigger('connect_error', new Error('boom'));
      expect(service.connectionStatus()).toBe('error');
      expect(service.error()).toBe('Impossible de se connecter au serveur');
    });

    it('"reconnecting" updates the status', () => {
      mockSocket.trigger('reconnecting');
      expect(service.connectionStatus()).toBe('reconnecting');
    });

    it('"error" sets the error message', () => {
      mockSocket.trigger('error', { code: 'X', message: 'bad thing' });
      expect(service.error()).toBe('bad thing');
    });
  });

  describe('room events', () => {
    beforeEach(() => service.connect('Alice'));

    it('"player:info" sets the current player', () => {
      const player = { id: 'p1', name: 'Alice' } as OnlinePlayer;
      mockSocket.trigger('player:info', player);
      expect(service.currentPlayer()).toEqual(player);
    });

    it('"room:created" sets the current room', () => {
      mockSocket.trigger('room:created', { room: room() });
      expect(service.currentRoom()?.id).toBe('room1');
      expect(service.isInRoom()).toBe(true);
    });

    it('"room:joined" sets the room and player only if no player is set yet', () => {
      const player = { id: 'p2', name: 'Bob' } as OnlinePlayer;
      mockSocket.trigger('room:joined', { room: room(), player });
      expect(service.currentRoom()?.id).toBe('room1');
      expect(service.currentPlayer()).toEqual(player);

      const otherPlayer = { id: 'p3', name: 'Carol' } as OnlinePlayer;
      mockSocket.trigger('room:joined', { room: room(), player: otherPlayer });
      expect(service.currentPlayer()).toEqual(player); // unchanged
    });

    it('"room:left" clears the room when it is the current player leaving', () => {
      mockSocket.trigger('player:info', { id: 'p1', name: 'Alice' } as OnlinePlayer);
      mockSocket.trigger('room:created', { room: room() });
      mockSocket.trigger('room:left', { room: null, playerId: 'p1' });
      expect(service.currentRoom()).toBeNull();
    });

    it('"room:left" updates the room (without clearing) when another player leaves', () => {
      mockSocket.trigger('player:info', { id: 'p1', name: 'Alice' } as OnlinePlayer);
      mockSocket.trigger('room:created', { room: room() });
      const updatedRoom = room({ players: [] });
      mockSocket.trigger('room:left', { room: updatedRoom, playerId: 'p2' });
      expect(service.currentRoom()).toEqual(updatedRoom);
    });

    it('"room:list" sets the available rooms', () => {
      mockSocket.trigger('room:list', { rooms: [room(), room({ id: 'room2' })] });
      expect(service.availableRooms()).toHaveLength(2);
    });

    it('isHost reflects whether the current player is the room host', () => {
      mockSocket.trigger('player:info', { id: 'p1', name: 'Alice' } as OnlinePlayer);
      mockSocket.trigger('room:created', { room: room({ hostPlayer: { id: 'p1', name: 'Alice' } as OnlinePlayer }) });
      expect(service.isHost()).toBe(true);
    });

    it('"chat:message" appends to the chat log', () => {
      mockSocket.trigger('chat:message', { id: 'm1', playerId: 'p1', playerName: 'Alice', message: 'hi', timestamp: '' });
      expect(service.chatMessages()).toHaveLength(1);
    });
  });

  describe('outgoing actions', () => {
    beforeEach(() => service.connect('Alice'));

    it('createRoom emits room:create', () => {
      service.createRoom('My room', true, 'english', 'random');
      expect(mockSocket.emit).toHaveBeenCalledWith('room:create', { name: 'My room', isPrivate: true, variant: 'english', layout: 'random' });
    });

    it('joinRoom emits room:join', () => {
      service.joinRoom('room1');
      expect(mockSocket.emit).toHaveBeenCalledWith('room:join', { roomId: 'room1' });
    });

    it('refreshRooms emits room:list', () => {
      service.refreshRooms();
      expect(mockSocket.emit).toHaveBeenCalledWith('room:list', {});
    });

    it('leaveRoom/setReady/sendMove/resign are no-ops without a current room', () => {
      service.leaveRoom();
      service.setReady(true);
      service.sendMove({} as never);
      service.resign();
      expect(mockSocket.emit).not.toHaveBeenCalledWith('room:leave', expect.anything());
      expect(mockSocket.emit).not.toHaveBeenCalledWith('player:ready', expect.anything());
      expect(mockSocket.emit).not.toHaveBeenCalledWith('game:move', expect.anything());
      expect(mockSocket.emit).not.toHaveBeenCalledWith('game:resign', expect.anything());
    });

    it('leaveRoom/setReady/sendMove/sendLudoRoll/sendLudoMove/resign emit with the current room id once in a room', () => {
      mockSocket.trigger('room:created', { room: room({ id: 'r1' }) });

      service.leaveRoom();
      expect(mockSocket.emit).toHaveBeenCalledWith('room:leave', { roomId: 'r1' });

      service.setReady(true);
      expect(mockSocket.emit).toHaveBeenCalledWith('player:ready', { roomId: 'r1', isReady: true });

      const move = { from: { row: 0, col: 0 } } as never;
      service.sendMove(move);
      expect(mockSocket.emit).toHaveBeenCalledWith('game:move', { roomId: 'r1', move });

      service.sendLudoRoll();
      expect(mockSocket.emit).toHaveBeenCalledWith('game:ludo:roll', { roomId: 'r1' });

      service.sendLudoMove('piece1');
      expect(mockSocket.emit).toHaveBeenCalledWith('game:ludo:move', { roomId: 'r1', pieceId: 'piece1' });

      service.resign();
      expect(mockSocket.emit).toHaveBeenCalledWith('game:resign', { roomId: 'r1' });
    });

    it('sendChatMessage trims the message and ignores blank input', () => {
      mockSocket.trigger('room:created', { room: room({ id: 'r1' }) });

      service.sendChatMessage('   ');
      expect(mockSocket.emit).not.toHaveBeenCalledWith('chat:send', expect.anything());

      service.sendChatMessage('  hello  ');
      expect(mockSocket.emit).toHaveBeenCalledWith('chat:send', { roomId: 'r1', message: 'hello' });
    });
  });

  describe('disconnect', () => {
    it('disconnects the socket and resets all state', () => {
      service.connect('Alice');
      mockSocket.trigger('connect');
      mockSocket.trigger('player:info', { id: 'p1', name: 'Alice' } as OnlinePlayer);

      service.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(service.connectionStatus()).toBe('disconnected');
      expect(service.currentPlayer()).toBeNull();
    });
  });

  it('getSocket returns the underlying socket once connected', () => {
    expect(service.getSocket()).toBeNull();
    service.connect('Alice');
    expect(service.getSocket()).toBe(mockSocket);
  });
});
