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
  Public,
  RequireDeletePermission,
  RequireReadPermission,
  RequireUpdatePermission,
  RequirePermission,
  CurrentUser,
  PaginatedResponse,
} from '@app/contracts';
import type {
  CreateDoctorProfileDto,
  UpdateDoctorProfileDto,
  DoctorProfileQueryDto,
  ToggleDoctorActiveBodyDto,
  JwtPayloadDto,
  ScheduleSlotsPublicQueryDto,
  MonthSlotsQueryDto,
  MonthAvailabilityResponseDto,
  DoctorCompositeData,
} from '@app/contracts/dtos';
import { MicroserviceService } from '../utils/microservice.service';
import {
  DOCTOR_PROFILES_PATTERNS,
  ORCHESTRATOR_PATTERNS,
} from '@app/contracts/patterns';

type DoctorPublicListItem = Pick<
  DoctorCompositeData,
  | 'id'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'isMale'
  | 'degree'
  | 'position'
  | 'introduction'
  | 'avatarUrl'
  | 'specialties'
  | 'workLocations'
  | 'appointmentDuration'
  | 'conditions'
  | 'symptoms'
  | 'expertise'
  | 'procedures'
  | 'patientGroups'
  | 'experienceYears'
  | 'education'
  | 'experience'
  | 'specialtyIds'
>;

type DoctorPublicProfile = Omit<
  DoctorCompositeData,
  | 'id'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'isActive'
  | 'createdAt'
  | 'updatedAt'
  | 'profileCreatedAt'
  | 'profileUpdatedAt'
> & {
  // We want to keep these at the top level for the profile
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
};

@Controller('doctors/profile')
export class DoctorProfileController {
  constructor(
    @Inject('PROVIDER_DIRECTORY_SERVICE')
    private readonly providerDirectoryClient: ClientProxy,
    @Inject('ORCHESTRATOR_SERVICE')
    private readonly orchestratorClient: ClientProxy,
    private readonly microserviceService: MicroserviceService,
  ) {}

  @Public()
  @Get('/public')
  async getPublicList(
    @Query() query: DoctorProfileQueryDto,
  ): Promise<PaginatedResponse<DoctorPublicListItem>> {
    const filters = {
      ...query,
      isActive: true,
    };

    const result = await this.microserviceService.sendWithTimeout<any>(
      this.orchestratorClient,
      ORCHESTRATOR_PATTERNS.DOCTOR_PUBLIC_LIST_COMPOSITE,
      filters,
      { timeoutMs: 15000 },
    );

    return {
      data: result.data.map((doctor: any) => this.mapToPublicListItem(doctor)),
      meta: result.meta,
    };
  }

  @Public()
  @Get('/public/:id')
  async getPublicProfile(
    @Param('id') id: string,
  ): Promise<DoctorPublicProfile> {
    const result = await this.microserviceService.sendWithTimeout<any>(
      this.orchestratorClient,
      ORCHESTRATOR_PATTERNS.DOCTOR_GET_COMPOSITE_BY_ID,
      { doctorId: id },
      { timeoutMs: 10000 },
    );

    return this.mapToPublicProfile(result.data);
  }

  @RequirePermission('doctors', 'read', { isSelf: true })
  @Get('me')
  getMyProfile(@CurrentUser() user: JwtPayloadDto) {
    return this.microserviceService.sendWithTimeout(
      this.providerDirectoryClient,
      DOCTOR_PROFILES_PATTERNS.GET_BY_ACCOUNT_ID,
      { staffAccountId: user.sub },
      { timeoutMs: 8000 },
    );
  }

