import { Module } from '@nestjs/common';
import { SpecialShiftsService } from './special-shifts.service';
import { SpecialShiftsController } from './special-shifts.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { DoctorsModule } from '../doctors/doctors.module';
import { DoctorCacheInvalidationService } from '../cache/doctor-cache-invalidation.service';
import { RedisModule } from '@app/redis';

@Module({
  imports: [DoctorsModule, RedisModule],
  controllers: [SpecialShiftsController],
  providers: [
    SpecialShiftsService,
    PrismaService,
    DoctorCacheInvalidationService,
  ],
  exports: [SpecialShiftsService],
})
export class SpecialShiftsModule {}
