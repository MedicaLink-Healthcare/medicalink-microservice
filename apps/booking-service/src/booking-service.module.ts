import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { AppointmentsModule } from './appointments/appointments.module';
import { PatientsModule } from './patients/patients.module';
import { PrismaModule } from '../prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { OutboxModule } from './outbox/outbox.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule,
    PrismaModule,
    AppointmentsModule,
    PatientsModule,
    OutboxModule,
  ],
  controllers: [HealthController],
})
export class BookingServiceModule {}
