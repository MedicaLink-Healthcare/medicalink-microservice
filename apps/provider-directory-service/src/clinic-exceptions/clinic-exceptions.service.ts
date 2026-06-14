import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateClinicExceptionDto,
  UpdateClinicExceptionDto,
  ClinicExceptionQueryDto,
} from '@app/contracts';
import { toUtcDate } from '@app/commons/utils';
import { DoctorCacheInvalidationService } from '../cache/doctor-cache-invalidation.service';

@Injectable()
export class ClinicExceptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheInvalidationService: DoctorCacheInvalidationService,
  ) {}

  async create(data: CreateClinicExceptionDto) {
    const targetDate = toUtcDate(data.date);

    const created = await this.prisma.clinicException.create({
      data: {
        workLocationId: data.workLocationId,
        date: targetDate,
        isFullDay: data.isFullDay !== undefined ? data.isFullDay : true,
        startTime: data.startTime,
        endTime: data.endTime,
        reason: data.reason,
      },
    });

    await this.cacheInvalidationService.invalidateSlotMatrix(
      undefined,
      data.date,
    );
    return created;
  }

  async findAll(query: ClinicExceptionQueryDto) {
    const where: any = {};
    if (query.workLocationId) {
      where.OR = [
        { workLocationId: query.workLocationId },
        { workLocationId: null },
      ];
    }
    if (query.date) where.date = toUtcDate(query.date);

    return this.prisma.clinicException.findMany({
      where,
    });
  }

  async findOne(id: string) {
    const exception = await this.prisma.clinicException.findUnique({
      where: { id },
    });
    if (!exception) throw new NotFoundException('Clinic exception not found');
    return exception;
  }

  async update(id: string, data: UpdateClinicExceptionDto) {
    await this.findOne(id);

    const updateData: any = {};
    if (data.workLocationId !== undefined)
      updateData.workLocationId = data.workLocationId;
    if (data.date !== undefined) updateData.date = toUtcDate(data.date);
    if (data.isFullDay !== undefined) updateData.isFullDay = data.isFullDay;
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.reason !== undefined) updateData.reason = data.reason;

    const updated = await this.prisma.clinicException.update({
      where: { id },
      data: updateData,
    });

    const dateStr = data.date || String(updated.date);
    await this.cacheInvalidationService.invalidateSlotMatrix(
      undefined,
      dateStr,
    );

    return updated;
  }

  async remove(id: string) {
    const exception = await this.findOne(id);
    const deleted = await this.prisma.clinicException.delete({ where: { id } });

    const dateStr = exception.date.toISOString().split('T')[0];
    await this.cacheInvalidationService.invalidateSlotMatrix(
      undefined,
      dateStr,
    );

    return deleted;
  }
}
