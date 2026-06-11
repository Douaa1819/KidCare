import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Guard RBAC pour vérifier les rôles et statuts.
 * SUPER_ADMIN hérite de tous les accès ADMIN.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  private roleMatches(requiredRoles: string[], userRole: string): boolean {
    if (requiredRoles.includes(userRole)) return true;
    if (userRole === 'SUPER_ADMIN' && requiredRoles.includes('ADMIN')) return true;
    return false;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    const jwtRole = String(user.role ?? '');

    // Cas spécial: Super Admin bootstrap (userId = 'admin_dev')
    if (user.userId === 'admin_dev' && jwtRole === 'SUPER_ADMIN') {
      if (!this.roleMatches(requiredRoles, jwtRole)) {
        throw new ForbiddenException(
          `Rôle insuffisant. Rôles autorisés: ${requiredRoles.join(', ')}`,
        );
      }
      request.utilisateur = {
        id: user.userId,
        email: user.email,
        role: jwtRole,
        statut: 'ACTIVE',
      };
      return true;
    }

    // JWT SUPER_ADMIN sans enregistrement DB (legacy env login)
    if (jwtRole === 'SUPER_ADMIN' && this.roleMatches(requiredRoles, jwtRole)) {
      const utilisateur = await this.prisma.utilisateur.findUnique({
        where: { email: user.email },
      });
      request.utilisateur = utilisateur ?? {
        id: user.userId,
        email: user.email,
        role: jwtRole,
        statut: 'ACTIVE',
      };
      return true;
    }

    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { email: user.email },
      include: { accessRestriction: true },
    });

    if (!utilisateur) {
      throw new ForbiddenException('Utilisateur non trouvé');
    }

    if (utilisateur.deletedAt) {
      throw new ForbiddenException('Compte supprimé');
    }

    const userRole = String(utilisateur.role);

    if (!this.roleMatches(requiredRoles, userRole)) {
      this.logger.warn(
        `Accès refusé: ${utilisateur.email} (${userRole}) ne peut pas accéder à ${context.getClass().name}. Rôles requis: ${requiredRoles.join(', ')}`,
      );
      throw new ForbiddenException(
        `Rôle insuffisant. Rôles autorisés: ${requiredRoles.join(', ')}`,
      );
    }

    const allowedStatuses =
      this.reflector.getAllAndOverride<string[]>(
        'allowedStatuses',
        [context.getHandler(), context.getClass()],
      ) ?? ['ACTIVE'];

    const userStatus = String(utilisateur.statut);
    if (!allowedStatuses.includes(userStatus)) {
      this.logger.warn(
        `Accès refusé: ${utilisateur.email} - Statut: ${userStatus}, Statuts autorisés: ${allowedStatuses.join(', ')}`,
      );
      throw new ForbiddenException(
        `Compte désactivé ou en attente d'activation. Statut actuel: ${userStatus}`,
      );
    }

    if (utilisateur.accessRestriction?.cannotLogin) {
      throw new ForbiddenException('Accès restreint — connexion interdite');
    }

    request.utilisateur = utilisateur;
    return true;
  }
}
