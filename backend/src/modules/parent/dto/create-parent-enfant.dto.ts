import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateParentEnfantDto {
  @IsString()
  prenom: string;

  @IsString()
  nom: string;

  @IsString()
  @Matches(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/, {
    message: 'dateNaissance doit être au format AAAA-MM-JJ (ex. 2021-03-15)',
  })
  dateNaissance: string;

  @IsString()
  @IsNotEmpty({ message: 'La classe est obligatoire.' })
  classeId: string;

  @IsOptional()
  @IsString()
  genre?: string;
}
