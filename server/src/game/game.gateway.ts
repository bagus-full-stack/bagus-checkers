import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { RoomService } from './room.service';
import { GameService } from './game.service';
import { OnlinePlayer, Move, ChatMessage } from './types';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:4200', 'http://localhost:4000'],
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private players = new Map<string, OnlinePlayer>(); // socketId -> player
  private socketToPlayer = new Map<string, string>(); // socketId -> playerId

  constructor(
    private roomService: RoomService,
    private gameService: GameService
  ) {}

  handleConnection(client: Socket) {
    const playerName = client.handshake.auth['playerName'] || `Player${client.id.slice(0, 4)}`;
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

    client.emit('player:info', player);
    console.log(`Player connected: ${player.name} (${playerId})`);
  }

  handleDisconnect(client: Socket) {
    const player = this.players.get(client.id);
    if (!player) return;

    // Update room connection status
    const room = this.roomService.updatePlayerConnection(
      player.id,
      client.id,
      false
    );

    if (room) {
      // Notify other player
      this.server.to(room.id).emit('player:disconnected', { playerId: player.id });
    }

    this.players.delete(client.id);
    this.socketToPlayer.delete(client.id);

    console.log(`Player disconnected: ${player.name}`);
  }

  @SubscribeMessage('room:create')
  handleCreateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { name: string; isPrivate: boolean; variant: string }
  ) {
    const player = this.players.get(client.id);
    if (!player) {
      client.emit('error', { code: 'NOT_FOUND', message: 'Player not found' });
      return;
    }

    const room = this.roomService.createRoom(
      player,
      data.name,
      data.isPrivate,
      data.variant || 'international'
    );

    client.join(room.id);
    client.emit('room:created', { room });

    console.log(`Room created: ${room.id} by ${player.name}`);
  }

  @SubscribeMessage('room:join')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    const player = this.players.get(client.id);
    if (!player) {
      client.emit('error', { code: 'NOT_FOUND', message: 'Player not found' });
      return;
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

    console.log(`${player.name} joined room ${room.id}`);
  }

  @SubscribeMessage('room:leave')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    const player = this.players.get(client.id);
    if (!player) return;

    const result = this.roomService.leaveRoom(player.id);
    if (!result) return;

    client.leave(data.roomId);
    this.server.to(data.roomId).emit('room:left', {
      room: result.room,
      playerId: player.id,
    });

    console.log(`${player.name} left room ${data.roomId}`);
  }

  @SubscribeMessage('room:list')
  handleListRooms(@ConnectedSocket() client: Socket) {
    const rooms = this.roomService.getPublicRooms();
    client.emit('room:list', { rooms });
  }

  @SubscribeMessage('player:ready')
  handlePlayerReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; isReady: boolean }
  ) {
    const player = this.players.get(client.id);
    if (!player) return;

    const room = this.roomService.setPlayerReady(player.id, data.isReady);
    if (!room) return;

    this.server.to(data.roomId).emit('player:ready', {
      playerId: player.id,
      isReady: data.isReady,
    });

    this.server.to(data.roomId).emit('room:updated', { room });

    // Start game if both ready
    if (room.status === 'ready') {
      const startedRoom = this.roomService.startGame(room.id);
      if (startedRoom) {
        const initialState = this.gameService.createInitialState();
        this.roomService.updateGameState(room.id, initialState);

        this.server.to(room.id).emit('game:started', {
          room: startedRoom,
          initialState,
        });

        console.log(`Game started in room ${room.id}`);
      }
    }
  }

  @SubscribeMessage('game:move')
  handleGameMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; move: Move }
  ) {
    const player = this.players.get(client.id);
    if (!player) return;

    const room = this.roomService.getRoom(data.roomId);
    if (!room || room.status !== 'playing') return;

    // Determine player color
    const playerColor =
      room.hostPlayer.id === player.id
        ? room.hostPlayer.color
        : room.guestPlayer?.color;

    if (!playerColor) return;

    // Apply move
    const currentState = room.gameState as any;
    const newState = this.gameService.applyMove(
      currentState,
      data.move,
      playerColor
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
          reason: 'no-pieces',
        },
      });

      console.log(`Game ended in room ${room.id}, winner: ${newState.winner}`);
    }
  }

  @SubscribeMessage('game:resign')
  handleResign(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    const player = this.players.get(client.id);
    if (!player) return;

    const room = this.roomService.getRoom(data.roomId);
    if (!room || room.status !== 'playing') return;

    const winner =
      room.hostPlayer.id === player.id
        ? room.guestPlayer?.color
        : room.hostPlayer.color;

    this.roomService.endGame(room.id);

    this.server.to(room.id).emit('game:ended', {
      result: {
        winner,
        reason: 'resignation',
      },
    });

    console.log(`${player.name} resigned in room ${room.id}`);
  }

  @SubscribeMessage('chat:send')
  handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; message: string }
  ) {
    const player = this.players.get(client.id);
    if (!player || !data.message.trim()) return;

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

