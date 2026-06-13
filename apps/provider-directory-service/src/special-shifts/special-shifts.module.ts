import { Module } from '@nestjs/common';
import { SpecialShiftsService } from './special-shifts.service';
import { SpecialShiftsController } from './special-shifts.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { DoctorsModule } from '../doctors/doctors.module';

@Module({
  imports: [DoctorsModule],
  controllers: [SpecialShiftsController],
  providers: [SpecialShiftsService, PrismaService],
  exports: [SpecialShiftsService],
})
export class SpecialShiftsModule {}
