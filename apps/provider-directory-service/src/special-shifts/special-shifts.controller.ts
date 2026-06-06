import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SpecialShiftsService } from './special-shifts.service';
import {
  CreateSpecialShiftDto,
  UpdateSpecialShiftDto,
  SpecialShiftQueryDto,
} from '@app/contracts';

@Controller()
export class SpecialShiftsController {
  constructor(private readonly specialShiftsService: SpecialShiftsService) {}

  @MessagePattern('special-shifts.create')
  create(@Payload() createSpecialShiftDto: CreateSpecialShiftDto) {
    return this.specialShiftsService.create(createSpecialShiftDto);
  }

  @MessagePattern('special-shifts.findAll')
  findAll(@Payload() query: SpecialShiftQueryDto) {
    return this.specialShiftsService.findAll(query);
  }

  @MessagePattern('special-shifts.findOne')
  findOne(@Payload() id: string) {
    return this.specialShiftsService.findOne(id);
  }

  @MessagePattern('special-shifts.update')
  update(@Payload() payload: { id: string; data: UpdateSpecialShiftDto }) {
    return this.specialShiftsService.update(payload.id, payload.data);
  }

  @MessagePattern('special-shifts.remove')
  remove(@Payload() id: string) {
    return this.specialShiftsService.remove(id);
  }
}
