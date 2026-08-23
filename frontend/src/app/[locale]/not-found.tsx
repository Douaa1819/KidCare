"use client"

import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { KidCareNotFound } from "@/components/kidcare-not-found"
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config"

export default function LocaleNotFoundPage() {
  const params = useParams()
  const t = useTranslations("notFound")

  const locale = (locales.includes(params.locale as Locale)
    ? params.locale
    : defaultLocale) as Locale

  return (
    <KidCareNotFound
      locale={locale}
      copy={{
        title: t("title"),
        headline: t("headline"),
        description: t("description"),
        backHome: t("backHome"),
        hint: t("hint"),
      }}
    />
  )
}
