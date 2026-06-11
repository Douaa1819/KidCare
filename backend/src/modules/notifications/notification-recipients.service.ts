import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RoleUtilisateur, StatutUtilisateur } from '@prisma/client';

/**
 * Résout les adresses email des parents concernés (comptes actifs + email principal famille).
 */
@Injectable()
export class NotificationRecipientsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeEmail(e: string | null | undefined): string | null {
    const v = e?.trim().toLowerCase();
    if (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return null;
    return v;
  }

  private addEmail(set: Set<string>, email: string | null | undefined) {
    const n = this.normalizeEmail(email);
    if (n) set.add(n);
  }

  /**
   * Parents de l’enfant : utilisateurs PARENT actifs avec notifications activées + email principal de la famille (si distinct).
   */
  async resolveParentEmailsForEnfant(enfantId: string): Promise<string[]> {
    const enfant = await this.prisma.enfant.findFirst({
      where: { id: enfantId, archivedAt: null },
      select: {
        famille: {
          select: {
            emailPrincipal: true,
            tuteurs: {
              select: {
                utilisateur: {
                  select: {
                    email: true,
                    role: true,
                    statut: true,
                    emailNotificationsEnabled: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const set = new Set<string>();
    if (!enfant?.famille) return [];

    for (const t of enfant.famille.tuteurs) {
      const u = t.utilisateur;
      if (
        u &&
        u.role === RoleUtilisateur.PARENT &&
        u.statut === StatutUtilisateur.ACTIVE &&
        u.emailNotificationsEnabled
      ) {
        this.addEmail(set, u.email);
      }
    }

    this.addEmail(set, enfant.famille.emailPrincipal);

    return [...set];
  }

  /**
   * Tous les parents des enfants actifs de la classe (dédoublonnés).
   */
  async resolveParentEmailsForClasse(classeId: string): Promise<string[]> {
    const enfants = await this.prisma.enfant.findMany({
      where: { classeId, archivedAt: null },
      select: { id: true },
    });

    const global = new Set<string>();
    for (const e of enfants) {
      const emails = await this.resolveParentEmailsForEnfant(e.id);
      for (const em of emails) global.add(em);
    }
    return [...global];
  }
}
