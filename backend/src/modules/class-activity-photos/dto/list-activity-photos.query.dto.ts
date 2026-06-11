import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';
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
}
