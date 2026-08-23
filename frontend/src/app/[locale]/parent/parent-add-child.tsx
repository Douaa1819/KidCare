"use client"

import { useCallback, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { UserPlus, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiClient } from "@/lib/api"
import { getApiErrorMessage, notifyError, notifySuccess } from "@/lib/feedback"
import {
  getChildEnrollmentBirthdateLimits,
  getChildEnrollmentBirthdateValidation,
  isValidName,
} from "@/lib/form-validation"
import { CHILD_ENROLLMENT_AGE_POLICY, formatAgeBound } from "@/lib/child-age-policy"
import { resolveClassLevelStyle } from "@/lib/class-display"
import { invalidateParentEnfantsCache } from "./parent-child-selector"

type PublicClasse = {
  id: string
  nom: string
  niveau?: string | null
  capacite?: number | null
  nbEnfants?: number
  complet?: boolean
  trancheAge?: string | null
}

type ParentAddChildProps = {
  onChildAdded?: (enfantId: string) => void
}

export function ParentAddChild({ onChildAdded }: ParentAddChildProps) {
  const t = useTranslations("parent.ui")
  const [modalOpen, setModalOpen] = useState(false)
  const [classes, setClasses] = useState<PublicClasse[]>([])
  const [classesLoading, setClassesLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    dateNaissance: "",
    classeId: "",
    genre: "",
  })

  const birthdateLimits = getChildEnrollmentBirthdateLimits()
  const birthdateMessages = {
    required: t("addChildBirthdateRequired"),
    invalidFormat: t("addChildBirthdateFormat"),
    invalid: t("addChildBirthdateInvalid"),
    tooYoung: (min: string, age: string) => t("addChildAgeTooYoung", { min, age }),
    tooOld: (max: string, age: string) => t("addChildAgeTooOld", { max, age }),
  }
  const birthdateError = form.dateNaissance
    ? getChildEnrollmentBirthdateValidation(form.dateNaissance, birthdateMessages)
    : null

  const loadClasses = useCallback(async () => {
    setClassesLoading(true)
    try {
      const res = await apiClient.listPublicClasses()
      const list = Array.isArray(res.data) ? res.data : []
      setClasses(list)
    } catch {
      notifyError(t("addChildClassesError"))
      setClasses([])
    } finally {
      setClassesLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (!modalOpen) return
    void loadClasses()
  }, [modalOpen, loadClasses])

  const resetForm = () => {
    setForm({ prenom: "", nom: "", dateNaissance: "", classeId: "", genre: "" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidName(form.prenom) || !isValidName(form.nom)) {
      notifyError(t("addChildNameInvalid"))
      return
    }
    if (!form.classeId) {
      notifyError(t("addChildClassRequired"))
      return
    }
    const dateErr = getChildEnrollmentBirthdateValidation(form.dateNaissance, birthdateMessages)
    if (dateErr) {
      notifyError(dateErr)
      return
    }
    const selected = classes.find(c => c.id === form.classeId)
    if (selected?.complet) {
      notifyError(t("addChildClassFull"))
      return
    }

    setSaving(true)
    try {
      const res = await apiClient.createParentChild({
        prenom: form.prenom.trim(),
        nom: form.nom.trim(),
        dateNaissance: form.dateNaissance,
        classeId: form.classeId,
        ...(form.genre ? { genre: form.genre } : {}),
      })
      const enfantId = String(res.data?.id ?? "")
      invalidateParentEnfantsCache()
      notifySuccess(t("addChildSuccess"))
      setModalOpen(false)
      resetForm()
      if (enfantId) onChildAdded?.(enfantId)
    } catch (err) {
      notifyError(getApiErrorMessage(err, t("addChildError")))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Card className="border border-sky-100 bg-white shadow-sm rounded-2xl">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                <UserPlus className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{t("addChildTitle")}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t("addChildHint")}</p>
              </div>
            </div>
            <Button
              type="button"
              className="parent-primary-button w-full text-white sm:w-auto"
              onClick={() => setModalOpen(true)}
            >
              {t("addChildCta")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div
            className="bg-white rounded-2xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="parent-add-child-title"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="parent-add-child-title" className="text-lg font-semibold text-gray-900">
                {t("addChildModalTitle")}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false)
                  resetForm()
                }}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
                aria-label={t("addChildCancel")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t("addChildFirstName")}</label>
                  <Input
                    name="prenom"
                    value={form.prenom}
                    onChange={e => setForm(prev => ({ ...prev, prenom: e.target.value }))}
                    required
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t("addChildLastName")}</label>
                  <Input
                    name="nom"
                    value={form.nom}
                    onChange={e => setForm(prev => ({ ...prev, nom: e.target.value }))}
                    required
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("addChildClass")} <span className="text-red-500">*</span>
                </label>
                {classesLoading ? (
                  <p className="text-sm text-muted-foreground">{t("addChildClassesLoading")}</p>
                ) : classes.length === 0 ? (
                  <p className="text-sm text-red-600">{t("addChildClassesEmpty")}</p>
                ) : (
                  <select
                    name="classeId"
                    value={form.classeId}
                    onChange={e => setForm(prev => ({ ...prev, classeId: e.target.value }))}
                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                    required
                  >
                    <option value="">{t("addChildClassPlaceholder")}</option>
                    {classes.map(c => {
                      const style = resolveClassLevelStyle(c.niveau, c.nom)
                      const label = `${c.nom}${c.niveau ? ` (${style.label})` : ""}`
                      const places =
                        c.capacite != null
                          ? ` — ${c.nbEnfants ?? 0}/${c.capacite}`
                          : ""
                      const suffix = c.complet ? ` — ${t("addChildClassFullShort")}` : ""
                      return (
                        <option key={c.id} value={c.id} disabled={Boolean(c.complet)}>
                          {label}
                          {places}
                          {suffix}
                        </option>
                      )
                    })}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t("addChildBirthdate")}</label>
                <Input
                  type="date"
                  name="dateNaissance"
                  min={birthdateLimits.min}
                  max={birthdateLimits.max}
                  pattern="[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])"
                  title={t("addChildBirthdateFormat")}
                  value={form.dateNaissance}
                  onChange={e => setForm(prev => ({ ...prev, dateNaissance: e.target.value }))}
                  className={birthdateError ? "border-red-400 focus-visible:ring-red-300" : ""}
                  required
                />
                {birthdateError && <p className="mt-1 text-xs text-red-500">{birthdateError}</p>}
                {!birthdateError && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("addChildBirthdateHint", {
                      min: formatAgeBound(CHILD_ENROLLMENT_AGE_POLICY.minAge),
                      max: formatAgeBound(CHILD_ENROLLMENT_AGE_POLICY.maxAge),
                    })}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t("addChildGender")}</label>
                <select
                  name="genre"
                  value={form.genre}
                  onChange={e => setForm(prev => ({ ...prev, genre: e.target.value }))}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                >
                  <option value="">{t("addChildGenderOptional")}</option>
                  <option value="Fille">{t("addChildGenderGirl")}</option>
                  <option value="Garçon">{t("addChildGenderBoy")}</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setModalOpen(false)
                    resetForm()
                  }}
                  disabled={saving}
                >
                  {t("addChildCancel")}
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  disabled={
                    saving ||
                    classesLoading ||
                    classes.length === 0 ||
                    !form.classeId
                  }
                >
                  {saving ? t("addChildSaving") : t("addChildSubmit")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
