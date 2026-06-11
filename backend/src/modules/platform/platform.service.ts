/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { Prisma, RoleUtilisateur, StatutUtilisateur } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../common/services/email.service';
import {
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_PLATFORM_SETTINGS,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_RESOURCES,
} from '../../common/constants/permissions';
import { AuditContext, AuditService } from './audit.service';

@Injectable()
export class PlatformService {
  private readonly logger = new Logger(PlatformService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly audit: AuditService,
  ) {}

  private normalizeEmail(email: string) {
    return String(email ?? '').trim().toLowerCase();
  }

  private auditCtx(req: { user?: { userId?: string; email?: string }; ip?: string; headers?: Record<string, string> }): AuditContext {
    return {
      userId: req.user?.userId,
      userEmail: req.user?.email,
      ip: req.ip,
      userAgent: req.headers?.['user-agent'],
    };
  }

  assertNotSuperAdminTarget(user: { role: string }, action: string) {
    if (user.role === 'SUPER_ADMIN') {
      throw new ForbiddenException(`Impossible de ${action} un Super Admin`);
    }
  }

  assertCallerCanManageUser(callerRole: string, targetRole: string) {
    if (callerRole !== 'SUPER_ADMIN' && targetRole === 'ADMIN') {
      throw new ForbiddenException('Seul un Super Admin peut gérer les administrateurs');
    }
    if (callerRole !== 'SUPER_ADMIN' && targetRole === 'SUPER_ADMIN') {
      throw new ForbiddenException('Accès refusé');
    }
  }

  async ensureDefaults() {
    const flagCount = await this.prisma.featureFlag.count();
    if (flagCount === 0) {
      await this.prisma.featureFlag.createMany({
        data: DEFAULT_FEATURE_FLAGS.map((f) => ({ ...f })),
      });
    }

    const permCount = await this.prisma.rolePermission.count();
    if (permCount === 0) {
      const rows: Prisma.RolePermissionCreateManyInput[] = [];
      for (const role of Object.keys(DEFAULT_ROLE_PERMISSIONS) as RoleUtilisateur[]) {
        for (const resource of PERMISSION_RESOURCES) {
          const flags = DEFAULT_ROLE_PERMISSIONS[role][resource];
          rows.push({ role, resource, ...flags });
        }
      }
      await this.prisma.rolePermission.createMany({ data: rows });
    }

    await this.prisma.platformSettings.upsert({
      where: { id: 'singleton' },
      update: {},
      create: {
        id: 'singleton',
        general: DEFAULT_PLATFORM_SETTINGS.general as Prisma.InputJsonValue,
        auth: DEFAULT_PLATFORM_SETTINGS.auth as Prisma.InputJsonValue,
        invitations: DEFAULT_PLATFORM_SETTINGS.invitations as Prisma.InputJsonValue,
        parents: DEFAULT_PLATFORM_SETTINGS.parents as Prisma.InputJsonValue,
        teachers: DEFAULT_PLATFORM_SETTINGS.teachers as Prisma.InputJsonValue,
        admins: DEFAULT_PLATFORM_SETTINGS.admins as Prisma.InputJsonValue,
        email: DEFAULT_PLATFORM_SETTINGS.email as Prisma.InputJsonValue,
        maintenance: DEFAULT_PLATFORM_SETTINGS.maintenance as Prisma.InputJsonValue,
      },
    });
  }

