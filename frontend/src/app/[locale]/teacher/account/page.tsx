"use client"

import { useState } from "react"
import Link from "next/link"
import { use } from "react"
import { useTranslations } from "next-intl"
import { ArrowLeft, KeyRound } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiClient } from "@/lib/api"
import { Locale } from "@/lib/i18n/config"
import { notifyError, notifySuccess } from "@/lib/feedback"

export default function TeacherAccountPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params)
  const t = useTranslations("teacher.dashboard.accountMenu")
  const tc = useTranslations("parent")
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" })
  const [saving, setSaving] = useState(false)

  const handlePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) {
      notifyError(tc("profile.passwordMismatch"))
      return
    }
    setSaving(true)
    try {
      await apiClient.changeAuthPassword(passwords.current, passwords.new, passwords.confirm)
      setPasswords({ current: "", new: "", confirm: "" })
      notifySuccess(tc("profile.passwordChanged"))
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: unknown } } }
      const msg = ax.response?.data?.message
      const text =
        typeof msg === "string" ? msg : Array.isArray(msg) ? msg.join(" ") : tc("ui.passwordErrorGeneric")
      notifyError(text)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-8 space-y-4">
      <Button variant="ghost" size="sm" className="h-9 px-2 -ml-2" asChild>
        <Link href={`/${locale}/teacher`} className="flex items-center gap-1.5 text-gray-700">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">{t("backToDashboard")}</span>
        </Link>
      </Button>

      <div>
        <h1 className="text-xl font-bold text-gray-900">{t("accountTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("accountSubtitle")}</p>
      </div>

      <Card className="border border-sky-100 bg-white shadow-sm rounded-2xl">
        <CardHeader className="border-b border-sky-100 pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-sky-600" aria-hidden />
            {tc("profile.passwordCardTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {(
            [
              { key: "current" as const, label: tc("profile.currentPasswordLabel") },
              { key: "new" as const, label: tc("profile.newPasswordLabel") },
              { key: "confirm" as const, label: tc("ui.confirmPasswordShort") },
            ] as const
          ).map(field => (
            <div key={field.key}>
              <p className="mb-1 text-xs font-medium text-gray-600">{field.label}</p>
              <Input
                type="password"
                value={passwords[field.key]}
                onChange={e => setPasswords(p => ({ ...p, [field.key]: e.target.value }))}
                className="h-10"
                autoComplete={field.key === "current" ? "current-password" : "new-password"}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="primary"
            onClick={() => void handlePasswordChange()}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? "…" : tc("profile.saveButton")}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