  @RequireReadPermission('doctors')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.microserviceService.sendWithTimeout(
      this.providerDirectoryClient,
      DOCTOR_PROFILES_PATTERNS.FIND_ONE,
      id,
    );
  }

  @RequireUpdatePermission('doctors')
  @Post()
  create(@Body() createDto: CreateDoctorProfileDto) {
    return this.microserviceService.sendWithTimeout(
      this.providerDirectoryClient,
      DOCTOR_PROFILES_PATTERNS.CREATE,
      createDto,
      { timeoutMs: 12000 },
    );
  }

  @RequirePermission('doctors', 'update', { isSelf: true })
  @Patch('me')
  updateMyProfile(
    @Body() updateDto: Omit<UpdateDoctorProfileDto, 'id' | 'staffAccountId'>,
    @CurrentUser() user: JwtPayloadDto,
  ) {
    return this.microserviceService.sendWithTimeout(
      this.providerDirectoryClient,
      DOCTOR_PROFILES_PATTERNS.UPDATE_SELF,
      { staffAccountId: user.sub, data: updateDto },
      { timeoutMs: 12000 },
    );
  }

  @RequireUpdatePermission('doctors')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: Omit<UpdateDoctorProfileDto, 'id'>,
  ) {
    return this.microserviceService.sendWithTimeout(
      this.providerDirectoryClient,
      DOCTOR_PROFILES_PATTERNS.UPDATE,
      { id, ...updateDto },
      { timeoutMs: 12000 },
    );
  }

  @Public()
  @Get(':id/slots')
  async getPublicSlots(
    @Param('id') id: string,
    @Query() query: ScheduleSlotsPublicQueryDto,
  ) {
    return await this.microserviceService.sendWithTimeout(
      this.orchestratorClient,
      ORCHESTRATOR_PATTERNS.SCHEDULE_SLOTS_LIST,
      {
        doctorId: id,
        strict: true,
        ...query,
      },
      { timeoutMs: 12000 },
    );
  }

  @Public()
  @Get(':id/month-slots')
  async getMonthSlots(
    @Param('id') id: string,
    @Query() query: MonthSlotsQueryDto,
  ): Promise<MonthAvailabilityResponseDto> {
    return await this.microserviceService.sendWithTimeout(
      this.orchestratorClient,
      ORCHESTRATOR_PATTERNS.SCHEDULE_MONTH_AVAILABILITY,
      {
        doctorId: id,
        query,
      },
      { timeoutMs: 30000 }, // Longer timeout since it checks multiple dates
    );
  }

  @RequireUpdatePermission('doctors')
  @Patch(':id/toggle-active')
  toggleActive(
    @Param('id') id: string,
    @Body() body: ToggleDoctorActiveBodyDto,
  ) {
    return this.microserviceService.sendWithTimeout(
      this.providerDirectoryClient,
      DOCTOR_PROFILES_PATTERNS.TOGGLE_ACTIVE,
      { id, isActive: body?.isActive },
      { timeoutMs: 8000 },
    );
  }

  @RequireDeletePermission('doctors')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.microserviceService.sendWithTimeout(
      this.providerDirectoryClient,
      DOCTOR_PROFILES_PATTERNS.REMOVE,
      { id },
    );
  }

  private mapToPublicListItem(doctor: any): DoctorPublicListItem {
    return {
      id: doctor.profileId || doctor.id,
      fullName: doctor.fullName,
      email: doctor.email,
      phone: doctor.phone,
      isMale: doctor.isMale,
      degree: doctor.degree,
      position: doctor.position,
      introduction: doctor.introduction,
      avatarUrl: doctor.avatarUrl,
      specialties: doctor.specialties,
      workLocations: doctor.workLocations,
      appointmentDuration: doctor.appointmentDuration,
      conditions: doctor.conditions,
      symptoms: doctor.symptoms,
      expertise: doctor.expertise,
      procedures: doctor.procedures,
      patientGroups: doctor.patientGroups,
      experienceYears: doctor.experienceYears,
      education: doctor.education,
      experience: doctor.experience,
      specialtyIds: doctor.specialtyIds,
    };
  }

  private mapToPublicProfile(doctor: any): DoctorPublicProfile {
    const {
      isActive: _isActive,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      profileCreatedAt: _pCreatedAt,
      profileUpdatedAt: _pUpdatedAt,
      staffAccountId: _staffAccountId,
      ...publicDoctor
    } = doctor;

    return {
      ...publicDoctor,
      id: doctor.profileId || doctor.id, // Ensure we return the profile ID as the primary ID for the public view
    } as DoctorPublicProfile;
  }
}
