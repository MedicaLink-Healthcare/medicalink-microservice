import { Injectable } from '@nestjs/common';
import { OfficeHoursRepository } from './office-hours.repository';
import { OfficeHours } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateOfficeHoursDto,
  OfficeHoursQueryDto,
  OfficeHoursResponseDto,
  UpdateOfficeHoursDto,
} from '@app/contracts';
import { BadRequestError, NotFoundError } from '@app/domain-errors';
import { DoctorRepository } from '../doctors/doctor.repository';

@Injectable()
export class OfficeHoursService {
  constructor(
    private readonly repo: OfficeHoursRepository,
    private readonly doctorRepo: DoctorRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(query: OfficeHoursQueryDto) {
    let { doctorId } = query;
    const { workLocationId } = query;
    if (doctorId) {
      doctorId = await this.doctorRepo.resolveDoctorId(doctorId);
    }

    let globalHours: OfficeHoursResponseDto[] = [];
    let doctorSpecific: OfficeHoursResponseDto[] = [];

    const globalEntities = await this.repo.findMany({ isGlobal: true });
    globalHours = globalEntities
      .filter(
        (oh) =>
          !workLocationId ||
          !oh.workLocationId ||
          oh.workLocationId === workLocationId,
      )
      .map((oh) => this.toResponseDto(oh));

    if (doctorId) {
      const docEntities = await this.repo.findMany({ doctorId });
      doctorSpecific = docEntities
        .filter((oh) => !workLocationId || oh.workLocationId === workLocationId)
        .map((oh) => this.toResponseDto(oh));
    }

    return {
      global: globalHours,
      doctorSpecific: doctorSpecific,
    };
  }

  async findOne(id: string) {
    const oh = await this.repo.findById(id);
    if (!oh) throw new NotFoundError('Office hours not found');
    return this.toResponseDto(oh);
  }

  async create(dto: CreateOfficeHoursDto) {
    if (dto.doctorId) {
      dto.doctorId = await this.doctorRepo.resolveDoctorId(dto.doctorId);
    }

    await this.validateNoOverlap(
      dto.doctorId || null,
      dto.workLocationId || null,
      dto.dayOfWeek,
      dto.startTime,
      dto.endTime,
    );
    const oh = await this.repo.create(dto);
    return this.toResponseDto(oh);
  }

  async update(id: string, dto: UpdateOfficeHoursDto) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Office hours not found');

    const oldDto = this.toResponseDto(existing);

    const newStart = dto.startTime ?? oldDto.startTime;
    const newEnd = dto.endTime ?? oldDto.endTime;
    const newDay = dto.dayOfWeek ?? oldDto.dayOfWeek;
    let newDocId = dto.doctorId !== undefined ? dto.doctorId : oldDto.doctorId;

    if (newDocId) {
      newDocId = await this.doctorRepo.resolveDoctorId(newDocId);
      if (dto.doctorId !== undefined) dto.doctorId = newDocId;
    }

    const newLocId =
      dto.workLocationId !== undefined
        ? dto.workLocationId
        : oldDto.workLocationId;

    if (
      newStart !== oldDto.startTime ||
      newEnd !== oldDto.endTime ||
      newDay !== oldDto.dayOfWeek
    ) {
      await this.validateNoOverlap(
        newDocId || null,
        newLocId || null,
        newDay,
        newStart,
        newEnd,
        id,
      );

      if (newDay === oldDto.dayOfWeek) {
        await this.validateShrinkingWindow(
          oldDto.doctorId || null,
          oldDto.dayOfWeek,
          oldDto.startTime,
          oldDto.endTime,
          newStart,
          newEnd,
        );
      } else {
        await this.validateShrinkingWindow(
          oldDto.doctorId || null,
          oldDto.dayOfWeek,
          oldDto.startTime,
          oldDto.endTime,
        );
      }
    }

    const oh = await this.repo.update(id, dto);
    return this.toResponseDto(oh);
  }

  async remove(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Office hours not found');

    const oldDto = this.toResponseDto(existing);
    await this.validateShrinkingWindow(
      oldDto.doctorId || null,
      oldDto.dayOfWeek,
      oldDto.startTime,
      oldDto.endTime,
    );

    const oh = await this.repo.delete(id);
    return this.toResponseDto(oh);
  }

