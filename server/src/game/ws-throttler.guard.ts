import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

interface Bucket {
  count: number;
  resetAt: number;
}

// ponytail: single-process in-memory map, resets on restart and doesn't
// share state across horizontally-scaled instances. Move to Redis if the
// server ever runs as more than one process.
@Injectable()
export class WsThrottlerGuard implements CanActivate {
  private readonly limit = 20;
  private readonly windowMs = 10_000;
  private readonly buckets = new Map<string, Bucket>();

  constructor() {
    setInterval(() => this.sweep(), 60_000).unref();
  }

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient();
    const key = `${client.id}:${context.getHandler().name}`;
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (bucket.count >= this.limit) {
      return false;
    }

    bucket.count++;
    return true;
  }

  private sweep(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (now > bucket.resetAt) {
        this.buckets.delete(key);
      }
    }
  }
}
