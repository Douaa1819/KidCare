import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StatutMenu } from '@prisma/client';

export class GetMenusQueryDto {
  @ApiPropertyOptional({ description: 'Filtrer par date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Date min (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateMin?: string;

  @ApiPropertyOptional({ description: 'Date max (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateMax?: string;

  @ApiPropertyOptional({ enum: StatutMenu })
  @IsOptional()
  @IsEnum(StatutMenu)
  statut?: StatutMenu;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
