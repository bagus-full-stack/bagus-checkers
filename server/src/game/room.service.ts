import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { GameRoom, OnlinePlayer, RoomStatus } from './types';

@Injectable()
export class RoomService {
  private rooms = new Map<string, GameRoom>();
  private playerRooms = new Map<string, string>(); // playerId -> roomId

  createRoom(
    host: OnlinePlayer,
    name: string,
    isPrivate: boolean,
    variant: string
  ): GameRoom {
    const roomId = uuidv4().slice(0, 8).toUpperCase();

    const room: GameRoom = {
      id: roomId,
      name: name || `Partie de ${host.name}`,
      hostPlayer: { ...host, color: 'white', isReady: false },
      status: 'waiting',
      createdAt: Date.now(),
      isPrivate,
      variant,
    };

    this.rooms.set(roomId, room);
    this.playerRooms.set(host.id, roomId);

    return room;
  }

  joinRoom(roomId: string, player: OnlinePlayer): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.guestPlayer) return null; // Room is full
    if (room.status !== 'waiting') return null;

    room.guestPlayer = { ...player, color: 'black', isReady: false };
    this.playerRooms.set(player.id, roomId);

    return room;
  }

  leaveRoom(playerId: string): { room: GameRoom; wasHost: boolean } | null {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    this.playerRooms.delete(playerId);

    const wasHost = room.hostPlayer.id === playerId;

    if (wasHost) {
      // Host left - if guest exists, promote them to host
      if (room.guestPlayer) {
        room.hostPlayer = { ...room.guestPlayer, color: 'white' };
        room.guestPlayer = undefined;
        room.status = 'waiting';
      } else {
        // No one left, delete room
        this.rooms.delete(roomId);
      }
    } else {
      // Guest left
      room.guestPlayer = undefined;
      room.status = 'waiting';
    }

    return { room, wasHost };
  }

  getRoom(roomId: string): GameRoom | null {
    return this.rooms.get(roomId) || null;
  }

  getRoomByPlayerId(playerId: string): GameRoom | null {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return null;
    return this.rooms.get(roomId) || null;
  }

  getPublicRooms(): GameRoom[] {
    return Array.from(this.rooms.values())
      .filter((room) => !room.isPrivate && room.status === 'waiting')
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  setPlayerReady(playerId: string, isReady: boolean): GameRoom | null {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return null;

    if (room.hostPlayer.id === playerId) {
      room.hostPlayer.isReady = isReady;
    } else if (room.guestPlayer?.id === playerId) {
      room.guestPlayer.isReady = isReady;
    }

    // Check if both players are ready
    if (
      room.hostPlayer.isReady &&
      room.guestPlayer?.isReady &&
      room.status === 'waiting'
    ) {
      room.status = 'ready';
    } else if (room.status === 'ready') {
      room.status = 'waiting';
    }

    return room;
  }

  startGame(roomId: string): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.status !== 'ready') return null;

    room.status = 'playing';
    return room;
  }

  endGame(roomId: string): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.status = 'finished';
    room.hostPlayer.isReady = false;
    if (room.guestPlayer) {
      room.guestPlayer.isReady = false;
    }

    return room;
  }

  updatePlayerConnection(
    playerId: string,
    socketId: string,
    isConnected: boolean
  ): GameRoom | null {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return null;

    if (room.hostPlayer.id === playerId) {
      room.hostPlayer.socketId = socketId;
      room.hostPlayer.isConnected = isConnected;
    } else if (room.guestPlayer?.id === playerId) {
      room.guestPlayer.socketId = socketId;
      room.guestPlayer.isConnected = isConnected;
    }

    return room;
  }

  updateGameState(roomId: string, gameState: unknown): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.gameState = gameState;
    }
  }
}

