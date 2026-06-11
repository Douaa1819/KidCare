import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class LogoutDto {
  @ApiPropertyOptional({ description: 'JWT refresh à invalider (recommandé)' })
  @IsOptional()
  @IsString()
  @MinLength(20)
  refreshToken?: string;
}
