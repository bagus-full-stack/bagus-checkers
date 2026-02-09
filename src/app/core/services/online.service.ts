import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { io, Socket } from 'socket.io-client';
import {
  GameRoom,
  OnlinePlayer,
  ConnectionStatus,
  ChatMessage,
  Move,
  GameState,
} from '../models';
import { environment } from '../../../environments/environment';

/**
 * Service for managing WebSocket connections and online multiplayer
 */
@Injectable({
  providedIn: 'root',
})
export class OnlineService {
  private readonly platformId = inject(PLATFORM_ID);
  private socket: Socket | null = null;

  // Connection state
  private readonly _connectionStatus = signal<ConnectionStatus>('disconnected');
  private readonly _currentPlayer = signal<OnlinePlayer | null>(null);
  private readonly _currentRoom = signal<GameRoom | null>(null);
  private readonly _availableRooms = signal<GameRoom[]>([]);
  private readonly _chatMessages = signal<ChatMessage[]>([]);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  readonly connectionStatus = this._connectionStatus.asReadonly();
  readonly currentPlayer = this._currentPlayer.asReadonly();
  readonly currentRoom = this._currentRoom.asReadonly();
  readonly availableRooms = this._availableRooms.asReadonly();
  readonly chatMessages = this._chatMessages.asReadonly();
  readonly error = this._error.asReadonly();

  readonly isConnected = computed(() => this._connectionStatus() === 'connected');
  readonly isInRoom = computed(() => this._currentRoom() !== null);
  readonly isHost = computed(() => {
    const room = this._currentRoom();
    const player = this._currentPlayer();
    return room?.hostPlayer.id === player?.id;
  });

  /**
   * Connect to the game server
   */
  connect(playerName: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.socket?.connected) return;

    this._connectionStatus.set('connecting');
    this._error.set(null);

    const serverUrl = environment.wsUrl || 'http://localhost:3000';

    this.socket = io(serverUrl, {
      auth: { playerName },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupEventListeners();
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.resetState();
  }

  /**
   * Create a new game room
   */
  createRoom(name: string, isPrivate: boolean = false, variant: string = 'international'): void {
    this.socket?.emit('room:create', { name, isPrivate, variant });
  }

  /**
   * Join an existing room
   */
  joinRoom(roomId: string): void {
    this.socket?.emit('room:join', { roomId });
  }

  /**
   * Leave current room
   */
  leaveRoom(): void {
    const room = this._currentRoom();
    if (room) {
      this.socket?.emit('room:leave', { roomId: room.id });
    }
  }

  /**
   * Request list of available rooms
   */
  refreshRooms(): void {
    this.socket?.emit('room:list', {});
  }

  /**
   * Set player ready status
   */
  setReady(isReady: boolean): void {
    const room = this._currentRoom();
    if (room) {
      this.socket?.emit('player:ready', { roomId: room.id, isReady });
    }
  }

  /**
   * Send a move to the server
   */
  sendMove(move: Move): void {
    const room = this._currentRoom();
    if (room) {
      this.socket?.emit('game:move', { roomId: room.id, move });
    }
  }

  /**
   * Resign the game
   */
  resign(): void {
    const room = this._currentRoom();
    if (room) {
      this.socket?.emit('game:resign', { roomId: room.id });
    }
  }

  /**
   * Send a chat message
   */
  sendChatMessage(message: string): void {
    const room = this._currentRoom();
    if (room && message.trim()) {
      this.socket?.emit('chat:send', { roomId: room.id, message: message.trim() });
    }
  }

  /**
   * Setup WebSocket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this._connectionStatus.set('connected');
      this._error.set(null);
    });

    this.socket.on('disconnect', () => {
      this._connectionStatus.set('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      this._connectionStatus.set('error');
      this._error.set('Impossible de se connecter au serveur');
      console.error('Connection error:', error);
    });

    this.socket.on('reconnecting', () => {
      this._connectionStatus.set('reconnecting');
    });

    // Player info
    this.socket.on('player:info', (player: OnlinePlayer) => {
      this._currentPlayer.set(player);
    });

    // Room events
    this.socket.on('room:created', ({ room }) => {
      this._currentRoom.set(room);
    });

    this.socket.on('room:joined', ({ room, player }) => {
      this._currentRoom.set(room);
      if (!this._currentPlayer()) {
        this._currentPlayer.set(player);
      }
    });

    this.socket.on('room:left', ({ room, playerId }) => {
      if (playerId === this._currentPlayer()?.id) {
        this._currentRoom.set(null);
        this._chatMessages.set([]);
      } else {
        this._currentRoom.set(room);
      }
    });

    this.socket.on('room:updated', ({ room }) => {
      this._currentRoom.set(room);
    });

    this.socket.on('room:list', ({ rooms }) => {
      this._availableRooms.set(rooms);
    });

    // Game events
    this.socket.on('game:started', ({ room }) => {
      this._currentRoom.set(room);
    });

    this.socket.on('game:move', ({ gameState }) => {
      // GameEngineService will handle state updates
      // This event is handled by the game page component
    });

    this.socket.on('game:ended', ({ result }) => {
      // Handled by game page
    });

    // Player status
    this.socket.on('player:ready', ({ playerId, isReady }) => {
      const room = this._currentRoom();
      if (room) {
        // Update room with ready status
      }
    });

    this.socket.on('player:disconnected', ({ playerId }) => {
      // Handle opponent disconnect
    });

    this.socket.on('player:reconnected', ({ playerId }) => {
      // Handle opponent reconnect
    });

    // Chat
    this.socket.on('chat:message', (message: ChatMessage) => {
      this._chatMessages.update(messages => [...messages, message]);
    });

    // Errors
    this.socket.on('error', ({ code, message }) => {
      this._error.set(message);
      console.error(`Server error [${code}]:`, message);
    });
  }

  /**
   * Reset all state
   */
  private resetState(): void {
    this._connectionStatus.set('disconnected');
    this._currentPlayer.set(null);
    this._currentRoom.set(null);
    this._availableRooms.set([]);
    this._chatMessages.set([]);
    this._error.set(null);
  }

  /**
   * Get the socket for direct event listening in components
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

