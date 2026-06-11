import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";

/** Lit NEXT_LOCALE (cookie non sensible, pas un jeton d’auth). */
export function readLocaleCookie(): Locale {
  if (typeof document === "undefined") return defaultLocale;
  const match = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]*)/);
  const value = match ? decodeURIComponent(match[1]) : "";
  return locales.includes(value as Locale) ? (value as Locale) : defaultLocale;
}
