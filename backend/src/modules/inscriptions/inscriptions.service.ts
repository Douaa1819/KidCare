import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInscriptionDto, ListInscriptionsQueryDto, UpdateInscriptionStatusDto } from './dto/create-inscription.dto';
import { EmailService } from '../../common/services/email.service';
import {
  extractAllInscriptionParentContacts,
  extractInscriptionParentContact,
  extractEnfantFromPayload,
  auditContextFromRequest,
  getAdminNotificationEmail,
} from '../../common/services/inscription-email.helpers';
import { validateChildBirthdateForPolicy } from '../../common/child-age-policy';
import { AuditService } from '../platform/audit.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

/**
 * Service pour gérer les inscriptions publiques
 * Crée en une transaction atomique : Famille (upsert), Tuteur(s), Enfant, Inscription
 */
@Injectable()
export class InscriptionsService {
  private readonly logger = new Logger(InscriptionsService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  /**
   * Crée une nouvelle inscription (candidature)
   * Transaction atomique : sauvegarde le payload complet et crée l'inscription
   *
   * @param dto Données d'inscription
   * @returns { applicationId, statut }
   */
  async apply(dto: CreateInscriptionDto) {
    try {
      const payload = dto as any;
      if (payload.enfant?.dateNaissance) {
        validateChildBirthdateForPolicy(payload.enfant.dateNaissance);
      }

      // Créer l'inscription avec le payload complet
      const inscription = await this.prisma.inscription.create({
        data: {
          statut: 'CANDIDATURE',
          payload,
          notes: null,
        },
      });

      this.logger.log(
        `Inscription créée: applicationId=${inscription.id}, statut=CANDIDATURE`,
      );

      const contacts = extractAllInscriptionParentContacts(payload);
      if (contacts.length > 0) {
        const errors: string[] = [];
        let sentCount = 0;

        for (const contact of contacts) {
          const emailResult = await this.emailService.sendInscriptionConfirmationEmail({
            email: contact.email,
            parentName: contact.parentName,
            childName: contact.enfantFullName,
            applicationId: inscription.id,
            locale: contact.locale,
          });
          if (emailResult.sent) {
            sentCount += 1;
          } else {
            errors.push(`${contact.email}: ${emailResult.error ?? 'EMAIL_SEND_FAILED'}`);
          }
        }

        await this.prisma.inscription.update({
          where: { id: inscription.id },
          data:
            errors.length === 0
              ? {
                  confirmationEmailSentAt: new Date(),
                  confirmationEmailError: null,
                }
              : {
                  confirmationEmailError: errors.join('; '),
                  ...(sentCount > 0 ? { confirmationEmailSentAt: new Date() } : {}),
                },
        });
      } else {
        this.logger.warn(
          `⚠️ Aucun email trouvé dans le payload — pas d'email de confirmation (inscription ${inscription.id})`,
        );
        await this.prisma.inscription.update({
          where: { id: inscription.id },
          data: { confirmationEmailError: 'NO_PARENT_EMAIL' },
        });
      }

      const principal = extractInscriptionParentContact(payload);
      const enfant = extractEnfantFromPayload(payload);
      const adminEmail = getAdminNotificationEmail(this.configService);
      if (adminEmail && principal) {
        try {
          await this.emailService.sendAdminNewInscriptionEmail({
            adminEmail,
            parentPrenom: principal.prenom,
            parentNom: principal.nom,
            enfantPrenom: enfant.prenom,
            enfantNom: enfant.nom,
            parentEmail: principal.email,
          });
        } catch (adminMailError) {
          this.logger.error(
            `❌ Erreur notification admin inscription: ${adminMailError instanceof Error ? adminMailError.message : 'Unknown'}`,
          );
        }
      }

      const updated = await this.prisma.inscription.findUnique({ where: { id: inscription.id } });

      return {
        applicationId: inscription.id,
        statut: inscription.statut,
        confirmationEmailSent: Boolean(updated?.confirmationEmailSentAt),
        confirmationEmailError: updated?.confirmationEmailError ?? null,
      };
    } catch (error) {
      this.logger.error(
        `Erreur lors de la création d'inscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException(
        'Erreur lors de la création de l\'inscription',
      );
    }
  }

  /**
   * Lister les inscriptions avec filtres et pagination
   */
  async listInscriptions(query: ListInscriptionsQueryDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 25;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (query.statut) {
      where.statut = query.statut;
    }

    if (query.dateMin || query.dateMax) {
      where.createdAt = {};
      if (query.dateMin) {
        where.createdAt.gte = new Date(query.dateMin);
      }
      if (query.dateMax) {
        where.createdAt.lte = new Date(query.dateMax);
      }
    }

    // Recherche dans le payload
    if (query.q) {
      // Note: La recherche full-text sur JSON n'est pas directement supportée
      // On récupère tous et on filtre en mémoire
      const allInscriptions = await this.prisma.inscription.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      });

      const filtered = allInscriptions.filter((insc) => {
        const payload = insc.payload as any;
        const searchStr = query.q?.toLowerCase() || '';
        return (
          payload?.enfant?.nom?.toLowerCase().includes(searchStr) ||
          payload?.enfant?.prenom?.toLowerCase().includes(searchStr) ||
          payload?.mere?.email?.toLowerCase().includes(searchStr) ||
          payload?.pere?.email?.toLowerCase().includes(searchStr)
        );
      });

      const total = filtered.length;
      return {
        items: filtered.map((insc) => this.formatInscriptionResponse(insc)),
        page,
        pageSize,
        total,
        hasNext: skip + pageSize < total,
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.inscription.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inscription.count({ where }),
    ]);

    return {
      items: items.map((insc) => this.formatInscriptionResponse(insc)),
      page,
      pageSize,
      total,
      hasNext: skip + pageSize < total,
    };
  }

  /**
   * Récupérer une inscription par ID
   */
  async getInscriptionById(id: string) {
    const inscription = await this.prisma.inscription.findUnique({
      where: { id },
    });

    if (!inscription) {
      throw new NotFoundException(`Inscription ${id} non trouvée`);
    }

    return this.formatInscriptionResponse(inscription);
  }

  /**
   * Mettre à jour le statut d'une inscription
   */
  async updateInscriptionStatus(id: string, dto: UpdateInscriptionStatusDto) {
    const inscription = await this.prisma.inscription.findUnique({
      where: { id },
    });

    if (!inscription) {
      throw new NotFoundException(`Inscription ${id} non trouvée`);
    }

    // Vérifier les transitions autorisées
    const validTransitions: Record<string, string[]> = {
      CANDIDATURE: ['EN_COURS', 'ACTIF', 'REJETEE'],
      EN_COURS: ['ACTIF', 'REJETEE'],
      ACTIF: [],
      REJETEE: [],
    };

    if (!validTransitions[inscription.statut]?.includes(dto.statut)) {
      throw new ConflictException(
        `Transition invalide: ${inscription.statut} -> ${dto.statut}`,
      );
    }

    if (
      dto.statut === 'ACTIF' &&
      (!inscription.familleId || !inscription.enfantId)
    ) {
      throw new BadRequestException(
        'Utilisez « Accepter » pour provisionner la famille avant de passer en ACTIF.',
      );
    }

    const updated = await this.prisma.inscription.update({
      where: { id },
      data: {
        statut: dto.statut as any,
        notes: dto.notes || inscription.notes,
      },
    });

    return this.formatInscriptionResponse(updated);
  }

  /**
   * Rejeter une inscription
   */
  async rejectInscription(
    id: string,
    raison?: string,
    req?: { user?: { userId?: string; email?: string }; ip?: string; headers?: Record<string, string | string[] | undefined> },
  ) {
    const inscription = await this.prisma.inscription.findUnique({
      where: { id },
    });

    if (!inscription) {
      throw new NotFoundException(`Inscription ${id} non trouvée`);
    }

    if (inscription.statut === 'REJETEE' || inscription.statut === 'ACTIF') {
      throw new ConflictException(
        `Impossible de rejeter une inscription avec le statut ${inscription.statut}`,
      );
    }

    const updated = await this.prisma.inscription.update({
      where: { id },
      data: {
        statut: 'REJETEE',
        notes: raison,
      },
    });

    const auditCtx = auditContextFromRequest(req);
    await this.auditService.log('inscription.refused', auditCtx, 'Inscription', id, {
      raison: raison?.trim() || undefined,
    });

    const payload = inscription.payload as Record<string, unknown>;
    const parent = extractInscriptionParentContact(payload);
    const enfant = extractEnfantFromPayload(payload);
    let emailSent = false;

    if (parent) {
      emailSent = await this.emailService.sendInscriptionRejectedEmail({
        email: parent.email,
        parentPrenom: parent.prenom,
        parentNom: parent.nom,
        enfantPrenom: enfant.prenom,
        enfantNom: enfant.nom,
        raison: raison?.trim() || undefined,
        locale: parent.locale,
      });

      await this.auditService.log(
        emailSent ? 'email.sent' : 'email.failed',
        auditCtx,
        'Inscription',
        id,
        { type: 'inscription.rejected', to: parent.email },
      );
    } else {
      this.logger.warn(`Refus inscription ${id} : aucun email parent dans le payload`);
      await this.auditService.log('email.failed', auditCtx, 'Inscription', id, {
        type: 'inscription.rejected',
        reason: 'no_parent_email',
      });
    }

    return {
      ...this.formatInscriptionResponse(updated),
      emailSent: parent ? emailSent : false,
    };
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

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /** Normalise mere/pere (legacy) et tuteurs[] pour le provisionnement. */
  private extractTuteursFromPayload(payload: Record<string, unknown>): any[] {
    const raw = payload?.tuteurs;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw;
    }

    const legacy: any[] = [];
    const mere = payload?.mere as Record<string, unknown> | undefined;
    const pere = payload?.pere as Record<string, unknown> | undefined;

    if (mere && (mere.email || mere.prenom || mere.nom)) {
      legacy.push({
        lien: 'Mere',
        prenom: mere.prenom,
        nom: mere.nom,
        email: mere.email,
        telephone: mere.telephone,
        adresse: mere.adresse,
        principal: true,
      });
    }
    if (pere && (pere.email || pere.prenom || pere.nom)) {
      legacy.push({
        lien: 'Pere',
        prenom: pere.prenom,
        nom: pere.nom,
        email: pere.email,
        telephone: pere.telephone,
        adresse: pere.adresse,
        principal: legacy.length === 0,
      });
    }

    return legacy;
  }

  /**
   * Accepter et provisionner une inscription
   * Crée Famille, Tuteur(s), Enfant, Utilisateur(s) PARENT et envoie les emails
   */
  async acceptAndProvisionInscription(id: string, user: any) {
    const inscription = await this.prisma.inscription.findUnique({
      where: { id },
    });

    if (!inscription) {
      throw new NotFoundException(`Inscription ${id} non trouvée`);
    }

    if (inscription.statut !== 'CANDIDATURE' && inscription.statut !== 'EN_COURS') {
      throw new ConflictException(
        `Impossible d'accepter une inscription avec le statut ${inscription.statut}`,
      );
    }

    const rawPayload = inscription.payload as any;
    const tuteursPayload = this.extractTuteursFromPayload(rawPayload);
    const payload = { ...rawPayload, tuteurs: tuteursPayload } as any;

    const tuteurAvecEmail = tuteursPayload.find((t) => t.email);
    if (!tuteurAvecEmail) {
      throw new BadRequestException('Aucun tuteur avec email trouvé dans le payload');
    }

    if (!payload.enfant?.prenom || !payload.enfant?.nom) {
      throw new BadRequestException('Informations enfant incomplètes dans le dossier');
    }

    const hasPrincipal = tuteursPayload.some((t) => Boolean(t.principal));
    if (!hasPrincipal && tuteursPayload.length > 0) {
      tuteursPayload[0].principal = true;
    }

    this.logger.log(
      `Acceptation inscription ${id} — ${tuteursPayload.length} tuteur(s), enfant ${payload.enfant.prenom} ${payload.enfant.nom}`,
    );

    const classeIdSouhaitee =
      typeof payload.classeIdSouhaitee === 'string'
        ? payload.classeIdSouhaitee.trim()
        : '';

    // Transaction atomique
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Créer ou récupérer la famille
      const emailPrincipal = this.normalizeEmail(String(tuteurAvecEmail.email));
      const famille = await tx.famille.upsert({
        where: { emailPrincipal },
        update: {},
        create: {
          emailPrincipal,
          languePreferee: payload.famille?.languePreferee || 'fr',
          adresseFacturation: payload.famille?.adresseFacturation,
        },
      });

      // 2. Créer/mettre à jour les tuteurs
      const tuteurs: any[] = [];
      const emailsToInvite: Array<{ email: string; prenom: string; nom: string; tuteurId: string }> = [];

      for (const tuteurData of tuteursPayload) {
        if (!tuteurData.email) continue;

        const tuteurEmail = this.normalizeEmail(String(tuteurData.email));
        let tuteur = await tx.tuteur.findFirst({
          where: { email: { equals: tuteurEmail, mode: 'insensitive' } },
        });

        if (tuteur) {
          tuteur = await tx.tuteur.update({
            where: { id: tuteur.id },
            data: {
              familleId: famille.id,
              lien: tuteurData.lien,
              prenom: tuteurData.prenom,
              nom: tuteurData.nom,
              email: tuteurEmail,
              telephone: tuteurData.telephone,
              adresse: tuteurData.adresse,
              principal: Boolean(tuteurData.principal),
            },
          });
        } else {
          tuteur = await tx.tuteur.create({
            data: {
              familleId: famille.id,
              lien: tuteurData.lien,
              prenom: tuteurData.prenom,
              nom: tuteurData.nom,
              email: tuteurEmail,
              telephone: tuteurData.telephone,
              adresse: tuteurData.adresse,
              principal: Boolean(tuteurData.principal),
            },
          });
        }

        tuteurs.push(tuteur);

        if (tuteur.email && tuteur.prenom && tuteur.nom) {
          emailsToInvite.push({
            email: tuteur.email,
            prenom: tuteur.prenom,
            nom: tuteur.nom,
            tuteurId: tuteur.id,
          });
        }
      }

      // 3. Créer l'enfant
      const allTags = [
        ...(payload.sante?.tagsMaladies ?? []),
        ...(payload.sante?.tagsAllergies ?? []),
        ...(payload.sante?.tagsIntolerances ?? []),
        ...(payload.sante?.tags ?? []),
      ];

      const enfantCreateData: any = {
        familleId: famille.id,
        prenom: payload.enfant.prenom,
        nom: payload.enfant.nom,
        dateNaissance: new Date(payload.enfant.dateNaissance),
        genre: payload.enfant.genre ?? null,
        photoUrl: payload.enfant.photoUrl ?? null,
        intolerances: payload.sante?.tagsIntolerances ?? [],
        sansRestriction: payload.restrictions?.sansRestriction ?? false,
      };

      if (classeIdSouhaitee) {
        const classe = await tx.classe.findFirst({
          where: { id: classeIdSouhaitee, active: true },
          select: { id: true },
        });
        if (classe) {
          enfantCreateData.classeId = classe.id;
        } else {
          this.logger.warn(
            `Inscription ${id} : classe souhaitée ${classeIdSouhaitee} introuvable ou inactive`,
          );
        }
      }

      const enfant = await tx.enfant.create({
        data: enfantCreateData,
      });

      // 3b. Créer les délégations (personnes autorisées à récupérer l'enfant)
      const personnesAutorisees = payload.restrictions?.personnesAutorisees ?? payload.personnesAutorisees ?? [];
      if (!payload.restrictions?.sansRestriction && personnesAutorisees.length > 0) {
        for (const person of personnesAutorisees) {
          if (!person.name) continue;
          await tx.delegation.create({
            data: {
              enfantId: enfant.id,
              nom: person.name,
              telephone: person.phone || '',
              cin: person.cin || '',
              relation: person.relationship || 'Autre',
            },
          });
        }
      }

      // 3c. Créer le profil de santé
      if (payload.sante) {
        await tx.profilSante.create({
          data: {
            enfantId: enfant.id,
            notes: payload.commentaire,
            restrictionAlimentaire: payload.sante.restrictionAlimentaire,
            delegationAutorisee: false,
            tags: allTags,
          },
        });
      }

      // 4. Créer ou lier les comptes PARENT (dans la transaction, avant l'email)
      const provisionedAccounts: Array<{
        email: string;
        prenom: string;
        nom: string;
        tuteurId: string;
        utilisateurId: string;
        tempPasswordPlain: string;
      }> = [];

      for (const tuteurInfo of emailsToInvite) {
        const email = this.normalizeEmail(tuteurInfo.email);
        const tempPasswordPlain = this.generateTempPassword();
        const tempPasswordHashed = await bcrypt.hash(tempPasswordPlain, 10);
        const existingUser = await tx.utilisateur.findUnique({ where: { email } });

        const utilisateur = existingUser
          ? await tx.utilisateur.update({
              where: { id: existingUser.id },
              data: {
                prenom: tuteurInfo.prenom,
                nom: tuteurInfo.nom,
                role: 'PARENT',
                tuteurId: tuteurInfo.tuteurId,
                tempPassword: tempPasswordHashed,
                statut: existingUser.statut === 'ACTIVE' ? 'ACTIVE' : 'INVITED',
                inviteLe: new Date(),
              },
            })
          : await tx.utilisateur.create({
              data: {
                email,
                prenom: tuteurInfo.prenom,
                nom: tuteurInfo.nom,
                role: 'PARENT',
                statut: 'INVITED',
                tempPassword: tempPasswordHashed,
                inviteLe: new Date(),
                tuteurId: tuteurInfo.tuteurId,
              },
            });

        provisionedAccounts.push({
          email: utilisateur.email,
          prenom: utilisateur.prenom,
          nom: utilisateur.nom,
          tuteurId: tuteurInfo.tuteurId,
          utilisateurId: utilisateur.id,
          tempPasswordPlain,
        });
      }

      // 5. Mettre à jour l'inscription
      const updatedInscription = await tx.inscription.update({
        where: { id },
        data: {
          statut: 'ACTIF',
          familleId: famille.id,
          enfantId: enfant.id,
        },
      });

      return {
        inscriptionId: updatedInscription.id,
        statut: updatedInscription.statut,
        familleId: famille.id,
        enfantId: enfant.id,
        tuteurs: tuteurs.map((t) => ({
          tuteurId: t.id,
          email: t.email,
          lien: t.lien,
        })),
        provisionedAccounts,
      };
    });

