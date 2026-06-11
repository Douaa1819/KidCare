import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyTokenDto {
  @ApiProperty({ description: 'JWT à vérifier' })
  @IsString()
  @MinLength(20)
  @MaxLength(4096)
  token: string;
}
