import { Controller, Logger } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '@app/redis';

const SLOT_MATRIX_KEY_PREFIX = 'slot_matrix';

interface AppointmentBookedPayload {
  data: {
    appointmentId: string;
    doctorId: string;
    serviceDate: string;
    timeStart: string;
    timeEnd: string;
  };
}

interface AppointmentCancelledPayload {
  data: {
    appointmentId: string;
    doctorId: string;
    serviceDate: string;
    timeStart: string;
  };
}

/**
 * Consumes APPOINTMENT_BOOKED and APPOINTMENT_CANCELLED events from RabbitMQ
 * to maintain the local BookedSlot table (async replication from booking-service).
 * EC-3: Implements Tombstone pattern for out-of-order event delivery.
 */
@Controller()
export class BookedSlotsConsumer {
  private readonly logger = new Logger(BookedSlotsConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @EventPattern('APPOINTMENT_BOOKED')
  async handleAppointmentBooked(
    message: AppointmentBookedPayload,
  ): Promise<void> {
    const { appointmentId, doctorId, serviceDate, timeStart } = message.data;

    try {
      // EC-3 Tombstone: check if a cancellation already arrived for this appointment
      const existing = await this.prisma.bookedSlot.findUnique({
        where: { appointmentId },
      });

      if (existing?.isCancelled) {
        // CANCELLED arrived first (out-of-order) — clean up tombstone and skip
        this.logger.warn(
          `BOOKED event arrived after CANCELLED for ${appointmentId} — removing tombstone`,
        );
        await this.prisma.bookedSlot.delete({ where: { appointmentId } });
        return;
      }

      const slotDate = new Date(serviceDate);
      await this.prisma.bookedSlot.upsert({
        where: { appointmentId },
        create: {
          appointmentId,
          doctorId,
          slotDate,
          timeStart,
          isCancelled: false,
        },
        update: { isCancelled: false },
      });

      // Invalidate slot matrix cache
      await this.redis.del(
        `${SLOT_MATRIX_KEY_PREFIX}:${doctorId}:${serviceDate}`,
      );
      this.logger.debug(`BookedSlot created for appt ${appointmentId}`);
    } catch (err: any) {
      this.logger.error(`Failed to handle APPOINTMENT_BOOKED: ${err?.message}`);
    }
  }

  @EventPattern('APPOINTMENT_CANCELLED')
  async handleAppointmentCancelled(
    message: AppointmentCancelledPayload,
  ): Promise<void> {
    const { appointmentId, doctorId, serviceDate, timeStart } = message.data;

    try {
      const existing = await this.prisma.bookedSlot.findUnique({
        where: { appointmentId },
      });

      if (!existing) {
        // EC-3 Tombstone: BOOKED has not arrived yet — store cancellation tombstone
        this.logger.warn(
          `CANCELLED arrived before BOOKED for ${appointmentId} — storing tombstone`,
        );
        const slotDate = new Date(serviceDate);
        await this.prisma.bookedSlot.create({
          data: {
            appointmentId,
            doctorId,
            slotDate,
            timeStart,
            isCancelled: true,
          },
        });
      } else {
        await this.prisma.bookedSlot.delete({ where: { appointmentId } });
      }

      // Invalidate slot matrix cache
      await this.redis.del(
        `${SLOT_MATRIX_KEY_PREFIX}:${doctorId}:${serviceDate}`,
      );
      this.logger.debug(`BookedSlot removed for appt ${appointmentId}`);
    } catch (err: any) {
      this.logger.error(
        `Failed to handle APPOINTMENT_CANCELLED: ${err?.message}`,
      );
    }
  }
}
