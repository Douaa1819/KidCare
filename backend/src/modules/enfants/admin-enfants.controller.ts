import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EnfantsService } from './enfants.service';
import { ListEnfantsQueryDto } from './dto/list-enfants-query.dto';
import { IsString, IsOptional } from 'class-validator';
import { Prisma, StatutPresence } from '@prisma/client';

class DelegationDto {
  @IsString() nom: string;
  @IsString() telephone: string;
  @IsString() cin: string;
  @IsString() relation: string;
}

class UpdateDelegationDto {
  @IsOptional() @IsString() nom?: string;
  @IsOptional() @IsString() telephone?: string;
  @IsOptional() @IsString() cin?: string;
  @IsOptional() @IsString() relation?: string;
}

@Controller('admin/enfants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class AdminEnfantsController {
  constructor(private readonly enfantsService: EnfantsService) {}

  @Get()
  async list(@Query() query: ListEnfantsQueryDto) {
    return this.enfantsService.listEnfants(query);
  }

  @Post()
  async create(@Body() data: Prisma.EnfantCreateInput) {
    return this.enfantsService.createEnfant(data);
  }

  @Get('familles')
  async listFamilles() {
    return this.enfantsService.listFamillesForSelect();
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.enfantsService.getEnfantById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Prisma.EnfantUpdateInput,
  ) {
    return this.enfantsService.updateEnfant(id, data);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: { user?: { userId?: string } },
  ) {
    await this.enfantsService.archiveEnfant(id, req.user?.userId);
    return { success: true };
  }

  @Post(':id/restore')
  async restore(@Param('id') id: string) {
    await this.enfantsService.restoreEnfant(id);
    return { success: true };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { statut?: StatutPresence | null },
  ) {
    return this.enfantsService.setEnfantPresenceStatusToday(id, body?.statut ?? null);
  }

  // ── Delegation endpoints ──────────────────────────────────────────────────

  @Post(':id/delegations')
  async addDelegation(
    @Param('id') enfantId: string,
    @Body() dto: DelegationDto,
  ) {
    return this.enfantsService.addDelegation(enfantId, dto);
  }

  @Patch(':id/delegations/:delegationId')
  async updateDelegation(
    @Param('delegationId') delegationId: string,
    @Body() dto: UpdateDelegationDto,
  ) {
    return this.enfantsService.updateDelegation(delegationId, dto);
  }

  @Delete(':id/delegations/:delegationId')
  async deleteDelegation(@Param('delegationId') delegationId: string) {
    await this.enfantsService.deleteDelegation(delegationId);
    return { success: true };
  }
}
