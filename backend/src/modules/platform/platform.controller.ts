import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleUtilisateur, StatutUtilisateur } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { SuperAdminOnly } from '../../common/decorators/super-admin.decorator';
import { AuditService } from './audit.service';
import { PlatformService } from './platform.service';

@ApiTags('Admin/Platform')
@Controller('admin/platform')
@UseGuards(JwtAuthGuard, RolesGuard, SuperAdminGuard)
@SuperAdminOnly()
@ApiBearerAuth()
export class PlatformController {
  constructor(
    private readonly platform: PlatformService,
    private readonly audit: AuditService,
  ) {}

  private ctx(req: { user?: { userId?: string; email?: string }; ip?: string; headers?: Record<string, string> }) {
    return {
      userId: req.user?.userId,
      userEmail: req.user?.email,
      ip: req.ip,
      userAgent: req.headers?.['user-agent'],
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques globales plateforme' })
  getStats() {
    return this.platform.getGlobalStats();
  }

  @Get('search')
  @ApiOperation({ summary: 'Recherche globale' })
  search(@Query('q') q: string, @Query('includeArchived') includeArchived?: string) {
    return this.platform.globalSearch(q ?? '', includeArchived === 'true');
  }

  // ── Organizations ────────────────────────────────────────────────────────

  @Get('organizations')
  listOrganizations(@Query('includeArchived') includeArchived?: string) {
    return this.platform.listOrganizations(includeArchived === 'true');
  }

  @Post('organizations')
  createOrganization(
    @Body() body: { nom: string; adresse?: string; email?: string; telephone?: string },
    @Req() req: { user?: { userId?: string; email?: string }; ip?: string; headers?: Record<string, string> },
  ) {
    return this.platform.createOrganization(body, this.ctx(req));
  }

  @Put('organizations/:id')
  updateOrganization(
    @Param('id') id: string,
    @Body() body: { nom?: string; adresse?: string; email?: string; telephone?: string; active?: boolean },
    @Req() req: { user?: { userId?: string; email?: string }; ip?: string; headers?: Record<string, string> },
  ) {
    return this.platform.updateOrganization(id, body, this.ctx(req));
  }

  @Post('organizations/:id/archive')
  archiveOrganization(
    @Param('id') id: string,
    @Req() req: { user?: { userId?: string; email?: string }; ip?: string; headers?: Record<string, string> },
  ) {
    return this.platform.archiveOrganization(id, this.ctx(req));
  }

  @Post('organizations/:id/restore')
  restoreOrganization(
    @Param('id') id: string,
    @Req() req: { user?: { userId?: string; email?: string }; ip?: string; headers?: Record<string, string> },
  ) {
    return this.platform.restoreOrganization(id, this.ctx(req));
  }

  // ── Users (admins, teachers, parents) ────────────────────────────────────

  @Get('users')
  listUsers(
    @Query('role') role?: RoleUtilisateur,
    @Query('statut') statut?: StatutUtilisateur,
    @Query('includeArchived') includeArchived?: string,
    @Query('includeDeleted') includeDeleted?: string,
    @Query('q') q?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.platform.listManagedUsers({
      role,
      statut,
      includeArchived: includeArchived === 'true',
      includeDeleted: includeDeleted === 'true',
      q,
      page,
      limit,
    });
  }

  @Post('admins')
  createAdmin(
    @Body() body: { email: string; prenom: string; nom: string; telephone?: string; organizationId?: string },
    @Req() req: { user?: { userId?: string; email?: string }; ip?: string; headers?: Record<string, string> },
  ) {
    return this.platform.createAdmin(body, this.ctx(req));
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() body: { prenom?: string; nom?: string; telephone?: string; role?: RoleUtilisateur; organizationId?: string },
    @Req() req: { user?: { userId?: string; email?: string; role?: string }; ip?: string; headers?: Record<string, string> },
  ) {
    return this.platform.updateManagedUser(id, body, req.user?.role ?? '', this.ctx(req));
  }

  @Patch('users/:id/status')
  setStatus(
    @Param('id') id: string,
    @Body() body: { statut: StatutUtilisateur },
    @Req() req: { user?: { userId?: string; email?: string; role?: string }; ip?: string; headers?: Record<string, string> },
  ) {
    return this.platform.setUserStatus(id, body.statut, req.user?.role ?? '', this.ctx(req));
  }

  @Post('users/:id/archive')
  archiveUser(
    @Param('id') id: string,
    @Req() req: { user?: { userId?: string; email?: string; role?: string }; ip?: string; headers?: Record<string, string> },
  ) {
    return this.platform.archiveUser(id, req.user?.role ?? '', this.ctx(req));
  }

  @Post('users/:id/restore')
  restoreUser(
    @Param('id') id: string,
    @Req() req: { user?: { userId?: string; email?: string; role?: string }; ip?: string; headers?: Record<string, string> },
  ) {
    return this.platform.restoreUser(id, req.user?.role ?? '', this.ctx(req));
  }

  @Post('users/:id/soft-delete')
  softDeleteUser(
    @Param('id') id: string,
    @Req() req: { user?: { userId?: string; email?: string; role?: string }; ip?: string; headers?: Record<string, string> },
  ) {
    return this.platform.softDeleteUser(id, req.user?.role ?? '', this.ctx(req));
  }

  @Post('users/:id/reset-password')
  resetPassword(
    @Param('id') id: string,
    @Req() req: { user?: { userId?: string; email?: string; role?: string }; ip?: string; headers?: Record<string, string> },
  ) {
    return this.platform.resetUserPassword(id, req.user?.role ?? '', this.ctx(req));
  }

  @Post('users/:id/force-logout')
  forceLogout(
    @Param('id') id: string,
    @Req() req: { user?: { userId?: string; email?: string; role?: string }; ip?: string; headers?: Record<string, string> },
  ) {
    return this.platform.forceLogoutUser(id, req.user?.role ?? '', this.ctx(req));
  }

  @Post('users/:id/resend-invitation')
  resendInvitation(
    @Param('id') id: string,
    @Req() req: { user?: { userId?: string; email?: string; role?: string }; ip?: string; headers?: Record<string, string> },
  ) {
    return this.platform.resendInvitation(id, req.user?.role ?? '', this.ctx(req));
  }

  @Get('users/:id/login-history')
  loginHistory(@Param('id') id: string) {
    return this.platform.getLoginHistory(id);
  }

  @Get('users/:id/restrictions')
  getRestrictions(@Param('id') id: string) {
    return this.platform.getAccessRestrictions(id);
  }

  @Put('users/:id/restrictions')
  updateRestrictions(
    @Param('id') id: string,
    @Body() body: Record<string, boolean>,
    @Req() req: { user?: { userId?: string; email?: string; role?: string }; ip?: string; headers?: Record<string, string> },
  ) {
    return this.platform.updateAccessRestrictions(id, body, req.user?.role ?? '', this.ctx(req));
  }

  // ── Permissions ──────────────────────────────────────────────────────────

  @Get('permissions')
  getPermissions() {
    return this.platform.getPermissionsMatrix();
  }

  @Patch('permissions/:role/:resource')
  updatePermission(
    @Param('role') role: RoleUtilisateur,
    @Param('resource') resource: string,
    @Body() body: Record<string, boolean>,
    @Req() req: { user?: { userId?: string; email?: string }; ip?: string; headers?: Record<string, string> },
  ) {
    return this.platform.updateRolePermission(role, resource, body, this.ctx(req));
  }

  // ── Audit logs (read-only) ───────────────────────────────────────────────

  @Get('audit-logs')
  auditLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('userId') userId?: string,
    @Query('q') q?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.audit.list({ page, limit, action, entity, userId, q, from, to });
  }

  // ── Security ─────────────────────────────────────────────────────────────

  @Get('security')
  security() {
    return this.platform.getSecurityOverview();
  }

  // ── Settings ─────────────────────────────────────────────────────────────

  @Get('settings')
  settings() {
    return this.platform.getPlatformSettings();
  }

  @Patch('settings/:section')
  updateSettings(
    @Param('section') section: 'general' | 'auth' | 'invitations' | 'parents' | 'teachers' | 'admins' | 'email' | 'maintenance',
    @Body() body: Record<string, unknown>,
    @Req() req: { user?: { userId?: string; email?: string }; ip?: string; headers?: Record<string, string> },
  ) {
    return this.platform.updatePlatformSettings(section, body, req.user?.userId ?? '', this.ctx(req));
  }

  // ── Feature flags ────────────────────────────────────────────────────────

  @Get('feature-flags')
  featureFlags() {
    return this.platform.listFeatureFlags();
  }

  @Patch('feature-flags/:key')
  updateFeatureFlag(
    @Param('key') key: string,
    @Body() body: { enabled: boolean },
    @Req() req: { user?: { userId?: string; email?: string }; ip?: string; headers?: Record<string, string> },
  ) {
    return this.platform.updateFeatureFlag(key, body.enabled, this.ctx(req));
  }

  // ── Archive entities ─────────────────────────────────────────────────────

  @Post('archive/:type/:id')
  archiveEntity(
    @Param('type') type: 'class' | 'event' | 'menu',
    @Param('id') id: string,
    @Req() req: { user?: { userId?: string; email?: string }; ip?: string; headers?: Record<string, string> },
  ) {
    return this.platform.archiveEntity(type, id, this.ctx(req));
  }

  @Post('restore/:type/:id')
  restoreEntity(
    @Param('type') type: 'class' | 'event' | 'menu',
    @Param('id') id: string,
    @Req() req: { user?: { userId?: string; email?: string }; ip?: string; headers?: Record<string, string> },
  ) {
    return this.platform.restoreEntity(type, id, this.ctx(req));
  }
}
