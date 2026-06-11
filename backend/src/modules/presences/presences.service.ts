import { Injectable, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GetPresencesQueryDto, GetPresencesResponseDto, PresenceItemDto } from './dto';
import { RoleUtilisateur, StatutPresence } from '@prisma/client';
import {
  toUtcMidnightForCalendarDate,
  utcDayRangeExclusiveEnd,
} from '../../common/calendar-date';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
import { assertTeacherCanAccessEnfant } from '../../common/security/teacher-access';

interface UserContext {
  userId: string;
  role: RoleUtilisateur;
  email: string;
}

@Injectable()
export class PresencesService {
  private readonly logger = new Logger(PresencesService.name);

  constructor(
    private prisma: PrismaService,
    private readonly notificationDispatcher: NotificationDispatcherService,
  ) {}

  /**
   * Récupère les IDs des classes enseignées par un enseignant
   */
  private async getClasseIdsForTeacher(userId: string): Promise<string[]> {
    // Méthode 1: Via utilisateur -> enseignant -> classes
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
      include: {
        enseignant: {
          include: {
            classes: {
              where: {
                dateFin: null, // Seulement les classes actuelles
              },
              select: { classeId: true },
            },
          },
        },
      },
    });

    if (utilisateur?.enseignant) {
      const classeIds = utilisateur.enseignant.classes.map((ec) => ec.classeId);
      this.logger.log(`Classes trouvées pour l'enseignant ${userId} (méthode 1): ${classeIds.join(', ')}`);
      return classeIds;
    }

    // Méthode 2: Recherche directe via enseignantId
    const utilisateur2 = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
      select: { enseignantId: true },
    });

    if (utilisateur2?.enseignantId) {
      const enseignantClasses = await this.prisma.enseignantClasse.findMany({
        where: {
          enseignantId: utilisateur2.enseignantId,
          dateFin: null,
        },
        select: { classeId: true },
      });

      const classeIds = enseignantClasses.map((ec) => ec.classeId);
      this.logger.log(`Classes trouvées pour l'enseignant ${userId} (méthode 2): ${classeIds.join(', ')}`);
      return classeIds;
    }

    this.logger.warn(`Enseignant non trouvé pour l'utilisateur ${userId}`);
    return [];
  }

  /**
   * Récupère les IDs des enfants d'un parent
   */
  private async getEnfantIdsForParent(userId: string): Promise<string[]> {
    const tuteur = await this.prisma.tuteur.findFirst({
      where: {
        utilisateur: {
          id: userId,
        },
      },
      include: {
        famille: {
          include: {
            enfants: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!tuteur) {
      return [];
    }

    return tuteur.famille.enfants.map((e) => e.id);
  }

  /**
   * Récupère les présences avec filtres et RBAC
   */
  async findMany(
    query: GetPresencesQueryDto,
    user: UserContext,
  ): Promise<GetPresencesResponseDto> {
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 25, 200);
    const skip = (page - 1) * pageSize;

    // Construire les filtres Prisma
    const where: any = {};

    // Filtre date (jour calendaire UTC, aligné sur createOrUpdatePresence)
    if (query.date) {
      try {
        const { start, endExclusive } = utcDayRangeExclusiveEnd(query.date);
        where.date = { gte: start, lt: endExclusive };
      } catch {
        throw new BadRequestException('Date invalide (format: YYYY-MM-DD)');
      }
    } else if (query.dateMin || query.dateMax) {
      where.date = {};
      try {
        if (query.dateMin) {
          where.date.gte = toUtcMidnightForCalendarDate(query.dateMin);
        }
        if (query.dateMax) {
          const { endExclusive } = utcDayRangeExclusiveEnd(query.dateMax);
          where.date.lt = endExclusive;
        }
      } catch {
        throw new BadRequestException('Plage de dates invalide (format: YYYY-MM-DD)');
      }
    }

    // Filtre statut
    if (query.statut) {
      where.statut = query.statut;
    }

    // Filtre enfantId
    if (query.enfantId) {
      where.enfantId = query.enfantId;
    }

    // Filtre enregistreParId (enseignant/admin)
    if (query.enregistreParId) {
      where.enregistrePar = query.enregistreParId;
    }

    // Filtre classeId : dans notre schéma, la classe est directement sur Enfant (enfant.classeId)
    if (query.classeId) {
      where.enfant = {
        ...where.enfant,
        classeId: query.classeId,
      };
    }

    // Filtre recherche (q)
    if (query.q) {
      where.enfant = {
        ...where.enfant,
        OR: [
          { nom: { contains: query.q, mode: 'insensitive' } },
          { prenom: { contains: query.q, mode: 'insensitive' } },
        ],
      };
    }

    // Appliquer RBAC
    if (user.role === RoleUtilisateur.PARENT) {
      const enfantIds = await this.getEnfantIdsForParent(user.userId);
      if (enfantIds.length === 0) {
        return {
          items: [],
          page,
          pageSize,
          total: 0,
          hasNext: false,
        };
      }
      where.enfantId = { in: enfantIds };
    } else if (user.role === RoleUtilisateur.ENSEIGNANT) {
      const classeIds = await this.getClasseIdsForTeacher(user.userId);
      if (classeIds.length === 0) {
        return {
          items: [],
          page,
          pageSize,
          total: 0,
          hasNext: false,
        };
      }

      // Restreindre aux enfants dont la classeId est dans les classes de l'enseignant
      where.enfant = {
        ...where.enfant,
        classeId: { in: classeIds },
      };
    }
    // ADMIN: pas de restriction

    // Compter le total
    const total = await this.prisma.presence.count({ where });

    // Récupérer les présences
    const presences = await this.prisma.presence.findMany({
      where,
      include: {
        enfant: {
          include: {
            classe: true,
          },
        },
      },
      orderBy: [{ date: 'desc' }, { enfant: { nom: 'asc' } }],
      skip,
      take: pageSize,
    });

    const userIds = Array.from(
      new Set(
        presences
          .map((p) => p.enregistrePar)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const utilisateursById = new Map<string, { id: string; prenom: string; nom: string }>();
    if (userIds.length > 0) {
      const utilisateurs = await this.prisma.utilisateur.findMany({
        where: { id: { in: userIds } },
        select: { id: true, prenom: true, nom: true },
      });
      for (const u of utilisateurs) {
        utilisateursById.set(u.id, u);
      }
    }

    // Transformer les données
    const items: PresenceItemDto[] = presences.map((p) => ({
      id: p.id,
      date: p.date.toISOString().split('T')[0],
      statut: p.statut,
      enfant: {
        id: p.enfant.id,
        prenom: p.enfant.prenom,
        nom: p.enfant.nom,
        classe: p.enfant.classe
          ? {
              id: p.enfant.classe.id,
              nom: p.enfant.classe.nom,
            }
          : undefined,
      },
      arriveeA: p.arriveeA ? p.arriveeA.toISOString().split('T')[1].substring(0, 5) : undefined,
      departA: p.departA ? p.departA.toISOString().split('T')[1].substring(0, 5) : undefined,
      enregistrePar: p.enregistrePar ? utilisateursById.get(p.enregistrePar) : undefined,
    }));

    return {
      items,
      page,
      pageSize,
      total,
      hasNext: skip + pageSize < total,
    };
  }

  /**
   * Crée ou met à jour une présence pour un enfant
   */
  async createOrUpdatePresence(
    enfantId: string,
    date: string,
    statut: StatutPresence,
    arriveeA?: string,
    departA?: string,
    user?: UserContext,
  ): Promise<PresenceItemDto> {
    // Vérifier que l'enfant existe
    const enfant = await this.prisma.enfant.findUnique({
      where: { id: enfantId },
      include: {
        inscriptions: true,
      },
    });

    if (!enfant) {
      throw new BadRequestException('Enfant non trouvé');
    }

    if (user?.role === RoleUtilisateur.ENSEIGNANT) {
      await assertTeacherCanAccessEnfant(this.prisma, user.userId, enfantId);
    }

    // Même normalisation que les résumés quotidiens (minuit UTC du jour YYYY-MM-DD)
    let dateObj: Date;
    try {
      dateObj = toUtcMidnightForCalendarDate(date);
    } catch {
      throw new BadRequestException('Date invalide (format: YYYY-MM-DD)');
    }

    // Parser les heures
    let arriveeDateTime: Date | null = null;
    let departDateTime: Date | null = null;

    if (arriveeA) {
      const [hours, minutes] = arriveeA.split(':').map(Number);
      arriveeDateTime = new Date(dateObj);
      arriveeDateTime.setHours(hours, minutes, 0, 0);
    }

    if (departA) {
      const [hours, minutes] = departA.split(':').map(Number);
      departDateTime = new Date(dateObj);
      departDateTime.setHours(hours, minutes, 0, 0);
    }

    const existingPresence = await this.prisma.presence.findUnique({
      where: {
        enfantId_date: {
          enfantId,
          date: dateObj,
        },
      },
    });
    const isFirstPresenceOfDay = !existingPresence;

    // Créer ou mettre à jour la présence
    const presence = await this.prisma.presence.upsert({
      where: {
        enfantId_date: {
          enfantId,
          date: dateObj,
        },
      },
      create: {
        enfantId,
        date: dateObj,
        statut,
        arriveeA: arriveeDateTime,
        departA: departDateTime,
        enregistrePar: user?.userId,
      },
      update: {
        statut,
        arriveeA: arriveeDateTime,
        departA: departDateTime,
        enregistrePar: user?.userId,
      },
      include: {
        enfant: true,
      },
    });

    if (isFirstPresenceOfDay) {
      void this.notificationDispatcher
        .notifyPresenceFirstRecorded({
          enfantId,
          enfantPrenom: presence.enfant.prenom,
          enfantNom: presence.enfant.nom,
          dateYmd: date,
          statut,
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(`Email notification présence: ${msg}`);
        });
    }

    return {
      id: presence.id,
      date: presence.date.toISOString().split('T')[0],
      statut: presence.statut,
      enfant: {
        id: presence.enfant.id,
        prenom: presence.enfant.prenom,
        nom: presence.enfant.nom,
      },
      arriveeA: presence.arriveeA
        ? presence.arriveeA.toISOString().split('T')[1].substring(0, 5)
        : undefined,
      departA: presence.departA
        ? presence.departA.toISOString().split('T')[1].substring(0, 5)
        : undefined,
    };
  }

  /**
   * Enregistre les présences pour une classe entière
   */
  async recordClassPresences(
    classeId: string,
    date: string,
    presences: Array<{
      enfantId: string;
      statut: StatutPresence;
      arriveeA?: string;
      departA?: string;
    }>,
    user: UserContext,
  ): Promise<PresenceItemDto[]> {
    this.logger.log(`recordClassPresences - User: ${user.email} (${user.role}), userId: ${user.userId}, classeId: ${classeId}`);
    
    // Vérifier que l'enseignant a accès à cette classe
    const userRoleStr = String(user.role);
    if (userRoleStr === 'ENSEIGNANT' || user.role === RoleUtilisateur.ENSEIGNANT) {
      const classeIds = await this.getClasseIdsForTeacher(user.userId);
      this.logger.log(`Vérification accès classe ${classeId} pour enseignant ${user.userId} (${user.email}). Classes autorisées: ${classeIds.length > 0 ? classeIds.join(', ') : 'aucune'}`);
      
      if (classeIds.length === 0) {
        this.logger.error(`Aucune classe trouvée pour l'enseignant ${user.userId}. Vérifiez que l'enseignant est bien assigné à une classe.`);
        throw new ForbiddenException(
          'Aucune classe assignée. Veuillez contacter l\'administrateur.',
        );
      }
      
      if (!classeIds.includes(classeId)) {
        this.logger.warn(`Accès refusé: enseignant ${user.userId} n'a pas accès à la classe ${classeId}. Classes autorisées: ${classeIds.join(', ')}`);
        throw new ForbiddenException(
          `Vous n'avez pas accès à cette classe. Classes autorisées: ${classeIds.join(', ')}`,
        );
      }
      
      this.logger.log(`✅ Accès autorisé pour l'enseignant ${user.userId} à la classe ${classeId}`);
    }

    // Vérifier que la classe existe
    const classe = await this.prisma.classe.findUnique({
      where: { id: classeId },
    });

    if (!classe) {
      throw new BadRequestException('Classe non trouvée');
    }

    // Enregistrer les présences
    const results: PresenceItemDto[] = [];
    for (const p of presences) {
      const result = await this.createOrUpdatePresence(
        p.enfantId,
        date,
        p.statut,
        p.arriveeA,
        p.departA,
        user,
      );
      results.push(result);
    }

    this.logger.log(
      `${results.length} présences enregistrées pour la classe ${classeId} le ${date}`,
    );

    return results;
  }
}