  async findPriority(query: OfficeHoursQueryDto) {
    let { doctorId } = query;
    const { workLocationId, strict } = query;
    if (doctorId) {
      doctorId = await this.doctorRepo.resolveDoctorId(doctorId);
    }

    if (strict && doctorId && workLocationId) {
      const isLinked = await this.doctorRepo.hasWorkLocation(
        doctorId,
        workLocationId,
      );
      if (!isLinked) {
        throw new BadRequestError(
          'Doctor is not assigned to the specified work location',
        );
      }
    }

    if (doctorId && workLocationId) {
      const tier1 = await this.findWithDoctorAndLocation({
        doctorId,
        workLocationId,
      });
      if (tier1.length > 0) return tier1;
    }

    if (doctorId) {
      const tier2 = await this.findWithDoctor(doctorId);
      if (tier2.length > 0) return tier2;
    }

    if (workLocationId) {
      const tier3 = await this.findWithLocation(workLocationId);
      if (tier3.length > 0) return tier3;
    }

    const tier4 = await this.findGlobal();
    return tier4;
  }

  private async findWithDoctorAndLocation({
    doctorId,
    workLocationId,
  }: {
    doctorId: string;
    workLocationId: string;
  }): Promise<OfficeHoursResponseDto[]> {
    const ohs = await this.repo.findMany({
      doctorId,
      workLocationId,
    });
    return ohs.map((oh) => this.toResponseDto(oh));
  }

  private async findWithDoctor(
    doctorId: string,
  ): Promise<OfficeHoursResponseDto[]> {
    const ohs = await this.repo.findMany({
      doctorId,
    });
    return ohs.map((oh) => this.toResponseDto(oh));
  }

  private async findWithLocation(
    workLocationId: string,
  ): Promise<OfficeHoursResponseDto[]> {
    const ohs = await this.repo.findMany({
      workLocationId,
    });
    return ohs.map((oh) => this.toResponseDto(oh));
  }

  private async findGlobal(): Promise<OfficeHoursResponseDto[]> {
    const ohs = await this.repo.findMany({
      isGlobal: true,
    });

    return ohs.map((oh) => this.toResponseDto(oh));
  }

  private toResponseDto(entity: OfficeHours): OfficeHoursResponseDto {
    const fmt = (d: Date | string): string => {
      const date = typeof d === 'string' ? new Date(d) : d;
      const iso = date.toISOString();
      return iso.substring(11, 16); // HH:mm
    };

    return {
      id: entity.id,
      doctorId: entity.doctorId,
      workLocationId: entity.workLocationId,
      dayOfWeek: entity.dayOfWeek,
      startTime: fmt(entity.startTime),
      endTime: fmt(entity.endTime),
      isGlobal: !!entity.isGlobal,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private async validateNoOverlap(
    doctorId: string | null,
    workLocationId: string | null,
    dayOfWeek: number,
    startTimeStr: string,
    endTimeStr: string,
    excludeId?: string,
  ) {
    if (!doctorId) return;

    const existing = await this.repo.findMany({ doctorId });
    const forDay = existing.filter(
      (oh) => oh.dayOfWeek === dayOfWeek && oh.id !== excludeId,
    );

    for (const oh of forDay) {
      const existingStart = this.toResponseDto(oh).startTime;
      const existingEnd = this.toResponseDto(oh).endTime;

      if (startTimeStr < existingEnd && endTimeStr > existingStart) {
        throw new BadRequestError(
          'Office hours overlap with an existing schedule for this doctor',
        );
      }
    }
  }

  private async validateShrinkingWindow(
    doctorId: string | null,
    dayOfWeek: number,
    oldStart: string,
    oldEnd: string,
    newStart?: string,
    newEnd?: string,
  ) {
    if (!doctorId) return;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const futureSlots = await this.prisma.bookedSlot.findMany({
      where: {
        doctorId,
        isCancelled: false,
        slotDate: { gte: today },
      },
    });

    for (const slot of futureSlots) {
      if (slot.slotDate.getUTCDay() === dayOfWeek) {
        const slotTime = slot.timeStart;
        if (slotTime >= oldStart && slotTime < oldEnd) {
          if (!newStart || !newEnd) {
            throw new BadRequestError(
              `Cannot delete office hours. Future appointment exists at ${slotTime}`,
              { details: { code: 'SHRINKING_WINDOW' } },
            );
          }
          if (slotTime < newStart || slotTime >= newEnd) {
            throw new BadRequestError(
              `Cannot shrink office hours. Future appointment exists at ${slotTime} which would be orphaned.`,
              { details: { code: 'SHRINKING_WINDOW' } },
            );
          }
        }
      }
    }
  }
}
