import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { GameRoom, OnlinePlayer, RoomStatus } from './types';

// ponytail: single-instance-only persistence (SQLite file on disk, reloaded
// on boot) so a restart doesn't wipe active games. Not a fix for horizontal
// scaling across multiple server instances - that needs a shared store
// (Redis/DB) instead, only worth building once there's actually more than
// one server process.
const STORE_PATH = path.join(process.cwd(), 'data', 'rooms.db');

@Injectable()
export class RoomService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RoomService.name);
  private rooms = new Map<string, GameRoom>();
  private playerRooms = new Map<string, string>(); // playerId -> roomId
  private saveTimer: NodeJS.Timeout | null = null;
  private db!: DatabaseSync;

  onModuleInit(): void {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    this.db = new DatabaseSync(STORE_PATH);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS player_rooms (player_id TEXT PRIMARY KEY, room_id TEXT NOT NULL);
    `);

    const roomRows = this.db.prepare('SELECT id, data FROM rooms').all() as { id: string; data: string }[];
    this.rooms = new Map(roomRows.map((row) => [row.id, JSON.parse(row.data) as GameRoom]));

    const playerRows = this.db.prepare('SELECT player_id, room_id FROM player_rooms').all() as {
      player_id: string;
      room_id: string;
    }[];
    this.playerRooms = new Map(playerRows.map((row) => [row.player_id, row.room_id]));

    this.logger.log(`Restored ${this.rooms.size} room(s) from disk`);
  }

  onModuleDestroy(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.flush();
    this.db.close();
  }

  private schedulePersist(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.flush();
    }, 200);
  }

  // ponytail: replaces both tables wholesale inside one transaction on every
  // flush - simple and atomic (a crash mid-write leaves the previous commit
  // intact, unlike the old JSON snapshot). Upserting only the changed rooms
  // would cut write volume further if the room count gets large.
  private flush(): void {
    try {
      this.db.exec('BEGIN');
      this.db.exec('DELETE FROM rooms');
      this.db.exec('DELETE FROM player_rooms');

      const insertRoom = this.db.prepare('INSERT INTO rooms (id, data) VALUES (?, ?)');
      for (const [id, room] of this.rooms) {
        insertRoom.run(id, JSON.stringify(room));
      }

      const insertPlayer = this.db.prepare('INSERT INTO player_rooms (player_id, room_id) VALUES (?, ?)');
      for (const [playerId, roomId] of this.playerRooms) {
        insertPlayer.run(playerId, roomId);
      }

      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      this.logger.error('Failed to persist rooms', err as Error);
    }
  }

  createRoom(
    host: OnlinePlayer,
    name: string,
    isPrivate: boolean,
    variant: string,
    layout?: 'classic' | 'random',
  ): GameRoom {
    const roomId = uuidv4().slice(0, 8).toUpperCase();
    const isLudo = variant === 'ludo';
    const initialColor = isLudo ? 'red' : 'white';

    const hostPlayerObj = { ...host, color: initialColor as any, isReady: false };

    const room: GameRoom = {
      id: roomId,
      name: name || `Partie de ${host.name}`,
      hostPlayer: hostPlayerObj,
      players: [hostPlayerObj],
      maxPlayers: isLudo ? 4 : 2,
      status: 'waiting',
      createdAt: Date.now(),
      isPrivate,
      variant,
    };

    this.rooms.set(roomId, room);
    this.playerRooms.set(host.id, roomId);
    this.schedulePersist();

    return room;
  }

  joinRoom(roomId: string, player: OnlinePlayer): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const maxPlayers = room.variant === 'ludo' ? 4 : 2;
    if ((room.players?.length || 1) >= maxPlayers) return null; // Room is full
    if (room.status !== 'waiting') return null;

    if (room.variant === 'ludo') {
      const colors = ['red', 'green', 'yellow', 'blue'];
      const assignedColor = colors[room.players?.length || 1];
      const newPlayer = { ...player, color: assignedColor as any, isReady: false };

      if (!room.players) room.players = [room.hostPlayer];
      room.players.push(newPlayer);

      // Fallback for types/checkers compatibility
      if (!room.guestPlayer) room.guestPlayer = newPlayer;
    } else {
      if (room.guestPlayer) return null; // Defensive check for checkers
      const newPlayer = { ...player, color: 'black' as any, isReady: false };
      room.guestPlayer = newPlayer;
      room.players = [room.hostPlayer, newPlayer];
    }

    this.playerRooms.set(player.id, roomId);
    this.schedulePersist();

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
      if (room.variant === 'ludo') {
        const remainingPlayers = room.players?.filter(p => p.id !== playerId) || [];
        if (remainingPlayers.length > 0) {
          room.hostPlayer = remainingPlayers[0];
          room.players = remainingPlayers;
          // Reassign fallback
          room.guestPlayer = remainingPlayers[1];
        } else {
          this.rooms.delete(roomId);
        }
      } else {
        // Checkers logic: Host left - if guest exists, promote them to host
        if (room.guestPlayer) {
          room.hostPlayer = { ...room.guestPlayer, color: 'white' as any };
          room.players = [room.hostPlayer];
          room.guestPlayer = undefined;
          room.status = 'waiting';
        } else {
          // No one left, delete room
          this.rooms.delete(roomId);
        }
      }
    } else {
      // Guest/Other player left
      if (room.variant === 'ludo') {
        room.players = room.players?.filter(p => p.id !== playerId);
        // Re-determine guestPlayer fallback
        room.guestPlayer = room.players?.find(p => p.id !== room.hostPlayer.id);
      } else {
        room.guestPlayer = undefined;
        room.players = [room.hostPlayer];
      }
      room.status = 'waiting';
    }

    this.schedulePersist();
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

    if (room.players) {
      const player = room.players.find(p => p.id === playerId);
      if (player) player.isReady = isReady;
    }

    // Keep backwards compatibility properties in sync
    if (room.hostPlayer.id === playerId) {
      room.hostPlayer.isReady = isReady;
    } else if (room.guestPlayer?.id === playerId) {
      room.guestPlayer.isReady = isReady;
    }

    // Check if ALL players are ready AND we have enough players
    if (room.variant === 'ludo') {
      const isEveryoneReady = room.players?.length && room.players.length > 1 && room.players.every(p => p.isReady);
      if (isEveryoneReady && room.status === 'waiting') {
        room.status = 'ready';
      } else if (!isEveryoneReady && room.status === 'ready') {
        room.status = 'waiting';
      }
    } else {
      // Checkers
      if (
        room.hostPlayer.isReady &&
        room.guestPlayer?.isReady &&
        room.status === 'waiting'
      ) {
        room.status = 'ready';
      } else if (room.status === 'ready') {
        room.status = 'waiting';
      }
    }

    this.schedulePersist();
    return room;
  }

  startGame(roomId: string): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.status !== 'ready') return null;

    room.status = 'playing';
    this.schedulePersist();
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
    if (room.players) {
      room.players.forEach(p => p.isReady = false);
    }

    this.schedulePersist();
    return room;
  }

  updatePlayerConnection(
    playerId: string,
    socketId: string,
    isConnected: boolean
  ): GameRoom | null {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return null;

    if (room.players) {
      const p = room.players.find(p => p.id === playerId);
      if (p) {
        p.socketId = socketId;
        p.isConnected = isConnected;
      }
    }

    if (room.hostPlayer.id === playerId) {
      room.hostPlayer.socketId = socketId;
      room.hostPlayer.isConnected = isConnected;
    } else if (room.guestPlayer?.id === playerId) {
      room.guestPlayer.socketId = socketId;
      room.guestPlayer.isConnected = isConnected;
    }

    this.schedulePersist();
    return room;
  }

  updateGameState(roomId: string, gameState: unknown): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.gameState = gameState;
      this.schedulePersist();
    }
  }
}

