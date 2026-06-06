import { Module } from '@nestjs/common';
import { ClinicExceptionsService } from './clinic-exceptions.service';
import { ClinicExceptionsController } from './clinic-exceptions.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [ClinicExceptionsController],
  providers: [ClinicExceptionsService, PrismaService],
  exports: [ClinicExceptionsService],
})
export class ClinicExceptionsModule {}
