import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ListEnfantsQueryDto } from './dto/list-enfants-query.dto';
import { Prisma, StatutPresence } from '@prisma/client';
import { validateChildBirthdateForPolicy } from '../../common/child-age-policy';

@Injectable()
export class EnfantsService {
  constructor(private prisma: PrismaService) {}

  private validateChildBirthdate(value: unknown) {
    validateChildBirthdateForPolicy(value);
  }

  /**
   * Début / fin du jour calendaire en UTC — aligné sur `YYYY-MM-DD` envoyé par le front
   * (`new Date().toISOString().slice(0, 10)` + `new Date("YYYY-MM-DD")`).
   */
  private utcDayRange(reference: Date = new Date()): { start: Date; end: Date } {
    const start = new Date(
      Date.UTC(
        reference.getUTCFullYear(),
        reference.getUTCMonth(),
        reference.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
    const end = new Date(
      Date.UTC(
        reference.getUTCFullYear(),
        reference.getUTCMonth(),
        reference.getUTCDate() + 1,
        0,
        0,
        0,
        0,
      ),
    );
    return { start, end };
  }

  async listEnfants(query: ListEnfantsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 25, 100);
    const skip = (page - 1) * pageSize;

    const where: any =
      query.archived === true
        ? { archivedAt: { not: null } }
        : { archivedAt: null };

    if (query.q) {
      const q = query.q.toLowerCase();
      where.OR = [
        { prenom: { contains: q, mode: 'insensitive' } },
        { nom: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (query.classeId) {
      where.classeId = query.classeId;
    }

    const { start: startOfToday, end: startOfTomorrow } = this.utcDayRange();

    const [items, total] = await Promise.all([
      this.prisma.enfant.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { prenom: 'asc' },
        include: {
          classe: { select: { id: true, nom: true } },
          famille: {
            select: {
              id: true,
              tuteurs: {
                select: {
                  id: true,
                  prenom: true,
                  nom: true,
                  telephone: true,
                  principal: true,
                },
              },
            },
          },
          presences: {
            where: {
              date: {
                gte: startOfToday,
                lt: startOfTomorrow,
              },
            },
            select: {
              id: true,
              date: true,
              statut: true,
            },
          },
        },
      }),
      this.prisma.enfant.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      hasNext: skip + pageSize < total,
    };
  }

  async getEnfantById(id: string) {
    return this.prisma.enfant.findUnique({
      where: { id },
      include: {
        classe: { select: { id: true, nom: true, niveau: true } },
        famille: {
          select: {
            id: true,
            tuteurs: {
              select: {
                id: true,
                prenom: true,
                nom: true,
                telephone: true,
                email: true,
                adresse: true,
                lien: true,
                principal: true,
              },
            },
          },
        },
        presences: {
          orderBy: { date: 'desc' },
          take: 10,
        },
        profilSante: {
          include: {
            allergies: true,
            intolerances: true,
            vaccinations: true,
            autorisations: true,
          },
        },
        inscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            statut: true,
            payload: true,
            createdAt: true,
          },
        },
        delegations: true,
      },
    });
  }

  // ── Delegation CRUD ──────────────────────────────────────────────────────
  async addDelegation(
    enfantId: string,
    data: { nom: string; telephone: string; cin: string; relation: string },
  ) {
    return this.prisma.delegation.create({ data: { ...data, enfantId } });
  }

  async updateDelegation(
    id: string,
    data: Partial<{
      nom: string;
      telephone: string;
      cin: string;
      relation: string;
    }>,
  ) {
    return this.prisma.delegation.update({ where: { id }, data });
  }

  async deleteDelegation(id: string) {
    return this.prisma.delegation.delete({ where: { id } });
  }

  async createEnfant(data: Prisma.EnfantCreateInput) {
    this.validateChildBirthdate(data.dateNaissance);
    return this.prisma.enfant.create({
      data,
    });
  }

  async updateEnfant(id: string, data: Prisma.EnfantUpdateInput) {
    return this.prisma.enfant.update({
      where: { id },
      data,
    });
  }

  async archiveEnfant(id: string, archivedBy?: string) {
    return this.prisma.enfant.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        archivedBy: archivedBy ?? null,
      },
    });
  }

  async restoreEnfant(id: string) {
    const enfant = await this.prisma.enfant.findUnique({ where: { id } });
    if (!enfant) {
      throw new NotFoundException('Enfant introuvable');
    }
    if (!enfant.archivedAt) {
      throw new BadRequestException('Cet enfant n\'est pas archivé');
    }
    return this.prisma.enfant.update({
      where: { id },
      data: { archivedAt: null, archivedBy: null },
    });
  }

  async listFamillesForSelect() {
    return this.prisma.famille.findMany({
      select: {
        id: true,
        emailPrincipal: true,
      },
      orderBy: { emailPrincipal: 'asc' },
      take: 200,
    });
  }

  async setEnfantPresenceStatusToday(enfantId: string, statut?: StatutPresence | null) {
    const { start: startOfToday, end: startOfTomorrow } = this.utcDayRange();

    const existing = await this.prisma.presence.findFirst({
      where: {
        enfantId,
        date: {
          gte: startOfToday,
          lt: startOfTomorrow,
        },
      },
    });

    if (!statut) {
      if (!existing) {
        return { deleted: false, message: 'Aucune présence à supprimer pour aujourd\'hui' };
      }
      await this.prisma.presence.delete({
        where: { id: existing.id },
      });
      return { deleted: true, id: existing.id };
    }

    if (existing) {
      return this.prisma.presence.update({
        where: { id: existing.id },
        data: { statut },
      });
    }

    return this.prisma.presence.create({
      data: {
        enfantId,
        date: startOfToday,
        statut,
      },
    });
  }
}
