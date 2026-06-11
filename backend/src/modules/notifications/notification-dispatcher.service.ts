import { Injectable, Logger } from '@nestjs/common';
import { StatutPresence } from '@prisma/client';
import { EmailService } from '../../common/services/email.service';
import { NotificationRecipientsService } from './notification-recipients.service';
import { buildPresenceRecordedEmail } from './templates/presence-recorded.template';
import { buildNewClassEventEmail } from './templates/new-class-event.template';
import { buildDailyResumeRecordedEmail } from './templates/daily-resume-recorded.template';

/**
 * Point d’entrée unique pour les notifications email métier.
 * Pour ajouter un type : 1) template 2) méthode notifyX 3) appeler depuis le service métier concerné.
 */
@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    private readonly mail: EmailService,
    private readonly recipients: NotificationRecipientsService,
  ) {}

  /**
   * Première saisie de présence du jour pour cet enfant (évite les spams sur corrections).
   */
  async notifyPresenceFirstRecorded(params: {
    enfantId: string;
    enfantPrenom: string;
    enfantNom: string;
    dateYmd: string;
    statut: StatutPresence;
  }): Promise<void> {
    try {
      const emails = await this.recipients.resolveParentEmailsForEnfant(params.enfantId);
      if (emails.length === 0) {
        this.logger.debug(`Aucun destinataire parent pour présence enfant=${params.enfantId}`);
        return;
      }

      const { subject, html, text } = buildPresenceRecordedEmail({
        enfantPrenom: params.enfantPrenom,
        enfantNom: params.enfantNom,
        dateYmd: params.dateYmd,
        statut: params.statut,
      });

      await Promise.all(
        emails.map((to) => this.mail.sendTransactionalEmail({ to, subject, html, text })),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`notifyPresenceFirstRecorded: ${msg}`);
    }
  }

  async notifyDailyResumeSaved(params: {
    enfantId: string;
    enfantPrenom: string;
    enfantNom: string;
    dateYmd: string;
  }): Promise<void> {
    try {
      const emails = await this.recipients.resolveParentEmailsForEnfant(params.enfantId);
      if (emails.length === 0) {
        this.logger.debug(
          `Aucun destinataire parent pour résumé enfant=${params.enfantId}`,
        );
        return;
      }

      const { subject, html, text } = buildDailyResumeRecordedEmail({
        enfantPrenom: params.enfantPrenom,
        enfantNom: params.enfantNom,
        dateYmd: params.dateYmd,
      });

      await Promise.all(
        emails.map((to) => this.mail.sendTransactionalEmail({ to, subject, html, text })),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`notifyDailyResumeSaved: ${msg}`);
    }
  }

  async notifyNewClassEvent(params: {
    classeId: string;
    classeNom: string;
    titre: string;
    description: string | null;
    startAt: Date;
    endAt: Date;
  }): Promise<void> {
    try {
      const emails = await this.recipients.resolveParentEmailsForClasse(params.classeId);
      if (emails.length === 0) {
        this.logger.debug(`Aucun parent pour événement classe=${params.classeId}`);
        return;
      }

      const { subject, html, text } = buildNewClassEventEmail({
        titre: params.titre,
        description: params.description,
        startAt: params.startAt,
        endAt: params.endAt,
        classeNom: params.classeNom,
      });

      await Promise.all(
        emails.map((to) => this.mail.sendTransactionalEmail({ to, subject, html, text })),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`notifyNewClassEvent: ${msg}`);
    }
  }
}
