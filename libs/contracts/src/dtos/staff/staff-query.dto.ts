import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { booleanTransformer } from '../../utils/custom-transformer';

export class StaffQueryDto {
  @IsOptional()
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be greater than or equal to 1' })
  @Transform(({ value }) => parseInt(String(value), 10))
  page?: number = 1;

  @IsOptional()
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be greater than 0' })
  @Max(1000, { message: 'Limit must not exceed 1000' })
  @Transform(({ value }) => parseInt(String(value), 10))
  limit?: number = 10;

  @IsOptional()
  @IsEnum(['SUPER_ADMIN', 'ADMIN', 'DOCTOR'], {
    message: 'Role must be one of: SUPER_ADMIN, ADMIN, DOCTOR',
  })
  role?: 'SUPER_ADMIN' | 'ADMIN' | 'DOCTOR';

  @IsOptional()
  @IsEnum(['SUPER_ADMIN', 'ADMIN', 'DOCTOR'], {
    message: 'Exclude Role must be one of: SUPER_ADMIN, ADMIN, DOCTOR',
  })
  excludeRole?: 'SUPER_ADMIN' | 'ADMIN' | 'DOCTOR';

  @IsOptional()
  @IsString({ message: 'Search term must be a string' })
  search?: string;

  @IsOptional()
  @IsString({ message: 'Email must be a string' })
  @Transform(({ value }) => value.toLowerCase())
  email?: string;

  @IsOptional()
  @IsBoolean({ message: 'isMale must be a boolean' })
  @Transform(booleanTransformer)
  isMale?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  @Transform(booleanTransformer)
  isActive?: boolean;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'Please provide a valid date format (YYYY-MM-DD)' },
  )
  createdFrom?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'Please provide a valid date format (YYYY-MM-DD)' },
  )
  createdTo?: string;

  @IsOptional()
  @IsEnum(['createdAt', 'fullName', 'email'], {
    message: 'Sort by must be one of: createdAt, fullName, email',
  })
  sortBy?: 'createdAt' | 'fullName' | 'email' = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'], {
    message: 'Sort order must be asc or desc',
  })
  @Transform(({ value }) => value?.toString().toLowerCase().trim())
  sortOrder?: 'asc' | 'desc' = 'desc';
}
