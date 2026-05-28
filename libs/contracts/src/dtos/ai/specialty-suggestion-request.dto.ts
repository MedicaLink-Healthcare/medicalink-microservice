import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class SpecialtyCatalogItemDto {
  @IsString()
  id!: string;

  @IsString()
  @MaxLength(256)
  name!: string;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  commonSymptoms?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

/**
 * NLU: LLM chọn id chuyên khoa từ catalog do FE gửi (đồng bộ với Qdrant / DB).
 */
export class SpecialtySuggestionRequestDto {
  @IsString()
  @MinLength(8, { message: 'Mô tả triệu chứng cần ít nhất 8 ký tự' })
  @MaxLength(4000, { message: 'Mô tả không được vượt quá 4000 ký tự' })
  symptoms!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(120)
  @ValidateNested({ each: true })
  @Type(() => SpecialtyCatalogItemDto)
  specialties?: SpecialtyCatalogItemDto[];
}
