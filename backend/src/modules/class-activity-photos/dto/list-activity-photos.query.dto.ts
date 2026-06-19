import { IsOptional, IsString, IsUUID, Matches, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { CALENDAR_DATE_YMD_REGEX } from '../../../common/validators/image-upload.validation';

export class ListActivityPhotosQueryDto {
  @IsUUID('4', { message: 'classeId invalide' })
  classeId!: string;

  @IsOptional()
  @IsString()
  @Matches(CALENDAR_DATE_YMD_REGEX, { message: 'date invalide (YYYY-MM-DD)' })
  date?: string;

  @IsOptional()
  @IsString()
  @Matches(CALENDAR_DATE_YMD_REGEX, { message: 'dateFrom invalide (YYYY-MM-DD)' })
  dateFrom?: string;

  @IsOptional()
  @IsString()
  @Matches(CALENDAR_DATE_YMD_REGEX, { message: 'dateTo invalide (YYYY-MM-DD)' })
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
