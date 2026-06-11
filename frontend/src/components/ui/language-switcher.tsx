'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from './button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';
import { locales, type Locale, localeNames, localeFlags } from '@/lib/i18n/config';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  hrefForLocaleFromPathname,
  setNextIntlLocaleCookie,
} from '@/lib/i18n/locale-path';

const A11Y_BY_LOCALE: Record<Locale, { language: string; changeLanguage: string }> = {
  fr: { language: 'Langue', changeLanguage: 'Changer de langue' },
  ar: { language: 'اللغة', changeLanguage: 'تغيير اللغة' },
};

export function LanguageSwitcher({
  currentLocale,
  variant = 'menu',
  compact = false,
}: {
  currentLocale: Locale;
  variant?: 'menu' | 'toggle';
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const a11y = A11Y_BY_LOCALE[currentLocale];

  const switchLanguage = (newLocale: Locale) => {
    if (newLocale === currentLocale) return;
    setNextIntlLocaleCookie(newLocale);
    router.replace(hrefForLocaleFromPathname(pathname || '/', newLocale));
  };

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
              locale === currentLocale
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
          <span className="hidden sm:inline">{localeFlags[currentLocale]}</span>
          <span className="hidden sm:inline">{localeNames[currentLocale]}</span>
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
