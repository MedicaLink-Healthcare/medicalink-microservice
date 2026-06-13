import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be greater than 0' })
  @Transform(({ value }) => parseInt(String(value), 10))
  page?: number = 1;

  @IsOptional()
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be greater than 0' })
  @Max(1000, { message: 'Limit must not exceed 1000' })
  @Transform(({ value }) => parseInt(String(value), 10))
  limit?: number = 10;

  @IsOptional()
  @IsString({ message: 'Search term must be a string' })
  search?: string;

  @IsOptional()
  @IsString({ message: 'Sort field must be a string' })
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'Sort order must be asc or desc' })
  @Transform(({ value }) => value?.toString().toLowerCase())
  sortOrder?: 'asc' | 'desc' = 'desc';
}
