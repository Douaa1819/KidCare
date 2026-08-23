import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TrimString } from '../../../common/validators/common-fields';

/**
 * DTO pour la connexion admin en DEV
 * En PROD, utiliser Supabase Auth
 */
export class LoginDto {
  @ApiProperty({
    example: 'admin@demo.kidcare.app',
    description: 'Email de l\'administrateur',
  })
  @TrimString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Email invalide' })
  @MaxLength(254)
  email: string;

  @ApiProperty({
    example: 'change_me',
    description: 'Mot de passe',
  })
  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  @MaxLength(128)
  password: string;
}

/**
 * Réponse de connexion
 */
export class LoginResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT d’accès (court)',
  })
  accessToken: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT de rafraîchissement (long)',
  })
  refreshToken: string;

  @ApiProperty({
    example: 'usr_123',
    description: 'ID utilisateur',
  })
  userId: string;

  @ApiProperty({
    example: 'ADMIN',
    description: 'Rôle utilisateur',
  })
  role: string;

  @ApiProperty({
    example: 'admin@demo.kidcare.app',
    description: 'Email utilisateur',
  })
  email: string;
}

