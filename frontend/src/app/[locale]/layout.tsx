import { notFound } from "next/navigation"
import { ReactNode } from "react"
import { Locale, locales } from "@/lib/i18n/config"
import { LocaleClientShell } from "./locale-client-shell"

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: localeParam } = await params

  if (!locales.includes(localeParam as Locale)) {
    notFound()
  }

  return <LocaleClientShell locale={localeParam as Locale}>{children}</LocaleClientShell>
}
