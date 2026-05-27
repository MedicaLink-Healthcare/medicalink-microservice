import { SpecialtyDto } from '../common';
import { WorkLocationDto } from '../common';

export interface DoctorDto {
  id: string;
  staffAccountId: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  licenseNo?: string;
  yearsExperience?: number;
  ratingAvg: number;
  reviewCount: number;
  appointmentDuration?: number;
  serviceCost?: number;
  conditions?: string[];
  symptoms?: string[];
  expertise?: string[];
  procedures?: string[];
  patientGroups?: string[];
  education?: string[];
  experience?: string[];
  specialties?: SpecialtyDto[];
  workLocations?: WorkLocationDto[];
}
