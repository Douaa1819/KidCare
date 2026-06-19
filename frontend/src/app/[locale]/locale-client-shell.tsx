"use client"

import { NextIntlClientProvider, IntlError, IntlErrorCode, type AbstractIntlMessages } from "next-intl"
import { I18nProvider } from "@/providers/i18n-provider"
import { AppToaster } from "@/components/ui/app-toaster"
import { ReactNode } from "react"
import type { Locale } from "@/lib/i18n/config"
import frMessages from "@/messages/fr.json"
import arMessages from "@/messages/ar.json"
import registrationFr from "@/messages/registration-fr.json"
import registrationAr from "@/messages/registration-ar.json"
import { initFeedbackMessages } from "@/lib/feedback"

const MESSAGES_BY_LOCALE: Record<Locale, AbstractIntlMessages> = {
  fr: { ...frMessages, registration: registrationFr } as AbstractIntlMessages,
  ar: { ...arMessages, registration: registrationAr } as AbstractIntlMessages,
}

function onIntlError(error: IntlError) {
  if (error.code === IntlErrorCode.MISSING_MESSAGE) return
  console.error(error)
}

export function LocaleClientShell({
  locale,
  children,
}: {
  locale: Locale
  children: ReactNode
}) {
  const messages = MESSAGES_BY_LOCALE[locale] ?? MESSAGES_BY_LOCALE.fr
  const feedback = (messages as { feedback?: Record<string, string> }).feedback ?? {}
  initFeedbackMessages(feedback)

  return (
    <NextIntlClientProvider locale={locale} messages={messages} onError={onIntlError}>
      <I18nProvider initialLocale={locale}>
        {children}
        <AppToaster />
      </I18nProvider>
    </NextIntlClientProvider>
  )
}
