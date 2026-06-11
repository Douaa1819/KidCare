import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  wrapPetitspasEmail,
  emailCredentialsBox,
  emailInfoBox,
  emailNoticeBox,
  emailParagraph,
  escapeHtml,
} from '../email/petitspas-email-layout';

/**
 * Service pour envoyer des emails
 * En DEV, affiche les emails dans la console
 * En PROD, utilise un service SMTP réel
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: any;
  private isDev: boolean;

  constructor(private configService: ConfigService) {
    this.isDev = this.configService.get('NODE_ENV') !== 'production';
    this.initializeTransporter();
  }

  private getFrontendBaseUrl(): string {
    return (
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('appUrl') ||
      this.configService.get<string>('APP_URL') ||
      'http://localhost:3001'
    ).replace(/\/$/, '');
  }

  private initializeTransporter() {
    // Utiliser les variables d'environnement (DEV ou PROD)
    const smtpHost = this.configService.get('SMTP_HOST');
    const smtpPort = this.configService.get('SMTP_PORT');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const smtpUser = this.configService.get('SMTP_USER');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const smtpPass = this.configService.get('SMTP_PASS');

    if (smtpHost && smtpPort && smtpUser && smtpPass) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      this.transporter = nodemailer.createTransport({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: false, // Use TLS (not SSL)
        auth: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          user: smtpUser,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          pass: smtpPass,
        },
      });
      this.logger.log('📧 Service SMTP configuré avec succès');
      this.logger.log(`📧 Host: ${smtpHost}:${smtpPort}`);
    } else {
      this.logger.warn('⚠️ Variables SMTP non configurées - Mode console uniquement');
    }
  }

  /**
   * Envoyer un email d'invitation à un enseignant/parent
   */
  async sendInvitationEmail(
    email: string,
    prenom: string,
    nom: string,
    role: string,
    tempPassword: string,
  ): Promise<boolean> {
    try {
      const subject = `Inscription confirmée - PetitsPas`;
      const html = this.generateInvitationHtml(
        prenom,
        nom,
        role,
        email,
        tempPassword,
      );

      if (!this.transporter) {
        // Fallback console (pas de SMTP configuré)
        this.logger.warn('⚠️ Pas de transporter SMTP - affichage console uniquement');
        this.logger.log(`To: ${email}`);
        this.logger.log(`Subject: ${subject}`);
        this.logger.log(`Prenom: ${prenom} ${nom}`);
        this.logger.log(`Role: ${role}`);
        this.logger.log(`HTML preview:\n${html.substring(0, 400)}...`);
        return true;
      }

      // Envoi réel via Mailtrap (même en DEV si EMAIL_SEND_IN_DEV=true)
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM') || 'noreply@wlw.ma',
        to: email,
        subject,
        html,
      });

      this.logger.log(`✅ Email d'invitation envoyé à ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Erreur envoi email: ${error.message}`);
      return false;
    }
  }

  /**
   * Générer le HTML de l'email d'invitation
   */
  private generateInvitationHtml(
    prenom: string,
    _nom: string,
    role: string,
    email: string,
    tempPassword: string,
  ): string {
    const loginUrl = `${this.getFrontendBaseUrl()}/fr`;
    const roleLabel =
      role === 'ENSEIGNANT'
        ? 'enseignant(e)'
        : role === 'PARENT'
          ? 'parent'
          : role === 'ADMIN'
            ? 'administrateur'
            : role.toLowerCase();

    const inner = `
      ${emailParagraph(`Bonjour <strong>${escapeHtml(prenom)}</strong>,`)}
      ${emailParagraph(
        `Votre inscription en tant que <strong>${escapeHtml(roleLabel)}</strong> sur <strong>PetitsPas</strong> est confirmée.`,
      )}
      ${emailParagraph('Voici vos identifiants de connexion :')}
      ${emailCredentialsBox([
        { label: 'Email', value: email },
        { label: 'Mot de passe', value: tempPassword },
      ])}
      ${emailNoticeBox('Pensez à modifier votre mot de passe après votre première connexion.')}
    `;

    return wrapPetitspasEmail({
      title: 'Bienvenue sur PetitsPas',
      subtitle: 'Vos identifiants de connexion',
      innerHtml: inner,
      locale: 'fr',
      cta: { href: loginUrl, label: 'Se connecter' },
    });
  }

  /**
   * Email envoyé après réinitialisation MDP par un Super Admin (mot de passe temporaire).
   */
  async sendAdminPasswordResetEmail(params: {
    email: string;
    prenom: string;
    nom: string;
    role: string;
    tempPassword: string;
    locale?: string;
  }): Promise<boolean> {
    const isAr = params.locale === 'ar';
    const subject = isAr
      ? 'إعادة تعيين كلمة المرور — PetitsPas'
      : 'Réinitialisation de votre mot de passe — PetitsPas';
    const html = this.generateAdminPasswordResetHtml(
      params.prenom,
      params.nom,
      params.role,
      params.email,
      params.tempPassword,
      isAr,
    );

    try {
      if (!this.transporter) {
        this.logger.error(
          '❌ SMTP non configuré — impossible d’envoyer l’email de réinitialisation MDP',
        );
        return false;
      }

      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM') || 'noreply@wlw.ma',
        to: params.email,
        subject,
        html,
      });

      this.logger.log(`✅ Email de réinitialisation MDP (admin) envoyé à ${params.email}`);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Erreur envoi réinitialisation MDP (admin): ${msg}`);
      return false;
    }
  }

  private generateAdminPasswordResetHtml(
    prenom: string,
    nom: string,
    role: string,
    email: string,
    tempPassword: string,
    isAr: boolean,
  ): string {
    const loginUrl = `${this.getFrontendBaseUrl()}/${isAr ? 'ar' : 'fr'}`;
    const locale = isAr ? 'ar' : 'fr';
    const roleLabel = isAr
      ? role === 'ENSEIGNANT'
        ? 'معلّم'
        : role === 'PARENT'
          ? 'ولي أمر'
          : role === 'ADMIN'
            ? 'مدير'
            : role.toLowerCase()
      : role === 'ENSEIGNANT'
        ? 'enseignant(e)'
        : role === 'PARENT'
          ? 'parent'
          : role === 'ADMIN'
            ? 'administrateur'
            : role.toLowerCase();

    const inner = isAr
      ? `
      ${emailParagraph(`مرحباً <strong>${escapeHtml(prenom)} ${escapeHtml(nom)}</strong>،`)}
      ${emailParagraph(
        'قام أحد مسؤولي المنصة بإعادة تعيين كلمة مرور حسابك على <strong>PetitsPas</strong>.',
      )}
      ${emailParagraph('إليك بيانات الدخول الجديدة:')}
      ${emailCredentialsBox([
        { label: 'البريد الإلكتروني', value: email },
        { label: 'كلمة المرور المؤقتة', value: tempPassword },
      ])}
      ${emailNoticeBox('يُرجى تغيير كلمة المرور فور تسجيل الدخول.')}
    `
      : `
      ${emailParagraph(`Bonjour <strong>${escapeHtml(prenom)} ${escapeHtml(nom)}</strong>,`)}
      ${emailParagraph(
        `Un administrateur de la plateforme a réinitialisé le mot de passe de votre compte <strong>${escapeHtml(roleLabel)}</strong> sur <strong>PetitsPas</strong>.`,
      )}
      ${emailParagraph('Voici vos nouveaux identifiants de connexion :')}
      ${emailCredentialsBox([
        { label: 'Email', value: email },
        { label: 'Mot de passe temporaire', value: tempPassword },
      ])}
      ${emailNoticeBox('Veuillez modifier votre mot de passe dès votre prochaine connexion.')}
    `;

    return wrapPetitspasEmail({
      title: 'PetitsPas',
      subtitle: isAr ? 'إعادة تعيين كلمة المرور' : 'Réinitialisation du mot de passe',
      innerHtml: inner,
      locale,
      cta: { href: loginUrl, label: isAr ? 'تسجيل الدخول' : 'Se connecter' },
    });
  }

  /**
   * Lien de réinitialisation du mot de passe (comptes actifs sur la plateforme)
   */
  async sendPasswordResetEmail(params: {
    email: string;
    prenom: string;
    resetUrl: string;
    locale?: string;
  }): Promise<boolean> {
    const isAr = params.locale === 'ar';
    const subject = isAr
      ? 'إعادة تعيين كلمة المرور — PetitsPas'
      : 'Réinitialisation de votre mot de passe — PetitsPas';
    const html = this.generatePasswordResetHtml(params.prenom, params.resetUrl, isAr);

    try {
      if (!this.transporter) {
        this.logger.warn('⚠️ Pas de transporter SMTP — réinitialisation MDP (log console)');
        this.logger.log(`To: ${params.email}`);
        this.logger.log(`Subject: ${subject}`);
        this.logger.log(`Reset URL: ${params.resetUrl}`);
        return true;
      }

      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM') || 'noreply@wlw.ma',
        to: params.email,
        subject,
        html,
      });

      this.logger.log(`✅ Email de réinitialisation envoyé à ${params.email}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Erreur envoi réinitialisation MDP: ${error.message}`);
      return false;
    }
  }

  private generatePasswordResetHtml(prenom: string, resetUrl: string, isAr: boolean): string {
    const locale = isAr ? 'ar' : 'fr';
    const subtitle = isAr ? 'إعادة تعيين كلمة المرور' : 'Réinitialisation du mot de passe';
    const greeting = isAr
      ? `مرحباً <strong>${escapeHtml(prenom)}</strong>،`
      : `Bonjour <strong>${escapeHtml(prenom)}</strong>,`;
    const body = isAr
      ? 'تلقّينا طلباً لإعادة تعيين كلمة المرور لحسابك على <strong>PetitsPas</strong>.'
      : 'Nous avons reçu une demande de réinitialisation du mot de passe de votre compte <strong>PetitsPas</strong>.';
    const ctaLabel = isAr ? 'تعيين كلمة مرور جديدة' : 'Choisir un nouveau mot de passe';
    const notice = isAr
      ? 'الرابط صالح لمدة ساعة واحدة. إذا لم تطلب هذا التغيير، تجاهل هذا البريد.'
      : 'Ce lien est valable 1 heure. Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.';

    const inner = `
      ${emailParagraph(greeting)}
      ${emailParagraph(body)}
      ${emailNoticeBox(notice)}
    `;

    return wrapPetitspasEmail({
      title: 'PetitsPas',
      subtitle,
      innerHtml: inner,
      locale,
      cta: { href: resetUrl, label: ctaLabel },
    });
  }

  /**
   * Envoyer un email de confirmation d'inscription
   */
  async sendConfirmationEmail(
    email: string,
    prenom: string,
    nom: string,
    enfantPrenom: string,
    applicationId: string,
  ): Promise<boolean> {
    try {
      const subject = `Confirmation d'inscription - Crèche PetitsPas`;
      const html = this.generateConfirmationHtml(
        prenom,
        nom,
        enfantPrenom,
        applicationId,
        email,
      );

      if (!this.transporter) {
        // Fallback console (pas de SMTP configuré)
        this.logger.warn('⚠️ Pas de transporter SMTP - affichage console uniquement');
        this.logger.log(`To: ${email}`);
        this.logger.log(`Subject: ${subject}`);
        this.logger.log(`Parent: ${prenom} ${nom}`);
        this.logger.log(`Enfant: ${enfantPrenom}`);
        this.logger.log(`Application ID: ${applicationId}`);
        this.logger.log(`HTML preview:\n${html.substring(0, 400)}...`);
        return true;
      }

      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM') || 'noreply@wlw.ma',
        to: email,
        subject,
        html,
      });

      this.logger.log(`✅ Email de confirmation envoyé à ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Erreur envoi email de confirmation: ${error.message}`);
      return false;
    }
  }

  /**
   * Générer le HTML de l'email de confirmation
   */
  private generateConfirmationHtml(
    prenom: string,
    nom: string,
    enfantPrenom: string,
    applicationId: string,
    email: string,
  ): string {
    const trackingUrl = `${this.getFrontendBaseUrl()}/fr/inscriptions`;

    const infoContent = `
      <p style="margin:0 0 8px;font-size:14px;"><strong>Dossier :</strong> ${escapeHtml(applicationId)}</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Enfant :</strong> ${escapeHtml(enfantPrenom)}</p>
      <p style="margin:0;font-size:14px;"><strong>Email :</strong> ${escapeHtml(email)}</p>
    `;

    const inner = `
      ${emailParagraph(`Bonjour <strong>${escapeHtml(prenom)} ${escapeHtml(nom)}</strong>,`)}
      ${emailParagraph(
        `Nous avons bien reçu votre demande d'inscription pour <strong>${escapeHtml(enfantPrenom)}</strong> à PetitsPas.`,
      )}
      ${emailNoticeBox('Statut : candidature en cours de traitement')}
      ${emailInfoBox(infoContent)}
      ${emailParagraph('<strong>Prochaines étapes</strong>')}
      ${emailParagraph('• Votre dossier est examiné par notre équipe<br/>• Réponse sous 48 à 72 h ouvrées<br/>• En cas d’acceptation, vous recevrez vos identifiants par email')}
      ${emailParagraph('Merci de votre confiance.')}
    `;

    return wrapPetitspasEmail({
      title: 'Inscription reçue',
      subtitle: 'Candidature enregistrée',
      innerHtml: inner,
      locale: 'fr',
      cta: { href: trackingUrl, label: 'Voir le formulaire d’inscription' },
    });
  }

  /**
   * Envoyer un email de notification
   */
  async sendNotificationEmail(
    email: string,
    subject: string,
    message: string,
  ): Promise<boolean> {
    try {
      if (this.isDev) {
        this.logger.log(`📧 NOTIFICATION (DEV MODE)`);
        this.logger.log(`To: ${email}`);
        this.logger.log(`Subject: ${subject}`);
        this.logger.log(`Message: ${message}`);
        return true;
      }

      if (!this.transporter) {
        this.logger.warn('⚠️ Service SMTP non configuré');
        return false;
      }

      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM') || 'noreply@wlw.ma',
        to: email,
        subject,
        text: message,
      });

      return true;
    } catch (error) {
      this.logger.error(`❌ Erreur envoi notification: ${error.message}`);
      return false;
    }
  }

  /**
   * Email transactionnel HTML (présence, événements, etc.) — même stratégie que l’invitation : SMTP si configuré, sinon log console.
   */
  async sendTransactionalEmail(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<boolean> {
    const enabled = this.configService.get<boolean>('notificationEmailsEnabled');
    if (enabled === false) {
      this.logger.debug(
        `📧 Notification ignorée (NOTIFICATION_EMAILS_ENABLED=false): ${params.subject} → ${params.to}`,
      );
      return false;
    }

    try {
      const from =
        (this.configService.get<string>('SMTP_FROM') as string) || 'noreply@wlw.ma';

      if (!this.transporter) {
        this.logger.warn('⚠️ Pas de transporter SMTP — notification (log console)');
        this.logger.log(`To: ${params.to}`);
        this.logger.log(`Subject: ${params.subject}`);
        this.logger.log(`Text: ${params.text ?? '(html only)'}`);
        this.logger.log(`HTML preview:\n${params.html.substring(0, 500)}…`);
        return true;
      }

      await this.transporter.sendMail({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });

      this.logger.log(`✅ Email transactionnel envoyé à ${params.to} — ${params.subject}`);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Erreur email transactionnel: ${msg}`);
      return false;
    }
  }
}

