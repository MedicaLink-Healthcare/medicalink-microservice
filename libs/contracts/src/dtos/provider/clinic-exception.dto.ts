import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  ValidateIf,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClinicExceptionDto {
  @IsOptional()
  @IsString()
  workLocationId?: string;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsOptional()
  @IsBoolean()
  isFullDay?: boolean;

  @ValidateIf((o) => !o.isFullDay)
  @IsNotEmpty()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime?: string;

  @ValidateIf((o) => !o.isFullDay)
  @IsNotEmpty()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateClinicExceptionDto {
  @IsOptional()
  @IsString()
  workLocationId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsBoolean()
  isFullDay?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ClinicExceptionQueryDto {
  @IsOptional()
  @IsString()
  workLocationId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}

export class ClinicExceptionResponseDto {
  id: string;
  workLocationId: string | null;
  date: Date;
  isFullDay: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  createdAt: Date;
}
