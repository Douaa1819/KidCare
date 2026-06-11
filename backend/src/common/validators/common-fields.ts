import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

/** Trim + refus chaîne vide après trim. */
export function TrimString() {
  return Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  );
}

export class EmailFieldDto {
  @TrimString()
  @IsEmail({}, { message: 'Email invalide' })
  @MaxLength(254)
  email: string;
}

export class UuidParamDto {
  @IsUUID('4', { message: 'Identifiant invalide' })
  id: string;
}

export class SearchQueryField {
  @IsOptional()
  @TrimString()
  @IsString()
  @MaxLength(120, { message: 'Recherche trop longue' })
  @Matches(/^[^<>]*$/, { message: 'Caractères invalides dans la recherche' })
  q?: string;
}

export class PersonNameField {
  @TrimString()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/^[^<>"'`\\;]+$/, { message: 'Nom invalide' })
  nom: string;
}

export class PersonPrenomField {
  @TrimString()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/^[^<>"'`\\;]+$/, { message: 'Prénom invalide' })
  prenom: string;
}
