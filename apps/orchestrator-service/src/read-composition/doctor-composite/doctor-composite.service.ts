/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CacheService } from '../../cache/cache.service';
import { MicroserviceClientHelper } from '../../clients';
import { CACHE_PREFIXES, CACHE_TTL } from '../../common/constants';
import {
  DOCTOR_ACCOUNTS_PATTERNS,
  DOCTOR_PROFILES_PATTERNS,
  STAFFS_PATTERNS,
  StaffQueryDto,
  DoctorSearchCompositeQueryDto,
  DoctorProfileQueryDto,
  DoctorCompositeResultDto,
  DoctorCompositeListResultDto,
  DoctorCompositeData,
  DoctorProfileData,
} from '@app/contracts';
import { IStaffAccount } from '@app/contracts/interfaces';
import { BaseCompositeService } from '../base';

/**
 * Service for composing doctor data from multiple sources
 * Implements read composition pattern with caching
 */
@Injectable()
export class DoctorCompositeService extends BaseCompositeService<
  DoctorCompositeData,
  DoctorSearchCompositeQueryDto
> {
  protected readonly logger = new Logger(DoctorCompositeService.name);
  protected readonly cachePrefix = CACHE_PREFIXES.DOCTOR_COMPOSITE;
  protected readonly listCachePrefix = CACHE_PREFIXES.DOCTOR_COMPOSITE_LIST;
  protected readonly defaultCacheTtl = CACHE_TTL.MEDIUM;

  constructor(
    @Inject('ACCOUNTS_SERVICE')
    private readonly accountsClient: ClientProxy,
    @Inject('PROVIDER_DIRECTORY_SERVICE')
    private readonly providerClient: ClientProxy,
    protected readonly cacheService: CacheService,
    protected readonly clientHelper: MicroserviceClientHelper,
  ) {
    super();
  }

  /**
   * Get complete doctor data by staff account ID
   */
  async getDoctorCompositeByAccountId(
    staffAccountId: string,
    skipCache = false,
  ): Promise<DoctorCompositeResultDto> {
    const cacheKey = this.buildEntityCacheKey(staffAccountId);

    return this.getCompositeWithCache<IStaffAccount, DoctorProfileData>(
      staffAccountId,
      {
        source1: {
          client: this.accountsClient,
          pattern: DOCTOR_ACCOUNTS_PATTERNS.FIND_ONE,
          payload: staffAccountId,
          timeoutMs: 8000,
          serviceName: 'accounts-service',
        },
        source2: {
          client: this.providerClient,
          pattern: DOCTOR_PROFILES_PATTERNS.GET_BY_ACCOUNT_ID,
          payload: { staffAccountId },
          timeoutMs: 8000,
          serviceName: 'provider-directory-service',
        },
        cacheKey,
        cacheTtl: CACHE_TTL.MEDIUM,
        skipCache,
      },
      (account, profile) => this.mergeData(account, profile),
    );
  }

  /**
   * Get complete doctor data by doctor profile ID
   */
  async getDoctorCompositeByDoctorId(
    doctorId: string,
    skipCache = false,
  ): Promise<DoctorCompositeResultDto> {
    const cacheKey = this.buildEntityCacheKey(`doc:${doctorId}`);

    // Check cache first
    if (!skipCache) {
      const cached = await this.cacheService.get<DoctorCompositeData>(cacheKey);
      if (cached) {
        return {
          data: cached,
          sources: [
            { service: 'provider-directory-service', fetched: false },
            { service: 'accounts-service', fetched: false },
          ],
          cache: { hit: true, ttl: CACHE_TTL.MEDIUM, key: cacheKey },
          timestamp: new Date(),
        };
      }
    }

    // 1. Fetch profile first to get staffAccountId
    const profile = await this.clientHelper.send<DoctorProfileData>(
      this.providerClient,
      DOCTOR_PROFILES_PATTERNS.FIND_ONE,
      doctorId,
      { timeoutMs: 8000 },
    );

    // 2. Fetch account using staffAccountId from profile
    let account: IStaffAccount | null = null;
    try {
      account = await this.clientHelper.send<IStaffAccount>(
        this.accountsClient,
        DOCTOR_ACCOUNTS_PATTERNS.FIND_ONE,
        profile.staffAccountId,
        { timeoutMs: 8000 },
      );
    } catch (err) {
      this.logger.warn(
        `Staff account ${profile.staffAccountId} not found for doctor ${doctorId}. Proceeding with profile data only.`,
      );
    }

    const compositeData = this.mergeData(account, profile);

    // Cache the result
    await this.cacheService.set(cacheKey, compositeData, CACHE_TTL.MEDIUM);

    return {
      data: compositeData,
      sources: [
        { service: 'provider-directory-service', fetched: true },
        { service: 'accounts-service', fetched: true },
      ],
      cache: { hit: false, ttl: CACHE_TTL.MEDIUM, key: cacheKey },
      timestamp: new Date(),
    };
  }

  // Admin list composite: use StaffQueryDto and DO NOT sanitize (return full metadata)
  async listDoctorCompositesAdmin(
    query: StaffQueryDto,
  ): Promise<DoctorCompositeListResultDto> {
    const hasExtraFilters =
      (query as any).specialtyIds !== undefined ||
      (query as any).workLocationIds !== undefined;
    if (hasExtraFilters) {
      return this.listDoctorCompositesPublic(
        query as unknown as DoctorProfileQueryDto,
      );
    }

    const cacheKey = this.buildListCacheKey({
      ...query,
      __admin: true,
    });

    const accountsPayload = {
      page: query.page,
      limit: query.limit,
      role: query.role,
      search: query.search || (query as any).fullName,
      email: query.email,
      isMale: query.isMale,
      isActive: query.isActive,
      createdFrom: query.createdFrom,
      createdTo: query.createdTo,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    // Remove undefined properties
    Object.keys(accountsPayload).forEach(
      (key) =>
        accountsPayload[key as keyof typeof accountsPayload] === undefined &&
        delete accountsPayload[key as keyof typeof accountsPayload],
    );

    const result = await this.searchCompositeWithCache<
      IStaffAccount,
      DoctorProfileData
    >(
      query,
      {
        primaryFetch: {
          client: this.accountsClient,
          pattern: DOCTOR_ACCOUNTS_PATTERNS.FIND_ALL,
          payload: accountsPayload,
          timeoutMs: 12000,
          serviceName: 'accounts-service',
        },
        secondaryFetch: (accounts: IStaffAccount[]) => ({
          client: this.providerClient,
          pattern: DOCTOR_PROFILES_PATTERNS.GET_BY_ACCOUNT_IDS,
          payload: {
            staffAccountIds: accounts.map((acc) => acc.id),
            ...(query.isActive !== undefined && { isActive: query.isActive }),
          },
          timeoutMs: 15000,
          serviceName: 'provider-directory-service',
        }),
        cacheKey,
        cacheTtl: CACHE_TTL.SHORT,
        skipCache: (query as any)?.skipCache ?? false,
        extractIds: (accounts) => accounts.map((acc) => acc.id),
        extractMeta: (primaryResult) => primaryResult.meta,
      },
      (account: IStaffAccount, profiles: DoctorProfileData[]) => {
        const profile = profiles.find((p) => p.staffAccountId === account.id);

        if (!profile && query.isActive !== undefined) {
          return null;
        } else if (!profile) {
          return {
            id: account.id,
            fullName: account.fullName,
            email: account.email,
            phone: account.phone,
            isMale: account.isMale,
            dateOfBirth: account.dateOfBirth,
          } as DoctorCompositeData;
        }
        return this.mergeData(account, profile);
      },
    );

    return result;
  }

  /**
   * Public list composite: uses provider-directory as primary fetch for correct filter pagination
   */
  async listDoctorCompositesPublic(
    query: DoctorProfileQueryDto,
  ): Promise<DoctorCompositeListResultDto> {
    const cacheKey = this.buildListCacheKey({
      ...query,
      __public: true,
    });

    const result = await this.searchCompositeWithCache<
      DoctorProfileData,
      IStaffAccount
    >(
      query,
      {
        primaryFetch: {
          client: this.providerClient,
          pattern: DOCTOR_PROFILES_PATTERNS.GET_PUBLIC_LIST,
          payload: query,
          timeoutMs: 12000,
          serviceName: 'provider-directory-service',
        },
        secondaryFetch: (profiles: DoctorProfileData[]) => ({
          client: this.accountsClient,
          pattern: STAFFS_PATTERNS.FIND_BY_IDS,
          payload: { staffIds: profiles.map((p) => p.staffAccountId) },
          timeoutMs: 10000,
          serviceName: 'accounts-service',
        }),
        cacheKey,
        cacheTtl: CACHE_TTL.SHORT,
        skipCache: (query as any)?.skipCache ?? false,
        extractIds: (profiles) => profiles.map((p) => p.staffAccountId),
        extractMeta: (primaryResult) => primaryResult.meta,
      },
      (profile: DoctorProfileData, accounts: IStaffAccount[]) => {
        const account = accounts.find((a) => a.id === profile.staffAccountId);
        return this.sanitizePublicComposite(this.mergeData(account, profile));
      },
    );

    return result;
  }

  /**
   * Sanitize composite item for public consumption
   * - Remove sensitive account/profile timestamps if needed
   * - Keep email and phone as they are now merged from account service
   */
  public sanitizePublicComposite(
    item: DoctorCompositeData,
  ): DoctorCompositeData {
    const {
      createdAt,
      updatedAt,
      profileCreatedAt,
      profileUpdatedAt,
      specialties,
      workLocations,
      ...rest
    } = item as any;

    const sanitized: any = {
      ...rest,
      specialties: specialties?.map((s: any) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
      })),
      workLocations: workLocations?.map((w: any) => ({
        id: w.id,
        name: w.name,
        address: w.address,
      })),
    };

    return sanitized as DoctorCompositeData;
  }

  /**
   * Merge account and profile data into composite
   */
  private mergeData(
    account: IStaffAccount | null | undefined,
    profile: DoctorProfileData,
  ): DoctorCompositeData {
    return {
      // Account data (with fallbacks if account is missing)
      id: account?.id || profile.staffAccountId,
      fullName: account?.fullName || profile.fullName || '',
      email: account?.email || '',
      phone: (account?.phone as string | null) || '',
      isMale: account?.isMale ?? profile.isMale ?? true,
      dateOfBirth: account?.dateOfBirth ? new Date(account.dateOfBirth) : null,
      role: 'DOCTOR',

      // Profile data
      profileId: profile.id,
      isActive: profile.isActive,
      position: profile.position,
      introduction: profile.introduction,
      education: profile.education,
      experience: profile.experience,
      avatarUrl: profile.avatarUrl,
      portrait: profile.portrait,
      ratings: profile.ratings,
      serviceCost: profile.serviceCost,
      experienceYears: profile.experienceYears,
      conditions: profile.conditions,
      symptoms: profile.symptoms,
      expertise: profile.expertise,
      procedures: profile.procedures,
      patientGroups: profile.patientGroups,
      specialtyIds: profile.specialtyIds,

      // Relations
      specialties: profile.specialties,
      workLocations: profile.workLocations,

      // Timestamps
      createdAt: account?.createdAt || profile.createdAt,
      updatedAt: account?.updatedAt || profile.updatedAt,
      profileCreatedAt: profile.createdAt,
      profileUpdatedAt: profile.updatedAt,
    };
  }

  /**
   * Invalidate cache for a specific doctor
   */
  async invalidateDoctorCache(staffAccountId: string): Promise<void> {
    return this.invalidateEntityCache(staffAccountId);
  }

  /**
   * Invalidate all doctor list caches
   */
  async invalidateDoctorListCache(): Promise<void> {
    return this.invalidateListCache();
  }
}
