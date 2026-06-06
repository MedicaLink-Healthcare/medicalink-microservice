import { Module } from '@nestjs/common';
import { SlotsController } from './slots.controller';
import { SlotService } from './slot.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '@app/redis';
import { DoctorsModule } from '../doctors/doctors.module';
import { OfficeHoursModule } from '../office-hours/office-hours.module';

@Module({
  imports: [PrismaModule, RedisModule, DoctorsModule, OfficeHoursModule],
  controllers: [SlotsController],
  providers: [SlotService],
  exports: [SlotService],
})
export class SlotsModule {}
