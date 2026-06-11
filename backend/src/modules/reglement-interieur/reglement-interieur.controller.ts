import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReglementInterieurService } from './reglement-interieur.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class UpdateReglementDto {
  @ApiProperty({ description: 'Contenu du règlement intérieur (texte/markdown)' })
  @IsString()
  @IsNotEmpty()
  contenu: string;
}

@ApiTags('Règlement Intérieur')
@Controller()
export class ReglementInterieurController {
  constructor(private readonly service: ReglementInterieurService) {}

  @Get('public/reglement-interieur')
  @ApiOperation({ summary: 'Récupérer le règlement intérieur actuel (public)' })
  getCurrent() {
    return this.service.getCurrent();
  }

  @Get('admin/reglement-interieur')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer le règlement intérieur actuel (admin)' })
  getAdmin() {
    return this.service.getCurrent();
  }

  @Put('admin/reglement-interieur')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mettre à jour le règlement intérieur (admin)" })
  update(@Body() dto: UpdateReglementDto, @Request() req: any) {
    const adminId = req.user?.id;
    return this.service.upsert(dto.contenu, adminId);
  }
}
