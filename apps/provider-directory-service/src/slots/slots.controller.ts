import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PROVIDER_PATTERNS } from '@app/contracts/patterns';
import {
  SlotService,
  TimeSlot,
  MonthAvailabilityResponseDto,
} from './slot.service';

@Controller()
export class SlotsController {
  constructor(private readonly slotService: SlotService) {}

  @MessagePattern(PROVIDER_PATTERNS.SLOTS_LIST)
  async listSlots(
    @Payload()
    dto: {
      doctorId: string;
      locationId: string;
      serviceDate: string;
      allowPast?: boolean;
      sessionId?: string;
    },
  ): Promise<TimeSlot[]> {
    return this.slotService.getAvailableSlots(
      dto.doctorId,
      dto.locationId,
      dto.serviceDate,
      dto.allowPast,
      dto.sessionId,
    );
  }

  @MessagePattern(PROVIDER_PATTERNS.MONTH_AVAILABILITY)
  async listMonthAvailability(
    @Payload()
    dto: {
      doctorId: string;
      locationId: string;
      month?: number;
      year?: number;
      allowPast?: boolean;
    },
  ): Promise<MonthAvailabilityResponseDto> {
    return this.slotService.listMonthAvailability(
      dto.doctorId,
      dto.locationId,
      dto.month,
      dto.year,
      dto.allowPast,
    );
  }
}
