import { IsString, IsOptional, IsISO8601, IsNumber, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({
    description: 'Titre de l\'événement',
    example: 'Réunion parents-enseignants',
  })
  @IsString()
  titre: string;

  @ApiPropertyOptional({
    description: 'Description de l\'événement',
    example: 'Salle bleue',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Date et heure de début (ISO 8601)',
    example: '2025-11-30T14:00:00Z',
  })
  @IsISO8601()
  startAt: string;

  @ApiProperty({
    description: 'Date et heure de fin (ISO 8601)',
    example: '2025-11-30T16:00:00Z',
  })
  @IsISO8601()
  endAt: string;

  @ApiProperty({
    description: 'ID de la classe',
    example: 'cls_1',
  })
  @IsString()
  classeId: string;

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

