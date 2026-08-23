import { Injectable, NotFoundException } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';
import { PrismaService } from '../../prisma/prisma.service';
import { richTextSanitizerConfig } from '../../common/sanitizer/rich-text-sanitizer-config';

@Injectable()
export class ReglementInterieurService {
  constructor(private prisma: PrismaService) {}

  async getCurrent() {
    // Retourne le règlement le plus récent
    const reglement = await this.prisma.reglementInterieur.findFirst({
      orderBy: { modifieLe: 'desc' },
    });

    if (!reglement) {
      // Retourner un règlement par défaut si aucun n'existe
      return {
        id: null,
        contenu: this.getDefaultContent(),
        version: 1,
        modifieLe: new Date(),
      };
    }

    return reglement;
  }

  async upsert(contenu: string, adminId?: string) {
    const safeContenu = sanitizeHtml(contenu, richTextSanitizerConfig());
    const existing = await this.prisma.reglementInterieur.findFirst({
      orderBy: { modifieLe: 'desc' },
    });

    if (existing) {
      return this.prisma.reglementInterieur.update({
        where: { id: existing.id },
        data: {
          contenu: safeContenu,
          version: existing.version + 1,
          modifiePar: adminId,
        },
      });
    }

    return this.prisma.reglementInterieur.create({
      data: {
        contenu: safeContenu,
        version: 1,
        modifiePar: adminId,
      },
    });
  }

  private getDefaultContent(): string {
    return `## KidCare - Crèche Maternelle

KidCare est une plateforme moderne de gestion de crèche. Les enfants y trouvent un accueil bienveillant et chaleureux, entourés par des adultes passionnés et dévoués.

## Les horaires de l'école

Horaires des classes : 8h30 à 11h30 et de 14h à 16h15, du lundi au vendredi. Un service de garde gratuit est assuré à partir de 7h45 le matin et jusqu'à 16h45 le soir.

## La scolarité

Les frais de scolarité sont à régler par trimestre. Toute absence (même prévisible) durant les périodes scolaires ne pourra faire l'objet de réduction sur les frais de scolarité mensuels.

## Vaccination & Maladie

Chaque enfant doit être à jour de ses vaccinations. Un enfant fiévreux ou nauséeux ne peut être accepté à l'école.

## Sécurité

Je reconnais avoir pris connaissance du règlement intérieur et m'engage à le respecter sans réserve.`;
  }
}
