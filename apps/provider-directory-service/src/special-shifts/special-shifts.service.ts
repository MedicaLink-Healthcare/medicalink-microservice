import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSpecialShiftDto,
  UpdateSpecialShiftDto,
  SpecialShiftQueryDto,
} from '@app/contracts';
import { dayjs, toUtcDate } from '@app/commons/utils';

@Injectable()
export class SpecialShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSpecialShiftDto) {
    const targetDate = toUtcDate(data.date);
    const reqStart = new Date(`1970-01-01T${data.startTime}:00Z`);
    const reqEnd = new Date(`1970-01-01T${data.endTime}:00Z`);

    // Check overlap with existing special shifts for the same doctor and date
    const overlapping = await this.prisma.specialShift.findFirst({
      where: {
        doctorId: data.doctorId,
        date: targetDate,
        OR: [
          {
            startTime: { lt: reqEnd },
            endTime: { gt: reqStart },
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException(
        'Special shift overlaps with an existing shift on this date.',
      );
    }

    return this.prisma.specialShift.create({
      data: {
        doctorId: data.doctorId,
        workLocationId: data.workLocationId,
        date: targetDate,
        startTime: reqStart,
        endTime: reqEnd,
        reason: data.reason,
      },
    });
  }

  async findAll(query: SpecialShiftQueryDto) {
    const where: any = {};
    if (query.doctorId) where.doctorId = query.doctorId;
    if (query.workLocationId) where.workLocationId = query.workLocationId;
    if (query.date) where.date = toUtcDate(query.date);

    return this.prisma.specialShift.findMany({ where });
  }

  async findOne(id: string) {
    const shift = await this.prisma.specialShift.findUnique({ where: { id } });
    if (!shift) throw new NotFoundException('Special shift not found');
    return shift;
  }

  async update(id: string, data: UpdateSpecialShiftDto) {
    const shift = await this.findOne(id);

    // Check shrinking window
    if (data.startTime || data.endTime || data.date) {
      await this.validateShrinkingWindow(
        shift.doctorId,
        toUtcDate(data.date || String(shift.date)),
      );
    }

    const updateData: any = {};
    if (data.workLocationId !== undefined)
      updateData.workLocationId = data.workLocationId;
    if (data.date !== undefined) updateData.date = toUtcDate(data.date);
    if (data.startTime !== undefined)
      updateData.startTime = new Date(`1970-01-01T${data.startTime}:00Z`);
    if (data.endTime !== undefined)
      updateData.endTime = new Date(`1970-01-01T${data.endTime}:00Z`);
    if (data.reason !== undefined) updateData.reason = data.reason;

    // Check overlap if time/date changed
    if (updateData.date || updateData.startTime || updateData.endTime) {
      const targetDate = updateData.date || shift.date;
      const reqStart = updateData.startTime || shift.startTime;
      const reqEnd = updateData.endTime || shift.endTime;

      const overlapping = await this.prisma.specialShift.findFirst({
        where: {
          id: { not: id },
          doctorId: shift.doctorId,
          date: targetDate,
          OR: [
            {
              startTime: { lt: reqEnd },
              endTime: { gt: reqStart },
            },
          ],
        },
      });

      if (overlapping) {
        throw new BadRequestException(
          'Updated special shift overlaps with an existing shift on this date.',
        );
      }
    }

    return this.prisma.specialShift.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    const shift = await this.findOne(id);
    await this.validateShrinkingWindow(shift.doctorId, shift.date);
    return this.prisma.specialShift.delete({ where: { id } });
  }

  private async validateShrinkingWindow(doctorId: string, date: Date) {
    // Basic implementation: if there are any booked slots on this day,
    // prevent modification to avoid orphaned appointments.
    const booked = await this.prisma.bookedSlot.findFirst({
      where: {
        doctorId,
        slotDate: date,
        isCancelled: false,
      },
    });

    if (booked) {
      throw new BadRequestException(
        'Cannot modify special shift: there are already booked appointments on this date. Please cancel them first.',
      );
    }
  }
}
