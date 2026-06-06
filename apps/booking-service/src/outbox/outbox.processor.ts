import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '@app/redis';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';

const LOCK_KEY = 'lock:outbox_processor';
const LOCK_TTL_SECONDS = 10;
const BATCH_SIZE = 50;

@Injectable()
export class OutboxProcessor {
  private readonly logger = new Logger(OutboxProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationClient: ClientProxy,
    @Inject('PROVIDER_DIRECTORY_SERVICE')
    private readonly providerDirectoryClient: ClientProxy,
  ) {}

  /**
   * Runs every 4 seconds. Acquires a distributed lock before processing
   * to ensure only one instance runs at a time (horizontal scaling safe).
   */
  @Cron('*/4 * * * * *')
  async processOutbox(): Promise<void> {
    // G4: Distributed lock — only one pod processes at a time
    const acquired = await this.acquireLock();
    if (!acquired) return;

    try {
      const events = await this.prisma.outboxEvent.findMany({
        where: { status: 'PENDING' },
        take: BATCH_SIZE,
        orderBy: { createdAt: 'asc' },
      });

      if (!events.length) return;

      this.logger.debug(`Processing ${events.length} outbox event(s)`);

      for (const event of events) {
        try {
          this.publishEvent(event);
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: { status: 'PROCESSED', processedAt: new Date() },
          });
        } catch (err: any) {
          this.logger.error(
            `Failed to process outbox event ${event.id} (${event.type})`,
            err?.message,
          );
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: { status: 'FAILED' },
          });
        }
      }
    } finally {
      await this.releaseLock();
    }
  }

  private publishEvent(event: {
    id: string;
    type: string;
    payload: unknown;
    correlationId: string | null;
  }): void {
    const headers = {
      'x-correlation-id': event.correlationId ?? '',
      'x-outbox-event-id': event.id,
    };
    const messagePayload = { data: event.payload, headers };

    switch (event.type) {
      case 'APPOINTMENT_BOOKED':
      case 'APPOINTMENT_CANCELLED':
        // Fan-out: notify both notification and provider-directory services
        this.notificationClient.emit(event.type, messagePayload);
        this.providerDirectoryClient.emit(event.type, messagePayload);
        break;
      case 'APPOINTMENT_STATUS_CHANGED':
        this.notificationClient.emit(event.type, messagePayload);
        break;
      default:
        this.logger.warn(`Unknown outbox event type: ${event.type}`);
        this.notificationClient.emit(event.type, messagePayload);
    }
  }

  /** Acquire distributed lock using Redis SET NX EX */
  private async acquireLock(): Promise<boolean> {
    const result = await this.redis
      .pipeline()
      .set(LOCK_KEY, '1', 'EX', LOCK_TTL_SECONDS, 'NX')
      .exec();
    return result?.[0]?.[1] === 'OK';
  }

  private async releaseLock(): Promise<void> {
    await this.redis.del(LOCK_KEY);
  }
}
