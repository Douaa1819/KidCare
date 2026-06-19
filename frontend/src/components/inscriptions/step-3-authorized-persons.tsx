"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { MenaPhoneInput } from "@/components/ui/mena-phone-input"
import { Label } from "@/components/ui/label"
import { fieldErrorClass, useSyncValidationErrors } from "@/lib/form-error-focus"
import { cn } from "@/lib/utils"
import { Plus, Trash2, UserCheck } from "lucide-react"
import { isValidCin, isValidName, isValidPhone } from "@/lib/form-validation"

export interface AuthorizedPerson {
  name: string
  relationship: string
  otherRelationship?: string
  phone: string
  cin: string
}

const RELATION_KEYS = [
  "grandmother", "grandfather", "aunt", "uncle",
  "olderBrother", "olderSister", "cousin", "neighbor", "housekeeper", "other",
] as const

export const RELATION_OTHER = "other"

interface Step3Props {
  formData: { authorizedPersons?: AuthorizedPerson[]; sansRestriction?: boolean }
  updateFormData: (data: Partial<{ authorizedPersons: AuthorizedPerson[]; sansRestriction: boolean }>) => void
  showErrors?: boolean
  onValidationErrors?: (errors: Record<string, string>) => void
}

export function validateStep3Fields(
  persons: AuthorizedPerson[],
  sansRestriction: boolean,
  tv: ReturnType<typeof useTranslations>,
): Record<string, string> {
  if (sansRestriction) return {}
  const errs: Record<string, string> = {}
  persons.forEach((person, index) => {
    const prefix = `person-${index}`
    if (!person.name?.trim()) errs[`${prefix}-name`] = tv("pickupNameRequired")
    else if (!isValidName(person.name)) errs[`${prefix}-name`] = tv("firstNameInvalid")
    if (!person.relationship?.trim()) errs[`${prefix}-relationship`] = tv("pickupRelationshipRequired")
    if (person.relationship === RELATION_OTHER) {
      if (!person.otherRelationship?.trim()) errs[`${prefix}-otherRelationship`] = tv("pickupOtherRelationshipRequired")
      else if (!isValidName(person.otherRelationship)) errs[`${prefix}-otherRelationship`] = tv("pickupOtherRelationshipInvalid")
    }
    if (!person.phone?.trim()) errs[`${prefix}-phone`] = tv("pickupPhoneRequired")
    else if (!isValidPhone(person.phone)) errs[`${prefix}-phone`] = tv("phoneInvalid")
    if (!person.cin?.trim()) errs[`${prefix}-cin`] = tv("pickupCinRequired")
    else if (!isValidCin(person.cin)) errs[`${prefix}-cin`] = tv("cinInvalid")
  })
  return errs
}

