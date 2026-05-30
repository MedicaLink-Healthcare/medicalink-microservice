import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DoctorCompositeService } from './doctor-composite.service';
import { ORCHESTRATOR_PATTERNS } from '@app/contracts/patterns';
import { StaffQueryDto, DoctorProfileQueryDto } from '@app/contracts';

@Controller()
export class DoctorCompositeController {
  constructor(
    private readonly doctorCompositeService: DoctorCompositeService,
  ) {}

  @MessagePattern(ORCHESTRATOR_PATTERNS.DOCTOR_GET_COMPOSITE)
  async getDoctorCompositeByAccountId(
    @Payload() payload: { staffAccountId: string; skipCache?: boolean },
  ) {
    return this.doctorCompositeService.getDoctorCompositeByAccountId(
      payload.staffAccountId,
      payload.skipCache,
    );
  }

  @MessagePattern(ORCHESTRATOR_PATTERNS.DOCTOR_GET_COMPOSITE_BY_ID)
  async getDoctorCompositeByDoctorId(
    @Payload() payload: { doctorId: string; skipCache?: boolean },
  ) {
    return this.doctorCompositeService.getDoctorCompositeByDoctorId(
      payload.doctorId,
      payload.skipCache,
    );
  }

  @MessagePattern(ORCHESTRATOR_PATTERNS.DOCTOR_LIST_COMPOSITE)
  async listDoctorComposites(@Payload() query: StaffQueryDto) {
    return this.doctorCompositeService.listDoctorCompositesAdmin(query);
  }

  @MessagePattern(ORCHESTRATOR_PATTERNS.DOCTOR_PUBLIC_LIST_COMPOSITE)
  async listDoctorCompositesPublic(@Payload() query: StaffQueryDto) {
    return this.doctorCompositeService.listDoctorCompositesPublic(
      query as unknown as DoctorProfileQueryDto,
    );
  }
}
