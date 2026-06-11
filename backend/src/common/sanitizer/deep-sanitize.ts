import sanitizeHtml from 'sanitize-html';
import { sanitiserConfig } from './sanitiser-config';
import {
  RICH_TEXT_FIELD_KEYS,
  richTextSanitizerConfig,
} from './rich-text-sanitizer-config';

/** Clés à ne pas modifier (mots de passe, jetons). */
const SKIP_VALUE_KEYS = new Set([
  'password',
  'oldPassword',
  'newPassword',
  'confirmPassword',
  'tempPassword',
  'accessToken',
  'refreshToken',
  'token',
  'authorization',
]);

export function deepSanitizeJsonBody(
  value: unknown,
  parentKey?: string,
): unknown {
  if (value === null || value === undefined) return value;

  if (parentKey && SKIP_VALUE_KEYS.has(parentKey)) {
    return value;
  }

  if (typeof value === 'string') {
    const config =
      parentKey && RICH_TEXT_FIELD_KEYS.has(parentKey)
        ? richTextSanitizerConfig()
        : sanitiserConfig();
    return sanitizeHtml(value, config);
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepSanitizeJsonBody(item));
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      out[key] = deepSanitizeJsonBody(obj[key], key);
    }
    return out;
  }

  return value;
}
