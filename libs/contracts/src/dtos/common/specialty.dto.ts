export interface SpecialtyDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  aliases?: string[];
  commonSymptoms?: string[];
  commonConditions?: string[];
  keywords?: string[];
  expertise?: string[];
}
