import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Delete,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Throttle } from '@nestjs/throttler';
import { firstValueFrom, timeout } from 'rxjs';
import {
  Public,
  RequireDeletePermission,
  RequireReadPermission,
  CurrentUser,
  GetReviewsQueryDto,
  AnalyzeReviewDto,
  GetReviewAnalysesQueryDto,
  type JwtPayloadDto,
  RequirePermission,
} from '@app/contracts';
import {
  CreateReviewDto,
  REVIEWS_PATTERNS,
  ORCHESTRATOR_PATTERNS,
  DOCTOR_PROFILES_PATTERNS,
} from '@app/contracts';
import { MicroserviceService } from '../utils/microservice.service';
import { PublicCreateThrottle } from '../utils/custom-throttle.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(
    @Inject('CONTENT_SERVICE') private readonly contentClient: ClientProxy,
    @Inject('ORCHESTRATOR_SERVICE')
    private readonly orchestratorClient: ClientProxy,
    @Inject('PROVIDER_DIRECTORY_SERVICE')
    private readonly providerDirectoryClient: ClientProxy,
    private readonly microserviceService: MicroserviceService,
  ) {}

  private async getDoctorProfileIdByStaffId(
    staffAccountId: string,
  ): Promise<string> {
    try {
      const profile = await firstValueFrom(
        this.providerDirectoryClient
          .send(DOCTOR_PROFILES_PATTERNS.GET_BY_ACCOUNT_ID, { staffAccountId })
          .pipe(timeout(5000)),
      );
      if (!profile || !profile.id) {
        throw new UnauthorizedException(
          'Doctor profile not found for this account',
        );
      }
      return profile.id;
    } catch (_error) {
      throw new UnauthorizedException(
        'Doctor profile not found for this account',
      );
    }
  }

  private async resolveDoctorId(id: string): Promise<string> {
    if (id === 'me') return id;

    try {
      const profile = await firstValueFrom(
        this.providerDirectoryClient
          .send(DOCTOR_PROFILES_PATTERNS.GET_BY_ACCOUNT_ID, {
            staffAccountId: id,
          })
          .pipe(timeout(2000)),
      );
      if (profile && profile.id) {
        return profile.id;
      }
    } catch (_error) {
      // If it fails (e.g., id is already a profile ID), fallback to original id
    }
    return id;
  }

  // List all reviews (admin/staff)
  @RequireReadPermission('reviews')
  @Get()
  async findAll(@Query() query: GetReviewsQueryDto) {
    return this.microserviceService.sendWithTimeout(
      this.contentClient,
      REVIEWS_PATTERNS.GET_LIST,
      query,
    );
  }

  // Public - create review
  @Public()
  @PublicCreateThrottle()
  @Post()
  async create(@Body() dto: CreateReviewDto) {
    return this.microserviceService.sendWithTimeout(
      this.orchestratorClient,
      ORCHESTRATOR_PATTERNS.REVIEW_CREATE,
      dto,
    );
  }

  // List reviews by doctor
  @RequireReadPermission('reviews')
  @Get('/doctor/:doctorId')
  async getByDoctor(
    @Param('doctorId') doctorId: string,
    @Query() query: GetReviewsQueryDto,
  ) {
    const resolvedId = await this.resolveDoctorId(doctorId);
    return this.microserviceService.sendWithTimeout(
      this.contentClient,
      REVIEWS_PATTERNS.GET_BY_DOCTOR,
      { doctorId: resolvedId, ...query },
    );
  }

  // List current logged-in doctor's reviews
  @RequireReadPermission('reviews')
  @Get('/staff/me')
  async getMyReviews(
    @CurrentUser() user: JwtPayloadDto,
    @Query() query: GetReviewsQueryDto,
  ) {
    const profileId = await this.getDoctorProfileIdByStaffId(user.sub);
    return this.microserviceService.sendWithTimeout(
      this.contentClient,
      REVIEWS_PATTERNS.GET_BY_DOCTOR,
      { doctorId: profileId, ...query },
    );
  }

  @RequireReadPermission('reviews')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.microserviceService.sendWithTimeout(
      this.contentClient,
      REVIEWS_PATTERNS.GET_BY_ID,
      { id },
    );
  }

  // Admin - delete review
  @RequireDeletePermission('reviews')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.microserviceService.sendWithTimeout(
      this.contentClient,
      REVIEWS_PATTERNS.DELETE,
      { id },
    );
  }

  // Analyze reviews - requires 'reviews:analyze' permission
  @RequirePermission('reviews', 'analyze')
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 per hour
  @Post('analyze')
  async analyzeReviews(
    @Body() dto: AnalyzeReviewDto,
    @CurrentUser() user: JwtPayloadDto,
  ) {
    let resolvedDoctorId = dto.doctorId;
    if (resolvedDoctorId === 'me') {
      resolvedDoctorId = await this.getDoctorProfileIdByStaffId(user.sub);
    } else {
      resolvedDoctorId = await this.resolveDoctorId(resolvedDoctorId);
    }

    return this.microserviceService.sendWithTimeout(
      this.contentClient,
      REVIEWS_PATTERNS.ANALYZE,
      { dto: { ...dto, doctorId: resolvedDoctorId }, userId: user.sub },
      { timeoutMs: 15000 }, // 15 second timeout for AI operations
    );
  }

  // Get historical analyses - requires 'reviews:read' permission
  // Uses orchestrator for read composition (populates creator name)
  @RequireReadPermission('reviews')
  @Get(':doctorId/analyses')
  async getReviewAnalyses(
    @Param('doctorId') doctorId: string,
    @Query() query: GetReviewAnalysesQueryDto,
  ) {
    const resolvedId = await this.resolveDoctorId(doctorId);
    return this.microserviceService.sendWithTimeout(
      this.orchestratorClient,
      ORCHESTRATOR_PATTERNS.REVIEW_ANALYSIS_LIST_COMPOSITE,
      { doctorId: resolvedId, query },
    );
  }

  // Get historical analyses for current logged-in doctor
  @RequireReadPermission('reviews')
  @Get('staff/me/analyses')
  async getMyReviewAnalyses(
    @CurrentUser() user: JwtPayloadDto,
    @Query() query: GetReviewAnalysesQueryDto,
  ) {
    const profileId = await this.getDoctorProfileIdByStaffId(user.sub);
    return this.microserviceService.sendWithTimeout(
      this.orchestratorClient,
      ORCHESTRATOR_PATTERNS.REVIEW_ANALYSIS_LIST_COMPOSITE,
      { doctorId: profileId, query },
    );
  }

  // Get single analysis by ID - requires 'reviews:read' permission
  @RequireReadPermission('reviews')
  @Get('analyses/:id')
  async getReviewAnalysisById(@Param('id') id: string) {
    return this.microserviceService.sendWithTimeout(
      this.contentClient,
      REVIEWS_PATTERNS.GET_ANALYSIS_BY_ID,
      { id },
    );
  }
}
