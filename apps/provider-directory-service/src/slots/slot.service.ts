import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '@app/redis';
import { dayjs, toUtcDate } from '@app/commons/utils';
import { DoctorRepository } from '../doctors/doctor.repository';
import { OfficeHoursService } from '../office-hours/office-hours.service';

const SLOT_MATRIX_KEY_PREFIX = 'slot_matrix';
const SLOT_MATRIX_TTL_SECONDS = 3600; // 1 hour
const MUTEX_LOCK_PREFIX = 'slot_matrix_lock';
const MUTEX_TTL_SECONDS = 10;
const HOLD_KEY_PREFIX = 'hold';

export interface TimeSlot {
  timeStart: string;
  timeEnd: string;
  status?: 'AVAILABLE' | 'HELD' | 'HELD_BY_ME';
}

export interface MonthAvailabilityResponseDto {
  availableDates: string[];
  month: number;
  year: number;
}

@Injectable()
export class SlotService {
  private readonly logger = new Logger(SlotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly doctorRepo: DoctorRepository,
    private readonly officeHoursService: OfficeHoursService,
  ) {}

  /**
   * Generates or retrieves available slots from cache.
   * Uses Mutex lock to prevent Cache Stampede.
   */
  async getAvailableSlots(
    doctorId: string,
    locationId: string,
    dateStr: string, // format YYYY-MM-DD
    allowPast = false,
    sessionId?: string,
  ): Promise<TimeSlot[]> {
    const cacheKey = `${SLOT_MATRIX_KEY_PREFIX}:${doctorId}:${dateStr}`;

    // 1. Try Cache
    const cached = await this.redis.getJson<TimeSlot[]>(cacheKey);
    if (cached) {
      return this.filterOutHeldSlots(doctorId, dateStr, cached, sessionId);
    }

    // 2. Cache Miss: Acquire Mutex
    const mutexKey = `${MUTEX_LOCK_PREFIX}:${doctorId}:${dateStr}`;
    const acquired = await this.acquireMutex(mutexKey);

    if (!acquired) {
      // If cannot acquire, wait and retry (simplified polling)
      await new Promise((resolve) => setTimeout(resolve, 500));
      const retryCache = await this.redis.getJson<TimeSlot[]>(cacheKey);
      if (retryCache)
        return this.filterOutHeldSlots(
          doctorId,
          dateStr,
          retryCache,
          sessionId,
        );
    }

    try {
      // 3. Generate slots
      const rawSlots = await this.generateRawSlots(
        doctorId,
        locationId,
        dateStr,
        allowPast,
      );

      // 4. Save to Cache
      await this.redis.setJson(cacheKey, rawSlots, SLOT_MATRIX_TTL_SECONDS);

      return this.filterOutHeldSlots(doctorId, dateStr, rawSlots, sessionId);
    } finally {
      if (acquired) {
        await this.redis.del(mutexKey);
      }
    }
  }

  private async generateRawSlots(
    doctorId: string,
    locationId: string,
    dateStr: string,
    allowPast: boolean,
  ): Promise<TimeSlot[]> {
    const targetDate = dayjs.utc(dateStr).startOf('day');
    const dayOfWeek = targetDate.day(); // 0 (Sun) to 6 (Sat)
    const localNow = dayjs().tz('Asia/Ho_Chi_Minh');

    if (
      !allowPast &&
      targetDate.format('YYYY-MM-DD') < localNow.format('YYYY-MM-DD')
    ) {
      return [];
    }

    const doctor = await this.doctorRepo.findOne(doctorId);
    if (!doctor || !doctor.isActive) return [];
    const durationMinutes = doctor.appointmentDuration || 30;

    // 1. Initialize timeline blocks (00:00 to 23:59)
    const timeline: Record<
      string,
      {
        startTime: string;
        endTime: string;
        priority: number;
        action: 'ENABLE' | 'DISABLE';
      }
    > = {};
    let currentBlock = dayjs.utc('1970-01-01T00:00:00Z');
    const endOfDay = dayjs.utc('1970-01-01T24:00:00Z');

    while (
      currentBlock.clone().add(durationMinutes, 'minute').valueOf() <=
      endOfDay.valueOf()
    ) {
      const timeStartStr = currentBlock.format('HH:mm');
      const timeEndStr = currentBlock
        .clone()
        .add(durationMinutes, 'minute')
        .format('HH:mm');
      timeline[timeStartStr] = {
        startTime: timeStartStr,
        endTime: timeEndStr,
        priority: 0,
        action: 'DISABLE',
      };
      currentBlock = currentBlock.add(durationMinutes, 'minute');
    }

    // 2. Fetch Data from 4 Layers
    const [regularHours, clinicHolidays, doctorExceptions, specialShifts] =
      await Promise.all([
        this.prisma.officeHours.findMany({
          where: { doctorId, workLocationId: locationId, dayOfWeek },
        }),
        this.prisma.clinicException.findMany({
          where: { date: toUtcDate(dateStr) },
        }),
        this.prisma.doctorException.findMany({
          where: { doctorId, date: toUtcDate(dateStr) },
        }),
        this.prisma.specialShift.findMany({
          where: {
            doctorId,
            workLocationId: locationId,
            date: toUtcDate(dateStr),
          },
        }),
      ]);

    // Helper function to apply layer
    const applyLayer = (
      start: string,
      end: string,
      priority: number,
      action: 'ENABLE' | 'DISABLE',
    ) => {
      for (const time of Object.keys(timeline)) {
        if (time >= start && time < end) {
          if (priority > timeline[time].priority) {
            timeline[time].priority = priority;
            timeline[time].action = action;
          }
        }
      }
    };

    // Layer 1: Regular Hours (Priority 10 - ENABLE)
    for (const shift of regularHours) {
      applyLayer(
        dayjs.utc(shift.startTime).format('HH:mm'),
        dayjs.utc(shift.endTime).format('HH:mm'),
        10,
        'ENABLE',
      );
    }

    // Layer 2: Clinic Holidays (Priority 20 - DISABLE)
    for (const holiday of clinicHolidays) {
      // Global holiday applies to all locations or specific location
      if (holiday.workLocationId && holiday.workLocationId !== locationId)
        continue;
      const start =
        holiday.isFullDay || !holiday.startTime ? '00:00' : holiday.startTime;
      const end =
        holiday.isFullDay || !holiday.endTime ? '24:00' : holiday.endTime;
      applyLayer(start, end, 20, 'DISABLE');
    }

    // Layer 3: Doctor Exceptions (Priority 30 - DISABLE)
    for (const exp of doctorExceptions) {
      const start = exp.isFullDay || !exp.startTime ? '00:00' : exp.startTime;
      const end = exp.isFullDay || !exp.endTime ? '24:00' : exp.endTime;
      applyLayer(start, end, 30, 'DISABLE');
    }

    // Layer 4: Special Shifts / Overrides (Priority 40 - ENABLE)
    for (const shift of specialShifts) {
      applyLayer(
        dayjs.utc(shift.startTime).format('HH:mm'),
        dayjs.utc(shift.endTime).format('HH:mm'),
        40,
        'ENABLE',
      );
    }

    // Fetch booked slots from async replica (EC-3 Tombstone check)
    const bookedSlots = await this.prisma.bookedSlot.findMany({
      where: {
        doctorId,
        slotDate: toUtcDate(dateStr),
        isCancelled: false,
      },
      select: { timeStart: true },
    });
    const bookedTimeStarts = new Set<string>(
      bookedSlots.map((b) => b.timeStart),
    );

    // Current time in minutes for past filtering
    const isToday =
      targetDate.format('YYYY-MM-DD') === localNow.format('YYYY-MM-DD');
    const currentMin = localNow.hour() * 60 + localNow.minute();

    // 3. Extract Valid Slots
    const availableSlots: TimeSlot[] = [];
    for (const block of Object.values(timeline)) {
      if (block.action !== 'ENABLE') continue;

      const isBooked = bookedTimeStarts.has(block.startTime);
      if (isBooked) continue;

      if (!allowPast && isToday) {
        const [h, m] = block.startTime.split(':').map(Number);
        if (h * 60 + m <= currentMin) continue;
      }

      availableSlots.push({
        timeStart: block.startTime,
        timeEnd: block.endTime,
      });
    }

    return availableSlots;
  }

