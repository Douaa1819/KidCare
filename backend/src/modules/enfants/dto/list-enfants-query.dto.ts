import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ListEnfantsQueryDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  pageSize?: number = 25;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsUUID()
  classeId?: string;

  /** true = enfants archivés uniquement ; false/absent = actifs uniquement */
  @IsOptional()
  @Type(() => String)
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  archived?: boolean;
}
