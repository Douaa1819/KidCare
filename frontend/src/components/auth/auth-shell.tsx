import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { AuthBackgroundShapes } from "@/components/auth/auth-background-shapes"
import { Locale } from "@/lib/i18n/config"

type AuthShellProps = {
  locale: Locale
  title: string
  subtitle: string
  children: React.ReactNode
  backHref?: string
  backLabel?: string
  /** md = login card, lg = multi-step forms */
  maxWidth?: "md" | "lg"
  /** Skip outer auth-card wrapper (multi-step flows with their own cards) */
  bareContent?: boolean
  /** Soft logo entrance + float animation (login page) */
  animateLogo?: boolean
}

export function AuthShell({
  locale,
  title,
  subtitle,
  children,
  backHref,
  backLabel,
  maxWidth = "md",
  bareContent = false,
  animateLogo = false,
}: AuthShellProps) {
  const widthClass = maxWidth === "lg" ? "max-w-2xl" : "max-w-md"

  return (
    <main className="auth-page-bg flex items-center justify-center px-4 py-8 sm:py-10">
      <AuthBackgroundShapes />
      <div className="auth-page-inner container mx-auto w-full">
        <div className="mb-5 flex justify-end sm:mb-6">
          <LanguageSwitcher currentLocale={locale} variant="auth" />
        </div>

        <div className={`${widthClass} mx-auto`}>
          <header className="auth-hero flex flex-col items-center mb-6 sm:mb-8 text-center">
            <div
              className={`auth-hero-brand relative mb-5${animateLogo ? " auth-hero-brand--animated" : ""}`}
            >
              <span className="auth-hero-glow" aria-hidden />
              <div className="auth-logo-ring relative z-[1] w-[5.25rem] h-[5.25rem] sm:w-24 sm:h-24 rounded-full overflow-hidden bg-white flex items-center justify-center">
                <Image
                  src="/Group 13.svg"
                  alt="Logo PetitsPas"
                  width={80}
                  height={80}
                  className="w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem]"
                />
              </div>
            </div>
            <h1 className="auth-heading text-2xl sm:text-3xl font-semibold tracking-tight">
              {title}
            </h1>
            <p className="auth-subtitle mt-2 text-sm sm:text-base max-w-sm leading-relaxed">
              {subtitle}
            </p>
          </header>

          {bareContent ? (
            <>
              {children}
              {backHref && backLabel ? (
                <div className="mt-6">
                  <Link href={backHref} className="auth-back-link">
                    <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                    {backLabel}
                  </Link>
                </div>
              ) : null}
            </>
          ) : (
            <div className="auth-card">
              {children}
              {backHref && backLabel ? (
                <div className="mt-6 pt-5 border-t border-[var(--auth-border)]">
                  <Link href={backHref} className="auth-back-link">
                    <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                    {backLabel}
                  </Link>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
