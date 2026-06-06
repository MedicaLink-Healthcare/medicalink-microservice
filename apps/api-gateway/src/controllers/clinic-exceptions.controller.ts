import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  CreateClinicExceptionDto,
  UpdateClinicExceptionDto,
  ClinicExceptionQueryDto,
  RequireReadPermission,
  RequireUpdatePermission,
  RequireDeletePermission,
  Public,
} from '@app/contracts';
import { MicroserviceService } from '../utils/microservice.service';

@Controller('clinic-exceptions')
export class ClinicExceptionsController {
  constructor(
    @Inject('PROVIDER_DIRECTORY_SERVICE')
    private readonly providerDirectoryClient: ClientProxy,
    private readonly microserviceService: MicroserviceService,
  ) {}

  @RequireReadPermission('office-hours')
  @Get()
  findAll(@Query() query: ClinicExceptionQueryDto) {
    return this.microserviceService.sendWithTimeout(
      this.providerDirectoryClient,
      'clinic-exceptions.findAll',
      query,
    );
  }

  @Public()
  @Get('public')
  findAllPublic(@Query() query: ClinicExceptionQueryDto) {
    return this.microserviceService.sendWithTimeout(
      this.providerDirectoryClient,
      'clinic-exceptions.findAll',
      query,
    );
  }

  @RequireReadPermission('office-hours')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.microserviceService.sendWithTimeout(
      this.providerDirectoryClient,
      'clinic-exceptions.findOne',
      id,
    );
  }

  @RequireUpdatePermission('office-hours')
  @Post()
  create(@Body() createClinicExceptionDto: CreateClinicExceptionDto) {
    return this.microserviceService.sendWithTimeout(
      this.providerDirectoryClient,
      'clinic-exceptions.create',
      createClinicExceptionDto,
    );
  }

  @RequireUpdatePermission('office-hours')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateClinicExceptionDto: UpdateClinicExceptionDto,
  ) {
    return this.microserviceService.sendWithTimeout(
      this.providerDirectoryClient,
      'clinic-exceptions.update',
      { id, data: updateClinicExceptionDto },
    );
  }

  @RequireDeletePermission('office-hours')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.microserviceService.sendWithTimeout(
      this.providerDirectoryClient,
      'clinic-exceptions.remove',
      id,
    );
  }
}
