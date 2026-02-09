export type PlayerColor = 'white' | 'black';
export type RoomStatus = 'waiting' | 'ready' | 'playing' | 'finished';

export interface OnlinePlayer {
  id: string;
  socketId: string;
  name: string;
  color?: PlayerColor;
  isReady: boolean;
  isConnected: boolean;
}

export interface GameRoom {
  id: string;
  name: string;
  hostPlayer: OnlinePlayer;
  guestPlayer?: OnlinePlayer;
  status: RoomStatus;
  createdAt: number;
  isPrivate: boolean;
  variant: string;
  gameState?: unknown;
}

export interface Position {
  row: number;
  col: number;
}

export interface Piece {
  id: string;
  color: PlayerColor;
  type: 'pawn' | 'king';
  position: Position;
}

export interface Move {
  piece: Piece;
  from: Position;
  to: Position;
  capturedPieces: Piece[];
  isPromotion: boolean;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

