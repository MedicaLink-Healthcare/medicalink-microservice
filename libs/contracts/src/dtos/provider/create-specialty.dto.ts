import {
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSpecialtyDto {
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(120, { message: 'Name must not exceed 120 characters' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Icon URL must be a string' })
  @IsUrl({}, { message: 'Icon URL must be a valid URL' })
  iconUrl?: string;

  @IsOptional()
  @IsArray({ message: 'Aliases must be an array' })
  @IsString({ each: true, message: 'Each alias must be a string' })
  aliases?: string[];

  @IsOptional()
  @IsArray({ message: 'Common symptoms must be an array' })
  @IsString({ each: true, message: 'Each common symptom must be a string' })
  commonSymptoms?: string[];

  @IsOptional()
  @IsArray({ message: 'Common conditions must be an array' })
  @IsString({ each: true, message: 'Each common condition must be a string' })
  commonConditions?: string[];

  @IsOptional()
  @IsArray({ message: 'Keywords must be an array' })
  @IsString({ each: true, message: 'Each keyword must be a string' })
  keywords?: string[];

  @IsOptional()
  @IsArray({ message: 'Expertise must be an array' })
  @IsString({ each: true, message: 'Each expertise must be a string' })
  expertise?: string[];
}
