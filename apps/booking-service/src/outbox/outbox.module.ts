import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { RabbitMQConfig, QUEUE_NAMES } from '@app/rabbitmq';
import { RedisModule } from '@app/redis';
import { OutboxProcessor } from './outbox.processor';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    RedisModule,
    ClientsModule.registerAsync([
      {
        name: 'NOTIFICATION_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) =>
          RabbitMQConfig.createClientConfig(
            configService,
            QUEUE_NAMES.NOTIFICATION_QUEUE,
          ),
        inject: [ConfigService],
      },
      {
        name: 'PROVIDER_DIRECTORY_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) =>
          RabbitMQConfig.createClientConfig(
            configService,
            QUEUE_NAMES.PROVIDER_QUEUE,
          ),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [OutboxProcessor, PrismaService],
  exports: [OutboxProcessor],
})
export class OutboxModule {}
