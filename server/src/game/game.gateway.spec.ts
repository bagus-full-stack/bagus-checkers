import * as fs from 'fs';
import * as path from 'path';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { RoomService } from './room.service';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function main(): void {
  fs.rmSync(path.join(process.cwd(), 'data', 'rooms.db'), { force: true });

  const rooms = new RoomService();
  rooms.onModuleInit();
  const gateway = new GameGateway(rooms, new GameService());
  const emitted: string[] = [];
  gateway.server = { to: () => ({ emit: (event: string) => emitted.push(event) }) } as any;

  const connect = (id: string, name: unknown = id) => {
    const client = { id, handshake: { auth: { playerName: name } }, emit() {}, join() {}, leave() {} } as any;
    gateway.handleConnection(client);
    return client;
  };

  const a = connect('a');
  const b = connect('b');
  const outsider = connect('c', 'x'.repeat(500));

  gateway.handleCreateRoom(a, { name: 'Test', isPrivate: false, variant: 'international' } as any);
  const room = rooms.getRoomByPlayerId(rooms.getRoomByPlayerId((gateway as any).players.get('a').id)!.hostPlayer.id)!;
  gateway.handleJoinRoom(b, { roomId: room.id } as any);
  gateway.handlePlayerReady(a, { roomId: room.id, isReady: true } as any);
  gateway.handlePlayerReady(b, { roomId: room.id, isReady: true } as any);
  assert(room.status === 'playing', 'room should start when both are ready');

  // A player outside the room cannot resign it, chat in it, or leave it.
  gateway.handleResign(outsider, { roomId: room.id } as any);
  assert(room.status === 'playing', 'outsider resign must be ignored');
  emitted.length = 0;
  gateway.handleChatMessage(outsider, { roomId: room.id, message: 'hi' } as any);
  assert(!emitted.includes('chat:message'), 'outsider chat must be ignored');
  gateway.handleLeaveRoom(outsider, { roomId: room.id } as any);
  assert(rooms.getRoom(room.id)?.guestPlayer?.id !== undefined, 'outsider leave must be ignored');

  // Player names are capped.
  assert((gateway as any).players.get('c').name.length === 24, 'player name should be capped at 24 chars');

  // A disconnect mid-game ends the game for the other player.
  emitted.length = 0;
  gateway.handleDisconnect(b);
  assert(emitted.includes('game:ended'), 'disconnect during a game should end it');

  // A disconnect that empties the room removes it, so no ghost room stays in the lobby.
  gateway.handleDisconnect(a);
  assert(rooms.getRoom(room.id) === null, 'empty room should be deleted');

  rooms.onModuleDestroy();
  fs.rmSync(path.join(process.cwd(), 'data', 'rooms.db'), { force: true });
  console.log('game.gateway: all assertions passed');
}

main();
