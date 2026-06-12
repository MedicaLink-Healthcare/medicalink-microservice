import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class PublicCreateAppointmentFromEventDto {
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @IsString()
  @IsNotEmpty()
  locationId: string;

  @IsString()
  @IsNotEmpty()
  serviceDate: string;

  @IsString()
  @IsNotEmpty()
  timeStart: string;

  @IsString()
  @IsNotEmpty()
  timeEnd: string;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  specialtyId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  aiTriageData?: Record<string, any>;
}
