import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, OnModuleDestroy, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { RoomService } from './room.service';
import { GameService } from './game.service';
import { OnlinePlayer, ChatMessage, GameRoom } from './types';
import { getAllowedOrigins } from '../cors';
import { WsThrottlerGuard } from './ws-throttler.guard';
import { LudoGameState } from './ludo-rules';

/** A Ludo player has this long per roll or move; two misses in a row drops them from the game. */
export const LUDO_TURN_MS = 30_000;
const LUDO_MAX_MISSES = 2;

/** A draughts player has this long per move; running out forfeits the game. */
export const CHECKERS_TURN_MS = 120_000;

/** A dropped connection keeps its seat this long, so a network blip is not a forfeit. */
export const RECONNECT_GRACE_MS = 45_000;

const TOKEN_PATTERN = /^[\w-]{16,64}$/;
import {
  RoomCreateDto,
  RoomJoinDto,
  RoomLeaveDto,
  PlayerReadyDto,
  GameMoveDto,
  GameResignDto,
  ChatSendDto,
  LudoRollDto,
  LudoMoveDto,
} from './dto';

@WebSocketGateway({
  cors: {
    origin: getAllowedOrigins(),
    credentials: true,
  },
})
@UseGuards(WsThrottlerGuard)
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  private readonly logger = new Logger(GameGateway.name);

  @WebSocketServer()
  server!: Server;

  private players = new Map<string, OnlinePlayer>(); // socketId -> player
  private socketToPlayer = new Map<string, string>(); // socketId -> playerId
  private turnTimers = new Map<string, NodeJS.Timeout>(); // roomId -> pending Ludo turn timeout
  private misses = new Map<string, Map<string, number>>(); // roomId -> color -> idle turns in a row
  private tokenOf = new Map<string, string>(); // socketId -> reconnect token
  private graceTimers = new Map<string, { timer: NodeJS.Timeout; player: OnlinePlayer }>(); // token -> seat on hold
  turnMs = LUDO_TURN_MS;
  checkersTurnMs = CHECKERS_TURN_MS;
  graceMs = RECONNECT_GRACE_MS;

  constructor(
    private roomService: RoomService,
    private gameService: GameService
  ) {}

  /** The room `playerId` is in, but only if it is `roomId` - client-supplied ids are never trusted. */
  private roomOf(playerId: string, roomId: string): GameRoom | null {
    const room = this.roomService.getRoomByPlayerId(playerId);
    return room && room.id === roomId ? room : null;
  }

  /** Takes a player out of their room (leave, disconnect, switching rooms) and tells everyone left. */
  private removeFromRoom(playerId: string, client?: Socket): void {
    const before = this.roomService.getRoomByPlayerId(playerId);
    if (!before) return;
    const leaverColor = before.players?.find((p) => p.id === playerId)?.color;
    const checkersGameAborted = before.variant !== 'ludo' && before.status === 'playing';

    const result = this.roomService.leaveRoom(playerId);
    if (!result) return;
    client?.leave(before.id);

    const { room } = result;
    this.server.to(room.id).emit('room:left', { room, playerId });

    if (room.variant === 'ludo' && (room.status === 'playing' || room.status === 'finished') && room.gameState) {
      const state = room.gameState as LudoGameState;
      this.server.to(room.id).emit('game:ludo:update', { gameState: state });
      if (state.status === 'finished') {
        this.server.to(room.id).emit('game:ended', { result: { winner: state.winner, reason: 'resignation' } });
      }
      this.armTurnTimer(room.id);
    } else if (checkersGameAborted) {
      this.server.to(room.id).emit('game:ended', {
        result: { winner: leaverColor === 'white' ? 'black' : 'white', reason: 'resignation' },
      });
    }
    this.armTurnTimer(room.id);
  }

  /** Tells the sender why nothing happened, so the page does not hang on a silent refusal. */
  private fail(client: Socket, code: string, message: string): void {
    client.emit('error', { code, message });
  }

  handleConnection(client: Socket) {
    const rawName = client.handshake.auth['playerName'];
    const playerName =
      typeof rawName === 'string' && rawName.trim()
        ? rawName.trim().slice(0, 24)
        : `Player${client.id.slice(0, 4)}`;
    const rawToken = client.handshake.auth['playerToken'];
    const token = typeof rawToken === 'string' && TOKEN_PATTERN.test(rawToken) ? rawToken : undefined;

    // Same browser tab coming back inside the grace period: hand it its seat back.
    const held = token ? this.graceTimers.get(token) : undefined;
    if (token && held) {
      clearTimeout(held.timer);
      this.graceTimers.delete(token);
      this.resumePlayer(client, held.player, token);
      return;
    }

    const playerId = uuidv4();

    const player: OnlinePlayer = {
      id: playerId,
      socketId: client.id,
      name: playerName,
      isReady: false,
      isConnected: true,
    };

    this.players.set(client.id, player);
    this.socketToPlayer.set(client.id, playerId);
    if (token) this.tokenOf.set(client.id, token);

    client.emit('player:info', player);
    this.logger.log(`Player connected: ${player.name} (${playerId})`);
  }

  private resumePlayer(client: Socket, player: OnlinePlayer, token: string): void {
    player.socketId = client.id;
    player.isConnected = true;
    this.players.set(client.id, player);
    this.socketToPlayer.set(client.id, player.id);
    this.tokenOf.set(client.id, token);

    client.emit('player:info', player);
    const room = this.roomService.updatePlayerConnection(player.id, client.id, true);
    if (room) {
      client.join(room.id);
      client.emit('room:joined', { room, player });
      this.server.to(room.id).emit('player:reconnected', { playerId: player.id });
      // Replay the board the page missed while offline.
      if (room.status === 'playing' && room.gameState) {
        if (room.variant === 'ludo') client.emit('game:ludo:update', { gameState: room.gameState });
        else client.emit('game:started', { room, initialState: room.gameState });
      }
    }
    this.logger.log(`Player reconnected: ${player.name} (${player.id})`);
  }

  onModuleDestroy(): void {
    this.turnTimers.forEach((t) => clearTimeout(t));
    this.turnTimers.clear();
    this.graceTimers.forEach(({ timer }) => clearTimeout(timer));
    this.graceTimers.clear();
  }

  handleDisconnect(client: Socket) {
    const player = this.players.get(client.id);
    if (!player) return;

    const token = this.tokenOf.get(client.id);
    this.players.delete(client.id);
    this.socketToPlayer.delete(client.id);
    this.tokenOf.delete(client.id);

    const room = this.roomService.updatePlayerConnection(player.id, client.id, false);
    if (!room || !token) {
      // Nothing to hold the seat for, or no way for the player to claim it back.
      this.removeFromRoom(player.id);
    } else {
      this.server.to(room.id).emit('player:disconnected', { playerId: player.id });
      const timer = setTimeout(() => {
        this.graceTimers.delete(token);
        this.removeFromRoom(player.id);
      }, this.graceMs);
      timer.unref();
      this.graceTimers.set(token, { timer, player });
    }

    this.logger.log(`Player disconnected: ${player.name}`);
  }

  @SubscribeMessage('room:create')
  handleCreateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RoomCreateDto
  ) {
    const player = this.players.get(client.id);
    if (!player) {
      client.emit('error', { code: 'NOT_FOUND', message: 'Player not found' });
      return;
    }

    this.removeFromRoom(player.id, client);
    const room = this.roomService.createRoom(
      player,
      data.name,
      data.isPrivate,
      data.variant || 'international',
      data.layout
    );

    client.join(room.id);
    client.emit('room:created', { room });

    this.logger.log(`Room created: ${room.id} by ${player.name}`);
  }

  @SubscribeMessage('room:join')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RoomJoinDto
  ) {
    const player = this.players.get(client.id);
    if (!player) {
      client.emit('error', { code: 'NOT_FOUND', message: 'Player not found' });
      return;
    }

    const current = this.roomService.getRoomByPlayerId(player.id);
    if (current && current.id !== data.roomId && this.roomService.getRoom(data.roomId)) {
      this.removeFromRoom(player.id, client);
    }
    const room = this.roomService.joinRoom(data.roomId, player);
    if (!room) {
      client.emit('error', { code: 'ROOM_ERROR', message: 'Cannot join room' });
      return;
    }

    client.join(room.id);
    client.emit('room:joined', { room, player });

    // Notify host
    this.server.to(room.id).emit('room:updated', { room });

    this.logger.log(`${player.name} joined room ${room.id}`);
  }

  @SubscribeMessage('room:leave')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RoomLeaveDto
  ) {
    const player = this.players.get(client.id);
    if (!player) return;

    if (!this.roomOf(player.id, data.roomId)) return;

    this.removeFromRoom(player.id, client);

    this.logger.log(`${player.name} left room ${data.roomId}`);
  }

  @SubscribeMessage('room:list')
  handleListRooms(@ConnectedSocket() client: Socket) {
    const rooms = this.roomService.getPublicRooms();
    client.emit('room:list', { rooms });
  }

  @SubscribeMessage('player:ready')
  handlePlayerReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: PlayerReadyDto
  ) {
    const player = this.players.get(client.id);
    if (!player) return;

    const room = this.roomService.setPlayerReady(player.id, data.isReady);
    if (!room) return;

    this.server.to(room.id).emit('player:ready', {
      playerId: player.id,
      isReady: data.isReady,
    });

    this.server.to(room.id).emit('room:updated', { room });

    // Start game if both ready
    if (room.status === 'ready') {
      const startedRoom = this.roomService.startGame(room.id);
      if (startedRoom) {
        const initialState = this.gameService.createInitialState(
          room.variant,
          room.layout,
          room.players?.map((p) => p.color!)
        );
        this.roomService.updateGameState(room.id, initialState);

        this.server.to(room.id).emit('game:started', {
          room: startedRoom,
          initialState,
        });
        this.armTurnTimer(room.id);

        this.logger.log(`Game started in room ${room.id}`);
      }
    }
  }

  @SubscribeMessage('game:move')
  handleGameMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: GameMoveDto
  ) {
    const player = this.players.get(client.id);
    if (!player) return;

    const room = this.roomOf(player.id, data.roomId);
    if (!room) return this.fail(client, 'NOT_IN_ROOM', 'You are not in this room');
    if (room.status !== 'playing') return this.fail(client, 'INVALID_MOVE', 'No game in progress');

    const playerColor = room.players?.find((p) => p.id === player.id)?.color;
    if (!playerColor) return;

    // Apply move
    const currentState = room.gameState as any;
    const newState = this.gameService.applyMove(
      currentState,
      data.move,
      playerColor,
      room.variant
    );

    if (!newState) {
      client.emit('error', { code: 'INVALID_MOVE', message: 'Invalid move' });
      return;
    }

    this.roomService.updateGameState(room.id, newState);

    // Broadcast move to all players in room
    this.server.to(room.id).emit('game:move', {
      move: data.move,
      gameState: newState,
    });

    // Check for game over
    if (newState.status === 'finished') {
      this.roomService.endGame(room.id);
      this.server.to(room.id).emit('game:ended', {
        result: {
          winner: newState.winner,
          reason: newState.reason ?? 'no-pieces',
        },
      });

      this.logger.log(`Game ended in room ${room.id}, winner: ${newState.winner}`);
    }
    this.armTurnTimer(room.id);
  }

  @SubscribeMessage('game:ludo:roll')
  handleLudoRoll(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LudoRollDto
  ) {
    const player = this.players.get(client.id);
    if (!player) return;

    const room = this.roomOf(player.id, data.roomId);
    if (!room) return this.fail(client, 'NOT_IN_ROOM', 'You are not in this room');
    if (room.status !== 'playing' || room.variant !== 'ludo') return this.fail(client, 'INVALID_MOVE', 'No Ludo game in progress');

    const playerColor = room.players?.find((p) => p.id === player.id)?.color;
    if (!playerColor) return;

    const currentState = room.gameState as any;
    if (!currentState || currentState.currentPlayer !== playerColor || currentState.phase !== 'rolling') {
      client.emit('error', { code: 'INVALID_MOVE', message: 'Not your turn to roll' });
      return;
    }

    const { state: newState } = this.gameService.rollLudoDice(currentState);
    this.roomService.updateGameState(room.id, newState);
    this.misses.get(room.id)?.delete(playerColor);

    this.server.to(room.id).emit('game:ludo:update', { gameState: newState });
    this.armTurnTimer(room.id);
  }

  @SubscribeMessage('game:ludo:move')
  handleLudoMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LudoMoveDto
  ) {
    const player = this.players.get(client.id);
    if (!player) return;

    const room = this.roomOf(player.id, data.roomId);
    if (!room) return this.fail(client, 'NOT_IN_ROOM', 'You are not in this room');
    if (room.status !== 'playing' || room.variant !== 'ludo') return this.fail(client, 'INVALID_MOVE', 'No Ludo game in progress');

    const playerColor = room.players?.find((p) => p.id === player.id)?.color;
    if (!playerColor) return;

    const currentState = room.gameState as any;
    const newState = this.gameService.applyLudoMove(currentState, playerColor, data.pieceId);
    if (!newState) {
      client.emit('error', { code: 'INVALID_MOVE', message: 'Invalid move' });
      return;
    }

    this.roomService.updateGameState(room.id, newState);
    this.misses.get(room.id)?.delete(playerColor);
    this.server.to(room.id).emit('game:ludo:update', { gameState: newState });

    if (newState.status === 'finished') {
      this.roomService.endGame(room.id);
      this.server.to(room.id).emit('game:ended', {
        result: { winner: newState.winner, reason: 'all-pieces-home' },
      });

      this.logger.log(`Ludo game ended in room ${room.id}, winner: ${newState.winner}`);
    }
    this.armTurnTimer(room.id);
  }

  /** (Re)starts the idle clock for whoever must act; clears it when the game is not running. */
  private armTurnTimer(roomId: string): void {
    clearTimeout(this.turnTimers.get(roomId));
    this.turnTimers.delete(roomId);
    const room = this.roomService.getRoom(roomId);
    const state = room?.gameState as { status?: string } | undefined;
    if (!room || room.status !== 'playing' || state?.status !== 'playing') {
      this.misses.delete(roomId);
      return;
    }
    const ms = room.variant === 'ludo' ? this.turnMs : this.checkersTurnMs;
    const timer = setTimeout(() => this.onTurnTimeout(roomId), ms);
    timer.unref();
    this.turnTimers.set(roomId, timer);
  }

  /**
   * The player to act stayed idle. Draughts: they forfeit. Ludo: play for them once, drop them on
   * the second miss in a row.
   */
  private onTurnTimeout(roomId: string): void {
    this.turnTimers.delete(roomId);
    const room = this.roomService.getRoom(roomId);
    let state = room?.gameState as LudoGameState | undefined;
    if (!room || room.status !== 'playing' || state?.status !== 'playing') {
      this.misses.delete(roomId);
      return;
    }

    if (room.variant !== 'ludo') {
      this.roomService.endGame(roomId);
      this.server.to(roomId).emit('game:ended', {
        result: { winner: state.currentPlayer === 'white' ? 'black' : 'white', reason: 'timeout' },
      });
      this.logger.log(`Room ${roomId}: ${state.currentPlayer} ran out of time`);
      return;
    }

    const color = state.currentPlayer;
    const streaks = this.misses.get(roomId) ?? new Map<string, number>();
    this.misses.set(roomId, streaks);
    const count = (streaks.get(color) ?? 0) + 1;
    streaks.set(color, count);

    if (count >= LUDO_MAX_MISSES) {
      state = this.roomService.dropLudoPlayer(roomId, color) ?? state;
      streaks.delete(color);
      this.logger.log(`${color} dropped from room ${roomId} for being idle`);
    } else {
      if (state.phase === 'rolling') state = this.gameService.rollLudoDice(state).state as LudoGameState;
      if (state.phase === 'moving') {
        const mover = state;
        for (const piece of mover.pieces.filter((p) => p.color === color)) {
          const moved = this.gameService.applyLudoMove(mover, color, piece.id);
          if (moved) {
            state = moved as LudoGameState;
            break;
          }
        }
      }
      this.roomService.updateGameState(roomId, state);
    }

    this.server.to(roomId).emit('game:ludo:update', { gameState: state });
    if (state.status === 'finished') {
      this.roomService.endGame(roomId);
      this.server.to(roomId).emit('game:ended', { result: { winner: state.winner, reason: 'resignation' } });
    }
    this.armTurnTimer(roomId);
  }

  @SubscribeMessage('game:resign')
  handleResign(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: GameResignDto
  ) {
    const player = this.players.get(client.id);
    if (!player) return;

    const room = this.roomOf(player.id, data.roomId);
    if (!room || room.status !== 'playing') return;

    if (room.variant === 'ludo') {
      const color = room.players?.find((p) => p.id === player.id)?.color;
      const state = color && this.roomService.dropLudoPlayer(room.id, color);
      if (state) {
        this.server.to(room.id).emit('game:ludo:update', { gameState: state });
        if (state.status === 'finished') {
          this.server.to(room.id).emit('game:ended', { result: { winner: state.winner, reason: 'resignation' } });
        }
        this.armTurnTimer(room.id);
      }
    } else {
      const myColor = room.hostPlayer.id === player.id ? room.hostPlayer.color : room.guestPlayer?.color;
      this.roomService.endGame(room.id);
      this.server.to(room.id).emit('game:ended', {
        result: { winner: myColor === 'white' ? 'black' : 'white', reason: 'resignation' },
      });
    }

    this.logger.log(`${player.name} resigned in room ${room.id}`);
  }

  @SubscribeMessage('chat:send')
  handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ChatSendDto
  ) {
    const player = this.players.get(client.id);
    if (!player || !data.message.trim() || !this.roomOf(player.id, data.roomId)) return;

    const chatMessage: ChatMessage = {
      id: uuidv4(),
      playerId: player.id,
      playerName: player.name,
      message: data.message.trim().slice(0, 200),
      timestamp: Date.now(),
    };

    this.server.to(data.roomId).emit('chat:message', chatMessage);
  }
}

