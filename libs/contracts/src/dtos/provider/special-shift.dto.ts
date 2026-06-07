import {
  IsString,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  Matches,
} from 'class-validator';

export class CreateSpecialShiftDto {
  @IsNotEmpty()
  @IsString()
  doctorId: string;

  @IsOptional()
  @IsString()
  workLocationId?: string;

  @IsNotEmpty()
  @IsDateString()
  effectiveDate: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateSpecialShiftDto {
  @IsOptional()
  @IsString()
  workLocationId?: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

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

export class SpecialShiftQueryDto {
  @IsOptional()
  @IsString()
  doctorId?: string;

  @IsOptional()
  @IsString()
  workLocationId?: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;
}

export class SpecialShiftResponseDto {
  id: string;
  doctorId: string;
  workLocationId: string | null;
  effectiveDate: Date;
  startTime: string;
  endTime: string;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}
