"use client"

import { use, useState, FormEvent, useRef, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { InlineAlert } from "@/components/ui/inline-alert"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { useTranslations } from "next-intl"
import { Locale } from "@/lib/i18n/config"
import { Mail, Lock, LogIn, Loader2 } from "lucide-react"
import { clearClientSessionCache } from "@/lib/auth-session"
import { dashboardPathForRole, normalizeAppRole } from "@/lib/auth/jwt-edge"
import type { AppRole } from "@/lib/auth/constants"
import { isValidEmail } from "@/lib/form-validation"
import {
  parseLoginResponse,
  SKIP_ADMIN_FALLBACK_CODES,
  type LoginField,
} from "@/lib/auth/login-errors"

export default function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const resolvedParams = use(params)
  const currentLocale = resolvedParams.locale
  const t = useTranslations("home")
  const tc = useTranslations("common.a11y")
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [errorField, setErrorField] = useState<LoginField | null>(null)

  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!errorField || isSubmitting) return
    if (errorField === "email") emailRef.current?.focus()
    else if (errorField === "password") passwordRef.current?.focus()
  }, [errorField, isSubmitting])

  function applyLoginError(parsed: { message: string; field: LoginField }) {
    setErrorField(parsed.field)
    if (parsed.field === "email") {
      setFieldErrors({ email: parsed.message })
      setFormError(null)
    } else if (parsed.field === "password") {
      setFieldErrors({ password: parsed.message })
      setFormError(null)
    } else {
      setFieldErrors({})
      setFormError(parsed.message)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setFieldErrors({})
    setErrorField(null)
    setIsSubmitting(true)

    const emailValue = email.trim()
    if (!isValidEmail(emailValue)) {
      const msg = t("errors.invalidEmail")
      setFieldErrors({ email: msg })
      setFormError(t("errors.fixEmail"))
      setErrorField("email")
      setIsSubmitting(false)
      return
    }
    if (!password) {
      const msg = t("errors.passwordRequired")
      setFieldErrors({ password: msg })
      setFormError(t("errors.enterPassword"))
      setErrorField("password")
      setIsSubmitting(false)
      return
    }

    try {
      clearClientSessionCache()

      const redirectForRole = (role: AppRole) => {
        router.replace(dashboardPathForRole(currentLocale, role))
      }

      const userRes = await fetch("/api/auth/login-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: emailValue, password }),
      })

      if (userRes.ok) {
        const data = (await userRes.json()) as { role?: string }
        const role = normalizeAppRole(data.role)
        if (role) {
          redirectForRole(role)
          return
        }
      }

      const userError = await parseLoginResponse(userRes, t)

      if (
        userError.code &&
        SKIP_ADMIN_FALLBACK_CODES.has(userError.code)
      ) {
        applyLoginError(userError)
        return
      }

      if (userRes.ok === false && userRes.status >= 500) {
        applyLoginError(userError)
        return
      }

      const adminRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: emailValue, password }),
      })

      if (adminRes.ok) {
        const adminData = (await adminRes.json()) as { role?: string }
        const adminRole = normalizeAppRole(adminData.role) || "SUPER_ADMIN"
        redirectForRole(adminRole)
        return
      }

      const adminError = await parseLoginResponse(adminRes, t)

      // Priorité : erreur la plus spécifique (email inconnu > mot de passe)
      if (userError.code === "USER_NOT_FOUND") {
        applyLoginError(userError)
      } else if (userError.code === "INVALID_PASSWORD" || adminError.code === "INVALID_PASSWORD") {
        applyLoginError({
          ...userError,
          code: "INVALID_PASSWORD",
          field: "password",
          message: userError.code === "INVALID_PASSWORD" ? userError.message : adminError.message,
        })
      } else {
        applyLoginError(userError.code ? userError : adminError)
      }
    } catch {
      applyLoginError({
        message: t("errors.codes.SERVER_ERROR"),
        field: "form",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#AEDFF7]/30 via-[#FFF7ED] to-[#FF6F61]/25 flex items-center justify-center px-4 py-8">
      <div className="container mx-auto">
        <div className="flex justify-end mb-6">
          <LanguageSwitcher currentLocale={currentLocale} />
        </div>

        <div className="max-w-md mx-auto">
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full overflow-hidden mb-4 shadow-md bg-white">
              <Image
                src="/Group 13.svg"
                alt={tc("logoAlt")}
                width={80}
                height={80}
              />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-1 tracking-tight">
              {t("title")}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground text-center max-w-xs">
              {t("subtitle")}
            </p>
          </div>

          <Card className="p-6 md:p-7 bg-white shadow-md rounded-2xl">
            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              {formError ? (
                <InlineAlert variant="error" onDismiss={() => setFormError(null)}>
                  {formError}
                </InlineAlert>
              ) : null}
              <div className="space-y-2 text-start">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  {t("emailLabel")}
                </label>
                <div className="relative">
                  <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    ref={emailRef}
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setFormError(null)
                      setFieldErrors((prev) => ({ ...prev, email: undefined }))
                      setErrorField(null)
                    }}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? "email-error" : undefined}
                    className={`w-full rounded-xl border bg-background ps-9 pe-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 ${
                      fieldErrors.email
                        ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                        : "border-input focus:border-primary focus:ring-primary/40"
                    }`}
                    placeholder={t("emailPlaceholder")}
                  />
                </div>
                {fieldErrors.email ? (
                  <p id="email-error" className="text-xs text-red-600" role="alert">
                    {fieldErrors.email}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2 text-start">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  {t("passwordLabel")}
                </label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    ref={passwordRef}
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setFormError(null)
                      setFieldErrors((prev) => ({ ...prev, password: undefined }))
                      setErrorField(null)
                    }}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? "password-error" : undefined}
                    className={`w-full rounded-xl border bg-background ps-9 pe-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 ${
                      fieldErrors.password
                        ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                        : "border-input focus:border-primary focus:ring-primary/40"
                    }`}
                    placeholder={t("passwordPlaceholder")}
                  />
                </div>
                {fieldErrors.password ? (
                  <p id="password-error" className="text-xs text-red-600" role="alert">
                    {fieldErrors.password}
                  </p>
                ) : null}
                <p className="text-end pt-0.5">
                  <Link
                    href={`/${currentLocale}/mot-de-passe-oublie`}
                    className="text-xs text-[#FF6F61] hover:underline font-medium"
                  >
                    {t("forgotPasswordLink")}
                  </Link>
                </p>
              </div>

              <Button
                type="submit"
                className="w-full mt-2 bg-[#FF6F61] hover:bg-[#e45f54] text-white font-semibold rounded-xl py-2.5"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                    {t("submitting")}
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 me-2" />
                    {t("submit")}
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 text-center text-xs md:text-sm text-muted-foreground">
              <span>{t("notRegistered")} </span>
              <Link
                href={`/${currentLocale}/inscriptions`}
                className="text-primary hover:underline"
              >
                {t("inscriptionLink")}
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </main>
  )
}
