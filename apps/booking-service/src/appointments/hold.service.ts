import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@app/redis';

const HOLD_TTL_SECONDS = 600; // 10 minutes
const HOLD_KEY_PREFIX = 'hold';
const HOLD_USER_PREFIX = 'hold_user';

@Injectable()
export class HoldService {
  private readonly logger = new Logger(HoldService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Acquire a temporary slot hold using Redis NX (set if not exists).
   * Returns true if hold was acquired, false if already held by another user.
   * Auto-releases any previous hold by the same user.
   */
  async holdSlot(
    doctorId: string,
    date: string,
    timeStart: string,
    userId: string,
  ): Promise<boolean> {
    const key = this.buildKey(doctorId, date, timeStart);
    const userKey = `${HOLD_USER_PREFIX}:${userId}`;

    // Auto-release previous hold if different from the requested one
    const previousHoldKey = await this.redis.get(userKey);
    if (previousHoldKey && previousHoldKey !== key) {
      await this.redis.del(previousHoldKey);
    }

    // Use raw ioredis pipeline to achieve SET NX EX
    const result = await this.redis
      .pipeline()
      .set(key, userId, 'EX', HOLD_TTL_SECONDS, 'NX')
      .exec();

    const setResult = result?.[0]?.[1];
    const acquired = setResult === 'OK';

    if (acquired) {
      await this.redis.set(userKey, key, HOLD_TTL_SECONDS);
      return true;
    }

    // Check if the user is already holding THIS key (re-acquiring)
    const currentHolder = await this.redis.get(key);
    if (currentHolder === userId) {
      await this.redis.expire(key, HOLD_TTL_SECONDS);
      await this.redis.set(userKey, key, HOLD_TTL_SECONDS);
      return true;
    }

    this.logger.debug(`Slot already held: ${key}`);
    return false;
  }

  /**
   * Release an existing slot hold. No-op if key does not exist.
   */
  async releaseHold(
    doctorId: string,
    date: string,
    timeStart: string,
    userId?: string,
  ): Promise<void> {
    const key = this.buildKey(doctorId, date, timeStart);
    await this.redis.del(key);

    if (userId) {
      await this.redis.del(`${HOLD_USER_PREFIX}:${userId}`);
    }
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
