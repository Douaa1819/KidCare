import { PartialType } from '@nestjs/swagger';
import { CreateMenuDto } from './create-menu.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { StatutMenu } from '@prisma/client';

export class UpdateMenuDto extends PartialType(CreateMenuDto) {
  @IsOptional()
  @IsEnum(StatutMenu)
  statut?: StatutMenu;
}
