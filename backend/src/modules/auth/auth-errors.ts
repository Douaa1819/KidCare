import { HttpException, HttpStatus } from '@nestjs/common';

export const AuthErrorCode = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  ACCOUNT_ARCHIVED: 'ACCOUNT_ARCHIVED',
  INVITATION_EXPIRED: 'INVITATION_EXPIRED',
  ACCOUNT_NOT_ACTIVATED: 'ACCOUNT_NOT_ACTIVATED',
  ACCESS_RESTRICTED: 'ACCESS_RESTRICTED',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

export type AuthErrorCode = (typeof AuthErrorCode)[keyof typeof AuthErrorCode];

export type AuthErrorBody = {
  code: AuthErrorCode;
  message: string;
};

export function authHttpException(
  code: AuthErrorCode,
  status: HttpStatus = HttpStatus.BAD_REQUEST,
  message?: string,
): HttpException {
  return new HttpException(
    {
      code,
      message: message ?? defaultMessageForCode(code),
    } satisfies AuthErrorBody,
    status,
  );
}

function defaultMessageForCode(code: AuthErrorCode): string {
  const map: Record<AuthErrorCode, string> = {
    USER_NOT_FOUND: 'Aucun compte associé à cette adresse email',
    INVALID_PASSWORD: 'Mot de passe incorrect',
    ACCOUNT_DISABLED: 'Compte désactivé',
    ACCOUNT_ARCHIVED: 'Compte archivé',
    INVITATION_EXPIRED: 'Invitation expirée',
    ACCOUNT_NOT_ACTIVATED: 'Compte non activé',
    ACCESS_RESTRICTED: 'Accès restreint',
    TOO_MANY_ATTEMPTS: 'Trop de tentatives',
    SERVER_ERROR: 'Erreur serveur',
  };
  return map[code];
}

/** Durée d'invitation par défaut (jours) si non configurée en plateforme. */
export const DEFAULT_INVITATION_EXPIRATION_DAYS = 7;

export function isInvitationExpired(
  inviteLe: Date | null | undefined,
  expirationDays: number,
): boolean {
  if (!inviteLe) return false;
  const expiresAt = new Date(inviteLe);
  expiresAt.setDate(expiresAt.getDate() + expirationDays);
  return new Date() > expiresAt;
}
