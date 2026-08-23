"use client"

import { use, useState, FormEvent, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { InlineAlert } from "@/components/ui/inline-alert"
import { AuthShell } from "@/components/auth/auth-shell"
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

      if (userError.code === "USER_NOT_FOUND") {
        applyLoginError(userError)
      } else if (userError.code === "INVALID_PASSWORD" || adminError.code === "INVALID_PASSWORD") {
        applyLoginError({
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
    <AuthShell locale={currentLocale} title={t("title")} subtitle={t("subtitle")}>
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {formError ? (
          <InlineAlert variant="error" onDismiss={() => setFormError(null)}>
            {formError}
          </InlineAlert>
        ) : null}
        <div className="space-y-2 text-start">
          <label htmlFor="email" className="auth-label">
            {t("emailLabel")}
          </label>
          <div className="relative">
            <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 auth-field-icon pointer-events-none" />
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
              className={`auth-field auth-field-focus ${
                fieldErrors.email
                  ? "!border-red-400 focus:!border-red-500 focus:!ring-red-200"
                  : ""
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
          <label htmlFor="password" className="auth-label">
            {t("passwordLabel")}
          </label>
          <div className="relative">
            <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 auth-field-icon pointer-events-none" />
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
              className={`auth-field auth-field-focus ${
                fieldErrors.password
                  ? "!border-red-400 focus:!border-red-500 focus:!ring-red-200"
                  : ""
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
              className="auth-link-accent text-xs"
            >
              {t("forgotPasswordLink")}
            </Link>
          </p>
        </div>

        <Button
          type="submit"
          variant="brand"
          className="w-full rounded-xl py-2.5 font-semibold"
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

      <div className="mt-5 border-t border-[var(--auth-border)] pt-5 text-center auth-footer-text">
        <span>{t("notRegistered")} </span>
        <Link href={`/${currentLocale}/inscriptions`} className="auth-link-accent">
          {t("inscriptionLink")}
        </Link>
      </div>
    </AuthShell>
  )
}
