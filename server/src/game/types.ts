export type PlayerColor = 'white' | 'black' | 'red' | 'blue' | 'yellow' | 'green';
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
  variant: string; // 'checkers' | 'ludo' or any variant
  layout?: 'classic' | 'random';
  gameState?: unknown;
  maxPlayers?: number;
  players?: OnlinePlayer[]; // generalized list of players
}

export interface Position {
  row: number;
  col: number;
}

export interface Piece {
  id: string;
  color: PlayerColor;
  type: 'pawn' | 'king' | 'token';
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
