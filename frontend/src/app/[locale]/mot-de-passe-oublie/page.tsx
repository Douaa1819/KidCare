"use client"

import { use, useState, FormEvent } from "react"
import { Mail, Send } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { InlineAlert } from "@/components/ui/inline-alert"
import { AuthShell } from "@/components/auth/auth-shell"
import { Locale } from "@/lib/i18n/config"
import { isValidEmail } from "@/lib/form-validation"

export default function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = use(params)
  const t = useTranslations("forgotPassword")
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setFieldError(null)

    const emailValue = email.trim()
    if (!isValidEmail(emailValue)) {
      setFieldError(t("invalidEmail"))
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue, locale }),
      })
      const data = (await res.json().catch(() => ({}))) as { message?: string }
      if (!res.ok) {
        const raw = data.message
        throw new Error(
          Array.isArray(raw) ? raw.join(" ") : typeof raw === "string" ? raw : t("errorGeneric"),
        )
      }
      setSuccess(data.message || t("successMessage"))
      setEmail("")
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

        <div className="space-y-2 text-left">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            {t("emailLabel")}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setFieldError(null)
                setError(null)
              }}
              className={`w-full rounded-xl border bg-background pl-9 pr-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 ${
                fieldError
                  ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                  : "border-input focus:border-primary focus:ring-primary/40"
              }`}
              placeholder="exemple@thepetitspas.com"
            />
          </div>
          {fieldError ? <p className="text-xs text-red-600">{fieldError}</p> : null}
        </div>

        <Button
          type="submit"
          variant="brand"
          className="w-full font-semibold rounded-xl py-2.5"
          disabled={isSubmitting}
        >
          <Send className="w-4 h-4 mr-2" />
          {isSubmitting ? t("submitting") : t("submit")}
        </Button>
      </form>
    </AuthShell>
  )
}
