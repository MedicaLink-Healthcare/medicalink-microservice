import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@app/redis';

const HOLD_TTL_SECONDS = 300; // 5 minutes
const HOLD_KEY_PREFIX = 'hold';

@Injectable()
export class HoldService {
  private readonly logger = new Logger(HoldService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Acquire a temporary slot hold using Redis NX (set if not exists).
   * Returns true if hold was acquired, false if already held by another user.
   */
  async holdSlot(
    doctorId: string,
    date: string,
    timeStart: string,
    userId: string,
  ): Promise<boolean> {
    const key = this.buildKey(doctorId, date, timeStart);
    // NX = only set if key does not exist (atomic lock)
    const result = await this.redis
      .pipeline()
      .set(key, userId, 'EX', HOLD_TTL_SECONDS, 'NX')
      .exec();

    const setResult = result?.[0]?.[1];
    const acquired = setResult === 'OK';
    if (!acquired) {
      this.logger.debug(`Slot already held: ${key}`);
    }
    return acquired;
  }

  /**
   * Release an existing slot hold. No-op if key does not exist.
   */
  async releaseHold(
    doctorId: string,
    date: string,
    timeStart: string,
  ): Promise<void> {
    const key = this.buildKey(doctorId, date, timeStart);
    await this.redis.del(key);
  }

  /**
   * Check if a slot is currently held by anyone.
   */
  async isHeld(
    doctorId: string,
    date: string,
    timeStart: string,
  ): Promise<boolean> {
    const key = this.buildKey(doctorId, date, timeStart);
    const val = await this.redis.get(key);
    return val !== null;
  }

  /**
   * Cursor-based SCAN to find all hold keys for a given doctor+date.
   * EC-2: Never use KEYS in production — use SCAN with COUNT=100.
   */
  async scanHeldTimeSlots(doctorId: string, date: string): Promise<string[]> {
    const pattern = `${HOLD_KEY_PREFIX}:${doctorId}:${date}:*`;
    const heldTimeStarts: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, pattern, 100);
      for (const key of keys) {
        // Key format: hold:{doctorId}:{date}:{timeStart}
        const parts = key.split(':');
        const timeStart = parts[parts.length - 1];
        if (timeStart) heldTimeStarts.push(timeStart);
      }
      cursor = nextCursor;
    } while (cursor !== '0');

    return heldTimeStarts;
  }

  private buildKey(doctorId: string, date: string, timeStart: string): string {
    return `${HOLD_KEY_PREFIX}:${doctorId}:${date}:${timeStart}`;
  }
}