    if (result.provisionedAccounts.length === 0) {
      this.logger.error(
        `Inscription ${id} provisionnée sans compte parent — emails/noms tuteurs manquants ?`,
      );
      throw new BadRequestException(
        'Aucun compte parent créé. Vérifiez que chaque tuteur a un email, un prénom et un nom.',
      );
    }

    for (const account of result.provisionedAccounts) {
      const verified = await this.prisma.utilisateur.findUnique({
        where: { id: account.utilisateurId },
        select: {
          id: true,
          tuteurId: true,
          role: true,
          tuteur: {
            select: {
              familleId: true,
              famille: { select: { enfants: { where: { archivedAt: null }, select: { id: true } } } },
            },
          },
        },
      });

      if (
        !verified?.tuteurId ||
        verified.role !== 'PARENT' ||
        !verified.tuteur?.famille?.enfants?.length
      ) {
        this.logger.error(
          `Inscription ${id} : compte parent ${account.email} incomplet après transaction (tuteurId=${verified?.tuteurId ?? 'null'}, enfants=${verified?.tuteur?.famille?.enfants?.length ?? 0})`,
        );
        throw new BadRequestException(
          `Provisionnement incomplet pour ${account.email}. Contactez le support.`,
        );
      }
    }

    this.logger.log(
      `Inscription ${id} : ${result.provisionedAccounts.length} compte(s) parent vérifié(s), enfant ${result.enfantId}`,
    );

