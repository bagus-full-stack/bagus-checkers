import * as fs from 'fs';
import * as path from 'path';
import { RoomService } from './room.service';
import { OnlinePlayer } from './types';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function player(id: string, name: string): OnlinePlayer {
  return { id, socketId: `socket-${id}`, name, isReady: false, isConnected: true };
}

function main(): void {
  const storePath = path.join(process.cwd(), 'data', 'rooms.json');
  fs.rmSync(storePath, { force: true });

  const service = new RoomService();
  service.onModuleInit();
  const room = service.createRoom(player('p1', 'Alice'), 'Test room', false, 'international');
  service.joinRoom(room.id, player('p2', 'Bob'));

  // Persist is debounced (setTimeout); write synchronously here to check the
  // on-disk shape without waiting on the timer.
  (service as any).saveTimer && clearTimeout((service as any).saveTimer);
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(
    storePath,
    JSON.stringify({
      rooms: Array.from((service as any).rooms.entries()),
      playerRooms: Array.from((service as any).playerRooms.entries()),
    })
  );

  const restored = new RoomService();
  restored.onModuleInit();
  const restoredRoom = restored.getRoom(room.id);
  assert(!!restoredRoom, 'room should survive a simulated restart');
  assert(restoredRoom!.guestPlayer?.id === 'p2', 'guest player should be restored');
  assert(restored.getRoomByPlayerId('p1')?.id === room.id, 'playerRooms index should be restored');

  fs.rmSync(storePath, { force: true });
  console.log('room.service persistence: all assertions passed');
}

main();
