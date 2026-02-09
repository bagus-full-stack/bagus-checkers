import { PlayerColor } from './piece.model';

/**
 * Online game room
 */
export interface GameRoom {
  readonly id: string;
  readonly name: string;
  readonly hostPlayer: OnlinePlayer;
  readonly guestPlayer?: OnlinePlayer;
  readonly status: RoomStatus;
  readonly createdAt: number;
  readonly isPrivate: boolean;
  readonly variant: string;
}

/**
 * Online player info
 */
export interface OnlinePlayer {
  readonly id: string;
  readonly name: string;
  readonly color?: PlayerColor;
  readonly isReady: boolean;
  readonly isConnected: boolean;
}

/**
 * Room status
 */
export type RoomStatus = 'waiting' | 'ready' | 'playing' | 'finished';

/**
 * Connection status
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

/**
 * WebSocket events from server
 */
export interface ServerEvents {
  'room:created': { room: GameRoom };
  'room:joined': { room: GameRoom; player: OnlinePlayer };
  'room:left': { room: GameRoom; playerId: string };
  'room:updated': { room: GameRoom };
  'room:list': { rooms: GameRoom[] };
  'game:started': { room: GameRoom; initialState: unknown };
  'game:move': { move: unknown; gameState: unknown };
  'game:ended': { result: unknown };
  'player:ready': { playerId: string; isReady: boolean };
  'player:reconnected': { playerId: string };
  'player:disconnected': { playerId: string };
  'chat:message': { playerId: string; playerName: string; message: string; timestamp: number };
  'error': { code: string; message: string };
}

/**
 * WebSocket events to server
 */
export interface ClientEvents {
  'room:create': { name: string; isPrivate: boolean; variant: string };
  'room:join': { roomId: string };
  'room:leave': { roomId: string };
  'room:list': {};
  'player:ready': { roomId: string; isReady: boolean };
  'game:move': { roomId: string; move: unknown };
  'game:resign': { roomId: string };
  'chat:send': { roomId: string; message: string };
}

/**
 * Chat message
 */
export interface ChatMessage {
  readonly id: string;
  readonly playerId: string;
  readonly playerName: string;
  readonly message: string;
  readonly timestamp: number;
}

