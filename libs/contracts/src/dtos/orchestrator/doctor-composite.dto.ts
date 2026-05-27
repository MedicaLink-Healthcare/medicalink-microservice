import { DoctorProfileResponseDto } from '../provider/doctor-profile-response.dto';

/**
 * Doctor profile data from provider-directory-service
 */
export type DoctorProfileData = DoctorProfileResponseDto;

/**
 * Complete doctor data (account + profile merged)
 */
export interface DoctorCompositeData {
  // Account data
  id: string; // staffAccountId
  fullName: string;
  email: string;
  phone?: string | null;
  isMale?: boolean | null;
  dateOfBirth?: Date | null;
  role: 'DOCTOR';

  // Profile data
  profileId: string; // Doctor.id from provider service
  isActive: boolean;
  degree?: string;
  position: string[];
  introduction?: string;
  education: string[];
  experience: string[];
  avatarUrl?: string | null;
  portrait?: string | null;
  appointmentDuration?: number;
  ratings?: number | null;
  serviceCost?: number | null;
  experienceYears?: number | null;
  conditions: string[];
  symptoms: string[];
  expertise: string[];
  procedures: string[];
  patientGroups: string[];
  specialtyIds: string[];

  // Relations
  specialties?: {
    id: string;
    name: string;
    slug: string;
  }[];
  workLocations?: {
    id: string;
    name: string;
    address?: string;
  }[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  profileCreatedAt: Date;
  profileUpdatedAt: Date;
}

/**
 * Result DTO for single doctor composite
 */
export class DoctorCompositeResultDto {
  data: DoctorCompositeData;

  sources: {
    service: string;
    fetched: boolean;
    error?: string;
  }[];

  cache?: {
    hit: boolean;
    ttl?: number;
    key?: string;
  };

  timestamp: Date;
}

/**
 * Result DTO for list of doctor composites
 */
export class DoctorCompositeListResultDto {
  data: DoctorCompositeData[];
  meta: any;
  cache?: {
    hit: boolean;
    ttl?: number;
    key?: string;
  };
  timestamp: Date;
}
