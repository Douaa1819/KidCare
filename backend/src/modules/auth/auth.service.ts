import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenBlacklistService } from '../../common/redis/token-blacklist.service';
import { EmailService } from '../../common/services/email.service';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 h

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tokenBlacklist: TokenBlacklistService,
    private readonly emailService: EmailService,
  ) {}

  get jwtSecret(): string {
    return this.config.get<string>('JWT_SECRET', 'dev_secret');
  }

  get accessExpires(): string {
    return this.config.get<string>('JWT_ACCESS_EXPIRES', '15m');
  }

  get refreshExpires(): string {
    return this.config.get<string>('JWT_REFRESH_EXPIRES', '7d');
  }

  signAccessToken(payload: {
    email: string;
    role: string;
    userId: string;
  }): string {
    const jti = randomUUID();
    const opts: SignOptions = { expiresIn: this.accessExpires as SignOptions['expiresIn'] };
    return jwt.sign({ ...payload, typ: 'access', jti }, this.jwtSecret, opts);
  }

  signRefreshToken(payload: {
    userId: string;
    email: string;
    role: string;
  }): string {
    const jti = randomUUID();
    const opts: SignOptions = { expiresIn: this.refreshExpires as SignOptions['expiresIn'] };
    return jwt.sign({ ...payload, typ: 'refresh', jti }, this.jwtSecret, opts);
  }

  issueTokenPair(user: {
    email: string;
    role: string;
    userId: string;
  }): { accessToken: string; refreshToken: string } {
    const roleStr = String(user.role);
    return {
      accessToken: this.signAccessToken({
        email: user.email,
        role: roleStr,
        userId: user.userId,
      }),
      refreshToken: this.signRefreshToken({
        userId: user.userId,
        email: user.email,
        role: roleStr,
      }),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    userId: string;
    role: string;
    email: string;
  }> {
    let decoded: jwt.JwtPayload & {
      typ?: string;
      userId?: string;
      email?: string;
      role?: string;
      jti?: string;
    };
    try {
      decoded = jwt.verify(refreshToken, this.jwtSecret) as typeof decoded;
    } catch {
      throw new UnauthorizedException('Refresh invalide ou expiré');
    }

    if (decoded.typ !== 'refresh') {
      throw new UnauthorizedException('Jeton non valide');
    }

    if (decoded.jti && (await this.tokenBlacklist.isBlacklisted(decoded.jti))) {
      throw new UnauthorizedException('Session révoquée');
    }

    const userId = decoded.userId as string;
    const email = decoded.email as string;
    const role = decoded.role as string;

    if (userId === 'admin_dev') {
      return {
        accessToken: this.signAccessToken({ userId, email, role }),
        userId,
        role,
        email,
      };
    }

    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
    });

    if (
      !utilisateur ||
      utilisateur.deletedAt ||
      utilisateur.statut === 'DISABLED' ||
      utilisateur.statut === 'ARCHIVED'
    ) {
      throw new UnauthorizedException('Utilisateur invalide');
    }

    const r = String(utilisateur.role);
    return {
      accessToken: this.signAccessToken({
        userId: utilisateur.id,
        email: utilisateur.email,
        role: r,
      }),
      userId: utilisateur.id,
      role: r,
      email: utilisateur.email,
    };
  }

  async revokeAccessPayload(payload: {
    jti?: string;
    exp?: number;
  }): Promise<void> {
    if (payload?.jti && payload.exp) {
      await this.tokenBlacklist.revokeUntil(payload.jti, payload.exp);
    }
  }

  async revokeRefreshTokenString(refreshToken: string): Promise<void> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtSecret) as jwt.JwtPayload & {
        typ?: string;
      };
      if (decoded.typ !== 'refresh') return;
      if (decoded.jti && decoded.exp) {
        await this.tokenBlacklist.revokeUntil(decoded.jti, decoded.exp);
      }
    } catch {
      /* ignore */
    }
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** URL publique du frontend pour les liens dans les emails */
  resolveFrontendBaseUrl(override?: string): string {
    if (override?.trim()) {
      try {
        const u = new URL(override.trim());
        if (u.protocol === 'http:' || u.protocol === 'https:') {
          return u.origin;
        }
      } catch {
        /* fallback env */
      }
    }
    const fromEnv =
      this.config.get<string>('FRONTEND_URL') ||
      this.config.get<string>('APP_URL') ||
      this.config.get<string>('appUrl');
    return (fromEnv || 'http://localhost:3001').replace(/\/$/, '');
  }

  private canRequestPasswordReset(utilisateur: {
    statut: string;
    tempPassword: string | null;
  }): boolean {
    if (utilisateur.statut === 'DISABLED') return false;
    if (!utilisateur.tempPassword) return false;
    return utilisateur.statut === 'ACTIVE' || utilisateur.statut === 'INVITED';
  }

  /**
   * Demande de réinitialisation — envoi d’un lien par email si le compte existe et est actif sur la plateforme.
   */
  async requestPasswordReset(
    email: string,
    locale = 'fr',
    appUrlOverride?: string,
  ): Promise<{ success: boolean; message: string }> {
    const genericMessage =
      'Si un compte actif existe avec cet email, un lien de réinitialisation vous a été envoyé.';

    const normalizedEmail = email.trim().toLowerCase();
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { email: normalizedEmail },
    });

    if (!utilisateur || !this.canRequestPasswordReset(utilisateur)) {
      this.logger.log(
        `Demande mot de passe oublié ignorée (compte absent ou non éligible): ${normalizedEmail}`,
      );
      return { success: true, message: genericMessage };
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashResetToken(rawToken);
    const expires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await this.prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpires: expires,
      },
    });

    const appUrl = this.resolveFrontendBaseUrl(appUrlOverride);
    const safeLocale = locale === 'ar' ? 'ar' : 'fr';
    const resetUrl = `${appUrl}/${safeLocale}/reinitialiser-mot-de-passe?token=${rawToken}`;

    await this.emailService.sendPasswordResetEmail({
      email: utilisateur.email,
      prenom: utilisateur.prenom,
      resetUrl,
      locale: safeLocale,
    });

    this.logger.log(`Lien de réinitialisation envoyé: ${utilisateur.email}`);

    return { success: true, message: genericMessage };
  }

  /**
   * Réinitialisation via le jeton reçu par email.
   */
  async resetPasswordWithToken(
    token: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Les mots de passe ne correspondent pas');
    }

    const tokenHash = this.hashResetToken(token.trim());
    const utilisateur = await this.prisma.utilisateur.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!utilisateur) {
      throw new BadRequestException('Lien invalide ou expiré. Demandez un nouveau lien.');
    }

    if (!this.canRequestPasswordReset(utilisateur)) {
      throw new BadRequestException('Ce compte ne peut pas réinitialiser son mot de passe.');
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await this.prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: {
        tempPassword: hashed,
        passwordResetTokenHash: null,
        passwordResetExpires: null,
        statut: utilisateur.statut === 'INVITED' ? 'ACTIVE' : utilisateur.statut,
        activeLe: utilisateur.activeLe ?? new Date(),
      },
    });

    this.logger.log(`Mot de passe réinitialisé: ${utilisateur.email}`);

    return {
      success: true,
      message: 'Mot de passe réinitialisé avec succès. Vous pouvez vous connecter.',
    };
  }
}
