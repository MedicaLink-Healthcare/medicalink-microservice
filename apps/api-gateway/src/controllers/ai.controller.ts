import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  Public,
  DoctorRecommendationRequestDto,
  SpecialtySuggestionRequestDto,
} from '@app/contracts';
import { AI_PATTERNS, SPECIALTIES_PATTERNS } from '@app/contracts/patterns';
import { MicroserviceService } from '../utils/microservice.service';

/**
 * REST prefix `/api/ai/*` — khớp frontend (vd. `POST /api/ai/recommend-doctor`) và tài liệu.
 * Logic RPC giống `DoctorRecommendationController` (`/api/doctors/profile/recommend`).
 */
@Controller('ai')
export class AiController {
  constructor(
    @Inject('AI_SERVICE') private readonly aiClient: ClientProxy,
    @Inject('PROVIDER_DIRECTORY_SERVICE')
    private readonly providerClient: ClientProxy,
    private readonly microserviceService: MicroserviceService,
  ) {}

  @Public()
  @Post(['recommend', 'recommend-doctor'])
  @HttpCode(200)
  async recommend(@Body() body: DoctorRecommendationRequestDto) {
    return this.microserviceService.sendWithTimeout(
      this.aiClient,
      AI_PATTERNS.DOCTOR_RECOMMENDATION,
      body,
      { timeoutMs: 90000 },
    );
  }

  /** Gợi ý chuyên khoa (NLU) — user xác nhận trên UI trước khi gọi recommend-doctor. */
  @Public()
  @Post('suggest-specialties')
  @HttpCode(200)
  async suggestSpecialties(@Body() body: SpecialtySuggestionRequestDto) {
    // 1. Fetch full catalog of specialties to get aliases, commonSymptoms, keywords
    try {
      const specialtiesResult: any =
        await this.microserviceService.sendWithTimeout(
          this.providerClient,
          SPECIALTIES_PATTERNS.FIND_ALL_ADMIN,
          { page: 1, limit: 100, isActive: true }, // Fetch up to 100 active specialties with metadata
          { timeoutMs: 15000 },
        );

      // 2. Override the specialties field to include the rich metadata needed by AI intent routing
      if (specialtiesResult && specialtiesResult.data) {
        body.specialties = specialtiesResult.data;
      }
    } catch (error) {
      // If fetching fails, we just log and proceed with whatever frontend provided (if any)
      console.warn('Failed to fetch specialties for AI suggestion:', error);
    }

    return this.microserviceService.sendWithTimeout(
      this.aiClient,
      AI_PATTERNS.SPECIALTY_SUGGESTION,
      body,
      { timeoutMs: 60000 },
    );
  }
}