    // Envoyer les emails uniquement après commit et vérification
    const invitedTuteurs: any[] = [];
    const credentialErrors: string[] = [];

    for (const account of result.provisionedAccounts) {
      const emailResult = await this.emailService.sendParentCredentialsEmail({
        email: account.email,
        parentName: `${account.prenom} ${account.nom}`.trim() || 'Parent',
        temporaryPassword: account.tempPasswordPlain,
      });

      invitedTuteurs.push({
        tuteurId: account.tuteurId,
        email: account.email,
        utilisateurId: account.utilisateurId,
        emailSent: emailResult.sent,
        error: emailResult.error,
      });

      if (!emailResult.sent) {
        credentialErrors.push(`${account.email}: ${emailResult.error ?? 'EMAIL_SEND_FAILED'}`);
      }
    }

    await this.prisma.inscription.update({
      where: { id },
      data:
        credentialErrors.length === 0 && result.provisionedAccounts.length > 0
          ? {
              credentialsEmailSentAt: new Date(),
              credentialsEmailError: null,
            }
          : {
              credentialsEmailError:
                credentialErrors.join('; ') || 'NO_PARENT_ACCOUNTS',
            },
    });

    this.logger.log(`Inscription ${id} acceptée et provisionnée`);
    return {
      ...result,
      invitedTuteurs,
      credentialsEmailSent: credentialErrors.length === 0 && result.provisionedAccounts.length > 0,
      credentialsEmailError: credentialErrors.length ? credentialErrors.join('; ') : null,
    };
  }

  /**
   * Renvoyer l'email de confirmation de candidature
   */
  async resendConfirmationEmail(id: string) {
    const inscription = await this.prisma.inscription.findUnique({ where: { id } });
    if (!inscription) {
      throw new NotFoundException(`Inscription ${id} non trouvée`);
    }

    const payload = inscription.payload as Record<string, unknown>;
    const contacts = extractAllInscriptionParentContacts(payload);
    if (contacts.length === 0) {
      throw new BadRequestException('Aucun email parent trouvé dans le dossier');
    }

    const errors: string[] = [];
    let sentCount = 0;

    for (const contact of contacts) {
      const emailResult = await this.emailService.sendInscriptionConfirmationEmail({
        email: contact.email,
        parentName: contact.parentName,
        childName: contact.enfantFullName,
        applicationId: inscription.id,
      });
      if (emailResult.sent) {
        sentCount += 1;
      } else {
        errors.push(`${contact.email}: ${emailResult.error ?? 'EMAIL_SEND_FAILED'}`);
      }
    }

    const updated = await this.prisma.inscription.update({
      where: { id },
      data:
        errors.length === 0
          ? { confirmationEmailSentAt: new Date(), confirmationEmailError: null }
          : {
              confirmationEmailError: errors.join('; '),
              ...(sentCount > 0 ? { confirmationEmailSentAt: new Date() } : {}),
            },
    });

    return {
      sent: errors.length === 0,
      sentCount,
      total: contacts.length,
      error: errors.length ? errors.join('; ') : null,
      inscription: this.formatInscriptionResponse(updated),
    };
  }

  /**
   * Renvoyer les identifiants parent (génère un nouveau mot de passe temporaire)
   */
  async resendCredentialsEmails(id: string) {
    const inscription = await this.prisma.inscription.findUnique({ where: { id } });
    if (!inscription) {
      throw new NotFoundException(`Inscription ${id} non trouvée`);
    }
    if (inscription.statut !== 'ACTIF') {
      throw new BadRequestException(
        'Les identifiants ne peuvent être renvoyés que pour une inscription acceptée (ACTIF)',
      );
    }
    if (!inscription.familleId) {
      throw new BadRequestException('Famille non provisionnée pour cette inscription');
    }

    const parents = await this.prisma.utilisateur.findMany({
      where: {
        role: 'PARENT',
        tuteur: { familleId: inscription.familleId },
        archivedAt: null,
        deletedAt: null,
      },
      select: { id: true, email: true, prenom: true, nom: true },
    });

    if (parents.length === 0) {
      throw new BadRequestException('Aucun compte parent trouvé pour cette inscription');
    }

    const errors: string[] = [];
    let sentCount = 0;

    for (const parent of parents) {
      const tempPasswordPlain = this.generateTempPassword();
      const tempPasswordHashed = await bcrypt.hash(tempPasswordPlain, 10);

      await this.prisma.utilisateur.update({
        where: { id: parent.id },
        data: {
          tempPassword: tempPasswordHashed,
          statut: 'INVITED',
          inviteLe: new Date(),
        },
      });

      const emailResult = await this.emailService.sendParentCredentialsEmail({
        email: parent.email,
        parentName: `${parent.prenom} ${parent.nom}`.trim() || 'Parent',
        temporaryPassword: tempPasswordPlain,
      });

      if (emailResult.sent) {
        sentCount += 1;
      } else {
        errors.push(`${parent.email}: ${emailResult.error ?? 'EMAIL_SEND_FAILED'}`);
      }
    }

    const updated = await this.prisma.inscription.update({
      where: { id },
      data:
        errors.length === 0
          ? { credentialsEmailSentAt: new Date(), credentialsEmailError: null }
          : { credentialsEmailError: errors.join('; ') },
    });

    return {
      sent: errors.length === 0,
      sentCount,
      total: parents.length,
      error: errors.length ? errors.join('; ') : null,
      inscription: this.formatInscriptionResponse(updated),
    };
  }

  /**
   * Formater la réponse d'une inscription
   */
  private formatInscriptionResponse(inscription: any) {
    const payload = inscription.payload as any;

    // Support both old format (mere/pere) and new format (tuteurs array)
    let parents: any[] = [];

    if (payload?.tuteurs && Array.isArray(payload.tuteurs)) {
      parents = payload.tuteurs
        .filter((t: any) => t.email)
        .map((t: any) => ({
          prenom: t.prenom,
          nom: t.nom,
          email: t.email,
          telephone: t.telephone,
          adresse: t.adresse,
          lien: t.lien,
          principal: Boolean(t.principal),
        }));
    } else {
      // Fallback to old format
      parents = [
        payload?.mere ? {
          prenom: payload.mere.prenom,
          nom: payload.mere.nom,
          email: payload.mere.email,
          telephone: payload.mere.telephone,
          adresse: payload.mere.adresse,
          lien: 'Mere',
          principal: true,
        } : null,
        payload?.pere ? {
          prenom: payload.pere.prenom,
          nom: payload.pere.nom,
          email: payload.pere.email,
          telephone: payload.pere.telephone,
          adresse: payload.pere.adresse,
          lien: 'Pere',
          principal: false,
        } : null,
      ].filter(Boolean);
    }

    return {
      id: inscription.id,
      statut: inscription.statut,
      createdAt: inscription.createdAt,
      updatedAt: inscription.updatedAt,
      payload,
      enfant: payload?.enfant ? {
        prenom: payload.enfant.prenom,
        nom: payload.enfant.nom,
      } : null,
      parents,
      notes: inscription.notes,
      familleId: inscription.familleId,
      enfantId: inscription.enfantId,
      confirmationEmailSentAt: inscription.confirmationEmailSentAt,
      confirmationEmailError: inscription.confirmationEmailError,
      credentialsEmailSentAt: inscription.credentialsEmailSentAt,
      credentialsEmailError: inscription.credentialsEmailError,
    };
  }
}

