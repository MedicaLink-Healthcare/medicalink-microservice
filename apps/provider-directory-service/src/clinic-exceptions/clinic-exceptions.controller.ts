import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ClinicExceptionsService } from './clinic-exceptions.service';
import {
  CreateClinicExceptionDto,
  UpdateClinicExceptionDto,
  ClinicExceptionQueryDto,
} from '@app/contracts';

@Controller()
export class ClinicExceptionsController {
  constructor(
    private readonly clinicExceptionsService: ClinicExceptionsService,
  ) {}

  @MessagePattern('clinic-exceptions.create')
  create(@Payload() createClinicExceptionDto: CreateClinicExceptionDto) {
    return this.clinicExceptionsService.create(createClinicExceptionDto);
  }

  @MessagePattern('clinic-exceptions.findAll')
  findAll(@Payload() query: ClinicExceptionQueryDto) {
    return this.clinicExceptionsService.findAll(query);
  }

  @MessagePattern('clinic-exceptions.findOne')
  findOne(@Payload() id: string) {
    return this.clinicExceptionsService.findOne(id);
  }

  @MessagePattern('clinic-exceptions.update')
  update(@Payload() payload: { id: string; data: UpdateClinicExceptionDto }) {
    return this.clinicExceptionsService.update(payload.id, payload.data);
  }

  @MessagePattern('clinic-exceptions.remove')
  remove(@Payload() id: string) {
    return this.clinicExceptionsService.remove(id);
  }
}
