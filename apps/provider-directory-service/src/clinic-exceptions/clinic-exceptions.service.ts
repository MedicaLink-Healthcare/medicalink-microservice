import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateClinicExceptionDto,
  UpdateClinicExceptionDto,
  ClinicExceptionQueryDto,
} from '@app/contracts';
import { dayjs, toUtcDate } from '@app/commons/utils';

@Injectable()
export class ClinicExceptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateClinicExceptionDto) {
    const targetDate = toUtcDate(data.date);

    return this.prisma.clinicException.create({
      data: {
        workLocationId: data.workLocationId,
        date: targetDate,
        isFullDay: data.isFullDay !== undefined ? data.isFullDay : true,
        startTime: data.startTime,
        endTime: data.endTime,
        reason: data.reason,
      },
    });
  }

  async findAll(query: ClinicExceptionQueryDto) {
    const where: any = {};
    if (query.workLocationId) where.workLocationId = query.workLocationId;
    if (query.date) where.date = toUtcDate(query.date);

    return this.prisma.clinicException.findMany({ where });
  }

  async findOne(id: string) {
    const exception = await this.prisma.clinicException.findUnique({
      where: { id },
    });
    if (!exception) throw new NotFoundException('Clinic exception not found');
    return exception;
  }

  async update(id: string, data: UpdateClinicExceptionDto) {
    const exception = await this.findOne(id);

    const updateData: any = {};
    if (data.workLocationId !== undefined)
      updateData.workLocationId = data.workLocationId;
    if (data.date !== undefined) updateData.date = toUtcDate(data.date);
    if (data.isFullDay !== undefined) updateData.isFullDay = data.isFullDay;
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.reason !== undefined) updateData.reason = data.reason;

    return this.prisma.clinicException.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.clinicException.delete({ where: { id } });
  }
}
