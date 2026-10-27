import * as fs from 'fs';
import * as path from 'path';
import { RoomService } from './room.service';
import { OnlinePlayer } from './types';
import { createLudoState, LudoGameState } from './ludo-rules';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function player(id: string, name: string): OnlinePlayer {
  return { id, socketId: `socket-${id}`, name, isReady: false, isConnected: true };
}

function main(): void {
  const storePath = path.join(process.cwd(), 'data', 'rooms.db');
  fs.rmSync(storePath, { force: true });

  const service = new RoomService();
  service.onModuleInit();
  const room = service.createRoom(player('p1', 'Alice'), 'Test room', false, 'international');
  service.joinRoom(room.id, player('p2', 'Bob'));

  // Persist is debounced (setTimeout); onModuleDestroy flushes synchronously
  // and closes the file so the restored instance can reopen it.
  service.onModuleDestroy();

  const restored = new RoomService();
  restored.onModuleInit();
  const restoredRoom = restored.getRoom(room.id);
  assert(!!restoredRoom, 'room should survive a simulated restart');
  assert(restoredRoom!.guestPlayer?.id === 'p2', 'guest player should be restored');
  assert(restored.getRoomByPlayerId('p1')?.id === room.id, 'playerRooms index should be restored');
  restored.onModuleDestroy();

  // Ludo: a freed middle color is reused, never duplicated.
  const ludoService = new RoomService();
  ludoService.onModuleInit();
  const ludo = ludoService.createRoom(player('l1', 'A'), 'Ludo', false, 'ludo');
  ludoService.joinRoom(ludo.id, player('l2', 'B'));
  ludoService.joinRoom(ludo.id, player('l3', 'C'));
  ludoService.leaveRoom('l2');
  ludoService.joinRoom(ludo.id, player('l4', 'D'));
  const colors = ludoService.getRoom(ludo.id)!.players!.map((p) => p.color);
  assert(new Set(colors).size === colors.length, 'ludo colors should stay unique after a leave');

  // Ludo: leaving mid-game passes the turn / ends the game instead of freezing it.
  const live = ludoService.createRoom(player('m1', 'A'), 'Live', false, 'ludo');
  ludoService.joinRoom(live.id, player('m2', 'B'));
  ludoService.setPlayerReady('m1', true);
  ludoService.setPlayerReady('m2', true);
  ludoService.startGame(live.id);
  ludoService.updateGameState(live.id, createLudoState(['red', 'green']));
  ludoService.leaveRoom('m1');
  const after = ludoService.getRoom(live.id)!;
  const afterState = after.gameState as LudoGameState;
  assert(afterState.status === 'finished' && afterState.winner === 'green', 'last remaining ludo player should win');
  assert(after.status === 'finished', 'room should end when one ludo player remains');
  ludoService.onModuleDestroy();

  // Restart: a Ludo game saved on an older track layout is dropped, a consistent one is kept.
  const saver = new RoomService();
  saver.onModuleInit();
  const keep = saver.createRoom(player('k1', 'A'), 'Keep', false, 'ludo');
  const stale = saver.createRoom(player('s1', 'A'), 'Stale', false, 'ludo');
  const fresh = createLudoState(['red', 'green']);
  saver.updateGameState(keep.id, fresh);
  saver.updateGameState(stale.id, {
    ...fresh,
    pieces: fresh.pieces.map((p, i) => (i === 0 ? { ...p, trackIndex: 20, position: { row: 6, col: 6 } } : p)),
  });
  saver.onModuleDestroy();
  const reloaded = new RoomService();
  reloaded.onModuleInit();
  assert(!!reloaded.getRoom(keep.id), 'consistent ludo room should be restored');
  assert(!reloaded.getRoom(stale.id), 'ludo room saved on another track layout should be dropped');
  reloaded.onModuleDestroy();

  fs.rmSync(storePath, { force: true });
  console.log('room.service persistence: all assertions passed');
}

main();
