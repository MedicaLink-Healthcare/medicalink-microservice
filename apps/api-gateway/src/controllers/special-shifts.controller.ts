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
  CreateSpecialShiftDto,
  UpdateSpecialShiftDto,
  SpecialShiftQueryDto,
  RequireReadPermission,
  RequireUpdatePermission,
  RequireDeletePermission,
  Public,
} from '@app/contracts';
import { MicroserviceService } from '../utils/microservice.service';

@Controller('special-shifts')
export class SpecialShiftsController {
  constructor(
    @Inject('PROVIDER_DIRECTORY_SERVICE')
    private readonly providerDirectoryClient: ClientProxy,
    private readonly microserviceService: MicroserviceService,
  ) {}

  @RequireReadPermission('office-hours')
  @Get()
  findAll(@Query() query: SpecialShiftQueryDto) {
    return this.microserviceService.sendWithTimeout(
      this.providerDirectoryClient,
      'special-shifts.findAll',
      query,
    );
  }

  @Public()
  @Get('public')
  findAllPublic(@Query() query: SpecialShiftQueryDto) {
    return this.microserviceService.sendWithTimeout(
      this.providerDirectoryClient,
      'special-shifts.findAll',
      query,
    );
  }

  @RequireReadPermission('office-hours')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.microserviceService.sendWithTimeout(
      this.providerDirectoryClient,
      'special-shifts.findOne',
      id,
    );
  }

  @RequireUpdatePermission('office-hours')
  @Post()
  create(@Body() createSpecialShiftDto: CreateSpecialShiftDto) {
    return this.microserviceService.sendWithTimeout(
      this.providerDirectoryClient,
      'special-shifts.create',
      createSpecialShiftDto,
    );
  }

  @RequireUpdatePermission('office-hours')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSpecialShiftDto: UpdateSpecialShiftDto,
  ) {
    return this.microserviceService.sendWithTimeout(
      this.providerDirectoryClient,
      'special-shifts.update',
      { id, data: updateSpecialShiftDto },
    );
  }

  @RequireDeletePermission('office-hours')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.microserviceService.sendWithTimeout(
      this.providerDirectoryClient,
      'special-shifts.remove',
      id,
    );
  }
}
