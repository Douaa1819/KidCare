import { IsString, IsOptional, IsISO8601, IsNumber, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEventDto {
  @ApiPropertyOptional({
    description: 'Titre de l\'événement',
    example: 'Réunion parents-enseignants',
  })
  @IsOptional()
  @IsString()
  titre?: string;

  @ApiPropertyOptional({
    description: 'Description de l\'événement',
    example: 'Salle bleue',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Date et heure de début (ISO 8601)',
    example: '2025-11-30T14:00:00Z',
  })
  @IsOptional()
  @IsISO8601()
  startAt?: string;

  @ApiPropertyOptional({
    description: 'Date et heure de fin (ISO 8601)',
    example: '2025-11-30T16:00:00Z',
  })
  @IsOptional()
  @IsISO8601()
  endAt?: string;

  @ApiPropertyOptional({
    description: 'ID de la classe',
    example: 'cls_1',
  })
  @IsOptional()
  @IsString()
  classeId?: string;

  @ApiPropertyOptional({
    description: 'Coût de l’événement',
    example: 120,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({
    description: 'Devise du coût',
    example: 'MAD',
    enum: ['MAD', 'EUR', 'USD'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['MAD', 'EUR', 'USD'])
  currency?: string;
}

