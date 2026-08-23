/* eslint-disable prettier/prettier, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import {
  LoginDto,
  LoginResponseDto,
  ChangePasswordDto,
  ChangePasswordResponseDto,
  RefreshTokenDto,
  LogoutDto,
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
  ResetPasswordDto,
  ResetPasswordResponseDto,
} from './dto';
import { VerifyTokenDto } from './dto/verify-token.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { AuditService } from '../platform/audit.service';
import {
  AuthErrorCode,
  authHttpException,
  DEFAULT_INVITATION_EXPIRATION_DAYS,
  isInvitationExpired,
} from './auth-errors';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly adminEmail: string;
  private readonly adminPassword: string;
  private readonly jwtSecret: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private authService: AuthService,
    private auditService: AuditService,
  ) {
    this.adminEmail = this.configService.get('ADMIN_EMAIL', 'admin@demo.kidcare.app');
    this.adminPassword = this.configService.get('ADMIN_PASSWORD', 'change_me');
    this.jwtSecret = this.configService.get('JWT_SECRET', 'dev_secret');
  }

  /**
   * Connexion admin
   */
  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ auth: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion admin' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Connexion réussie', type: LoginResponseDto })
  @ApiResponse({ status: 400, description: 'Email ou mot de passe incorrect' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: { ip?: string; headers?: Record<string, string> },
  ): Promise<LoginResponseDto> {
    const authMode = this.configService.get('AUTH_MODE', 'LOCAL');
    if (authMode === 'SUPABASE') {
      throw new BadRequestException(
        'Endpoint non disponible en production. Utiliser Supabase Auth.',
      );
    }

    const auditCtx = {
      userEmail: dto.email,
      ip: req.ip,
      userAgent: req.headers?.['user-agent'],
    };

    const adminEmailNorm = this.adminEmail.trim().toLowerCase();
    const dtoEmailNorm = dto.email.trim().toLowerCase();

    if (dtoEmailNorm !== adminEmailNorm) {
      this.logger.warn(`Tentative de connexion admin échouée: ${dto.email}`);
      await this.auditService.log('login.failed', auditCtx, 'Auth', undefined, { email: dto.email });
      throw authHttpException(AuthErrorCode.INVALID_PASSWORD);
    }
    if (dto.password !== this.adminPassword) {
      this.logger.warn(`Tentative de connexion admin échouée: ${dto.email}`);
      await this.auditService.log('login.failed', auditCtx, 'Auth', undefined, { email: dto.email });
      throw authHttpException(AuthErrorCode.INVALID_PASSWORD);
    }

    const { accessToken, refreshToken } = this.authService.issueTokenPair({
      email: this.adminEmail,
      role: 'SUPER_ADMIN',
      userId: 'admin_dev',
    });

    await this.auditService.log('login.success', { ...auditCtx, userId: 'admin_dev' }, 'Auth', 'admin_dev');
    this.logger.log(`Super Admin connecté: ${this.adminEmail}`);

    return {
      accessToken,
      refreshToken,
      userId: 'admin_dev',
      role: 'SUPER_ADMIN',
      email: this.adminEmail,
    };
  }

  /**
   * Connexion utilisateur (enseignant/parent)
   */
  @Post('login-user')
  @UseGuards(ThrottlerGuard)
  @Throttle({ auth: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion utilisateur (enseignant/parent)' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Connexion réussie', type: LoginResponseDto })
  @ApiResponse({ status: 400, description: 'Email ou mot de passe incorrect' })
  async loginUser(
    @Body() dto: LoginDto,
    @Req() req: { ip?: string; headers?: Record<string, string> },
  ): Promise<LoginResponseDto> {
    const authMode = this.configService.get('AUTH_MODE', 'LOCAL');
    if (authMode === 'SUPABASE') {
      throw new BadRequestException(
        'Endpoint non disponible en production. Utiliser Supabase Auth.',
      );
    }

    const ip = req.ip;
    const userAgent = req.headers?.['user-agent'];
    const emailNorm = dto.email.trim().toLowerCase();

    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { email: emailNorm },
      include: { accessRestriction: true },
    });

    const logLogin = async (success: boolean, userId?: string) => {
      await this.prisma.loginHistory.create({
        data: { email: emailNorm, success, ip, userAgent, utilisateurId: userId },
      });
    };

    if (!utilisateur || utilisateur.deletedAt) {
      this.logger.warn(`Connexion échouée: ${emailNorm} (email introuvable)`);
      await logLogin(false);
      await this.auditService.log('login.failed', { userEmail: emailNorm, ip, userAgent }, 'Auth');
      throw authHttpException(AuthErrorCode.USER_NOT_FOUND);
    }

    if (utilisateur.statut === 'ARCHIVED' || utilisateur.archivedAt) {
      this.logger.warn(`Connexion échouée: ${emailNorm} (compte archivé)`);
      await logLogin(false, utilisateur.id);
      throw authHttpException(AuthErrorCode.ACCOUNT_ARCHIVED);
    }

    if (utilisateur.statut === 'DISABLED') {
      this.logger.warn(`Connexion échouée: ${emailNorm} (compte désactivé)`);
      await logLogin(false, utilisateur.id);
      throw authHttpException(AuthErrorCode.ACCOUNT_DISABLED);
    }

    if (utilisateur.accessRestriction?.cannotLogin) {
      await logLogin(false, utilisateur.id);
      throw authHttpException(AuthErrorCode.ACCOUNT_DISABLED);
    }

    const invitationDays = await this.getInvitationExpirationDays();
    if (
      utilisateur.statut === 'INVITED' &&
      isInvitationExpired(utilisateur.inviteLe, invitationDays)
    ) {
      await logLogin(false, utilisateur.id);
      throw authHttpException(AuthErrorCode.INVITATION_EXPIRED);
    }

    if (!utilisateur.tempPassword) {
      this.logger.warn(`Connexion échouée: ${emailNorm} (mot de passe absent)`);
      await logLogin(false, utilisateur.id);
      if (utilisateur.statut === 'INVITED') {
        throw authHttpException(AuthErrorCode.ACCOUNT_NOT_ACTIVATED);
      }
      throw authHttpException(AuthErrorCode.INVALID_PASSWORD);
    }

    const passwordMatch = await this.verifyPassword(dto.password, utilisateur.tempPassword);

    if (!passwordMatch) {
      this.logger.warn(`Connexion échouée: ${emailNorm} (mot de passe incorrect)`);
      await logLogin(false, utilisateur.id);
      await this.auditService.log('login.failed', { userId: utilisateur.id, userEmail: emailNorm, ip, userAgent }, 'Auth', utilisateur.id);
      throw authHttpException(AuthErrorCode.INVALID_PASSWORD);
    }

    if (
      !utilisateur.tempPassword.startsWith('$2b$') &&
      !utilisateur.tempPassword.startsWith('$2a$')
    ) {
      const hashed = await bcrypt.hash(dto.password.trim(), 10);
      await this.prisma.utilisateur.update({
        where: { id: utilisateur.id },
        data: { tempPassword: hashed },
      });
    }

    const now = new Date();
    await this.prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: {
        dernierAcces: now,
        ...(utilisateur.statut === 'INVITED'
          ? { statut: 'ACTIVE', activeLe: utilisateur.activeLe ?? now }
          : {}),
      },
    });

    await logLogin(true, utilisateur.id);
    await this.auditService.log('login.success', { userId: utilisateur.id, userEmail: dto.email, ip, userAgent }, 'Utilisateur', utilisateur.id);

    this.logger.log(`Utilisateur connecté: ${dto.email} (${utilisateur.role})`);

    const { accessToken, refreshToken } = this.authService.issueTokenPair({
      email: utilisateur.email,
      role: utilisateur.role,
      userId: utilisateur.id,
    });

    return {
      accessToken,
      refreshToken,
      userId: utilisateur.id,
      role: utilisateur.role,
      email: utilisateur.email,
    };
  }

  /**
   * Rafraîchir le JWT d’accès
   */
  @Post('refresh')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rafraîchir access token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Nouveau access token' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<{
    accessToken: string;
    userId: string;
    role: string;
    email: string;
  }> {
    const authMode = this.configService.get('AUTH_MODE', 'LOCAL');
    if (authMode === 'SUPABASE') {
      throw new BadRequestException(
        'Endpoint non disponible en production. Utiliser Supabase Auth.',
      );
    }
    return this.authService.refreshAccessToken(dto.refreshToken);
  }

  /**
   * Déconnexion — révoque access (et refresh optionnel) dans Redis si configuré
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Déconnexion' })
  @ApiBody({ type: LogoutDto })
  async logout(@Req() req: { user: { jti?: string; exp?: number } }, @Body() body: LogoutDto) {
    const authMode = this.configService.get('AUTH_MODE', 'LOCAL');
    if (authMode === 'SUPABASE') {
      return;
    }
    await this.authService.revokeAccessPayload(req.user);
    if (body?.refreshToken) {
      await this.authService.revokeRefreshTokenString(body.refreshToken);
    }
  }

  /**
   * Changer le mot de passe
   */
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Changer le mot de passe' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Mot de passe changé avec succès', type: ChangePasswordResponseDto })
  @ApiResponse({ status: 400, description: 'Ancien mot de passe incorrect' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: { user: { userId?: string; email?: string; jti?: string; exp?: number } },
  ): Promise<ChangePasswordResponseDto> {
    const user = req.user;

    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Les mots de passe ne correspondent pas');
    }

    if (dto.newPassword.length < 8) {
      throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères');
    }

    if (!user.userId || user.userId === 'admin_dev') {
      throw new BadRequestException('Action non disponible pour ce compte');
    }

    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: user.userId },
    });

    if (!utilisateur || !utilisateur.tempPassword) {
      throw new BadRequestException('Utilisateur non trouvé');
    }

    const oldPasswordMatch = await this.verifyPassword(dto.oldPassword, utilisateur.tempPassword);
    if (!oldPasswordMatch) {
      this.logger.warn(`Changement de mot de passe échoué: ${user.email}`);
      throw new BadRequestException('Ancien mot de passe incorrect');
    }

    const hashedNew = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.utilisateur.update({
      where: { id: user.userId },
      data: { tempPassword: hashedNew, activeLe: new Date(), statut: 'ACTIVE' },
    });

    await this.authService.revokeAccessPayload(user);

    this.logger.log(`Mot de passe changé: ${user.email}`);

    return { success: true, message: 'Mot de passe changé avec succès' };
  }

  /**
   * Mot de passe oublié — envoi d’un lien par email (comptes INVITED/ACTIVE uniquement)
   */
  @Post('forgot-password')
  @UseGuards(ThrottlerGuard)
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Demander un lien de réinitialisation du mot de passe' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, type: ForgotPasswordResponseDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<ForgotPasswordResponseDto> {
    const authMode = this.configService.get('AUTH_MODE', 'LOCAL');
    if (authMode === 'SUPABASE') {
      throw new BadRequestException(
        'Endpoint non disponible en production. Utiliser Supabase Auth.',
      );
    }
    return this.authService.requestPasswordReset(
      dto.email,
      dto.locale ?? 'fr',
      dto.appUrl,
    );
  }

  /**
   * Réinitialiser le mot de passe via le jeton reçu par email
   */
  @Post('reset-password')
  @UseGuards(ThrottlerGuard)
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Réinitialiser le mot de passe avec le jeton reçu par email' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, type: ResetPasswordResponseDto })
  @ApiResponse({ status: 400, description: 'Jeton invalide ou expiré' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<ResetPasswordResponseDto> {
    const authMode = this.configService.get('AUTH_MODE', 'LOCAL');
    if (authMode === 'SUPABASE') {
      throw new BadRequestException(
        'Endpoint non disponible en production. Utiliser Supabase Auth.',
      );
    }
    return this.authService.resetPasswordWithToken(
      dto.token,
      dto.newPassword,
      dto.confirmPassword,
    );
  }

  /**
   * Vérifier le token
   */
  @Post('verify')
  @UseGuards(ThrottlerGuard)
  @Throttle({ auth: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vérifier un token JWT' })
  async verify(@Body() dto: VerifyTokenDto) {
    try {
      const decoded = jwt.verify(dto.token, this.jwtSecret) as {
        role?: string;
        email?: string;
        userId?: string;
        exp?: number;
      };
      return {
        valid: true,
        role: decoded.role ?? null,
        email: decoded.email ?? null,
        userId: decoded.userId ?? null,
        exp: decoded.exp ?? null,
      };
    } catch {
      throw new BadRequestException('Token invalide ou expiré');
    }
  }

  /**
   * Vérification de mot de passe avec support migration plain text → bcrypt
   */
  private async getInvitationExpirationDays(): Promise<number> {
    try {
      const settings = await this.prisma.platformSettings.findUnique({
        where: { id: 'singleton' },
        select: { invitations: true },
      });
      const invitations = settings?.invitations as { invitationExpirationDays?: number } | null;
      const days = Number(invitations?.invitationExpirationDays);
      return Number.isFinite(days) && days > 0 ? days : DEFAULT_INVITATION_EXPIRATION_DAYS;
    } catch {
      return DEFAULT_INVITATION_EXPIRATION_DAYS;
    }
  }

  private async verifyPassword(provided: string, stored: string): Promise<boolean> {
    if (!provided || !stored) return false;

    if (stored.startsWith('$2b$') || stored.startsWith('$2a$')) {
      return bcrypt.compare(provided, stored);
    }

    return provided.trim() === stored.trim();
  }
}
