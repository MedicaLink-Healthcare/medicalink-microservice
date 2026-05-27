export interface SpecialtyResponseDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  aliases: string[];
  commonSymptoms: string[];
  commonConditions: string[];
  keywords: string[];
  expertise: string[];
  isActive: boolean;
  infoSectionsCount: number;
  createdAt: Date;
  updatedAt: Date;
}
