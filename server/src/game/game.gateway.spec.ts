import * as fs from 'fs';
import * as path from 'path';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { RoomService } from './room.service';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function ludoChecks(rooms: RoomService): Promise<void> {
  const gateway = new GameGateway(rooms, new GameService());
  const events: { event: string; payload: any }[] = [];
  gateway.server = { to: () => ({ emit: (event: string, payload: any) => events.push({ event, payload }) }) } as any;
  gateway.turnMs = 20;

  const connect = (id: string) => {
    const client = { id, handshake: { auth: { playerName: id } }, emit() {}, join() {}, leave() {} } as any;
    gateway.handleConnection(client);
    return client;
  };
  const [p1, p2, p3] = ['l1', 'l2', 'l3'].map(connect);
  gateway.handleCreateRoom(p1, { name: 'Ludo', isPrivate: false, variant: 'ludo' } as any);
  const room = rooms.getRoomByPlayerId((gateway as any).players.get('l1').id)!;
  gateway.handleJoinRoom(p2, { roomId: room.id } as any);
  gateway.handleJoinRoom(p3, { roomId: room.id } as any);
  for (const p of [p1, p2, p3]) gateway.handlePlayerReady(p, { roomId: room.id, isReady: true } as any);
  assert(room.status === 'playing', 'ludo room should start');
  assert((room.gameState as any).currentPlayer === 'red', 'red starts');

  // Not your turn: ignored, state unchanged.
  const errors: string[] = [];
  p2.emit = (event: string) => errors.push(event);
  gateway.handleLudoRoll(p2, { roomId: room.id } as any);
  assert(errors.includes('error') && (room.gameState as any).phase === 'rolling', 'roll out of turn must be refused');

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const updates = () => events.filter((e) => e.event === 'game:ludo:update').length;

  // Red stays idle: the server plays for it once (first miss) ...
  await wait(35);
  assert(updates() >= 1, 'an idle turn should be played by the server');
  assert((room.gameState as any).players.includes('red'), 'red is not dropped after one miss');

  // ... and drops it on its second idle turn in a row (green and blue are idle too, so it comes round again).
  await wait(150);
  assert(!(room.gameState as any).players.includes('red'), 'red should be dropped after two idle turns');
  gateway.onModuleDestroy();
}

async function main(): Promise<void> {
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

  // A player outside the room cannot move for the guest (the guest is black; white moves first).
  emitted.length = 0;
  const err: string[] = [];
  outsider.emit = (event: string) => err.push(event);
  const before = JSON.stringify(room.gameState);
  const blackMove = { piece: (room.gameState as any).pieces.find((p: any) => p.color === 'black'), to: { row: 4, col: 1 }, capturedPieces: [] };
  gateway.handleGameMove(outsider, { roomId: room.id, move: blackMove } as any);
  assert(!emitted.includes('game:move') && JSON.stringify(room.gameState) === before, 'outsider game:move must be ignored');

  // Player names are capped.
  assert((gateway as any).players.get('c').name.length === 24, 'player name should be capped at 24 chars');

  // A disconnect mid-game ends the game for the other player.
  emitted.length = 0;
  gateway.handleDisconnect(b);
  assert(emitted.includes('game:ended'), 'disconnect during a game should end it');

  // A disconnect that empties the room removes it, so no ghost room stays in the lobby.
  gateway.handleDisconnect(a);
  assert(rooms.getRoom(room.id) === null, 'empty room should be deleted');

  await ludoChecks(rooms);

  rooms.onModuleDestroy();
  fs.rmSync(path.join(process.cwd(), 'data', 'rooms.db'), { force: true });
  console.log('game.gateway: all assertions passed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
