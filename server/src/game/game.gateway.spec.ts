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

/** Reconnect grace, draughts move timer, and error replies for refused actions. */
async function sessionChecks(rooms: RoomService): Promise<void> {
  const gateway = new GameGateway(rooms, new GameService());
  const events: { event: string; payload: any }[] = [];
  gateway.server = { to: () => ({ emit: (event: string, payload: any) => events.push({ event, payload }) }) } as any;
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const sent = new Map<string, string[]>();
  const connect = (id: string, token?: string) => {
    const log: string[] = [];
    sent.set(id, log);
    const client = {
      id,
      handshake: { auth: { playerName: id, playerToken: token } },
      emit: (event: string, payload?: any) => log.push(event + (payload?.code ? ':' + payload.code : '')),
      join() {},
      leave() {},
    } as any;
    gateway.handleConnection(client);
    return client;
  };
  const idOf = (socketId: string) => (gateway as any).players.get(socketId)?.id as string | undefined;
  const startGame = (tokenA: string, tokenB: string, idA: string, idB: string) => {
    const a = connect(idA, tokenA);
    const b = connect(idB, tokenB);
    gateway.handleCreateRoom(a, { name: 'T', isPrivate: false, variant: 'international' } as any);
    const room = rooms.getRoomByPlayerId(idOf(idA)!)!;
    gateway.handleJoinRoom(b, { roomId: room.id } as any);
    gateway.handlePlayerReady(a, { roomId: room.id, isReady: true } as any);
    gateway.handlePlayerReady(b, { roomId: room.id, isReady: true } as any);
    return { a, b, room };
  };

  // A dropped connection keeps its seat, and the same token takes it back with the board replayed.
  gateway.graceMs = 80;
  gateway.checkersTurnMs = 10_000;
  const tokenA = 'token-aaaaaaaaaaaaaaaa';
  const first = startGame(tokenA, 'token-bbbbbbbbbbbbbbbb', 'r1', 'r2');
  const idA = idOf('r1')!;
  gateway.handleDisconnect(first.a);
  assert(rooms.getRoomByPlayerId(idA)?.id === first.room.id, 'a dropped player keeps their seat during the grace period');
  const back = connect('r1-new', tokenA);
  assert(idOf('r1-new') === idA, 'the same token gets the same player back');
  const log = sent.get('r1-new')!;
  assert(log.includes('room:joined') && log.includes('game:started'), 'the returning player gets the room and the board replayed');
  await wait(120);
  assert(rooms.getRoomByPlayerId(idA) !== null, 'the resumed player must not be removed when the old grace timer would have fired');

  // Without coming back, the seat is released after the grace period.
  gateway.handleDisconnect(back);
  await wait(130);
  assert(rooms.getRoomByPlayerId(idA) === null, 'the seat is released once the grace period is over');
  gateway.handleDisconnect(first.b);

  // Draughts: running out of time forfeits.
  gateway.checkersTurnMs = 40;
  events.length = 0;
  const timed = startGame('token-cccccccccccccccc', 'token-dddddddddddddddd', 'r3', 'r4');
  await wait(100);
  const ended = events.find((e) => e.event === 'game:ended');
  assert(ended?.payload.result.reason === 'timeout' && ended.payload.result.winner === 'black', 'white (to move) loses on time');
  assert(timed.room.status === 'finished', 'the room is finished after a timeout');

  // A refused action gets an answer.
  const stray = connect('r5', 'token-eeeeeeeeeeeeeeee');
  gateway.handleGameMove(stray, { roomId: 'NOPE', move: {} } as any);
  gateway.handleLudoRoll(stray, { roomId: 'NOPE' } as any);
  assert(sent.get('r5')!.filter((e) => e === 'error:NOT_IN_ROOM').length === 2, 'a move or roll outside a room gets NOT_IN_ROOM');

  gateway.handleDisconnect(timed.a);
  gateway.handleDisconnect(timed.b);
  gateway.handleDisconnect(stray);
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
  await sessionChecks(rooms);

  rooms.onModuleDestroy();
  fs.rmSync(path.join(process.cwd(), 'data', 'rooms.db'), { force: true });
  console.log('game.gateway: all assertions passed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
