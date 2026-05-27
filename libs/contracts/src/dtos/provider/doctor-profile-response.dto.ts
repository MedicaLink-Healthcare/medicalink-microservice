import { SpecialtyDto, WorkLocationDto } from '../common';

export class DoctorProfileResponseDto {
  id: string;
  staffAccountId: string;
  fullName: string;
  isMale: boolean | null;
  isActive: boolean;
  appointmentDuration: number;
  degree?: string;
  position: string[];
  introduction?: string;
  education: string[];
  experience: string[];
  avatarUrl: string | null;
  portrait: string | null;
  ratings: number | null;
  serviceCost: number | null;
  experienceYears: number | null;
  conditions: string[];
  symptoms: string[];
  expertise: string[];
  procedures: string[];
  patientGroups: string[];
  specialtyIds: string[];
  createdAt: Date;
  updatedAt: Date;
  specialties?: SpecialtyDto[];
  workLocations?: WorkLocationDto[];
}
