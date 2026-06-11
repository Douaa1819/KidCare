import { IsEmail, IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'parent@example.com' })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @ApiProperty({ example: 'fr', required: false })
  @IsOptional()
  @IsString()
  @IsIn(['fr', 'ar'])
  locale?: string;

  /** URL du frontend (ex. http://localhost:3001) — prioritaire sur APP_URL côté API */
  @ApiProperty({ example: 'http://localhost:3001', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  @IsUrl({ require_tld: false }, { message: 'URL frontend invalide' })
  appUrl?: string;
}

export class ForgotPasswordResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({
    example:
      'Si un compte actif existe avec cet email, un lien de réinitialisation vous a été envoyé.',
  })
  message: string;
}
