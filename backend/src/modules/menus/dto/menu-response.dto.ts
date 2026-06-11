import { ApiProperty } from '@nestjs/swagger';
import { StatutMenu } from '@prisma/client';

export class MenuResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: '2025-11-24' })
  date: string;

  @ApiProperty({ required: false })
  collationMatin?: string | null;

  @ApiProperty({ required: false })
  repas?: string | null;

  @ApiProperty({ required: false })
  gouter?: string | null;

  @ApiProperty({ enum: StatutMenu })
  statut: StatutMenu;

  @ApiProperty({ type: [String] })
  allergenes: string[];

  @ApiProperty()
  creePar: string;

  @ApiProperty()
  creeLe: string;

  @ApiProperty()
  modifieLe: string;

  @ApiProperty({ required: false, nullable: true })
  publieLe: string | null;
}
