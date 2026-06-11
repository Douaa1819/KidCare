import { BadRequestException } from '@nestjs/common';
import * as path from 'path';

/** Jour calendaire ISO (YYYY-MM-DD). */
export const CALENDAR_DATE_YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Types MIME autorisés pour les photos d'activités (pas de SVG — risque XSS). */
export const ACTIVITY_PHOTO_MIME_REGEX = /^image\/(jpeg|png|webp|gif)$/;

export const ALLOWED_ACTIVITY_PHOTO_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const ACTIVITY_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const ACTIVITY_PHOTO_MIN_BYTES = 12;

/** Nom de fichier sans chemin ni caractères de contrôle. */
export const SAFE_UPLOAD_FILENAME_REGEX = /^[a-zA-Z0-9._ -]{1,200}$/;

/** Légende : texte court sans caractères de contrôle. */
export const SAFE_PHOTO_LEGENDE_REGEX = /^[^\x00-\x08\x0B\x0C\x0E-\x1F]*$/;

export function isValidCalendarDateYmd(ymd: string): boolean {
  const m = ymd.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === mo - 1 &&
    dt.getUTCDate() === d
  );
}

function bufferStartsWith(buf: Buffer, sig: number[], offset = 0): boolean {
  if (buf.length < offset + sig.length) return false;
  return sig.every((byte, i) => buf[offset + i] === byte);
}

/** Détection du type réel via signatures magiques (ne se fie pas au MIME client). */
export function detectImageMimeFromBuffer(buffer: Buffer): string | null {
  if (!buffer?.length || buffer.length < ACTIVITY_PHOTO_MIN_BYTES) {
    return null;
  }
  if (bufferStartsWith(buffer, [0xff, 0xd8, 0xff])) {
    return 'image/jpeg';
  }
  if (bufferStartsWith(buffer, [0x89, 0x50, 0x4e, 0x47])) {
    return 'image/png';
  }
  if (bufferStartsWith(buffer, [0x47, 0x49, 0x46, 0x38])) {
    return 'image/gif';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

function normalizeDeclaredMime(mime: string): string {
  const lower = mime.toLowerCase().trim();
  return lower === 'image/jpg' ? 'image/jpeg' : lower;
}

export function assertAllowedStoredImageMime(mimeType: string): string {
  const normalized = normalizeDeclaredMime(mimeType ?? '');
  if (!ALLOWED_ACTIVITY_PHOTO_MIME_TYPES.has(normalized)) {
    throw new BadRequestException('Type MIME image non autorisé');
  }
  return normalized;
}

export function assertSafeUploadFilename(originalName: string | undefined): void {
  if (!originalName?.trim()) return;
  const trimmed = originalName.trim();
  if (trimmed.includes('..') || /[\\/]/.test(trimmed)) {
    throw new BadRequestException('Nom de fichier non autorisé');
  }
  const base = path.basename(trimmed);
  if (!SAFE_UPLOAD_FILENAME_REGEX.test(base)) {
    throw new BadRequestException('Nom de fichier non autorisé');
  }
}

export function validateActivityPhotoUpload(
  file: Express.Multer.File | undefined,
): { mimeType: string } {
  if (!file?.buffer?.length) {
    throw new BadRequestException('Fichier image requis');
  }

  if (file.buffer.length > ACTIVITY_PHOTO_MAX_BYTES) {
    throw new BadRequestException(
      `Fichier trop volumineux (max ${Math.floor(ACTIVITY_PHOTO_MAX_BYTES / (1024 * 1024))} Mo)`,
    );
  }

  if (file.buffer.length < ACTIVITY_PHOTO_MIN_BYTES) {
    throw new BadRequestException('Fichier image invalide ou vide');
  }

  const declared = normalizeDeclaredMime(file.mimetype ?? '');
  if (!ACTIVITY_PHOTO_MIME_REGEX.test(declared)) {
    throw new BadRequestException(
      'Type de fichier non autorisé (jpeg, png, webp, gif uniquement)',
    );
  }

  assertSafeUploadFilename(file.originalname);

  const detected = detectImageMimeFromBuffer(file.buffer);
  if (!detected) {
    throw new BadRequestException(
      'Fichier image invalide ou corrompu (signature non reconnue)',
    );
  }

  if (declared !== detected) {
    throw new BadRequestException(
      'Le type déclaré ne correspond pas au contenu réel du fichier',
    );
  }

  return { mimeType: detected };
}
