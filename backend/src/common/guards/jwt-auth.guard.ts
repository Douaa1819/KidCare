import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { TokenBlacklistService } from '../redis/token-blacklist.service';

/**
 * Guard JWT pour authentifier les requêtes
 * En PROD: valide le JWT Supabase
 * En DEV: accepte les JWT locaux ou fallback admin
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly jwtSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly tokenBlacklist: TokenBlacklistService,
  ) {
    this.jwtSecret = this.configService.get('JWT_SECRET', 'dev_secret');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token manquant');
    }

    try {
      const decoded = this.verifyToken(token) as jwt.JwtPayload & {
        typ?: string;
        jti?: string;
      };

      if (decoded.typ === 'refresh') {
        throw new UnauthorizedException('Utiliser un access token');
      }
      if (decoded.typ && decoded.typ !== 'access') {
        throw new UnauthorizedException('Token invalide');
      }

      if (
        decoded.jti &&
        (await this.tokenBlacklist.isBlacklisted(decoded.jti))
      ) {
        throw new UnauthorizedException('Token révoqué');
      }

      request.user = decoded;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error(
        `Erreur validation JWT: ${error instanceof Error ? error.message : error}`,
      );
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }

  private extractToken(request: {
    headers?: { authorization?: string; cookie?: string };
  }): string | null {
    const authHeader = request.headers?.authorization;
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        return parts[1];
      }
    }

    const cookieHeader = request.headers?.cookie;
    if (!cookieHeader) return null;

    const names = ['pp_access', 'token', 'auth_token'];
    for (const name of names) {
      const match = cookieHeader.match(
        new RegExp(`(?:^|;\\s*)${name}=([^;]+)`),
      );
      if (match?.[1]) {
        try {
          return decodeURIComponent(match[1].trim());
        } catch {
          return match[1].trim();
        }
      }
    }

    return null;
  }

  private verifyToken(token: string): jwt.JwtPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as jwt.JwtPayload;
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }
}
