import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import { RoleUtilisateur, StatutUtilisateur } from '@prisma/client';



/**

 * Résout les adresses email des parents liés à un enfant.

 * Respecte opt-out, exclut archivés/désactivés, dédoublonne les adresses.

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



  private isEligibleParentUser(u: {

    role: RoleUtilisateur;

    statut: StatutUtilisateur;

    emailNotificationsEnabled: boolean;

  }): boolean {

    if (u.role !== RoleUtilisateur.PARENT) return false;

    if (u.statut === StatutUtilisateur.DISABLED || u.statut === StatutUtilisateur.ARCHIVED) {

      return false;

    }

    if (!u.emailNotificationsEnabled) return false;

    return u.statut === StatutUtilisateur.ACTIVE || u.statut === StatutUtilisateur.INVITED;

  }



  /**

   * Parents de l'enfant : comptes PARENT actifs/invités avec notifications activées,

   * ou email tuteur si aucun compte lié.

   */

  async resolveParentEmailsForEnfant(enfantId: string): Promise<string[]> {

    const enfant = await this.prisma.enfant.findFirst({

      where: { id: enfantId, archivedAt: null },

      select: {

        famille: {

          select: {

            tuteurs: {

              select: {

                email: true,

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

      if (u && this.isEligibleParentUser(u)) {

        this.addEmail(set, u.email);

        continue;

      }

      if (!u && t.email) {

        this.addEmail(set, t.email);

      }

    }



    return [...set];

  }



  /**

   * Parents des enfants actifs de la classe (dédoublonnés).

   * Enfants sans classe ne sont pas inclus.

   */

  async resolveParentEmailsForClasse(classeId: string): Promise<string[]> {

    if (!classeId?.trim()) return [];



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


