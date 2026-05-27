import {
  IsString,
  IsOptional,
  IsArray,
  MaxLength,
  IsNumber,
  Min,
} from 'class-validator';

export class UpdateDoctorProfileDto {
  @IsString({ message: 'Doctor ID must be a string' })
  id: string;

  @IsString({ message: 'Degree must be a string' })
  @IsOptional()
  @MaxLength(100, { message: 'Degree must not exceed 100 characters' })
  degree?: string;

  @IsArray({ message: 'Position must be an array' })
  @IsString({ each: true, message: 'Each position must be a string' })
  @IsOptional()
  position?: string[];

  @IsString({ message: 'Introduction must be a string' })
  @IsOptional()
  introduction?: string;

  @IsArray({ message: 'Education must be an array' })
  @IsString({ each: true, message: 'Each education step must be a string' })
  @IsOptional()
  education?: string[];

  @IsArray({ message: 'Experience must be an array' })
  @IsString({ each: true, message: 'Each experience must be a string' })
  @IsOptional()
  experience?: string[];

  @IsString({ message: 'Avatar URL must be a string' })
  @IsOptional()
  avatarUrl?: string;

  @IsString({ message: 'Portrait URL must be a string' })
  @IsOptional()
  portrait?: string;

  @IsArray({ message: 'Specialty IDs must be an array' })
  @IsString({ each: true, message: 'Each specialty ID must be a string' })
  @IsOptional()
  specialtyIds?: string[];

  @IsArray({ message: 'Location IDs must be an array' })
  @IsString({ each: true, message: 'Each location ID must be a string' })
  @IsOptional()
  locationIds?: string[];

  @IsOptional()
  @IsNumber({}, { message: 'appointmentDuration must be a number' })
  @Min(1, { message: 'appointmentDuration must be at least 1 minute' })
  appointmentDuration?: number;

  @IsNumber({}, { message: 'Ratings must be a number' })
  @IsOptional()
  ratings?: number;

  @IsNumber({}, { message: 'Service cost must be a number' })
  @IsOptional()
  serviceCost?: number;

  @IsNumber({}, { message: 'Experience years must be a number' })
  @IsOptional()
  experienceYears?: number;

  @IsArray({ message: 'Conditions must be an array' })
  @IsString({ each: true, message: 'Each condition must be a string' })
  @IsOptional()
  conditions?: string[];

  @IsArray({ message: 'Symptoms must be an array' })
  @IsString({ each: true, message: 'Each symptom must be a string' })
  @IsOptional()
  symptoms?: string[];

  @IsArray({ message: 'Expertise must be an array' })
  @IsString({ each: true, message: 'Each expertise must be a string' })
  @IsOptional()
  expertise?: string[];

  @IsArray({ message: 'Procedures must be an array' })
  @IsString({ each: true, message: 'Each procedure must be a string' })
  @IsOptional()
  procedures?: string[];

  @IsArray({ message: 'Patient groups must be an array' })
  @IsString({ each: true, message: 'Each patient group must be a string' })
  @IsOptional()
  patientGroups?: string[];
}
