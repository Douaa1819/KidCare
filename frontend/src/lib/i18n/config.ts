/**
 * Configuration i18n avec next-intl
 */

export const locales = ['fr', 'ar'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'fr';

/** Aligné sur le backend (Africa/Casablanca). */
export const defaultTimeZone = 'Africa/Casablanca';

export const localeNames: Record<Locale, string> = {
  fr: 'Français',
  ar: 'العربية',
};

export const localeFlags: Record<Locale, string> = {
  fr: '🇫🇷',
  ar: '🇸🇦',
};

/**
 * Obtenir la direction pour une locale
 */
export function getLocaleDirection(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

/**
 * Vérifier si une locale est RTL
 */
export function isRTL(locale: Locale): boolean {
  return locale === 'ar';
}