export default function Step3AuthorizedPersons({ formData, updateFormData, showErrors, onValidationErrors }: Step3Props) {
  const t = useTranslations("registration")
  const tv = useTranslations("registration.validation")
  const persons: AuthorizedPerson[] = formData.authorizedPersons ?? []
  const sansRestriction: boolean = formData.sansRestriction ?? false
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})

  const fieldKey = (index: number, field: keyof AuthorizedPerson) => `${index}.${field}`
  const inputId = (index: number, field: string) => `person-${index}-${field}`
  const shouldShowError = (index: number, field: keyof AuthorizedPerson) =>
    Boolean(showErrors || touchedFields[fieldKey(index, field)])

  const errs = useMemo(
    () => validateStep3Fields(persons, sansRestriction, tv),
    [persons, sansRestriction, tv],
  )

  useSyncValidationErrors(errs, onValidationErrors)

  const errorFor = (person: AuthorizedPerson, field: keyof AuthorizedPerson, index: number) => {
    if (!shouldShowError(index, field)) return null
    const key = `person-${index}-${field}`
    return errs[key] ?? null
  }

  const handlePersonChange = (index: number, field: keyof AuthorizedPerson, value: string) => {
    const updated = [...persons]
    const nextPerson = { ...updated[index], [field]: value }
    if (field === "relationship" && value !== RELATION_OTHER) nextPerson.otherRelationship = ""
    updated[index] = nextPerson
    setTouchedFields((prev) => ({ ...prev, [fieldKey(index, field)]: true }))
    updateFormData({ authorizedPersons: updated })
  }

  const handleAddPerson = () => {
    updateFormData({
      authorizedPersons: [...persons, { name: "", relationship: "", otherRelationship: "", phone: "", cin: "" }],
    })
  }

  const handleRemovePerson = (index: number) => {
    updateFormData({ authorizedPersons: persons.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-1">
          <UserCheck className="w-5 h-5 text-accent shrink-0" aria-hidden />
          {t("pickup.title")}
        </h2>
      </div>

      <div className={`p-4 rounded-xl border-2 transition-colors ${
        sansRestriction
          ? "border-accent/40 bg-accent/10"
          : "border-border bg-white/60"
      }`}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={sansRestriction}
            onChange={(e) => updateFormData({ sansRestriction: e.target.checked })}
            className="w-5 h-5 rounded accent-accent mt-0.5 shrink-0"
          />
          <span className={`text-sm font-semibold ${sansRestriction ? "text-accent" : "text-foreground"}`}>
            {t("pickup.sansRestriction")}
          </span>
        </label>
      </div>

      {!sansRestriction && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-semibold text-foreground">{t("pickup.title")}</p>
            <button
              type="button"
              onClick={handleAddPerson}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-accent/10 text-accent border border-accent/30 hover:bg-accent/15 transition-colors font-medium"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden />
              {t("pickup.addPerson")}
            </button>
          </div>

          {persons.length === 0 ? (
            <div className="text-center py-8 rounded-xl border-2 border-dashed border-border text-muted-foreground">
              <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-40" aria-hidden />
              <p className="text-sm">{t("pickup.addPerson")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {persons.map((person, index) => (
                <div key={index} className="p-4 rounded-xl border border-border bg-white/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">
                      {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePerson(index)}
                      aria-label={t("pickup.removePerson")}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={inputId(index, "name")} className="text-xs font-medium">
                        {t("pickup.fullName")} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id={inputId(index, "name")}
                        value={person.name}
                        onChange={(e) => handlePersonChange(index, "name", e.target.value)}
                        onBlur={() => setTouchedFields((prev) => ({ ...prev, [fieldKey(index, "name")]: true }))}
                        aria-invalid={!!errorFor(person, "name", index)}
                        className={`mt-1 h-9 text-sm ${fieldErrorClass(!!errorFor(person, "name", index))}`}
                      />
                      {errorFor(person, "name", index) && (
                        <p className="mt-1 text-xs text-destructive" role="alert">{errorFor(person, "name", index)}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={inputId(index, "relationship")} className="text-xs font-medium">
                        {t("pickup.relationship")} <span className="text-destructive">*</span>
                      </Label>
                      <select
                        id={inputId(index, "relationship")}
                        value={person.relationship}
                        onChange={(e) => handlePersonChange(index, "relationship", e.target.value)}
                        onBlur={() => setTouchedFields((prev) => ({ ...prev, [fieldKey(index, "relationship")]: true }))}
                        aria-invalid={!!errorFor(person, "relationship", index)}
                        className={`mt-1 w-full h-9 rounded-md border bg-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          errorFor(person, "relationship", index) ? "border-destructive" : "border-border"
                        }`}
                      >
                        <option value="">{t("pickup.chooseRelationship")}</option>
                        {RELATION_KEYS.map((key) => (
                          <option key={key} value={key}>{t(`pickup.relations.${key}`)}</option>
                        ))}
                      </select>
                      {errorFor(person, "relationship", index) && (
                        <p className="mt-1 text-xs text-destructive" role="alert">{errorFor(person, "relationship", index)}</p>
                      )}
                    </div>
                  </div>

                  {person.relationship === RELATION_OTHER && (
                    <div>
                      <Label htmlFor={inputId(index, "otherRelationship")} className="text-xs font-medium">
                        {t("pickup.otherRelationship")} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id={inputId(index, "otherRelationship")}
                        value={person.otherRelationship ?? ""}
                        onChange={(e) => handlePersonChange(index, "otherRelationship", e.target.value)}
                        onBlur={() => setTouchedFields((prev) => ({ ...prev, [fieldKey(index, "otherRelationship")]: true }))}
                        aria-invalid={!!errorFor(person, "otherRelationship", index)}
                        className={`mt-1 h-9 text-sm ${fieldErrorClass(!!errorFor(person, "otherRelationship", index))}`}
                      />
                      {errorFor(person, "otherRelationship", index) && (
                        <p className="mt-1 text-xs text-destructive" role="alert">{errorFor(person, "otherRelationship", index)}</p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={inputId(index, "phone")} className="text-xs font-medium">
                        {t("pickup.phone")} <span className="text-destructive">*</span>
                      </Label>
                      <MenaPhoneInput
                        id={inputId(index, "phone")}
                        value={person.phone}
                        onChange={(v) => handlePersonChange(index, "phone", v)}
                        onBlur={() => setTouchedFields((prev) => ({ ...prev, [fieldKey(index, "phone")]: true }))}
                        aria-invalid={!!errorFor(person, "phone", index)}
                        className="mt-1"
                        inputClassName={cn(
                          "h-9 text-sm",
                          errorFor(person, "phone", index) && "border-destructive ring-1 ring-destructive/30",
                        )}
                      />
                      {errorFor(person, "phone", index) && (
                        <p className="mt-1 text-xs text-destructive" role="alert">{errorFor(person, "phone", index)}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={inputId(index, "cin")} className="text-xs font-medium">
                        {t("pickup.cin")} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id={inputId(index, "cin")}
                        placeholder={t("parents.placeholders.cin")}
                        value={person.cin}
                        onChange={(e) => handlePersonChange(index, "cin", e.target.value)}
                        onBlur={() => setTouchedFields((prev) => ({ ...prev, [fieldKey(index, "cin")]: true }))}
                        aria-invalid={!!errorFor(person, "cin", index)}
                        className={`mt-1 h-9 text-sm ${fieldErrorClass(!!errorFor(person, "cin", index))}`}
                      />
                      {errorFor(person, "cin", index) && (
                        <p className="mt-1 text-xs text-destructive" role="alert">{errorFor(person, "cin", index)}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