  /**
   * Evaluates slot status considering holds and the requesting sessionId.
   */
  private async filterOutHeldSlots(
    doctorId: string,
    dateStr: string,
    slots: TimeSlot[],
    sessionId?: string,
  ): Promise<TimeSlot[]> {
    const pattern = `${HOLD_KEY_PREFIX}:${doctorId}:${dateStr}:*`;
    let cursor = '0';
    const heldKeys: string[] = [];

    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, pattern, 100);
      heldKeys.push(...keys);
      cursor = nextCursor;
    } while (cursor !== '0');

    if (heldKeys.length === 0) {
      return slots.map((slot) => ({ ...slot, status: 'AVAILABLE' }));
    }

    const heldValues = await Promise.all(
      heldKeys.map((k) => this.redis.get(k)),
    );
    const heldMap = new Map<string, string>(); // timeStart -> userId

    for (let i = 0; i < heldKeys.length; i++) {
      const key = heldKeys[i];
      const val = heldValues[i];
      if (val) {
        const parts = key.split(':');
        // Key format: hold:{doctorId}:{date}:{timeStart}
        // Since timeStart has a colon (e.g. 09:30), it splits into two parts
        const timeStart = `${parts[parts.length - 2]}:${parts[parts.length - 1]}`;
        heldMap.set(timeStart, val);
      }
    }

    return slots.map((slot) => {
      const heldBy = heldMap.get(slot.timeStart);
      let status: 'AVAILABLE' | 'HELD' | 'HELD_BY_ME' = 'AVAILABLE';
      if (heldBy) {
        status = sessionId && heldBy === sessionId ? 'HELD_BY_ME' : 'HELD';
      }
      return { ...slot, status };
    });
  }

  async listMonthAvailability(
    doctorId: string,
    locationId: string,
    reqMonth?: number,
    reqYear?: number,
    allowPast = false,
  ): Promise<MonthAvailabilityResponseDto> {
    const availableDates: string[] = [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    const month = reqMonth || currentMonth;
    const year = reqYear || currentYear;
    const daysInMonth = new Date(year, month, 0).getDate();

    let startDay = 1;
    if (!allowPast) {
      if (year < currentYear) {
        return { availableDates: [], month, year };
      }
      if (year === currentYear) {
        if (month < currentMonth) {
          return { availableDates: [], month, year };
        }
        if (month === currentMonth) {
          startDay = currentDay;
        }
      }
    }

    for (let day = startDay; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      try {
        const slots = await this.getAvailableSlots(
          doctorId,
          locationId,
          dateStr,
          true,
        );
        if (slots && slots.length > 0) {
          availableDates.push(dateStr);
        }
      } catch (_err) {
        continue;
      }
    }

    return {
      availableDates,
      month,
      year,
    };
  }

  private async acquireMutex(key: string): Promise<boolean> {
    const result = await this.redis
      .pipeline()
      .set(key, '1', 'EX', MUTEX_TTL_SECONDS, 'NX')
      .exec();
    return result?.[0]?.[1] === 'OK';
  }
}
