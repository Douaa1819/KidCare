import { ConfigService } from '@nestjs/config';
import type { AuditContext } from '../../modules/platform/audit.service';

export type InscriptionParentContact = {
  email: string;
  prenom: string;
  nom: string;
  parentName: string;
  enfantFullName: string;
  locale?: 'fr' | 'ar';
};

function contactFromRecord(
  record: Record<string, unknown> | null | undefined,
  enfantFullName: string,
  locale: 'fr' | 'ar',
): InscriptionParentContact | null {
  if (!record || typeof record.email !== 'string' || !record.email.trim()) return null;
  const prenom = typeof record.prenom === 'string' ? record.prenom : '';
  const nom = typeof record.nom === 'string' ? record.nom : '';
  return {
    email: record.email.trim().toLowerCase(),
    prenom,
    nom,
    parentName: `${prenom} ${nom}`.trim() || 'Parent',
    enfantFullName,
    locale,
  };
}

export function extractAllInscriptionParentContacts(
  payload: Record<string, unknown>,
): InscriptionParentContact[] {
  const enfantFullName = formatEnfantFullName(payload);
  const famille = payload.famille as Record<string, unknown> | undefined;
  const langue = famille?.languePreferee;
  const locale: 'fr' | 'ar' = langue === 'ar' ? 'ar' : 'fr';
  const seen = new Set<string>();
  const contacts: InscriptionParentContact[] = [];

  const push = (contact: InscriptionParentContact | null) => {
    if (!contact || seen.has(contact.email)) return;
    seen.add(contact.email);
    contacts.push(contact);
  };

  const tuteurs = Array.isArray(payload.tuteurs) ? payload.tuteurs : [];
  for (const t of tuteurs) {
    push(contactFromRecord(t as Record<string, unknown>, enfantFullName, locale));
  }

  push(contactFromRecord(payload.mere as Record<string, unknown>, enfantFullName, locale));
  push(contactFromRecord(payload.pere as Record<string, unknown>, enfantFullName, locale));

  if (typeof famille?.emailPrincipal === 'string' && famille.emailPrincipal.trim()) {
    push({
      email: famille.emailPrincipal.trim().toLowerCase(),
      prenom: '',
      nom: '',
      parentName: 'Parent',
      enfantFullName,
      locale,
    });
  }

  return contacts;
}

export function extractInscriptionParentContact(payload: Record<string, unknown>): InscriptionParentContact | null {
  const tuteurs = Array.isArray(payload.tuteurs) ? payload.tuteurs : [];
  const mere = payload.mere as Record<string, unknown> | undefined;
  const pere = payload.pere as Record<string, unknown> | undefined;
  const famille = payload.famille as Record<string, unknown> | undefined;

  const principal =
    tuteurs.find((t: Record<string, unknown>) => t.principal && t.email) ||
    tuteurs.find((t: Record<string, unknown>) => t.email) ||
    (mere?.email ? mere : null) ||
    (pere?.email ? pere : null);

  const emailRaw =
    (typeof famille?.emailPrincipal === 'string' ? famille.emailPrincipal : '') ||
    (typeof (principal as Record<string, unknown>)?.email === 'string'
      ? ((principal as Record<string, unknown>).email as string)
      : '') ||
    (typeof mere?.email === 'string' ? mere.email : '') ||
    (typeof pere?.email === 'string' ? pere.email : '');

  const email = emailRaw.trim().toLowerCase();
  if (!email) return null;

  const prenom =
    (typeof (principal as Record<string, unknown>)?.prenom === 'string'
      ? ((principal as Record<string, unknown>).prenom as string)
      : '') ||
    (typeof mere?.prenom === 'string' ? mere.prenom : '') ||
    (typeof pere?.prenom === 'string' ? pere.prenom : '');

  const nom =
    (typeof (principal as Record<string, unknown>)?.nom === 'string'
      ? ((principal as Record<string, unknown>).nom as string)
      : '') ||
    (typeof mere?.nom === 'string' ? mere.nom : '') ||
    (typeof pere?.nom === 'string' ? pere.nom : '');

  const enfantFullName = formatEnfantFullName(payload);
  const langue = (payload.famille as { languePreferee?: string })?.languePreferee;
  const locale: 'fr' | 'ar' = langue === 'ar' ? 'ar' : 'fr';

  return {
    email,
    prenom,
    nom,
    parentName: `${prenom} ${nom}`.trim() || 'Parent',
    enfantFullName,
    locale,
  };
}

export function extractEnfantFromPayload(payload: Record<string, unknown>): {
  prenom: string;
  nom: string;
} {
  const enfant = (payload.enfant ?? {}) as Record<string, unknown>;
  const prenom =
    (typeof enfant.prenom === 'string' ? enfant.prenom : '') ||
    (typeof enfant.childFirstName === 'string' ? enfant.childFirstName : '') ||
    (typeof enfant.firstName === 'string' ? enfant.firstName : '');
  const nom =
    (typeof enfant.nom === 'string' ? enfant.nom : '') ||
    (typeof enfant.childLastName === 'string' ? enfant.childLastName : '') ||
    (typeof enfant.lastName === 'string' ? enfant.lastName : '');
  return {
    prenom: prenom.trim(),
    nom: nom.trim(),
  };
}

/** Nom complet enfant pour emails : « Prénom Nom » */
export function formatEnfantFullName(payload: Record<string, unknown>): string {
  const { prenom, nom } = extractEnfantFromPayload(payload);
  const full = `${prenom} ${nom}`.trim();
  return full || 'votre enfant';
}

export function auditContextFromRequest(req?: {
  user?: { userId?: string; email?: string };
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}): AuditContext {
  const ua = req?.headers?.['user-agent'];
  return {
    userId: req?.user?.userId,
    userEmail: req?.user?.email,
    ip: req?.ip,
    userAgent: Array.isArray(ua) ? ua[0] : ua,
  };
}

export function getAdminNotificationEmail(config: ConfigService): string | null {
  const email = config.get<string>('ADMIN_EMAIL')?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}
