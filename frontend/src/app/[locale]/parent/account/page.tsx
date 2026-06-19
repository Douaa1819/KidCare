"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { use } from "react"
import { useTranslations } from "next-intl"
import { ArrowLeft, KeyRound, Mail, MapPin, Phone, UserRound } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MenaPhoneInput } from "@/components/ui/mena-phone-input"
import { apiClient } from "@/lib/api"
import { Locale } from "@/lib/i18n/config"
import { toast } from "sonner"
import { isValidPhone } from "@/lib/form-validation"

export default function ParentAccountPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params)
  const t = useTranslations("parent")
  const [profile, setProfile] = useState({ prenom: "", nom: "", email: "" })
  const [contactForm, setContactForm] = useState({ telephone: "", adresse: "" })
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" })
  const [passwordSaving, setPasswordSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadProfile() {
      try {
        setProfileLoading(true)
        const res = await apiClient.getParentProfile()
        if (cancelled) return
        const data = res.data ?? {}
        setProfile({
          prenom: data.prenom ?? "",
          nom: data.nom ?? "",
          email: data.email ?? "",
        })
        setContactForm({
          telephone: data.telephone ?? "",
          adresse: data.adresse ?? "",
        })
      } catch {
        if (!cancelled) toast.error(t("account.profileLoadError"))
      } finally {
        if (!cancelled) setProfileLoading(false)
      }
    }
    void loadProfile()
    return () => { cancelled = true }
  }, [t])

  const handleProfileSave = async () => {
    const telephone = contactForm.telephone.trim()
    const adresse = contactForm.adresse.trim()
    if (telephone && !isValidPhone(telephone)) {
      toast.error(t("account.phoneInvalid"))
      return
    }
    setProfileSaving(true)
    try {
      const res = await apiClient.updateParentMe({
        telephone: telephone || undefined,
        adresse: adresse || undefined,
      })
      const data = res.data ?? {}
      setContactForm({
        telephone: data.telephone ?? telephone,
        adresse: data.adresse ?? adresse,
      })
      toast.success(t("account.profileSaved"))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message
      const text = typeof msg === "string" ? msg : Array.isArray(msg) ? msg.join(" ") : t("account.profileSaveError")
      toast.error(text)
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error(t("profile.passwordMismatch"))
      return
    }
    setPasswordSaving(true)
    try {
      await apiClient.changePassword(passwords.current, passwords.new)
      setPasswords({ current: "", new: "", confirm: "" })
      toast.success(t("profile.passwordChanged"))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message
      const text = typeof msg === "string" ? msg : Array.isArray(msg) ? msg.join(" ") : t("ui.passwordErrorGeneric")
      toast.error(text)
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24 md:pb-8 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-9 px-2 -ml-2" asChild>
          <Link href={`/${locale}/parent`} className="flex items-center gap-1.5 text-gray-700">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">{t("account.backToApp")}</span>
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-900">{t("account.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("account.subtitle")}</p>
      </div>

      <Card className="border border-sky-100 bg-white shadow-sm rounded-2xl">
        <CardHeader className="border-b border-sky-100 pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <UserRound className="h-4 w-4 text-sky-600" aria-hidden />
            {t("account.personalInfoTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {profileLoading ? (
            <p className="text-sm text-muted-foreground py-4">{t("ui.loading")}</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-600">{t("account.firstNameLabel")}</p>
                  <Input value={profile.prenom} disabled className="h-10 bg-gray-50 text-gray-500" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-600">{t("account.lastNameLabel")}</p>
                  <Input value={profile.nom} disabled className="h-10 bg-gray-50 text-gray-500" />
                </div>
              </div>

              <div>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                  {t("account.emailLabel")}
                </p>
                <Input value={profile.email} disabled className="h-10 bg-gray-50 text-gray-500" />
                <p className="mt-1 text-xs text-muted-foreground">{t("account.emailReadonlyHint")}</p>
              </div>

              <div>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                  {t("account.phoneLabel")}
                </p>
                <MenaPhoneInput
                  value={contactForm.telephone}
                  onChange={(telephone) => setContactForm(prev => ({ ...prev, telephone }))}
                  className="h-10"
                />
              </div>

              <div>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {t("account.addressLabel")}
                </p>
                <Input
                  value={contactForm.adresse}
                  onChange={e => setContactForm(prev => ({ ...prev, adresse: e.target.value }))}
                  placeholder={t("account.addressPlaceholder")}
                  className="h-10"
                />
              </div>

              <Button
                type="button"
                onClick={() => void handleProfileSave()}
                disabled={profileSaving}
                className="w-full sm:w-auto bg-[#FF6F61] text-white hover:bg-[#FF6F61]/90"
              >
                {profileSaving ? t("account.saving") : t("account.saveProfile")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border border-sky-100 bg-white shadow-sm rounded-2xl">
        <CardHeader className="border-b border-sky-100 pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-sky-600" aria-hidden />
            {t("profile.passwordCardTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {[
            { key: "current" as const, label: t("profile.currentPasswordLabel"), ph: "••••••••" },
            { key: "new" as const, label: t("profile.newPasswordLabel"), ph: "••••••••" },
            { key: "confirm" as const, label: t("ui.confirmPasswordShort"), ph: "••••••••" },
          ].map(field => (
            <div key={field.key}>
              <p className="mb-1 text-xs font-medium text-gray-600">{field.label}</p>
              <Input
                type="password"
                placeholder={field.ph}
                value={passwords[field.key]}
                onChange={e => setPasswords(p => ({ ...p, [field.key]: e.target.value }))}
                className="h-10"
                autoComplete={field.key === "current" ? "current-password" : "new-password"}
              />
            </div>
          ))}
          <Button
            type="button"
            onClick={() => void handlePasswordChange()}
            disabled={passwordSaving}
            className="w-full sm:w-auto bg-[#FF6F61] text-white hover:bg-[#FF6F61]/90"
          >
            {passwordSaving ? "…" : t("profile.saveButton")}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
