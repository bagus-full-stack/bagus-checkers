import { ExecutionContext } from '@nestjs/common';
import { WsThrottlerGuard } from './ws-throttler.guard';

function fakeContext(clientId: string, handlerName: string): ExecutionContext {
  return {
    switchToWs: () => ({ getClient: () => ({ id: clientId }) }),
    getHandler: () => ({ name: handlerName }),
  } as unknown as ExecutionContext;
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function main(): void {
  const guard = new WsThrottlerGuard();
  const ctx = fakeContext('socket-1', 'handleGameMove');

  for (let i = 0; i < 20; i++) {
    assert(guard.canActivate(ctx), `call ${i} should be allowed within limit`);
  }
  assert(!guard.canActivate(ctx), 'call 21 should be blocked over limit');

  const otherHandler = fakeContext('socket-1', 'handleChatMessage');
  assert(guard.canActivate(otherHandler), 'different handler has its own bucket');

  const otherClient = fakeContext('socket-2', 'handleGameMove');
  assert(guard.canActivate(otherClient), 'different client has its own bucket');

  console.log('ws-throttler.guard: all assertions passed');
}

main();
