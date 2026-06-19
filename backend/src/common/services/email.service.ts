import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  wrapPetitspasEmail,
  emailCredentialsBox,
  emailInfoBox,
  emailNoticeBox,
  emailParagraph,
  emailHeading,
  escapeHtml,
} from '../email/petitspas-email-layout';
import {
  bilingualEmailSubject,
  wrapBilingualEmail,
} from '../email/bilingual-email';

export type EmailSendResult = { sent: boolean; error?: string };

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  isSmtpConfigured(): boolean {
    return this.transporter !== null;
  }

  private getFrontendBaseUrl(): string {
    return (
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('APP_URL') ||
      this.configService.get<string>('appUrl') ||
      'http://localhost:3001'
    ).replace(/\/$/, '');
  }

  private getParentLoginUrl(): string {
    return `${this.getFrontendBaseUrl()}/auth/login-user`;
  }

  private getFromAddress(): string {
    return this.configService.get<string>('SMTP_FROM') || 'noreply@petitspas.com';
  }

  private initializeTransporter(): void {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<string>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      this.logger.warn('SMTP_CONFIG_MISSING — emails non envoyés (SMTP_HOST/PORT/USER/PASS requis)');
      return;
    }

      this.transporter = nodemailer.createTransport({
        host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
    });
    this.logger.log(`SMTP ready — ${smtpHost}:${smtpPort}`);
  }

  private async deliver(params: {
    to: string;
    subject: string;
    html: string;
    logTag: 'EMAIL_CONFIRMATION_SENT' | 'EMAIL_CREDENTIALS_SENT' | 'EMAIL_SEND_FAILED' | 'EMAIL_REJECT_SENT' | 'EMAIL_ADMIN_NOTIF_SENT';
  }): Promise<EmailSendResult> {
    if (!this.transporter) {
      this.logger.warn(`SMTP_CONFIG_MISSING — ${params.logTag} skipped for ${params.to}`);
      return { sent: false, error: 'SMTP_CONFIG_MISSING' };
    }

    try {
      await this.transporter.sendMail({
        from: this.getFromAddress(),
        to: params.to,
        subject: params.subject,
        html: params.html,
      });
      this.logger.log(`${params.logTag} → ${params.to}`);
      return { sent: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`EMAIL_SEND_FAILED → ${params.to}: ${msg}`);
      return { sent: false, error: msg };
    }
  }

  /** Email A — confirmation candidature (formulaire public) */
  async sendInscriptionConfirmationEmail(params: {
    email: string;
    parentName: string;
    childName: string;
    applicationId: string;
    locale?: 'fr' | 'ar';
  }): Promise<EmailSendResult> {
    const subject = bilingualEmailSubject(
      'Confirmation de votre inscription — PetitsPas',
      'تأكيد طلب التسجيل — PetitsPas',
    );
    const html = this.buildInscriptionConfirmationHtml(params);
    return this.deliver({
      to: params.email,
      subject,
      html,
      logTag: 'EMAIL_CONFIRMATION_SENT',
    });
  }

  /** Email B — identifiants parent après acceptation admin */
  async sendParentCredentialsEmail(params: {
    email: string;
    parentName: string;
    temporaryPassword: string;
    locale?: 'fr' | 'ar';
  }): Promise<EmailSendResult> {
    const subject = bilingualEmailSubject(
      'Vos identifiants de connexion — PetitsPas',
      'بيانات الدخول — PetitsPas',
    );
    const loginUrl = this.getParentLoginUrl();
    const html = this.buildParentCredentialsHtml({
      parentName: params.parentName,
      email: params.email,
      temporaryPassword: params.temporaryPassword,
      loginUrl,
      locale: params.locale,
    });
    return this.deliver({
      to: params.email,
      subject,
      html,
      logTag: 'EMAIL_CREDENTIALS_SENT',
    });
  }

  /** @deprecated use sendParentCredentialsEmail */
  async sendInvitationEmail(
    email: string,
    prenom: string,
    nom: string,
    _role: string,
    tempPassword: string,
  ): Promise<boolean> {
    const result = await this.sendParentCredentialsEmail({
        email,
      parentName: `${prenom} ${nom}`.trim() || 'Parent',
      temporaryPassword: tempPassword,
    });
    return result.sent;
  }

  /** @deprecated use sendInscriptionConfirmationEmail */
  async sendConfirmationEmail(
    email: string,
    prenom: string,
    nom: string,
    enfantPrenom: string,
    enfantNom?: string,
    applicationId?: string,
  ): Promise<boolean> {
    const childName = enfantNom
      ? `${enfantPrenom} ${enfantNom}`.trim()
      : enfantPrenom;
    const result = await this.sendInscriptionConfirmationEmail({
      email,
      parentName: `${prenom} ${nom}`.trim() || 'Parent',
      childName: childName || 'votre enfant',
      applicationId: applicationId ?? '',
    });
    return result.sent;
  }

  private buildInscriptionConfirmationHtml(params: {
    parentName: string;
    childName: string;
    applicationId: string;
    email: string;
    locale?: 'fr' | 'ar';
  }): string {
    const trackingUrlFr = `${this.getFrontendBaseUrl()}/fr/inscriptions`;
    const trackingUrlAr = `${this.getFrontendBaseUrl()}/ar/inscriptions`;
    const preferAr = params.locale === 'ar';

    const infoFr = `
      <p style="margin:0 0 8px;font-size:14px;"><strong>Parent :</strong> ${escapeHtml(params.parentName)}</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Enfant :</strong> ${escapeHtml(params.childName)}</p>
      <p style="margin:0;font-size:14px;"><strong>Email :</strong> ${escapeHtml(params.email)}</p>
    `;

    const infoAr = `
      <p style="margin:0 0 8px;font-size:14px;"><strong>ولي الأمر :</strong> ${escapeHtml(params.parentName)}</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>الطفل :</strong> ${escapeHtml(params.childName)}</p>
      <p style="margin:0;font-size:14px;"><strong>البريد :</strong> ${escapeHtml(params.email)}</p>
    `;

    const innerFr = `
      ${emailParagraph(`Bonjour <strong>${escapeHtml(params.parentName)}</strong>,`)}
      ${emailParagraph(
        `Nous avons bien reçu votre demande d'inscription pour <strong>${escapeHtml(params.childName)}</strong>.`,
      )}
      ${emailNoticeBox('Statut : candidature en cours de traitement')}
      ${emailInfoBox(infoFr)}
      ${emailParagraph(
        "L'équipe PetitsPas va l'examiner et vous recevrez une réponse prochainement.",
      )}
      ${emailParagraph('Merci de votre confiance.')}
    `;

    const innerAr = `
      ${emailParagraph(`مرحباً <strong>${escapeHtml(params.parentName)}</strong>،`)}
      ${emailParagraph(
        `تم استلام طلب تسجيل <strong>${escapeHtml(params.childName)}</strong> بنجاح.`,
      )}
      ${emailNoticeBox('الحالة : الطلب قيد المعالجة')}
      ${emailInfoBox(infoAr)}
      ${emailParagraph('سيتم مراجعة طلبكم وستتلقون الرد قريباً.')}
      ${emailParagraph('شكراً لثقتكم.')}
    `;

    return wrapBilingualEmail({
      titleFr: 'Confirmation de votre inscription',
      titleAr: 'تأكيد طلب التسجيل',
      innerFr,
      innerAr,
      cta: {
        href: preferAr ? trackingUrlAr : trackingUrlFr,
        label: preferAr ? 'نموذج التسجيل' : 'Formulaire d\'inscription',
      },
    });
  }

  private buildParentCredentialsHtml(params: {
    parentName: string;
    email: string;
    temporaryPassword: string;
    loginUrl: string;
    locale?: 'fr' | 'ar';
  }): string {
    const preferAr = params.locale === 'ar';

    const innerFr = `
      ${emailParagraph(`Bonjour <strong>${escapeHtml(params.parentName)}</strong>,`)}
      ${emailParagraph('Votre compte parent PetitsPas a été créé.')}
      ${emailParagraph('Voici vos identifiants de connexion :')}
      ${emailCredentialsBox([
        { label: 'Email', value: params.email },
        { label: 'Mot de passe temporaire', value: params.temporaryPassword },
      ])}
      ${emailParagraph(
        `<strong>Lien de connexion :</strong> <a href="${escapeHtml(params.loginUrl)}" style="color:#FF6F61;">${escapeHtml(params.loginUrl)}</a>`,
      )}
      ${emailNoticeBox(
        'Pour votre sécurité, veuillez modifier votre mot de passe après la première connexion.',
      )}
    `;

    const innerAr = `
      ${emailParagraph(`مرحباً <strong>${escapeHtml(params.parentName)}</strong>،`)}
      ${emailParagraph('تم إنشاء حسابكم الأبوي على PetitsPas.')}
      ${emailParagraph('إليكم بيانات الدخول :')}
      ${emailCredentialsBox([
        { label: 'البريد الإلكتروني', value: params.email },
        { label: 'كلمة المرور المؤقتة', value: params.temporaryPassword },
      ])}
      ${emailParagraph(
        `<strong>رابط الدخول :</strong> <a href="${escapeHtml(params.loginUrl)}" style="color:#FF6F61;">${escapeHtml(params.loginUrl)}</a>`,
      )}
      ${emailNoticeBox('يُرجى تغيير كلمة المرور بعد أول تسجيل دخول.')}
    `;

    return wrapBilingualEmail({
      titleFr: 'Vos identifiants de connexion',
      titleAr: 'بيانات الدخول',
      innerFr,
      innerAr,
      cta: { href: params.loginUrl, label: preferAr ? 'تسجيل الدخول' : 'Se connecter' },
    });
  }

  async sendAdminPasswordResetEmail(params: {
    email: string;
    prenom: string;
    nom: string;
    role: string;
    tempPassword: string;
    locale?: string;
  }): Promise<boolean> {
    const subject = bilingualEmailSubject(
      'Réinitialisation de votre mot de passe — PetitsPas',
      'إعادة تعيين كلمة المرور — PetitsPas',
    );
    const loginUrlFr = `${this.getFrontendBaseUrl()}/fr`;
    const loginUrlAr = `${this.getFrontendBaseUrl()}/ar`;
    const preferAr = params.locale === 'ar';
    const roleLabelFr =
      params.role === 'ENSEIGNANT'
        ? 'enseignant(e)'
        : params.role === 'PARENT'
          ? 'parent'
          : params.role === 'ADMIN'
            ? 'administrateur'
            : params.role.toLowerCase();
    const roleLabelAr =
      params.role === 'ENSEIGNANT'
        ? 'معلّم(ة)'
        : params.role === 'PARENT'
          ? 'ولي أمر'
          : params.role === 'ADMIN'
            ? 'مدير'
            : params.role.toLowerCase();

    const innerFr = `
      ${emailParagraph(`Bonjour <strong>${escapeHtml(params.prenom)} ${escapeHtml(params.nom)}</strong>,`)}
      ${emailParagraph(
        `Un administrateur a réinitialisé le mot de passe de votre compte <strong>${escapeHtml(roleLabelFr)}</strong>.`,
      )}
      ${emailCredentialsBox([
        { label: 'Email', value: params.email },
        { label: 'Mot de passe temporaire', value: params.tempPassword },
      ])}
      ${emailNoticeBox('Veuillez modifier votre mot de passe dès votre prochaine connexion.')}
    `;

    const innerAr = `
      ${emailParagraph(`مرحباً <strong>${escapeHtml(params.prenom)} ${escapeHtml(params.nom)}</strong>،`)}
      ${emailParagraph('قام أحد مسؤولي المنصة بإعادة تعيين كلمة مرور حسابك.')}
      ${emailCredentialsBox([
        { label: 'البريد الإلكتروني', value: params.email },
        { label: 'كلمة المرور المؤقتة', value: params.tempPassword },
      ])}
      ${emailNoticeBox('يُرجى تغيير كلمة المرور فور تسجيل الدخول.')}
    `;

    const html = wrapBilingualEmail({
      titleFr: 'Réinitialisation du mot de passe',
      titleAr: 'إعادة تعيين كلمة المرور',
      innerFr,
      innerAr,
      cta: { href: preferAr ? loginUrlAr : loginUrlFr, label: preferAr ? 'تسجيل الدخول' : 'Se connecter' },
    });

    const result = await this.deliver({
      to: params.email,
      subject,
      html,
      logTag: 'EMAIL_CREDENTIALS_SENT',
    });
    return result.sent;
  }

  async sendPasswordResetEmail(params: {
    email: string;
    prenom: string;
    resetUrl: string;
    locale?: string;
  }): Promise<boolean> {
    const subject = bilingualEmailSubject(
      'Réinitialisation de votre mot de passe — PetitsPas',
      'إعادة تعيين كلمة المرور — PetitsPas',
    );
    const html = this.generatePasswordResetHtml(params.prenom, params.resetUrl);
    const result = await this.deliver({
        to: params.email,
        subject,
        html,
      logTag: 'EMAIL_SEND_FAILED',
    });
    return result.sent;
  }

  private generatePasswordResetHtml(prenom: string, resetUrl: string): string {
    const innerFr = `
      ${emailParagraph(`Bonjour <strong>${escapeHtml(prenom)}</strong>,`)}
      ${emailParagraph(
        'Nous avons reçu une demande de réinitialisation du mot de passe.',
      )}
      ${emailNoticeBox(
        'Ce lien est valable 1 heure. Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.',
      )}
    `;

    const innerAr = `
      ${emailParagraph(`مرحباً <strong>${escapeHtml(prenom)}</strong>،`)}
      ${emailParagraph('تلقّينا طلباً لإعادة تعيين كلمة المرور.')}
      ${emailNoticeBox('الرابط صالح لمدة ساعة واحدة. إذا لم تطلبوا هذا التغيير، تجاهلوا هذا البريد.')}
    `;

    return wrapBilingualEmail({
      titleFr: 'Réinitialisation du mot de passe',
      titleAr: 'إعادة تعيين كلمة المرور',
      innerFr,
      innerAr,
      cta: { href: resetUrl, label: 'Choisir un nouveau mot de passe / تعيين كلمة مرور جديدة' },
    });
  }

  async sendInscriptionRejectedEmail(params: {
    email: string;
    parentPrenom: string;
    parentNom: string;
    enfantPrenom: string;
    enfantNom?: string;
    raison?: string;
    locale?: 'fr' | 'ar';
  }): Promise<boolean> {
    const subject = bilingualEmailSubject(
      'Décision concernant votre inscription — PetitsPas',
      'قرار بشأن طلب التسجيل — PetitsPas',
    );
    const enfantLabel = params.enfantNom
      ? `${params.enfantPrenom} ${params.enfantNom}`.trim()
      : params.enfantPrenom;

    const raisonFr = params.raison?.trim()
      ? emailParagraph(`<strong>Motif :</strong> ${escapeHtml(params.raison.trim())}`)
      : '';
    const raisonAr = params.raison?.trim()
      ? emailParagraph(`<strong>السبب :</strong> ${escapeHtml(params.raison.trim())}`)
      : '';

    const innerFr = `
      ${emailParagraph(`Bonjour <strong>${escapeHtml(params.parentPrenom)} ${escapeHtml(params.parentNom)}</strong>,`)}
      ${emailParagraph(
        `Nous vous remercions pour l'intérêt porté à PetitsPas et pour votre demande d'inscription concernant <strong>${escapeHtml(enfantLabel)}</strong>.`,
      )}
      ${emailParagraph(
        'Après examen attentif de votre dossier, nous ne sommes pas en mesure de retenir votre candidature pour le moment.',
      )}
      ${raisonFr}
      ${emailParagraph('Nous vous souhaitons le meilleur pour la suite.')}
    `;

    const innerAr = `
      ${emailParagraph(`مرحباً <strong>${escapeHtml(params.parentPrenom)} ${escapeHtml(params.parentNom)}</strong>،`)}
      ${emailParagraph(
        `نشكركم على اهتمامكم بـ PetitsPas وعلى طلب التسجيل الخاص بـ <strong>${escapeHtml(enfantLabel)}</strong>.`,
      )}
      ${emailParagraph(
        'بعد دراسة ملفكم، نأسف لإبلاغكم بأننا غير قادرين على قبول الطلب حالياً.',
      )}
      ${raisonAr}
      ${emailParagraph('نتمنى لكم التوفيق.')}
    `;

    const html = wrapBilingualEmail({
      titleFr: 'Décision sur votre inscription',
      titleAr: 'قرار بشأن طلب التسجيل',
      innerFr,
      innerAr,
    });

    const result = await this.deliver({
      to: params.email,
      subject,
      html,
      logTag: 'EMAIL_REJECT_SENT',
    });
    return result.sent;
  }

  async sendAdminNewInscriptionEmail(params: {
    adminEmail: string;
    parentPrenom: string;
    parentNom: string;
    enfantPrenom: string;
    enfantNom: string;
    parentEmail: string;
  }): Promise<boolean> {
    const subject = bilingualEmailSubject(
      'Nouvelle inscription reçue — PetitsPas',
      'تسجيل جديد — PetitsPas',
    );

    const enfantLabel = `${params.enfantPrenom} ${params.enfantNom}`.trim();
    const parentLabel = `${params.parentPrenom} ${params.parentNom}`.trim();
    const adminUrl = `${this.getFrontendBaseUrl()}/fr/admin/inscriptions`;

    const infoFr = `
      <p style="margin:0 0 8px;font-size:14px;"><strong>Parent :</strong> ${escapeHtml(parentLabel)}</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Enfant :</strong> ${escapeHtml(enfantLabel)}</p>
      <p style="margin:0;font-size:14px;"><strong>Email :</strong> ${escapeHtml(params.parentEmail)}</p>
    `;

    const infoAr = `
      <p style="margin:0 0 8px;font-size:14px;"><strong>ولي الأمر :</strong> ${escapeHtml(parentLabel)}</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>الطفل :</strong> ${escapeHtml(enfantLabel)}</p>
      <p style="margin:0;font-size:14px;"><strong>البريد :</strong> ${escapeHtml(params.parentEmail)}</p>
    `;

    const innerFr = `
      ${emailHeading('Nouvelle candidature')}
      ${emailParagraph('Une nouvelle demande d\'inscription a été soumise.')}
      ${emailInfoBox(infoFr)}
    `;

    const innerAr = `
      ${emailHeading('طلب تسجيل جديد')}
      ${emailParagraph('تم تقديم طلب تسجيل جديد.')}
      ${emailInfoBox(infoAr)}
    `;

    const html = wrapBilingualEmail({
      titleFr: 'Nouvelle inscription',
      titleAr: 'تسجيل جديد',
      innerFr,
      innerAr,
      cta: { href: adminUrl, label: 'Voir les inscriptions' },
    });

    const result = await this.deliver({
      to: params.adminEmail,
      subject,
      html,
      logTag: 'EMAIL_ADMIN_NOTIF_SENT',
    });
    return result.sent;
  }

  async sendNotificationEmail(email: string, subject: string, message: string): Promise<boolean> {
      if (!this.transporter) {
      this.logger.warn(`SMTP_CONFIG_MISSING — notification skipped for ${email}`);
        return false;
      }
    try {
      await this.transporter.sendMail({
        from: this.getFromAddress(),
        to: email,
        subject,
        text: message,
      });
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`EMAIL_SEND_FAILED → ${email}: ${msg}`);
      return false;
    }
  }

  async sendTransactionalEmail(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<boolean> {
    const enabled = this.configService.get<boolean>('notificationEmailsEnabled');
    if (enabled === false) return false;

    if (!this.transporter) {
      this.logger.warn(`SMTP_CONFIG_MISSING — transactional skipped for ${params.to}`);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.getFromAddress(),
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      this.logger.log(`Transactional email sent → ${params.to}`);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`EMAIL_SEND_FAILED → ${params.to}: ${msg}`);
      return false;
    }
  }
}
