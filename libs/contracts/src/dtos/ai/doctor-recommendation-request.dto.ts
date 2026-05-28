import { Transform } from 'class-transformer';
import {
  Allow,
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Payload RPC từ API Gateway tới AI Service (RAG gợi ý bác sĩ).
 * `query` là alias tùy chọn của `symptoms` (frontend/SDK cũ).
 */
export class DoctorRecommendationRequestDto {
  @Transform(({ obj }: { obj: Record<string, unknown> }) => {
    const s = obj['symptoms'];
    const q = obj['query'];
    if (typeof s === 'string' && s.trim().length > 0) return s.trim();
    if (typeof q === 'string' && q.trim().length > 0) return q.trim();
    if (typeof s === 'string') return s.trim();
    if (typeof q === 'string') return q.trim();
    return s ?? q ?? '';
  })
  @IsString()
  @MinLength(8, { message: 'Mô tả triệu chứng cần ít nhất 8 ký tự' })
  @MaxLength(4000, { message: 'Mô tả không được vượt quá 4000 ký tự' })
  symptoms!: string;

  @Allow()
  @IsOptional()
  query?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(15)
  topK?: number = 5;

  /**
   * Lọc cứng theo chuyên khoa (id trong DB) trước khi hybrid search — phù hợp phòng khám / UI đã chọn khoa.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @IsString({ each: true })
  specialtyIds?: string[];

  /**
   * Truyền mảng triệu chứng đã được trích xuất từ suggest-specialties để tối ưu hóa tìm kiếm.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extractedSymptoms?: string[];
}
