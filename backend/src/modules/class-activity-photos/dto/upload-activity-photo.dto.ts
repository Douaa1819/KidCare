import { IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import {
  CALENDAR_DATE_YMD_REGEX,
  SAFE_PHOTO_LEGENDE_REGEX,
} from '../../../common/validators/image-upload.validation';

export class UploadActivityPhotoBodyDto {
  @IsUUID('4', { message: 'classeId invalide' })
  classeId!: string;

  @IsString()
  @Matches(CALENDAR_DATE_YMD_REGEX, { message: 'date invalide (YYYY-MM-DD)' })
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(SAFE_PHOTO_LEGENDE_REGEX, { message: 'Légende invalide' })
  legende?: string;
}
