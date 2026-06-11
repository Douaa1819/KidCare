import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RewriteDailyMessageDto {
  @ApiProperty({
    description: 'Texte brut saisi par l’éducatrice',
    example:
      'on a fait peinture et motricité, les enfants ont bien participé et ont bien mangé',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  text: string;
}

export class RewriteDailyMessageResponseDto {
  @ApiProperty({
    description: 'Message reformulé par IA',
    example:
      "Aujourd'hui, les enfants ont participé à des activités de peinture et de motricité. Ils se sont montrés impliqués tout au long de la journée et ont bien mangé.",
  })
  message: string;
}

