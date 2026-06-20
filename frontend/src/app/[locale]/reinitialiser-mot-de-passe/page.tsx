"use client"

import { use, useState, FormEvent, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Lock, KeyRound } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { InlineAlert } from "@/components/ui/inline-alert"
import { AuthShell } from "@/components/auth/auth-shell"
import { Locale } from "@/lib/i18n/config"

const PASSWORD_RULE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

function ResetPasswordForm({ locale }: { locale: Locale }) {
  const t = useTranslations("resetPassword")
  const searchParams = useSearchParams()
  const tokenFromUrl = searchParams.get("token") ?? ""

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!tokenFromUrl) {
      setError(t("missingToken"))
      return
    }
    if (!PASSWORD_RULE.test(newPassword)) {
      setError(t("passwordRules"))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t("passwordMismatch"))
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tokenFromUrl,
          newPassword,
          confirmPassword,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { message?: string }
      if (!res.ok) {
        const raw = data.message
        throw new Error(
          Array.isArray(raw) ? raw.join(" ") : typeof raw === "string" ? raw : t("errorGeneric"),
        )
      }
      setSuccess(data.message || t("successMessage"))
      setNewPassword("")
      setConfirmPassword("")
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorGeneric"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      locale={locale}
      title={t("title")}
      subtitle={t("subtitle")}
      backHref={`/${locale}`}
      backLabel={t("backToLogin")}
      animateLogo
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error ? (
          <InlineAlert variant="error" onDismiss={() => setError(null)}>
            {error}
          </InlineAlert>
        ) : null}
        {success ? (
          <InlineAlert variant="success" onDismiss={() => setSuccess(null)}>
            {success}
          </InlineAlert>
        ) : null}

        {!tokenFromUrl ? (
          <InlineAlert variant="error">{t("missingToken")}</InlineAlert>
        ) : null}

        <div className="space-y-2 text-left">
          <label htmlFor="newPassword" className="auth-label">
            {t("newPasswordLabel")}
          </label>
          <div className="relative">
            <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 auth-field-icon pointer-events-none" />
            <input
              id="newPassword"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={!tokenFromUrl || Boolean(success)}
              className="auth-field auth-field-focus"
              placeholder="••••••••"
            />
          </div>
          <p className="text-xs text-[var(--auth-text-muted)]">{t("passwordHint")}</p>
        </div>

        <div className="space-y-2 text-left">
          <label htmlFor="confirmPassword" className="auth-label">
            {t("confirmPasswordLabel")}
          </label>
          <div className="relative">
            <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 auth-field-icon pointer-events-none" />
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={!tokenFromUrl || Boolean(success)}
              className="auth-field auth-field-focus"
              placeholder="••••••••"
            />
          </div>
        </div>

        <Button
          type="submit"
          variant="auth"
          className="w-full font-semibold rounded-xl py-2.5"
          disabled={isSubmitting || !tokenFromUrl || Boolean(success)}
        >
          <KeyRound className="w-4 h-4 me-2" />
          {isSubmitting ? t("submitting") : t("submit")}
        </Button>
      </form>
    </AuthShell>
  )
}

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = use(params)

  return (
    <Suspense fallback={null}>
      <ResetPasswordForm locale={locale} />
    </Suspense>
  )
}
