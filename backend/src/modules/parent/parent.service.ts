import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateParentMeDto, GetPresencesQueryDto, GetEventsQueryDto, CreateParentEnfantDto } from './dto';
import { EnfantsService } from '../enfants/enfants.service';
import { validateChildBirthdateForPolicy } from '../../common/child-age-policy';

@Injectable()
export class ParentService {
  private readonly logger = new Logger(ParentService.name);

  constructor(
    private prisma: PrismaService,
    private enfantsService: EnfantsService,
  ) {}

  private readonly profileInclude = {
    tuteur: {
      include: {
        famille: {
          include: {
            enfants: {
              where: { archivedAt: null },
              include: {
                classe: {
                  include: {
                    enseignants: {
                      include: {
                        enseignant: {
                          include: { utilisateur: true },
                        },
                      },
                    },
                    _count: { select: { enfants: { where: { archivedAt: null } } } },
                  },
                },
                delegations: true,
                profilSante: {
                  include: { allergies: true, intolerances: true },
                },
              },
            },
            tuteurs: true,
          },
        },
      },
    },
  } as const;

  private parentSelfAddChildEnabled(): boolean {
    return String(process.env.PARENT_SELF_ADD_CHILD_ENABLED || '').toLowerCase() === 'true';
  }

  private async assertCanAddChild(utilisateurId: string) {
    if (!this.parentSelfAddChildEnabled()) {
      throw new ForbiddenException("L'ajout d'enfant par le parent n'est pas activé.");
    }
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      include: { tuteur: true },
    });
    if (!utilisateur?.tuteur) {
      throw new NotFoundException('Tuteur non trouvé');
    }
    if (!utilisateur.tuteur.principal) {
      throw new ForbiddenException('Seul le tuteur principal peut ajouter un enfant.');
    }
    return utilisateur.tuteur;
  }

  private parseYmd(ymd: string): { y: number; mo: number; d: number } {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
    if (!m) throw new BadRequestException('Paramètre date invalide');
    return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
  }

  /** Début du jour calendaire UTC (YYYY-MM-DD). */
  private startOfUtcDayFromYmd(ymd: string): Date {
    const { y, mo, d } = this.parseYmd(ymd);
    return new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0));
  }

  /** Fin du jour calendaire UTC pour une date YYYY-MM-DD (aligné sur les `...T00:00:00.000Z` en base). */
  private endOfUtcDayFromYmd(ymd: string): Date {
    const { y, mo, d } = this.parseYmd(ymd);
    return new Date(Date.UTC(y, mo - 1, d, 23, 59, 59, 999));
  }

  private utcYmd(d: Date): string {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }

  private async loadUtilisateurWithProfile(utilisateurId: string) {
    return this.prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      include: this.profileInclude,
    });
  }

  /** Lie automatiquement un compte PARENT à son tuteur via l'email si possible. */
  private async ensureTuteurLinked(utilisateurId: string) {
    let utilisateur = await this.loadUtilisateurWithProfile(utilisateurId);
    if (!utilisateur) {
      return null;
    }
    if (utilisateur.tuteur) {
      return utilisateur;
    }

    const tuteur = await this.prisma.tuteur.findFirst({
      where: { email: { equals: utilisateur.email, mode: 'insensitive' } },
    });
    if (!tuteur) {
      return utilisateur;
    }

    await this.prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: { tuteurId: tuteur.id },
    });
    return this.loadUtilisateurWithProfile(utilisateurId);
  }

  private assertUtilisateurId(utilisateurId?: string | null): string {
    const id = typeof utilisateurId === 'string' ? utilisateurId.trim() : '';
    if (!id) {
      throw new BadRequestException('Identifiant utilisateur manquant');
    }
    return id;
  }

  private incompleteProfileResponse(
    utilisateur: {
      id: string;
      email: string;
      prenom?: string | null;
      nom?: string | null;
      langue?: string | null;
      telephone?: string | null;
    },
    message?: string,
  ) {
    return {
      id: utilisateur.id,
      email: utilisateur.email,
      prenom: utilisateur.prenom ?? '',
      nom: utilisateur.nom ?? '',
      telephone: utilisateur.telephone ?? null,
      adresse: null,
      langue: utilisateur.langue ?? 'fr',
      tuteurId: null,
      familleId: null,
      estTuteurPrincipal: false,
      peutAjouterEnfant: false,
      profilIncomplet: true,
      message:
        message ??
        "Votre compte parent n'est pas encore lié à un profil famille. Contactez l'administration.",
      enfants: [],
      tuteurs: [],
      enfantsArchives: [],
    };
  }

  private mapEnfantForProfile(e: any) {
    return {
      id: e.id,
      prenom: e.prenom,
      nom: e.nom,
      dateNaissance: e.dateNaissance,
      classeId: e.classeId ?? null,
      classeNom: e.classe?.nom ?? null,
      classeNiveau: e.classe?.niveau ?? null,
      classeNbEleves: e.classe?._count?.enfants ?? null,
      classeEnseignants: (e.classe?.enseignants ?? []).map((ec: any) => ({
        prenom: ec.enseignant?.utilisateur?.prenom ?? null,
        nom: ec.enseignant?.utilisateur?.nom ?? null,
      })),
      photoUrl: e.photoUrl ?? null,
      delegations: (e.delegations ?? []).map((d: any) => ({
        id: d.id,
        nom: d.nom,
        telephone: d.telephone,
        cin: d.cin,
        relation: d.relation,
      })),
      profilSante: e.profilSante
        ? {
            id: e.profilSante.id,
            medecin: e.profilSante.medecin ?? null,
            notes: e.profilSante.notes ?? null,
            restrictionAlimentaire: e.profilSante.restrictionAlimentaire ?? null,
            tags: Array.isArray(e.profilSante.tags) ? e.profilSante.tags : [],
            allergies: (e.profilSante.allergies ?? []).map((a: any) => ({
              id: a.id,
              nom: a.nom,
              severite: a.severite ?? null,
              notes: a.notes ?? null,
            })),
            intolerances: (e.profilSante.intolerances ?? []).map((i: any) => ({
              id: i.id,
              nom: i.nom,
              notes: i.notes ?? null,
            })),
          }
        : null,
    };
  }

  /**
   * Récupère les infos du tuteur connecté + ses enfants
   */
  async getMyProfile(utilisateurId: string) {
    const id = this.assertUtilisateurId(utilisateurId);

    try {
      const utilisateur = await this.ensureTuteurLinked(id);

      if (!utilisateur) {
        this.logger.warn(`GET /parent/me — utilisateur introuvable: ${id}`);
        throw new NotFoundException('Utilisateur non trouvé');
      }

      if (!utilisateur.tuteur) {
        this.logger.warn(
          `GET /parent/me — compte ${utilisateur.email} sans tuteur lié (tuteurId=${utilisateur.tuteurId ?? 'null'})`,
        );
        return this.incompleteProfileResponse(utilisateur);
      }

      const famille = utilisateur.tuteur.famille;
      const enfantsSource = famille?.enfants ?? [];
      const tuteursSource = famille?.tuteurs ?? [];

      let enfantsArchives: Array<{
        id: string;
        prenom: string;
        nom: string;
        dateNaissance: Date;
        archivedAt: Date | null;
        classeId: string | null;
        classe: { nom: string } | null;
      }> = [];

      if (utilisateur.tuteur.familleId) {
        enfantsArchives = await this.prisma.enfant.findMany({
          where: {
            familleId: utilisateur.tuteur.familleId,
            archivedAt: { not: null },
          },
          orderBy: { archivedAt: 'desc' },
          select: {
            id: true,
            prenom: true,
            nom: true,
            dateNaissance: true,
            archivedAt: true,
            classeId: true,
            classe: { select: { nom: true } },
          },
        });
      }

      this.logger.log(
        `GET /parent/me OK — ${utilisateur.email}, ${enfantsSource.length} enfant(s) actif(s)`,
      );

      return {
        id: utilisateur.id,
        email: utilisateur.email,
        prenom: utilisateur.tuteur.prenom ?? utilisateur.prenom ?? '',
        nom: utilisateur.tuteur.nom ?? utilisateur.nom ?? '',
        telephone: utilisateur.tuteur.telephone ?? null,
        adresse: utilisateur.tuteur.adresse ?? null,
        langue: utilisateur.langue,
        tuteurId: utilisateur.tuteur.id,
        familleId: utilisateur.tuteur.familleId,
        estTuteurPrincipal: utilisateur.tuteur.principal === true,
        peutAjouterEnfant:
          utilisateur.tuteur.principal === true && this.parentSelfAddChildEnabled(),
        profilIncomplet: false,
        enfants: enfantsSource.map((e) => this.mapEnfantForProfile(e)),
        tuteurs: tuteursSource.map((t) => ({
          id: t.id,
          prenom: t.prenom,
          nom: t.nom,
          telephone: t.telephone,
          adresse: t.adresse,
          email: t.email,
          lien: t.lien,
        })),
        enfantsArchives: enfantsArchives.map((e) => ({
          id: e.id,
          prenom: e.prenom,
          nom: e.nom,
          dateNaissance: e.dateNaissance,
          classeId: e.classeId,
          classeNom: e.classe?.nom ?? null,
          archivedAt: e.archivedAt,
          estArchive: true,
          lectureSeule: true,
        })),
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `GET /parent/me échec pour utilisateur ${id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Ajoute un enfant à la famille du tuteur principal (classe obligatoire).
   */
  async createMyChild(utilisateurId: string, dto: CreateParentEnfantDto) {
    const tuteur = await this.assertCanAddChild(utilisateurId);

    const prenom = dto.prenom?.trim();
    const nom = dto.nom?.trim();
    if (!prenom || !nom) {
      throw new BadRequestException('Le prénom et le nom sont obligatoires.');
    }
    if (!dto.classeId?.trim()) {
      throw new BadRequestException('La classe est obligatoire.');
    }

    const classe = await this.prisma.classe.findFirst({
      where: { id: dto.classeId, active: true },
      include: {
        _count: { select: { enfants: { where: { archivedAt: null } } } },
      },
    });
    if (!classe) {
      throw new BadRequestException('Classe invalide ou inactive.');
    }
    if (classe.capacite != null && classe._count.enfants >= classe.capacite) {
      throw new BadRequestException('Cette classe est complète.');
    }

    validateChildBirthdateForPolicy(dto.dateNaissance);

    const dateNaissance = new Date(`${dto.dateNaissance}T12:00:00.000Z`);
    const enfant = await this.enfantsService.createEnfant({
      prenom,
      nom,
      dateNaissance,
      genre: dto.genre?.trim() || null,
      famille: { connect: { id: tuteur.familleId } },
      classe: { connect: { id: classe.id } },
    });

    const withClasse = await this.prisma.enfant.findUnique({
      where: { id: enfant.id },
      include: {
        classe: {
          include: {
            enseignants: {
              include: { enseignant: { include: { utilisateur: true } } },
            },
            _count: { select: { enfants: { where: { archivedAt: null } } } },
          },
        },
      },
    });

    return {
      id: withClasse!.id,
      prenom: withClasse!.prenom,
      nom: withClasse!.nom,
      dateNaissance: withClasse!.dateNaissance,
      classeId: withClasse!.classeId,
      classeNom: withClasse!.classe?.nom ?? null,
      classeNiveau: withClasse!.classe?.niveau ?? null,
      classeNbEleves: withClasse!.classe?._count?.enfants ?? null,
      classeEnseignants: (withClasse!.classe?.enseignants ?? []).map((ec) => ({
        prenom: ec.enseignant?.utilisateur?.prenom ?? null,
        nom: ec.enseignant?.utilisateur?.nom ?? null,
      })),
      photoUrl: withClasse!.photoUrl ?? null,
    };
  }

  /**
   * Met à jour le profil du tuteur
   */
  async updateMyProfile(utilisateurId: string, dto: UpdateParentMeDto) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      include: { tuteur: true },
    });

    if (!utilisateur || !utilisateur.tuteur) {
      throw new NotFoundException('Tuteur non trouvé');
    }

    const updatedTuteur = await this.prisma.tuteur.update({
      where: { id: utilisateur.tuteur.id },
      data: {
        telephone: dto.telephone ?? utilisateur.tuteur.telephone,
        adresse: dto.adresse ?? utilisateur.tuteur.adresse,
      },
    });

    return {
      id: updatedTuteur.id,
      prenom: updatedTuteur.prenom,
      nom: updatedTuteur.nom,
      telephone: updatedTuteur.telephone,
      adresse: updatedTuteur.adresse,
    };
  }

  /**
   * Récupère les présences d'un enfant du tuteur
   */
  async getChildPresences(utilisateurId: string, enfantId: string, query: GetPresencesQueryDto) {
    // Vérifier que l'enfant appartient au tuteur
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      include: {
        tuteur: {
          include: {
            famille: {
              include: {
                enfants: {
                  where: { archivedAt: null },
                  include: {
                    classe: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!utilisateur?.tuteur) {
      throw new NotFoundException('Tuteur non trouvé');
    }

    const enfantBelongsToTuteur = (utilisateur.tuteur.famille?.enfants ?? []).some(
      (e) => e.id === enfantId,
    );
    if (!enfantBelongsToTuteur) {
      throw new ForbiddenException('Cet enfant ne vous appartient pas');
    }

    const page = query.page || 1;
    const pageSize = query.pageSize || 30;
    const skip = (page - 1) * pageSize;

    const where: any = { enfantId };
    if (query.dateMin) {
      const s = String(query.dateMin).trim();
      const gte =
        /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00.000Z`) : new Date(query.dateMin);
      where.date = { gte };
    }
    if (query.dateMax) {
      const s = String(query.dateMax).trim();
      // YYYY-MM-DD seul = minuit UTC, ce qui excluait le même jour après 00:00 UTC
      const lte = /^\d{4}-\d{2}-\d{2}$/.test(s)
        ? this.endOfUtcDayFromYmd(s)
        : new Date(query.dateMax);
      where.date = { ...where.date, lte };
    }

    const [presences, total] = await Promise.all([
      this.prisma.presence.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { date: 'desc' },
      }),
      this.prisma.presence.count({ where }),
    ]);

    return {
      data: presences.map((p) => ({
        id: p.id,
        date: p.date,
        statut: p.statut,
        arriveeA: p.arriveeA,
        departA: p.departA,
      })),
      pagination: {
        page,
        pageSize,
        total,
        hasNext: page * pageSize < total,
      },
    };
  }

  /**
   * Récupère le dernier résumé publié d'une classe
   */
  async getLatestClassJournal(utilisateurId: string, classeId: string, date?: string) {
    // Vérifier que l'utilisateur a un enfant dans cette classe
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      include: {
        tuteur: {
          include: {
            famille: {
              include: {
                enfants: {
                  where: { archivedAt: null },
                  include: {
                    classe: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!utilisateur?.tuteur) {
      return { empty: true as const, requestedDate: date?.trim() ?? null };
    }

    const enfants = utilisateur.tuteur.famille?.enfants ?? [];
    const hasChildInClass = enfants.some((e) => e.classeId === classeId);
    if (!hasChildInClass) {
      throw new ForbiddenException('Vous n\'avez pas d\'enfant dans cette classe');
    }

    // Brouillon + Publie : dès que l'enseignant enregistre le message du jour,
    // les parents le voient (sinon seul « Envoyer à tous » / publish les exposait).
    const where: any = {
      classeId,
      statut: { in: ['Brouillon', 'Publie'] },
    };

    let requestedYmd: string | undefined;
    if (date) {
      requestedYmd = date.trim();
      const startOfDay = this.startOfUtcDayFromYmd(requestedYmd);
      const endOfDay = this.endOfUtcDayFromYmd(requestedYmd);
      where.date = { gte: startOfDay, lte: endOfDay };
    }

    const journal = await this.prisma.classDailySummary.findFirst({
      where,
      orderBy: { date: 'desc' },
    });

    if (!journal) {
      return {
        empty: true as const,
        requestedDate: requestedYmd ?? null,
      };
    }

    const journalYmd = this.utcYmd(new Date(journal.date));
    const isFallback = requestedYmd ? journalYmd !== requestedYmd : false;

    return {
      id: journal.id,
      date: journal.date,
      activites: journal.activites,
      apprentissages: journal.apprentissages,
      humeurGroupe: journal.humeurGroupe,
      observations: journal.observations,
      publieLe: journal.publieLe,
      isFallback,
      requestedDate: requestedYmd ?? journalYmd,
    };
  }

  /**
   * Récupère les événements visibles pour le parent
   */
  async getMyEvents(utilisateurId: string, query: GetEventsQueryDto) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      include: {
        tuteur: {
          include: {
            famille: {
              include: {
                enfants: {
                  where: { archivedAt: null },
                  include: {
                    classe: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!utilisateur?.tuteur) {
      return {
        data: [],
        pagination: { page: query.page || 1, pageSize: query.pageSize || 20, total: 0, hasNext: false },
      };
    }

    const classeIds = (utilisateur.tuteur.famille?.enfants ?? [])
      .filter((e) => e.classeId)
      .map((e) => e.classeId as string);

    if (classeIds.length === 0) {
      return {
        data: [],
        pagination: { page: 1, pageSize: 20, total: 0, hasNext: false },
      };
    }

    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    let dateFrom: Date | null = null;
    if (query.dateFrom) {
      dateFrom = query.dateFrom === 'today' ? new Date() : new Date(query.dateFrom);
    }

    const where: any = {
      classeId: { in: classeIds },
      status: 'PUBLISHED',
    };

    if (dateFrom) {
      where.startAt = { gte: dateFrom };
    }

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { startAt: 'asc' },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: events.map((e) => ({
        id: e.id,
        titre: e.titre,
        description: e.description,
        startAt: e.startAt,
        endAt: e.endAt,
        classeId: e.classeId,
        cost: e.cost === null ? null : Number(e.cost),
        currency: e.currency,
      })),
      pagination: {
        page,
        pageSize,
        total,
        hasNext: page * pageSize < total,
      },
    };
  }

  /**
   * Récupère le menu du jour
   */
  async getClassMenuOfDay(utilisateurId: string, classeId: string, date?: string) {
    // Vérifier que l'utilisateur a un enfant dans cette classe
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      include: {
        tuteur: {
          include: {
            famille: {
              include: {
                enfants: { where: { archivedAt: null } },
              },
            },
          },
        },
      },
    });

    if (!utilisateur?.tuteur) {
      return {
        empty: true as const,
        requestedDate: date ?? null,
      };
    }

    const hasChildInClass = (utilisateur.tuteur.famille?.enfants ?? []).some(
      (e) => e.classeId === classeId,
    );
    if (!hasChildInClass) {
      throw new ForbiddenException('Vous n\'avez pas d\'enfant dans cette classe');
    }

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const menu = await this.prisma.menu.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        statut: 'Publie',
      },
    });

    if (!menu) {
      return {
        empty: true as const,
        requestedDate: date ?? null,
      };
    }

    return {
      id: menu.id,
      date: menu.date,
      // On expose des noms de champs adaptés au front (entree/plat/dessert)
      entree: (menu as any).collationMatin ?? null,
      plat: (menu as any).repas ?? null,
      dessert: (menu as any).gouter ?? null,
      statut: menu.statut,
      publieLe: menu.publieLe,
    };
  }

  /**
   * Récupère le résumé quotidien d'un enfant
   */
  async getChildDailyResume(utilisateurId: string, enfantId: string, date?: string) {
    // Vérifier que l'enfant appartient au tuteur
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      include: {
        tuteur: {
          include: {
            famille: {
              include: {
                enfants: { where: { archivedAt: null } },
              },
            },
          },
        },
      },
    });

    if (!utilisateur?.tuteur) {
      throw new NotFoundException('Tuteur non trouvé');
    }

    const enfantBelongsToTuteur = (utilisateur.tuteur.famille?.enfants ?? []).some(
      (e) => e.id === enfantId,
    );
    if (!enfantBelongsToTuteur) {
      throw new ForbiddenException('Cet enfant ne vous appartient pas');
    }

    const ymd =
      date && /^\d{4}-\d{2}-\d{2}$/.test(String(date).trim())
        ? String(date).trim()
        : this.utcYmd(new Date());
    const startOfRequestedDay = this.startOfUtcDayFromYmd(ymd);
    const endOfRequestedDay = this.endOfUtcDayFromYmd(ymd);

    // Jour calendaire UTC uniquement (pas de repli sur la veille — évite d’afficher « hier » pour « aujourd’hui »)
    const resume = await this.prisma.dailyResume.findFirst({
      where: {
        enfantId,
        date: { gte: startOfRequestedDay, lte: endOfRequestedDay },
      },
      orderBy: { date: 'desc' },
      include: { observations: true },
    });

    if (!resume) {
      return {
        empty: true as const,
        requestedDate: ymd,
      };
    }

    const resumeYmd = this.utcYmd(new Date(resume.date));
    const isFallback = resumeYmd !== ymd;

    return {
      id: resume.id,
      date: resume.date,
      humeur: resume.humeur,
      appetit: resume.appetit,
      sieste: resume.sieste,
      participation: resume.participation,
      observations: resume.observations.map((o) => o.observation),
      creeLe: resume.creeLe,
      modifieLe: resume.modifieLe,
      isFallback,
      requestedDate: ymd,
    };
  }

  // ─────────────────────────── SANTÉ ───────────────────────────

  private async assertChildBelongsToParent(utilisateurId: string, enfantId: string) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      include: { tuteur: { include: { famille: { include: { enfants: { where: { archivedAt: null } } } } } } },
    });
    if (!utilisateur?.tuteur) throw new NotFoundException('Tuteur non trouvé');
    const ok = (utilisateur.tuteur.famille?.enfants ?? []).some(
      (e) => String(e.id) === String(enfantId),
    );
    if (!ok) throw new ForbiddenException('Cet enfant ne vous appartient pas');
  }

  async getChildSante(utilisateurId: string, enfantId: string) {
    await this.assertChildBelongsToParent(utilisateurId, enfantId);
    const sante = await this.prisma.profilSante.findUnique({
      where: { enfantId },
      include: { allergies: true, intolerances: true, autorisations: true },
    });
    return sante ?? null;
  }

  async upsertChildSante(utilisateurId: string, enfantId: string, dto: any) {
    await this.assertChildBelongsToParent(utilisateurId, enfantId);

    const existing = await this.prisma.profilSante.findUnique({ where: { enfantId } });

    if (existing) {
      // Update scalar fields
      await this.prisma.profilSante.update({
        where: { enfantId },
        data: {
          medecin: dto.medecin !== undefined ? dto.medecin : existing.medecin,
          notes: dto.notes !== undefined ? dto.notes : existing.notes,
          restrictionAlimentaire: dto.restrictionAlimentaire !== undefined ? dto.restrictionAlimentaire : existing.restrictionAlimentaire,
          tags: dto.tags !== undefined ? dto.tags : existing.tags,
        },
      });

      // Replace allergies if provided
      if (dto.allergies !== undefined) {
        await this.prisma.allergie.deleteMany({ where: { profilSanteId: existing.id } });
        if (dto.allergies.length > 0) {
          await this.prisma.allergie.createMany({
            data: dto.allergies.map((a: any) => ({
              profilSanteId: existing.id,
              nom: a.nom,
              severite: a.severite ?? null,
              notes: a.notes ?? null,
            })),
          });
        }
      }

      // Replace intolerances if provided
      if (dto.intolerances !== undefined) {
        await this.prisma.intolerance.deleteMany({ where: { profilSanteId: existing.id } });
        if (dto.intolerances.length > 0) {
          await this.prisma.intolerance.createMany({
            data: dto.intolerances.map((i: any) => ({
              profilSanteId: existing.id,
              nom: i.nom,
              notes: i.notes ?? null,
            })),
          });
        }
      }
    } else {
      // Create new ProfilSante
      await this.prisma.profilSante.create({
        data: {
          enfantId,
          medecin: dto.medecin ?? null,
          notes: dto.notes ?? null,
          restrictionAlimentaire: dto.restrictionAlimentaire ?? null,
          tags: dto.tags ?? [],
          allergies: dto.allergies?.length
            ? { create: dto.allergies.map((a: any) => ({ nom: a.nom, severite: a.severite ?? null, notes: a.notes ?? null })) }
            : undefined,
          intolerances: dto.intolerances?.length
            ? { create: dto.intolerances.map((i: any) => ({ nom: i.nom, notes: i.notes ?? null })) }
            : undefined,
        },
      });
    }

    return this.getChildSante(utilisateurId, enfantId);
  }

  async deleteChildSante(utilisateurId: string, enfantId: string) {
    await this.assertChildBelongsToParent(utilisateurId, enfantId);
    const existing = await this.prisma.profilSante.findUnique({ where: { enfantId } });
    if (!existing) throw new NotFoundException('Profil santé non trouvé');
    // Cascade delete related records first
    await this.prisma.allergie.deleteMany({ where: { profilSanteId: existing.id } });
    await this.prisma.intolerance.deleteMany({ where: { profilSanteId: existing.id } });
    await this.prisma.autorisationMedicament.deleteMany({ where: { profilSanteId: existing.id } });
    await this.prisma.vaccination.deleteMany({ where: { profilSanteId: existing.id } });
    await this.prisma.profilSante.delete({ where: { enfantId } });
    return { message: 'Profil santé supprimé' };
  }

  // ─────────────────────────── DÉLÉGATIONS ───────────────────────────

  async addDelegation(utilisateurId: string, enfantId: string, dto: any) {
    await this.assertChildBelongsToParent(utilisateurId, enfantId);
    const delegation = await this.prisma.delegation.create({
      data: {
        enfantId,
        nom: dto.nom,
        telephone: dto.telephone,
        cin: dto.cin ?? '',
        relation: dto.relation ?? '',
      },
    });
    return delegation;
  }

  async updateDelegation(utilisateurId: string, enfantId: string, delegationId: string, dto: any) {
    await this.assertChildBelongsToParent(utilisateurId, enfantId);
    const existing = await this.prisma.delegation.findFirst({ where: { id: delegationId, enfantId } });
    if (!existing) throw new NotFoundException('Délégation non trouvée');
    return this.prisma.delegation.update({
      where: { id: delegationId },
      data: {
        nom: dto.nom ?? existing.nom,
        telephone: dto.telephone ?? existing.telephone,
        cin: dto.cin ?? existing.cin,
        relation: dto.relation ?? existing.relation,
      },
    });
  }

  async deleteDelegation(utilisateurId: string, enfantId: string, delegationId: string) {
    await this.assertChildBelongsToParent(utilisateurId, enfantId);
    const existing = await this.prisma.delegation.findFirst({ where: { id: delegationId, enfantId } });
    if (!existing) throw new NotFoundException('Délégation non trouvée');
    await this.prisma.delegation.delete({ where: { id: delegationId } });
    return { message: 'Délégation supprimée' };
  }
}

