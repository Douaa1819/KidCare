import Link from "next/link"
import { Footprints, Home, MapPinOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import type { Locale } from "@/lib/i18n/config"

export type KidCareNotFoundCopy = {
  title: string
  headline: string
  description: string
  backHome: string
  hint: string
}

type KidCareNotFoundProps = {
  locale: Locale
  copy: KidCareNotFoundCopy
}

export function KidCareNotFound({ locale, copy }: KidCareNotFoundProps) {
  const homeHref = `/${locale}`

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-violet-100 via-purple-50 to-indigo-100 flex items-center justify-center px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-violet-300/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -right-20 h-64 w-64 rounded-full bg-purple-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 left-1/4 h-56 w-56 rounded-full bg-indigo-200/30 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-6 flex justify-end">
          <LanguageSwitcher currentLocale={locale} variant="toggle" />
        </div>

        <div className="mb-8 flex flex-col items-center text-center">
          <p className="brand-wordmark">KidCare</p>
        </div>

        <Card className="overflow-hidden rounded-3xl border border-violet-200/60 bg-white p-0 shadow-lg">
          <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50 via-white to-purple-50 px-6 py-8 text-center">
            <div className="relative mx-auto mb-4 flex w-fit items-center justify-center">
              <span
                className="select-none bg-gradient-to-br from-violet-700 via-purple-600 to-indigo-500 bg-clip-text text-8xl font-black leading-none tracking-tighter text-transparent"
                aria-hidden
              >
                404
              </span>
              <MapPinOff
                className="absolute -right-8 -top-2 h-8 w-8 text-violet-500 opacity-90"
                aria-hidden
              />
            </div>

            <div className="mb-4 flex items-center justify-center gap-2 text-violet-500/70" aria-hidden>
              <Footprints className="h-4 w-4 rotate-[-12deg]" />
              <Footprints className="h-5 w-5" />
              <Footprints className="h-4 w-4 rotate-[12deg] opacity-40" />
              <span className="mx-1 text-lg text-purple-500">?</span>
            </div>

            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{copy.headline}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.description}</p>
          </div>

          <div className="space-y-4 px-6 py-6">
            <p className="text-center text-xs text-gray-500">{copy.hint}</p>

            <Button
              asChild
              variant="brand"
              className="h-11 w-full rounded-2xl text-base font-semibold shadow-md"
            >
              <Link href={homeHref}>
                <Home className="h-4 w-4" aria-hidden />
                {copy.backHome}
              </Link>
            </Button>
          </div>
        </Card>

        <p className="mt-6 text-center text-[11px] text-gray-400">{copy.title}</p>
      </div>
    </main>
  )
}
