'use client';

import { useRouter, usePathname, useParams } from 'next/navigation';
import { Button } from './button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';
import { locales, type Locale, localeNames, localeFlags } from '@/lib/i18n/config';
import { Check, Globe, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  hrefForLocaleFromPathname,
  setNextIntlLocaleCookie,
} from '@/lib/i18n/locale-path';

const A11Y_BY_LOCALE: Record<Locale, { language: string; changeLanguage: string }> = {
  fr: { language: 'Langue', changeLanguage: 'Changer de langue' },
  ar: { language: 'اللغة', changeLanguage: 'تغيير اللغة' },
};

function resolveRouteLocale(params: ReturnType<typeof useParams>, fallback: Locale): Locale {
  const raw = params?.locale;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return locales.includes(value as Locale) ? (value as Locale) : fallback;
}

export function LanguageSwitcher({
  currentLocale,
  variant = 'menu',
  compact = false,
}: {
  currentLocale: Locale;
  variant?: 'menu' | 'toggle' | 'auth';
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const activeLocale = resolveRouteLocale(params, currentLocale);
  const a11y = A11Y_BY_LOCALE[activeLocale];

  const switchLanguage = (newLocale: Locale) => {
    if (newLocale === activeLocale) return;
    setNextIntlLocaleCookie(newLocale);
    const href = hrefForLocaleFromPathname(pathname || '/', newLocale);
    router.push(href);
  };

  if (variant === 'auth') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              'border border-[var(--auth-border)] bg-white/85 text-[var(--auth-text-muted)]',
              'transition-colors hover:border-[var(--auth-accent)]/25 hover:bg-white hover:text-[var(--auth-text)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)]/30 focus-visible:ring-offset-1',
            )}
            aria-label={a11y.changeLanguage}
          >
            <Languages className="h-4 w-4" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-[9.5rem] rounded-lg border-[var(--auth-border)] bg-white p-1 shadow-md"
        >
          {locales.map((locale) => (
            <DropdownMenuItem
              key={locale}
              onClick={() => switchLanguage(locale)}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm',
                'text-[var(--auth-text)] focus:bg-[var(--auth-accent-soft)] focus:text-[var(--auth-text)]',
              )}
              dir={locale === 'ar' ? 'rtl' : 'ltr'}
            >
              <span>{localeNames[locale]}</span>
              {locale === activeLocale ? (
                <Check
                  className="ms-auto h-3.5 w-3.5 shrink-0 text-[var(--auth-accent)]"
                  aria-hidden
                />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'toggle') {
    return (
      <div
        className={cn(
          'flex rounded-lg border border-sidebar-border bg-sidebar-accent/15 p-0.5',
          compact ? 'w-full flex-col gap-0.5' : 'w-full',
        )}
        role="group"
        aria-label={a11y.language}
      >
        {locales.map((locale) => (
          <button
            key={locale}
            type="button"
            onClick={() => switchLanguage(locale)}
            title={localeNames[locale]}
            className={cn(
              'rounded-md text-xs font-semibold transition-all',
              compact ? 'px-2 py-1.5' : 'flex-1 px-2 py-2',
              locale === activeLocale
                ? 'bg-background text-sidebar-foreground shadow-sm ring-1 ring-sidebar-border/80'
                : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/25',
            )}
          >
            <span className={cn('flex items-center justify-center', compact ? '' : 'gap-1.5')}>
              <span aria-hidden>{localeFlags[locale]}</span>
              {!compact && <span>{locale === 'fr' ? 'FR' : 'عربي'}</span>}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{localeFlags[activeLocale]}</span>
          <span className="hidden sm:inline">{localeNames[activeLocale]}</span>
          <span className="sr-only">{a11y.changeLanguage}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => switchLanguage(locale)}
            className="flex items-center gap-2"
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
          >
            <span>{localeFlags[locale]}</span>
            <span>{localeNames[locale]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
