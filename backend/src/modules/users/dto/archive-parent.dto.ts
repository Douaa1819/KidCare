import { IsArray, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class ArchiveParentDto {
  /** Si true, archive aussi les enfants liés (selon règles de garde). */
  @IsOptional()
  @IsBoolean()
  archiveLinkedChildren?: boolean;

  /** Enfants avec autre tuteur actif — archivage explicite après confirmation admin. */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  confirmedChildIds?: string[];
}

export class RestoreParentDto {
  @IsOptional()
  @IsBoolean()
  restoreChildren?: boolean;
}
