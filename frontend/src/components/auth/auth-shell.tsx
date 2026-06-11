import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Card } from "@/components/ui/card"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { Locale } from "@/lib/i18n/config"

type AuthShellProps = {
  locale: Locale
  title: string
  subtitle: string
  children: React.ReactNode
  backHref?: string
  backLabel?: string
}

export function AuthShell({
  locale,
  title,
  subtitle,
  children,
  backHref,
  backLabel,
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#AEDFF7]/30 via-[#FFF7ED] to-[#FF6F61]/25 flex items-center justify-center px-4 py-8">
      <div className="container mx-auto">
        <div className="flex justify-end mb-6">
          <LanguageSwitcher currentLocale={locale} />
        </div>

        <div className="max-w-md mx-auto">
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full overflow-hidden mb-4 shadow-md bg-white">
              <Image
                src="/Group 13.svg"
                alt="Logo PetitsPas"
                width={80}
                height={80}
              />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-1 tracking-tight text-center">
              {title}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground text-center max-w-xs">
              {subtitle}
            </p>
          </div>

          <Card className="p-6 md:p-7 bg-white shadow-md rounded-2xl space-y-0">
            {children}
            {backHref && backLabel ? (
              <div className="mt-6 pt-5 border-t border-gray-100">
                <Link
                  href={backHref}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:border-[#AEDFF7] hover:bg-[#AEDFF7]/20 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6F61]/40"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0 text-[#FF6F61]" aria-hidden />
                  {backLabel}
                </Link>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </main>
  )
}
