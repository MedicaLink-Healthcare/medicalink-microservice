import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class EventTempDto {
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
}
