import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClassDailySummaryDto {
  @IsString()
  @IsNotEmpty()
  classeId: string;

  @IsString()
  @IsNotEmpty()
  date: string; // Format: YYYY-MM-DD

  @IsString()
  @IsOptional()
  activites: string;

  @IsString()
  @IsOptional()
  apprentissages: string;

  @IsString()
  @IsOptional()
  humeurGroupe: string;

  @IsString()
  @IsOptional()
  observations?: string;
}

export class UpdateClassDailySummaryDto {
  @IsString()
  @IsOptional()
  activites?: string;

  @IsString()
  @IsOptional()
  apprentissages?: string;

  @IsString()
  @IsOptional()
  humeurGroupe?: string;

  @IsString()
  @IsOptional()
  observations?: string;
}

export class PublishClassDailySummaryDto {
  // Pas de paramètres, juste pour publier
}

export class ClassDailySummaryResponseDto {
  id: string;
  classeId: string;
  classeNom: string;
  date: string;
  activites: string;
  apprentissages: string;
  humeurGroupe: string;
  observations?: string;
  statut: 'Brouillon' | 'Publie';
  creePar: string;
  creeLe: string;
  modifieLe: string;
  publieLe?: string;
}

export class GetClassDailySummariesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 25;
  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  dateMin?: string;

  @IsOptional()
  @IsString()
  dateMax?: string;

  @IsOptional()
  @IsString()
  statut?: 'Brouillon' | 'Publie';

  @IsOptional()
  @IsString()
  classeId?: string;
}

