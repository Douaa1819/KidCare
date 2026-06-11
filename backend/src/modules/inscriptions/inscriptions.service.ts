import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInscriptionDto, ListInscriptionsQueryDto, UpdateInscriptionStatusDto } from './dto/create-inscription.dto';
import { EmailService } from '../../common/services/email.service';
import { validateChildBirthdateForPolicy } from '../../common/child-age-policy';
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

      // Envoyer email de confirmation immédiat
      const parentEmail = payload.tuteurs?.find((t: any) => t.email)?.email || 
                         payload.mere?.email || 
                         payload.pere?.email;
      
      if (parentEmail) {
        const parentPrenom = payload.tuteurs?.find((t: any) => t.email)?.prenom || 
                            payload.mere?.prenom || 
                            payload.pere?.prenom || '';
        const parentNom = payload.tuteurs?.find((t: any) => t.email)?.nom || 
                         payload.mere?.nom || 
                         payload.pere?.nom || '';
        const enfantPrenom = payload.enfant?.prenom || '';

        try {
          await this.emailService.sendConfirmationEmail(
            parentEmail,
            parentPrenom,
            parentNom,
            enfantPrenom,
            inscription.id,
          );
          this.logger.log(`📧 Email de confirmation envoyé à ${parentEmail}`);
        } catch (emailError) {
          this.logger.error(
            `❌ Erreur envoi email confirmation: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`,
          );
          // Ne pas bloquer l'inscription si l'email échoue
        }
      } else {
        this.logger.warn('⚠️ Aucun email trouvé dans le payload - pas d\'email de confirmation envoyé');
      }

      // TODO: Déclencher webhook n8n

      return {
        applicationId: inscription.id,
        statut: inscription.statut,
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
  async rejectInscription(id: string, raison: string) {
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

    return this.formatInscriptionResponse(updated);
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

    const payload = inscription.payload as any;

    // Valider qu'il y a au moins un tuteur avec email
    const tuteurAvecEmail = payload.tuteurs?.find((t: any) => t.email);
    if (!tuteurAvecEmail) {
      throw new BadRequestException('Aucun tuteur avec email trouvé dans le payload');
    }

    // Transaction atomique
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Créer ou récupérer la famille
      const emailPrincipal = tuteurAvecEmail.email;
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

      for (const tuteurData of payload.tuteurs || []) {
        if (!tuteurData.email) continue;

        const tuteurEmail = this.normalizeEmail(tuteurData.email);
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
      const enfant = await tx.enfant.create({
        data: {
          familleId: famille.id,
          prenom: payload.enfant.prenom,
          nom: payload.enfant.nom,
          dateNaissance: new Date(payload.enfant.dateNaissance),
          genre: payload.enfant.genre,
          photoUrl: payload.enfant.photoUrl,
          intolerances: payload.sante?.tagsIntolerances ?? [],
          sansRestriction: payload.restrictions?.sansRestriction ?? false,
        },
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

    // Envoyer les emails uniquement après commit de la transaction
    const invitedTuteurs: any[] = [];
    for (const account of result.provisionedAccounts) {
      try {
        await this.emailService.sendInvitationEmail(
          account.email,
          account.prenom,
          account.nom,
          'PARENT',
          account.tempPasswordPlain,
        );

        invitedTuteurs.push({
          tuteurId: account.tuteurId,
          email: account.email,
          utilisateurId: account.utilisateurId,
          emailSent: true,
        });

        this.logger.log(`Parent invité et email envoyé: ${account.email}`);
      } catch (error) {
        this.logger.error(
          `Erreur envoi email parent ${account.email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        invitedTuteurs.push({
          tuteurId: account.tuteurId,
          email: account.email,
          utilisateurId: account.utilisateurId,
          emailSent: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.logger.log(`Inscription ${id} acceptée et provisionnée`);
    return {
      ...result,
      invitedTuteurs,
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
    };
  }
}

