import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MicroserviceClientHelper } from '../../clients/microservice-client.helper';
import {
  ScheduleSlotsQueryDto,
  ScheduleSlotDto,
  MonthSlotsQueryDto,
  MonthAvailabilityResponseDto,
} from '@app/contracts/dtos';
import { TIMEOUTS } from '../../common/constants';
import { BadRequestError } from '@app/domain-errors';

@Injectable()
export class ScheduleCompositeService {
  constructor(
    @Inject('PROVIDER_DIRECTORY_SERVICE')
    private readonly providerClient: ClientProxy,
    @Inject('BOOKING_SERVICE')
    private readonly bookingClient: ClientProxy,
    private readonly clientHelper: MicroserviceClientHelper,
  ) {}

  /**
   * List available slots for a doctor's schedule on a given date.
   * Defers to provider-directory-service for slot orchestration.
   */
  async listSlots(query: ScheduleSlotsQueryDto): Promise<ScheduleSlotDto[]> {
    const { doctorId, serviceDate, locationId, allowPast } = query;

    if (!doctorId || !serviceDate) {
      throw new BadRequestError('doctorId and serviceDate are required');
    }

    const slots = await this.clientHelper.send<ScheduleSlotDto[]>(
      this.providerClient,
      'provider.slots.list', // using literal string equivalent to PROVIDER_PATTERNS.SLOTS_LIST to avoid circular dependency
      { doctorId, serviceDate, locationId, allowPast },
      { timeoutMs: TIMEOUTS.SERVICE_CALL },
    );

    return slots || [];
  }

  /**
   * Get available dates in a month for a doctor's schedule.
   * Defers to provider-directory-service for month availability orchestration.
   */
  async listMonthAvailability(
    doctorId: string,
    query: MonthSlotsQueryDto,
  ): Promise<MonthAvailabilityResponseDto> {
    const { month, year, locationId, allowPast } = query;

    const res = await this.clientHelper.send<MonthAvailabilityResponseDto>(
      this.providerClient,
      'provider.slots.monthAvailability',
      { doctorId, locationId, month, year, allowPast },
      { timeoutMs: TIMEOUTS.SERVICE_CALL },
    );

    return (
      res || {
        availableDates: [],
        month: month || new Date().getMonth() + 1,
        year: year || new Date().getFullYear(),
      }
    );
  }
}