  async getGlobalStats() {
    const [
      organizations,
      admins,
      teachers,
      parents,
      classes,
      events,
      menus,
      archivedUsers,
      activeUsers,
      disabledUsers,
      auditLast24h,
    ] = await Promise.all([
      this.prisma.organization.count({ where: { archivedAt: null } }),
      this.prisma.utilisateur.count({ where: { role: 'ADMIN', deletedAt: null, archivedAt: null } }),
      this.prisma.utilisateur.count({ where: { role: 'ENSEIGNANT', deletedAt: null, archivedAt: null } }),
      this.prisma.utilisateur.count({ where: { role: 'PARENT', deletedAt: null, archivedAt: null } }),
      this.prisma.classe.count({ where: { archivedAt: null } }),
      this.prisma.event.count({ where: { archivedAt: null } }),
      this.prisma.menu.count({ where: { archivedAt: null } }),
      this.prisma.utilisateur.count({ where: { statut: 'ARCHIVED' } }),
      this.prisma.utilisateur.count({ where: { statut: 'ACTIVE', deletedAt: null } }),
      this.prisma.utilisateur.count({ where: { statut: 'DISABLED' } }),
      this.prisma.auditLog.count({
        where: { creeLe: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ]);

    return {
      organizations,
      admins,
      teachers,
      parents,
      classes,
      events,
      menus,
      archivedUsers,
      activeUsers,
      disabledUsers,
      auditLast24h,
    };
  }

  async globalSearch(q: string, includeArchived = false) {
    const term = q.trim();
    if (!term) return { parents: [], teachers: [], admins: [], classes: [], events: [], menus: [], archivedUsers: [] };

    const userWhere: Prisma.UtilisateurWhereInput = {
      deletedAt: null,
      OR: [
        { email: { contains: term, mode: 'insensitive' } },
        { prenom: { contains: term, mode: 'insensitive' } },
        { nom: { contains: term, mode: 'insensitive' } },
      ],
    };
    if (!includeArchived) {
      userWhere.archivedAt = null;
    }

    const [parents, teachers, admins, archivedUsers, classes, events, menus] = await Promise.all([
      this.prisma.utilisateur.findMany({
        where: { ...userWhere, role: 'PARENT' },
        take: 10,
        select: { id: true, email: true, prenom: true, nom: true, statut: true, archivedAt: true },
      }),
      this.prisma.utilisateur.findMany({
        where: { ...userWhere, role: 'ENSEIGNANT' },
        take: 10,
        select: { id: true, email: true, prenom: true, nom: true, statut: true, archivedAt: true },
      }),
      this.prisma.utilisateur.findMany({
        where: { ...userWhere, role: 'ADMIN' },
        take: 10,
        select: { id: true, email: true, prenom: true, nom: true, statut: true, archivedAt: true },
      }),
      includeArchived
        ? this.prisma.utilisateur.findMany({
            where: { ...userWhere, statut: 'ARCHIVED' },
            take: 10,
            select: { id: true, email: true, prenom: true, nom: true, role: true, statut: true, archivedAt: true },
          })
        : Promise.resolve([]),
      this.prisma.classe.findMany({
        where: {
          nom: { contains: term, mode: 'insensitive' },
          ...(includeArchived ? {} : { archivedAt: null }),
        },
        take: 10,
        select: { id: true, nom: true, niveau: true, active: true, archivedAt: true },
      }),
      this.prisma.event.findMany({
        where: {
          titre: { contains: term, mode: 'insensitive' },
          ...(includeArchived ? {} : { archivedAt: null }),
        },
        take: 10,
        select: { id: true, titre: true, startAt: true, archivedAt: true },
      }),
      this.prisma.menu.findMany({
        where: includeArchived ? {} : { archivedAt: null },
        take: 10,
        select: { id: true, date: true, statut: true, archivedAt: true },
      }),
    ]);

    return { parents, teachers, admins, classes, events, menus, archivedUsers };
  }

  // ── Organizations ──────────────────────────────────────────────────────────

  async listOrganizations(includeArchived = false) {
    return this.prisma.organization.findMany({
      where: includeArchived ? {} : { archivedAt: null },
      orderBy: { nom: 'asc' },
      include: { _count: { select: { utilisateurs: true } } },
    });
  }

  async createOrganization(data: { nom: string; adresse?: string; email?: string; telephone?: string }, ctx: AuditContext) {
    const org = await this.prisma.organization.create({ data });
    await this.audit.log('organization.created', ctx, 'Organization', org.id, { nom: org.nom });
    return org;
  }

  async updateOrganization(id: string, data: Prisma.OrganizationUpdateInput, ctx: AuditContext) {
    const org = await this.prisma.organization.update({ where: { id }, data });
    await this.audit.log('organization.updated', ctx, 'Organization', id);
    return org;
  }

  async archiveOrganization(id: string, ctx: AuditContext) {
    const org = await this.prisma.organization.update({
      where: { id },
      data: { archivedAt: new Date(), active: false },
    });
    await this.audit.log('organization.archived', ctx, 'Organization', id);
    return org;
  }

  async restoreOrganization(id: string, ctx: AuditContext) {
    const org = await this.prisma.organization.update({
      where: { id },
      data: { archivedAt: null, active: true },
    });
    await this.audit.log('organization.restored', ctx, 'Organization', id);
    return org;
  }

  // ── Admin / User management ────────────────────────────────────────────────

  async listManagedUsers(query: {
    role?: RoleUtilisateur;
    statut?: StatutUtilisateur;
    includeArchived?: boolean;
    includeDeleted?: boolean;
    q?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: Prisma.UtilisateurWhereInput = {};

    if (query.role) where.role = query.role;
    if (query.statut) where.statut = query.statut;
    if (!query.includeArchived) where.archivedAt = null;
    if (!query.includeDeleted) where.deletedAt = null;

    if (query.q) {
      where.OR = [
        { email: { contains: query.q, mode: 'insensitive' } },
        { prenom: { contains: query.q, mode: 'insensitive' } },
        { nom: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.utilisateur.findMany({
        where,
        skip,
        take: limit,
        orderBy: { creeLe: 'desc' },
        select: {
          id: true,
          email: true,
          prenom: true,
          nom: true,
          telephone: true,
          role: true,
          statut: true,
          dernierAcces: true,
          inviteLe: true,
          activeLe: true,
          archivedAt: true,
          deletedAt: true,
          creeLe: true,
          accessRestriction: true,
        },
      }),
      this.prisma.utilisateur.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async createAdmin(
    dto: { email: string; prenom: string; nom: string; telephone?: string; organizationId?: string },
    ctx: AuditContext,
  ) {
    const email = this.normalizeEmail(dto.email);
    const existing = await this.prisma.utilisateur.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (existing) throw new BadRequestException(`Un utilisateur avec l'email ${email} existe déjà`);

    const tempPasswordPlain = this.generateTempPassword();
    const tempPasswordHashed = await bcrypt.hash(tempPasswordPlain, 10);

    const user = await this.prisma.utilisateur.create({
      data: {
        email,
        prenom: dto.prenom,
        nom: dto.nom,
        telephone: dto.telephone,
        role: 'ADMIN',
        statut: 'INVITED',
        tempPassword: tempPasswordHashed,
        inviteLe: new Date(),
        organizationId: dto.organizationId,
      },
    });

    await this.emailService.sendInvitationEmail(email, dto.prenom, dto.nom, 'ADMIN', tempPasswordPlain);
    await this.audit.log('admin.created', ctx, 'Utilisateur', user.id, { email });

    return { utilisateurId: user.id, email: user.email, role: user.role, statut: user.statut, invited: true };
  }

  async updateManagedUser(
    id: string,
    dto: { prenom?: string; nom?: string; telephone?: string; role?: RoleUtilisateur; organizationId?: string },
    callerRole: string,
    ctx: AuditContext,
  ) {
    const user = await this.prisma.utilisateur.findUnique({ where: { id } });
    if (!user || user.deletedAt) throw new NotFoundException('Utilisateur non trouvé');

    this.assertCallerCanManageUser(callerRole, user.role);
    this.assertNotSuperAdminTarget(user, 'modifier');

    if (dto.role) {
      this.assertCallerCanManageUser(callerRole, dto.role);
      if (dto.role === 'SUPER_ADMIN') {
        throw new ForbiddenException('Impossible d\'attribuer le rôle Super Admin via cette interface');
      }
    }

    const updated = await this.prisma.utilisateur.update({
      where: { id },
      data: {
        prenom: dto.prenom,
        nom: dto.nom,
        telephone: dto.telephone,
        role: dto.role,
        organizationId: dto.organizationId,
      },
    });

    await this.audit.log('user.updated', ctx, 'Utilisateur', id, { role: updated.role });
    return updated;
  }

  async setUserStatus(id: string, statut: StatutUtilisateur, callerRole: string, ctx: AuditContext) {
    const user = await this.prisma.utilisateur.findUnique({ where: { id } });
    if (!user || user.deletedAt) throw new NotFoundException('Utilisateur non trouvé');

    this.assertCallerCanManageUser(callerRole, user.role);
    this.assertNotSuperAdminTarget(user, 'modifier le statut de');

    const data: Prisma.UtilisateurUpdateInput = {
      statut,
      activeLe: statut === 'ACTIVE' ? new Date() : user.activeLe,
      archivedAt: statut === 'ARCHIVED' ? new Date() : null,
    };

    if (statut === 'DISABLED' && user.statut === 'INVITED') {
      data.tempPassword = null;
    }

    const updated = await this.prisma.utilisateur.update({ where: { id }, data });
    await this.audit.log(`user.status.${statut.toLowerCase()}`, ctx, 'Utilisateur', id);
    return updated;
  }

  async archiveUser(id: string, callerRole: string, ctx: AuditContext) {
    return this.setUserStatus(id, 'ARCHIVED', callerRole, ctx);
  }

  async restoreUser(id: string, callerRole: string, ctx: AuditContext) {
    const user = await this.prisma.utilisateur.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    this.assertCallerCanManageUser(callerRole, user.role);
    this.assertNotSuperAdminTarget(user, 'restaurer');

    const updated = await this.prisma.utilisateur.update({
      where: { id },
      data: { statut: 'ACTIVE', archivedAt: null, activeLe: new Date() },
    });
    await this.audit.log('user.restored', ctx, 'Utilisateur', id);
    return updated;
  }

  async softDeleteUser(id: string, callerRole: string, ctx: AuditContext) {
    const user = await this.prisma.utilisateur.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    this.assertCallerCanManageUser(callerRole, user.role);
    this.assertNotSuperAdminTarget(user, 'supprimer');

    if (user.role === 'PARENT') {
      throw new BadRequestException('Utilisez l\'archivage pour les parents (pas de suppression définitive)');
    }

    const updated = await this.prisma.utilisateur.update({
      where: { id },
      data: { deletedAt: new Date(), statut: 'DISABLED', tempPassword: null },
    });
    await this.audit.log('user.soft_deleted', ctx, 'Utilisateur', id);
    return { message: 'Utilisateur supprimé (soft delete)', id: updated.id };
  }

  async resetUserPassword(id: string, callerRole: string, ctx: AuditContext) {
    const user = await this.prisma.utilisateur.findUnique({ where: { id } });
    if (!user || user.deletedAt) throw new NotFoundException('Utilisateur non trouvé');
    this.assertCallerCanManageUser(callerRole, user.role);
    this.assertNotSuperAdminTarget(user, 'réinitialiser le mot de passe de');

    const tempPasswordPlain = this.generateTempPassword();
    const tempPasswordHashed = await bcrypt.hash(tempPasswordPlain, 10);

    await this.prisma.utilisateur.update({
      where: { id },
      data: {
        tempPassword: tempPasswordHashed,
        statut: user.statut,
        sessionRevokedAt: new Date(),
      },
    });

    await this.prisma.userSession.updateMany({
      where: { utilisateurId: id, revoked: false },
      data: { revoked: true },
    });

    const emailSent = await this.emailService.sendAdminPasswordResetEmail({
      email: user.email,
      prenom: user.prenom,
      nom: user.nom,
      role: user.role,
      tempPassword: tempPasswordPlain,
    });

    if (!emailSent) {
      this.logger.error(
        `Échec envoi email réinitialisation MDP — utilisateur ${user.email} (${id})`,
      );
      throw new ServiceUnavailableException(
        'Échec d\'envoi de l\'email. Vérifiez la configuration SMTP.',
      );
    }

    await this.audit.log('password.reset', ctx, 'Utilisateur', id, {
      targetEmail: user.email,
      targetUserId: id,
      targetRole: user.role,
      performedBy: ctx.userEmail,
    });

    return { message: 'Mot de passe réinitialisé', emailSent: true, id };
  }

  async forceLogoutUser(id: string, callerRole: string, ctx: AuditContext) {
    const user = await this.prisma.utilisateur.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    this.assertCallerCanManageUser(callerRole, user.role);
    this.assertNotSuperAdminTarget(user, 'forcer la déconnexion de');

    await this.prisma.utilisateur.update({
      where: { id },
      data: { sessionRevokedAt: new Date() },
    });
    await this.prisma.userSession.updateMany({
      where: { utilisateurId: id, revoked: false },
      data: { revoked: true },
    });
    await this.audit.log('user.force_logout', ctx, 'Utilisateur', id);
    return { message: 'Sessions révoquées', id };
  }

  async resendInvitation(id: string, callerRole: string, ctx: AuditContext) {
    return this.resetUserPassword(id, callerRole, ctx);
  }

  async getLoginHistory(userId: string, limit = 50) {
    return this.prisma.loginHistory.findMany({
      where: { utilisateurId: userId },
      orderBy: { creeLe: 'desc' },
      take: limit,
    });
  }

  // ── Access restrictions ────────────────────────────────────────────────────

  async getAccessRestrictions(userId: string) {
    return this.prisma.userAccessRestriction.findUnique({ where: { utilisateurId: userId } });
  }

  async updateAccessRestrictions(
    userId: string,
    data: Partial<{
      cannotLogin: boolean;
      readOnly: boolean;
      noPhotoUpload: boolean;
      noEventManagement: boolean;
      noPresenceManagement: boolean;
      noChildManagement: boolean;
      noSettingsAccess: boolean;
      noAdminManagement: boolean;
      noTeacherManagement: boolean;
      noParentManagement: boolean;
    }>,
    callerRole: string,
    ctx: AuditContext,
  ) {
    const user = await this.prisma.utilisateur.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    this.assertCallerCanManageUser(callerRole, user.role);
    this.assertNotSuperAdminTarget(user, 'modifier les restrictions de');

    const restriction = await this.prisma.userAccessRestriction.upsert({
      where: { utilisateurId: userId },
      create: { utilisateurId: userId, ...data },
      update: data,
    });

    await this.audit.log('permissions.updated', ctx, 'UserAccessRestriction', restriction.id, data);
    return restriction;
  }

  // ── Permissions matrix ─────────────────────────────────────────────────────

  async getPermissionsMatrix() {
    const perms = await this.prisma.rolePermission.findMany({ orderBy: [{ role: 'asc' }, { resource: 'asc' }] });
    const byRole: Record<string, Record<string, unknown>> = {};
    for (const p of perms) {
      if (!byRole[p.role]) byRole[p.role] = {};
      byRole[p.role][p.resource] = {
        view: p.view,
        create: p.create,
        edit: p.edit,
        delete: p.delete,
        upload: p.upload,
        export: p.export,
        archive: p.archive,
      };
    }
    return byRole;
  }

  async updateRolePermission(
    role: RoleUtilisateur,
    resource: string,
    flags: Partial<{ view: boolean; create: boolean; edit: boolean; delete: boolean; upload: boolean; export: boolean; archive: boolean }>,
    ctx: AuditContext,
  ) {
    if (role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Les permissions Super Admin ne sont pas modifiables');
    }

    const updated = await this.prisma.rolePermission.upsert({
      where: { role_resource: { role, resource } },
      create: { role, resource, ...flags },
      update: flags,
    });

    await this.audit.log('role_permission.updated', ctx, 'RolePermission', updated.id, { role, resource, ...flags });
    return updated;
  }

  // ── Platform settings ──────────────────────────────────────────────────────

  async getPlatformSettings() {
    await this.ensureDefaults();
    return this.prisma.platformSettings.findUnique({ where: { id: 'singleton' } });
  }

  async updatePlatformSettings(
    section: 'general' | 'auth' | 'invitations' | 'parents' | 'teachers' | 'admins' | 'email' | 'maintenance',
    data: Record<string, unknown>,
    modifiePar: string,
    ctx: AuditContext,
  ) {
    const current = await this.getPlatformSettings();
    const sectionData = { ...(current?.[section] as object), ...data };

    const updated = await this.prisma.platformSettings.upsert({
      where: { id: 'singleton' },
      update: { [section]: sectionData, modifiePar },
      create: {
        id: 'singleton',
        [section]: sectionData,
        modifiePar,
      },
    });

    await this.audit.log('platform_settings.updated', ctx, 'PlatformSettings', 'singleton', { section });
    return updated;
  }

  // ── Feature flags ──────────────────────────────────────────────────────────

  async listFeatureFlags() {
    await this.ensureDefaults();
    return this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  }

  async updateFeatureFlag(key: string, enabled: boolean, ctx: AuditContext) {
    const flag = await this.prisma.featureFlag.update({
      where: { key },
      data: { enabled },
    });
    await this.audit.log('feature_flag.updated', ctx, 'FeatureFlag', flag.id, { key, enabled });
    return flag;
  }

  // ── Security center ────────────────────────────────────────────────────────

  async getSecurityOverview() {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      failedLogins,
      activeSessions,
      blockedUsers,
      archivedUsers,
      recentPasswordResets,
      recentRoleChanges,
      recentInvitations,
      suspiciousActivity,
    ] = await Promise.all([
      this.prisma.loginHistory.findMany({
        where: { success: false, creeLe: { gte: since24h } },
        orderBy: { creeLe: 'desc' },
        take: 50,
      }),
      this.prisma.userSession.findMany({
        where: { revoked: false, expiresAt: { gt: new Date() } },
        orderBy: { lastActivity: 'desc' },
        take: 50,
        include: { utilisateur: { select: { id: true, email: true, prenom: true, nom: true, role: true } } },
      }),
      this.prisma.utilisateur.findMany({
        where: { statut: 'DISABLED', deletedAt: null },
        take: 50,
        select: { id: true, email: true, prenom: true, nom: true, role: true, modifieLe: true },
      }),
      this.prisma.utilisateur.findMany({
        where: { statut: 'ARCHIVED' },
        take: 50,
        orderBy: { archivedAt: 'desc' },
        select: { id: true, email: true, prenom: true, nom: true, role: true, archivedAt: true },
      }),
      this.prisma.auditLog.findMany({
        where: { action: 'password.reset', creeLe: { gte: since24h } },
        orderBy: { creeLe: 'desc' },
        take: 20,
      }),
      this.prisma.auditLog.findMany({
        where: { action: { contains: 'role' }, creeLe: { gte: since24h } },
        orderBy: { creeLe: 'desc' },
        take: 20,
      }),
      this.prisma.auditLog.findMany({
        where: { action: { in: ['admin.created', 'user.updated'] }, creeLe: { gte: since24h } },
        orderBy: { creeLe: 'desc' },
        take: 20,
      }),
      this.prisma.auditLog.findMany({
        where: {
          action: { in: ['login.failed', 'user.force_logout'] },
          creeLe: { gte: since24h },
        },
        orderBy: { creeLe: 'desc' },
        take: 30,
      }),
    ]);

    return {
      failedLogins,
      activeSessions,
      blockedUsers,
      archivedUsers,
      recentPasswordResets,
      recentRoleChanges,
      recentInvitations,
      suspiciousActivity,
    };
  }

  // ── Archive entities ───────────────────────────────────────────────────────

  async archiveEntity(type: 'class' | 'event' | 'menu', id: string, ctx: AuditContext) {
    const now = new Date();
    if (type === 'class') {
      const item = await this.prisma.classe.update({ where: { id }, data: { archivedAt: now, active: false } });
      await this.audit.log('class.archived', ctx, 'Classe', id);
      return item;
    }
    if (type === 'event') {
      const item = await this.prisma.event.update({ where: { id }, data: { archivedAt: now } });
      await this.audit.log('event.archived', ctx, 'Event', id);
      return item;
    }
    const item = await this.prisma.menu.update({ where: { id }, data: { archivedAt: now } });
    await this.audit.log('menu.archived', ctx, 'Menu', id);
    return item;
  }

  async restoreEntity(type: 'class' | 'event' | 'menu', id: string, ctx: AuditContext) {
    if (type === 'class') {
      const item = await this.prisma.classe.update({ where: { id }, data: { archivedAt: null, active: true } });
      await this.audit.log('class.restored', ctx, 'Classe', id);
      return item;
    }
    if (type === 'event') {
      const item = await this.prisma.event.update({ where: { id }, data: { archivedAt: null } });
      await this.audit.log('event.restored', ctx, 'Event', id);
      return item;
    }
    const item = await this.prisma.menu.update({ where: { id }, data: { archivedAt: null } });
    await this.audit.log('menu.restored', ctx, 'Menu', id);
    return item;
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    const bytes = crypto.randomBytes(12);
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars[bytes[i] % chars.length];
    }
    return password;
  }
}
