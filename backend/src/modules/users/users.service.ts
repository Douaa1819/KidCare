/* eslint-disable prettier/prettier, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../common/services/email.service';
import { CreateUserDto, InviteTeacherDto, UpdateUserStatusDto, ListUsersQueryDto, UpdateTeacherProfileDto, UpdateEtablissementDto } from './dto/create-user.dto';
import { ArchiveParentDto, RestoreParentDto } from './dto/archive-parent.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  private normalizeEmail(email: string): string {
    return String(email ?? '').trim().toLowerCase();
  }

  private async assertEmailNotUsed(email: string) {
    const existing = await this.prisma.utilisateur.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(`Un utilisateur avec l'email ${email} existe déjà`);
    }
  }

  /**
   * Créer un utilisateur (enseignant ou parent)
   * Crée un Utilisateur avec le rôle spécifié et statut INVITED
   * Envoie une invitation Supabase et un email
   */
  async createUser(dto: CreateUserDto) {
    const email = this.normalizeEmail(dto.email);
    await this.assertEmailNotUsed(email);

    try {
      // Générer un mot de passe temporaire (plain text pour l'email)
      const tempPasswordPlain = this.generateTempPassword();
      const tempPasswordHashed = await bcrypt.hash(tempPasswordPlain, 10);

      // Créer l'utilisateur local
      const utilisateur = await this.prisma.utilisateur.create({
        data: {
          email,
          prenom: dto.prenom,
          nom: dto.nom,
          telephone: dto.telephone,
          role: dto.role as any,
          statut: 'INVITED',
          tempPassword: tempPasswordHashed,
          inviteLe: new Date(),
        },
      });

      // Envoyer l'email d'invitation avec le mot de passe plain text
      await this.emailService.sendInvitationEmail(
        utilisateur.email,
        utilisateur.prenom,
        utilisateur.nom,
        utilisateur.role,
        tempPasswordPlain,
      );

      this.logger.log(`Utilisateur créé et email envoyé: ${utilisateur.email} (${utilisateur.role})`);

      return {
        utilisateurId: utilisateur.id,
        email: utilisateur.email,
        role: utilisateur.role,
        statut: utilisateur.statut,
        invited: true,
        emailSent: true,
      };
    } catch (error) {
      this.logger.error(`Erreur création utilisateur: ${error.message}`);
      throw error;
    }
  }

  /**
   * Inviter un enseignant
   * Crée un Utilisateur avec rôle ENSEIGNANT et statut INVITED
   * Envoie une invitation Supabase et un email
   */
  async inviteTeacher(dto: InviteTeacherDto) {
    const email = this.normalizeEmail(dto.email);
    await this.assertEmailNotUsed(email);

    try {
      const tempPasswordPlain = this.generateTempPassword();
      const tempPasswordHashed = await bcrypt.hash(tempPasswordPlain, 10);

      const utilisateur = await this.prisma.utilisateur.create({
        data: {
          email,
          prenom: dto.prenom,
          nom: dto.nom,
          telephone: dto.telephone,
          role: 'ENSEIGNANT',
          statut: 'INVITED',
          tempPassword: tempPasswordHashed,
          inviteLe: new Date(),
        },
      });

      await this.emailService.sendInvitationEmail(
        utilisateur.email,
        utilisateur.prenom,
        utilisateur.nom,
        'ENSEIGNANT',
        tempPasswordPlain,
      );

      this.logger.log(`Enseignant invité et email envoyé: ${utilisateur.email}`);

      return {
        utilisateurId: utilisateur.id,
        email: utilisateur.email,
        statut: utilisateur.statut,
        invited: true,
        emailSent: true,
      };
    } catch (error) {
      this.logger.error(`Erreur invitation enseignant: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mettre à jour le statut d'un utilisateur
   */
  private assertAdminCannotManageSuperAdmin(callerRole: string | undefined, targetRole: string, action: string) {
    if (targetRole === 'SUPER_ADMIN') {
      throw new ForbiddenException(`Impossible de ${action} un Super Admin`);
    }
    if (callerRole !== 'SUPER_ADMIN' && targetRole === 'ADMIN') {
      throw new ForbiddenException(`Seul un Super Admin peut ${action} un administrateur`);
    }
  }

  async updateStatus(userId: string, dto: UpdateUserStatusDto, callerRole?: string) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
    });

    if (!utilisateur) {
      throw new NotFoundException(`Utilisateur ${userId} non trouvé`);
    }

    this.assertAdminCannotManageSuperAdmin(callerRole, utilisateur.role, 'modifier');

    const updated = await this.prisma.utilisateur.update({
      where: { id: userId },
      data: {
        statut: dto.statut as any,
        activeLe: dto.statut === 'ACTIVE' ? new Date() : utilisateur.activeLe,
        tempPassword:
          dto.statut === 'DISABLED' && utilisateur.statut === 'INVITED'
            ? null
            : utilisateur.tempPassword,
      },
    });

    this.logger.log(`Statut utilisateur ${userId} mis à jour: ${dto.statut}`);

    return updated;
  }

  async updateEmailNotifications(userId: string, enabled: boolean) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
    });

    if (!utilisateur) {
      throw new NotFoundException(`Utilisateur ${userId} non trouvé`);
    }

    const updated = await this.prisma.utilisateur.update({
      where: { id: userId },
      data: { emailNotificationsEnabled: enabled },
      select: {
        id: true,
        email: true,
        role: true,
        emailNotificationsEnabled: true,
      },
    });

    this.logger.log(
      `Notifications email utilisateur ${userId}: ${enabled ? 'activées' : 'désactivées'}`,
    );

    return updated;
  }

  /**
   * Lister les utilisateurs avec filtres
   */
  async listUsers(query: ListUsersQueryDto, callerRole?: string) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where: any = {
      archivedAt: null,
      deletedAt: null,
    };

    const protectedRoles = ['SUPER_ADMIN', 'ADMIN'] as const;
    if (callerRole !== 'SUPER_ADMIN') {
      if (query.role && protectedRoles.includes(query.role as (typeof protectedRoles)[number])) {
        return {
          data: [],
          pagination: { page, limit, total: 0, pages: 0 },
        };
      }
      where.role = query.role ?? { notIn: [...protectedRoles] };
    } else if (query.role) {
      where.role = query.role;
    }

    if (query.statut) {
      where.statut = query.statut;
    }

    if (query.q) {
      const q = String(query.q).trim().slice(0, 120);
      if (q) {
        where.OR = [
          { email: { contains: q, mode: 'insensitive' } },
          { prenom: { contains: q, mode: 'insensitive' } },
          { nom: { contains: q, mode: 'insensitive' } },
        ];
      }
    }

    const [utilisateurs, total] = await Promise.all([
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
          langue: true,
          emailNotificationsEnabled: true,
          dernierAcces: true,
          creeLe: true,
          inviteLe: true,
          activeLe: true,
          enseignantId: true,
          tuteurId: true,
        },
      }),
      this.prisma.utilisateur.count({ where }),
    ]);

    return {
      data: utilisateurs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtenir un utilisateur par ID
   */
  async findById(id: string, callerRole?: string) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        telephone: true,
        prenom: true,
        nom: true,
        langue: true,
        role: true,
        statut: true,
        emailNotificationsEnabled: true,
        notesAdmin: true,
        dernierAcces: true,
        creeLe: true,
        modifieLe: true,
        tuteur: {
          select: {
            id: true,
            familleId: true,
            lien: true,
            prenom: true,
            nom: true,
            telephone: true,
            adresse: true,
            email: true,
            principal: true,
            famille: {
              select: {
                id: true,
                emailPrincipal: true,
                languePreferee: true,
                adresseFacturation: true,
                enfants: {
                  where: { archivedAt: null },
                  select: {
                    id: true,
                    prenom: true,
                    nom: true,
                    dateNaissance: true,
                    genre: true,
                    photoUrl: true,
                    intolerances: true,
                    sansRestriction: true,
                    remarques: true,
                    profilSante: {
                      select: {
                        tags: true,
                        allergies: {
                          select: {
                            id: true,
                            nom: true,
                            severite: true,
                            notes: true,
                          },
                        },
                        intolerances: {
                          select: {
                            id: true,
                            nom: true,
                            notes: true,
                          },
                        },
                      },
                    },
                    classeId: true,
                    classe: {
                      select: {
                        id: true,
                        nom: true,
                        niveau: true,
                        enseignants: {
                          where: { dateFin: null },
                          select: {
                            enseignant: {
                              select: {
                                id: true,
                                utilisateur: {
                                  select: {
                                    id: true,
                                    prenom: true,
                                    nom: true,
                                    email: true,
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    inscriptions: {
                      orderBy: { createdAt: 'desc' as const },
                      take: 1,
                      select: {
                        id: true,
                        statut: true,
                        payload: true,
                        createdAt: true,
                      },
                    },
                  },
                },
                tuteurs: {
                  select: {
                    id: true,
                    lien: true,
                    prenom: true,
                    nom: true,
                    telephone: true,
                    adresse: true,
                    email: true,
                    principal: true,
                    utilisateur: {
                      select: {
                        id: true,
                        telephone: true,
                        email: true,
                        statut: true,
                      },
                    },
                  },
                },
                inscriptions: {
                  orderBy: { createdAt: 'desc' as const },
                  take: 10,
                  select: {
                    id: true,
                    enfantId: true,
                    statut: true,
                    payload: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        },
        enseignant: {
          select: {
            id: true,
            fonction: true,
            specialite: true,
            classes: {
              select: {
                classe: {
                  select: {
                    id: true,
                    nom: true,
                    niveau: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!utilisateur) {
      throw new NotFoundException(`Utilisateur ${id} non trouvé`);
    }

    this.assertAdminCannotManageSuperAdmin(callerRole, utilisateur.role, 'consulter');

    return utilisateur;
  }

  /**
   * Obtenir un utilisateur par email
   */
  async findByEmail(email: string) {
    return this.prisma.utilisateur.findUnique({
      where: { email },
      include: {
        tuteur: true,
      },
    });
  }

  private isActiveGuardianUtilisateur(u: {
    statut: string;
    archivedAt: Date | null;
    deletedAt: Date | null;
  } | null | undefined): boolean {
    if (!u || u.deletedAt) return false;
    if (u.archivedAt) return false;
    return u.statut === 'ACTIVE' || u.statut === 'INVITED';
  }

  private async loadParentForArchive(userId: string) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
      include: {
        tuteur: {
          include: {
            famille: {
              include: {
                enfants: {
                  where: { archivedAt: null },
                  select: {
                    id: true,
                    prenom: true,
                    nom: true,
                    dateNaissance: true,
                    classeId: true,
                    classe: { select: { id: true, nom: true } },
                  },
                },
                tuteurs: {
                  include: {
                    utilisateur: {
                      select: {
                        id: true,
                        prenom: true,
                        nom: true,
                        email: true,
                        statut: true,
                        archivedAt: true,
                        deletedAt: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!utilisateur) {
      throw new NotFoundException(`Utilisateur ${userId} non trouvé`);
    }
    if (utilisateur.role !== 'PARENT') {
      throw new BadRequestException('Cette action est réservée aux comptes parent');
    }
    if (!utilisateur.tuteur) {
      throw new BadRequestException('Ce compte parent n\'est lié à aucun tuteur');
    }
    if (utilisateur.archivedAt || utilisateur.statut === 'ARCHIVED') {
      throw new BadRequestException('Ce compte parent est déjà archivé');
    }

    return utilisateur;
  }

  private otherActiveGuardiansForChild(
    familleTuteurs: Array<{
      id: string;
      prenom: string | null;
      nom: string | null;
      utilisateur: {
        id: string;
        prenom: string;
        nom: string;
        email: string;
        statut: string;
        archivedAt: Date | null;
        deletedAt: Date | null;
      } | null;
    }>,
    excludeTuteurId: string,
    excludeUtilisateurId: string,
  ) {
    return familleTuteurs
      .filter((t) => t.id !== excludeTuteurId)
      .filter((t) => t.utilisateur?.id !== excludeUtilisateurId)
      .filter((t) => this.isActiveGuardianUtilisateur(t.utilisateur))
      .map((t) => ({
        tuteurId: t.id,
        utilisateurId: t.utilisateur!.id,
        prenom: t.utilisateur!.prenom,
        nom: t.utilisateur!.nom,
        email: t.utilisateur!.email,
      }));
  }

  async getParentArchivePreview(userId: string, callerRole?: string) {
    const utilisateur = await this.loadParentForArchive(userId);
    this.assertAdminCannotManageSuperAdmin(callerRole, utilisateur.role, 'archiver');

    const famille = utilisateur.tuteur!.famille;
    const children = famille.enfants.map((enfant) => {
      const otherGuardians = this.otherActiveGuardiansForChild(
        famille.tuteurs,
        utilisateur.tuteur!.id,
        utilisateur.id,
      );
      return {
        id: enfant.id,
        prenom: enfant.prenom,
        nom: enfant.nom,
        dateNaissance: enfant.dateNaissance,
        classeId: enfant.classeId,
        classeNom: enfant.classe?.nom ?? null,
        hasOtherActiveGuardian: otherGuardians.length > 0,
        otherGuardians,
        archiveByDefault: otherGuardians.length === 0,
      };
    });

    return {
      parent: {
        id: utilisateur.id,
        email: utilisateur.email,
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
      },
      children,
    };
  }

  async archiveParent(
    userId: string,
    dto: ArchiveParentDto,
    archivedByUserId: string,
    callerRole?: string,
  ) {
    const utilisateur = await this.loadParentForArchive(userId);
    this.assertAdminCannotManageSuperAdmin(callerRole, utilisateur.role, 'archiver');

    const archiveLinkedChildren = dto.archiveLinkedChildren === true;
    const confirmedChildIds = new Set(dto.confirmedChildIds ?? []);
    const famille = utilisateur.tuteur!.famille;
    const now = new Date();
    const archivedChildIds: string[] = [];
    const skippedChildIds: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      await tx.utilisateur.update({
        where: { id: userId },
        data: {
          statut: 'ARCHIVED',
          archivedAt: now,
          tempPassword: null,
          sessionRevokedAt: now,
        },
      });

      await tx.userSession.updateMany({
        where: { utilisateurId: userId, revoked: false },
        data: { revoked: true },
      });

      if (archiveLinkedChildren) {
        for (const enfant of famille.enfants) {
          const otherGuardians = this.otherActiveGuardiansForChild(
            famille.tuteurs,
            utilisateur.tuteur!.id,
            utilisateur.id,
          );
          const shouldArchive =
            otherGuardians.length === 0 || confirmedChildIds.has(enfant.id);

          if (shouldArchive) {
            await tx.enfant.update({
              where: { id: enfant.id },
              data: { archivedAt: now, archivedBy: archivedByUserId },
            });
            archivedChildIds.push(enfant.id);
          } else {
            skippedChildIds.push(enfant.id);
          }
        }
      }
    });

    this.logger.log(
      `Parent ${userId} archivé — enfants archivés: ${archivedChildIds.length}, ignorés: ${skippedChildIds.length}`,
    );

    return {
      message: 'Compte parent archivé',
      id: userId,
      archivedChildren: archivedChildIds.length,
      skippedChildren: skippedChildIds.length,
      archivedChildIds,
      skippedChildIds,
    };
  }

  async restoreParent(userId: string, dto: RestoreParentDto, callerRole?: string) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
      include: {
        tuteur: {
          include: {
            famille: {
              include: {
                enfants: {
                  where: { archivedAt: { not: null } },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!utilisateur) {
      throw new NotFoundException(`Utilisateur ${userId} non trouvé`);
    }
    if (utilisateur.role !== 'PARENT') {
      throw new BadRequestException('Cette action est réservée aux comptes parent');
    }
    if (!utilisateur.archivedAt && utilisateur.statut !== 'ARCHIVED') {
      throw new BadRequestException('Ce compte parent n\'est pas archivé');
    }

    this.assertAdminCannotManageSuperAdmin(callerRole, utilisateur.role, 'restaurer');

    const restoreChildren = dto.restoreChildren === true;
    const restoredChildIds: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      await tx.utilisateur.update({
        where: { id: userId },
        data: {
          statut: 'ACTIVE',
          archivedAt: null,
          activeLe: utilisateur.activeLe ?? new Date(),
        },
      });

      if (restoreChildren && utilisateur.tuteur?.famille) {
        for (const enfant of utilisateur.tuteur.famille.enfants) {
          await tx.enfant.update({
            where: { id: enfant.id },
            data: { archivedAt: null, archivedBy: null },
          });
          restoredChildIds.push(enfant.id);
        }
      }
    });

    this.logger.log(
      `Parent ${userId} restauré — enfants restaurés: ${restoredChildIds.length}`,
    );

    return {
      message: 'Compte parent restauré',
      id: userId,
      restoredChildren: restoredChildIds.length,
      restoredChildIds,
    };
  }

  /**
   * Supprimer un utilisateur
   * - PARENT : interdit — utiliser l'archivage.
   * - ENSEIGNANT/ADMIN : suppression définitive du compte.
   */
  async deleteUser(userId: string, callerRole?: string) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
      include: {
        tuteur: {
          include: {
            famille: {
              include: {
                enfants: true,
                tuteurs: true,
              },
            },
          },
        },
      },
    });

    if (!utilisateur) {
      throw new NotFoundException(`Utilisateur ${userId} non trouvé`);
    }

    this.assertAdminCannotManageSuperAdmin(callerRole, utilisateur.role, 'supprimer');

    if (utilisateur.role === 'PARENT') {
      throw new BadRequestException(
        'Utilisez l\'archivage pour les comptes parent (pas de suppression définitive)',
      );
    }

    await this.prisma.utilisateur.delete({
      where: { id: userId },
    });

    this.logger.log(`Utilisateur ${userId} (${utilisateur.role}) supprimé définitivement`);

    return {
      message: 'Utilisateur supprimé avec succès',
      id: userId,
    };
  }

  /**
   * Assigner un enseignant à une classe
   */
  async assignTeacherToClass(utilisateurId: string, classeId: string) {
    // Vérifier que l'utilisateur existe et est un enseignant
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      include: { enseignant: true },
    });

    if (!utilisateur) {
      throw new NotFoundException(`Utilisateur ${utilisateurId} non trouvé`);
    }

    if (utilisateur.role !== 'ENSEIGNANT') {
      throw new BadRequestException('L\'utilisateur doit être un enseignant');
    }

    // Vérifier que la classe existe
    const classe = await this.prisma.classe.findUnique({
      where: { id: classeId },
    });

    if (!classe) {
      throw new NotFoundException(`Classe ${classeId} non trouvée`);
    }

    // Créer l'Enseignant s'il n'existe pas
    let enseignant = utilisateur.enseignant;
    if (!enseignant) {
      enseignant = await this.prisma.enseignant.create({
        data: {
          utilisateur: {
            connect: { id: utilisateurId },
          },
        },
      });

      // Mettre à jour l'utilisateur avec l'enseignantId
      await this.prisma.utilisateur.update({
        where: { id: utilisateurId },
        data: { enseignantId: enseignant.id },
      });
    }

    // Assigner la classe
    const assignment = await this.prisma.enseignantClasse.upsert({
      where: {
        enseignantId_classeId: {
          enseignantId: enseignant.id,
          classeId,
        },
      },
      create: {
        enseignantId: enseignant.id,
        classeId,
      },
      update: {
        dateFin: null, // Réactiver si désactivé
      },
      include: {
        classe: true,
      },
    });

    this.logger.log(
      `Enseignant ${utilisateur.email} assigné à la classe ${classe.nom}`,
    );

    return {
      message: 'Enseignant assigné à la classe avec succès',
      enseignantId: enseignant.id,
      utilisateurId,
      classeId,
      classe: assignment.classe,
    };
  }

  /**
   * Mettre à jour le profil d'un enseignant (fonction, specialite, telephone, prenom, nom)
   */
  async updateTeacherProfile(utilisateurId: string, dto: UpdateTeacherProfileDto, callerRole?: string) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      include: { enseignant: true },
    });

    if (!utilisateur) {
      throw new NotFoundException(`Utilisateur ${utilisateurId} non trouvé`);
    }

    this.assertAdminCannotManageSuperAdmin(callerRole, utilisateur.role, 'modifier');

    // Mise à jour des champs Utilisateur
    const userUpdateData: any = {};
    if (dto.prenom !== undefined) userUpdateData.prenom = dto.prenom;
    if (dto.nom !== undefined) userUpdateData.nom = dto.nom;
    if (dto.telephone !== undefined) userUpdateData.telephone = dto.telephone;
    if (dto.notesAdmin !== undefined) userUpdateData.notesAdmin = dto.notesAdmin || null;

    if (Object.keys(userUpdateData).length > 0) {
      await this.prisma.utilisateur.update({
        where: { id: utilisateurId },
        data: userUpdateData,
      });
    }

    // Mise à jour des champs Enseignant si l'utilisateur est ENSEIGNANT
    if (utilisateur.role === 'ENSEIGNANT' && (dto.fonction !== undefined || dto.specialite !== undefined)) {
      if (!utilisateur.enseignant) {
        // Créer l'Enseignant s'il n'existe pas encore
        const enseignant = await this.prisma.enseignant.create({
          data: { utilisateur: { connect: { id: utilisateurId } } },
        });
        await this.prisma.utilisateur.update({
          where: { id: utilisateurId },
          data: { enseignantId: enseignant.id },
        });
        await this.prisma.enseignant.update({
          where: { id: enseignant.id },
          data: {
            ...(dto.fonction !== undefined && { fonction: dto.fonction }),
            ...(dto.specialite !== undefined && { specialite: dto.specialite }),
          },
        });
      } else {
        await this.prisma.enseignant.update({
          where: { id: utilisateur.enseignant.id },
          data: {
            ...(dto.fonction !== undefined && { fonction: dto.fonction }),
            ...(dto.specialite !== undefined && { specialite: dto.specialite }),
          },
        });
      }
    }

    this.logger.log(`Profil enseignant mis à jour: ${utilisateurId}`);
    return this.findById(utilisateurId);
  }

  // ── Établissement ──────────────────────────────────────────────────────────

  async getEtablissement() {
    const record = await this.prisma.etablissementInfo.findUnique({
      where: { id: 'singleton' },
    });
    return record ?? {
      id: 'singleton',
      nom: '',
      adresse: '',
      telephone: '',
      email: '',
      siteWeb: null,
      description: null,
      horaires: null,
      capacite: null,
      modifiePar: null,
      modifieLe: new Date(),
    };
  }

  async updateEtablissement(dto: UpdateEtablissementDto, adminId?: string) {
    const data: any = { ...dto };
    if (adminId) data.modifiePar = adminId;
    const record = await this.prisma.etablissementInfo.upsert({
      where: { id: 'singleton' },
      update: data,
      create: { id: 'singleton', nom: '', adresse: '', telephone: '', email: '', ...data },
    });
    this.logger.log(`EtablissementInfo mis à jour par ${adminId ?? 'inconnu'}`);
    return record;
  }

  /**
   * Générer un mot de passe temporaire cryptographiquement sécurisé
   */
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

