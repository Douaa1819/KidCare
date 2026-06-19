import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, Min, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RoleUtilisateur, StatutUtilisateur } from '@prisma/client';

/**
 * DTO pour créer un utilisateur (enseignant ou parent)
 */
export class CreateUserDto {
  @ApiProperty({
    example: 'prof@wlw.ma',
    description: 'Email de l\'utilisateur',
  })
  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @ApiProperty({
    example: 'Ahmed',
    description: 'Prénom',
  })
  @IsString()
  @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
  prenom: string;

  @ApiProperty({
    example: 'Dupont',
    description: 'Nom',
  })
  @IsString()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  nom: string;

  @ApiProperty({
    example: 'ENSEIGNANT',
    description: 'Rôle de l\'utilisateur',
    enum: ['ENSEIGNANT', 'PARENT', 'ADMIN'],
  })
  @IsEnum(['ENSEIGNANT', 'PARENT', 'ADMIN'], {
    message: 'Le rôle doit être ENSEIGNANT, PARENT ou ADMIN',
  })
  role: string;

  @ApiProperty({
    example: '+212612345678',
    description: 'Téléphone (optionnel)',
    required: false,
  })
  @IsOptional()
  @IsString()
  telephone?: string;
}

/**
 * DTO pour inviter un enseignant (legacy - utilise CreateUserDto maintenant)
 */
export class InviteTeacherDto {
  @ApiProperty({
    example: 'prof@wlw.ma',
    description: 'Email de l\'enseignant',
  })
  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @ApiProperty({
    example: 'Ahmed',
    description: 'Prénom de l\'enseignant',
  })
  @IsString()
  prenom: string;

  @ApiProperty({
    example: 'Dupont',
    description: 'Nom de l\'enseignant',
  })
  @IsString()
  nom: string;

  @ApiProperty({
    example: '+212612345678',
    description: 'Téléphone (optionnel)',
    required: false,
  })
  @IsOptional()
  @IsString()
  telephone?: string;
}

/**
 * DTO pour mettre à jour le statut d'un utilisateur
 */
export class UpdateUserStatusDto {
  @ApiProperty({
    example: 'ACTIVE',
    description: 'Nouveau statut',
    enum: StatutUtilisateur,
  })
  @IsEnum(StatutUtilisateur, {
    message: 'Statut invalide. Doit être INVITED, ACTIVE ou DISABLED',
  })
  statut: StatutUtilisateur;
}

/** Activer / désactiver les emails transactionnels (présence, événements…) pour ce compte */
export class UpdateEmailNotificationsDto {
  @ApiProperty({ example: true, description: 'Recevoir les notifications par email' })
  @IsBoolean()
  emailNotificationsEnabled: boolean;
}

/**
 * DTO pour filtrer les utilisateurs
 */
export class ListUsersQueryDto {
  @ApiProperty({
    example: 'ADMIN',
    description: 'Filtrer par rôle',
    required: false,
  })
  @IsOptional()
  @IsEnum(['ADMIN', 'ENSEIGNANT', 'PARENT'], {
    message: 'Rôle invalide',
  })
  role?: string;

  @ApiProperty({
    example: 'ACTIVE',
    description: 'Filtrer par statut',
    required: false,
  })
  @IsOptional()
  @IsEnum(['INVITED', 'ACTIVE', 'DISABLED'], {
    message: 'Statut invalide',
  })
  statut?: string;

  @ApiProperty({
    example: 'ahmed',
    description: 'Recherche par email/prénom/nom',
    required: false,
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({
    example: '1',
    description: 'Numéro de page',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({
    example: '10',
    description: 'Nombre de résultats par page',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

/**
 * DTO pour mettre à jour le profil d'un enseignant
 */
export class UpdateTeacherProfileDto {
  @ApiProperty({ example: 'Éducateur', description: 'Fonction de l\'enseignant', required: false })
  @IsOptional()
  @IsString()
  fonction?: string;

  @ApiProperty({ example: 'Anglais', description: 'Spécialité de l\'enseignant', required: false })
  @IsOptional()
  @IsString()
  specialite?: string;

  @ApiProperty({ example: '+212612345678', description: 'Téléphone', required: false })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiProperty({ example: 'Ahmed', description: 'Prénom', required: false })
  @IsOptional()
  @IsString()
  prenom?: string;

  @ApiProperty({ example: 'Dupont', description: 'Nom', required: false })
  @IsOptional()
  @IsString()
  nom?: string;

  @ApiProperty({ example: 'Parent très impliqué', description: 'Notes internes admin', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notesAdmin?: string;
}

/**
 * DTO pour mettre à jour les informations de l'établissement
 */
export class UpdateEtablissementDto {
  @ApiProperty({ example: 'Crèche PetitsPas', required: false })
  @IsOptional()
  @IsString()
  nom?: string;

  @ApiProperty({ example: '12 rue des Enfants, Casablanca', required: false })
  @IsOptional()
  @IsString()
  adresse?: string;

  @ApiProperty({ example: '+212 522 000 000', required: false })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiProperty({ example: 'contact@petitspas.ma', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'https://petitspas.ma', required: false })
  @IsOptional()
  @IsString()
  siteWeb?: string;

  @ApiProperty({ example: 'Crèche accueillant les enfants de 3 mois à 6 ans.', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Lun–Ven : 07h30 – 18h00', required: false })
  @IsOptional()
  @IsString()
  horaires?: string;

  @ApiProperty({ example: 60, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  capacite?: number;
}

/**
 * DTO pour assigner un enseignant à une classe
 */
export class AssignTeacherToClassDto {
  @ApiProperty({
    example: 'usr_123',
    description: 'ID de l\'utilisateur enseignant',
  })
  @IsString()
  @IsNotEmpty()
  utilisateurId: string;

  @ApiProperty({
    example: 'cls_456',
    description: 'ID de la classe',
  })
  @IsString()
  @IsNotEmpty()
  classeId: string;
}
