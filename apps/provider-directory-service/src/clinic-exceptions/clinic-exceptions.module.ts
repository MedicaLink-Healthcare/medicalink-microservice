import { Module } from '@nestjs/common';
import { ClinicExceptionsService } from './clinic-exceptions.service';
import { ClinicExceptionsController } from './clinic-exceptions.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { DoctorCacheInvalidationService } from '../cache/doctor-cache-invalidation.service';
import { RedisModule } from '@app/redis';

@Module({
  imports: [RedisModule],
  controllers: [ClinicExceptionsController],
  providers: [
    ClinicExceptionsService,
    PrismaService,
    DoctorCacheInvalidationService,
  ],
  exports: [ClinicExceptionsService],
})
export class ClinicExceptionsModule {}
