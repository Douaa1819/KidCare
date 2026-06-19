"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fieldErrorClass, useSyncValidationErrors } from "@/lib/form-error-focus"
import { getBirthdateLimits, getBirthdateValidation, isValidName } from "@/lib/form-validation"
import {
  formatAgeBound,
  getDefaultChildAgePolicy,
  normalizeChildAgePolicy,
  type ChildAgePolicy,
} from "@/lib/child-age-policy"
import { GENDER_OPTIONS } from "@/lib/inscription-constants"
import { validateCountryCityFields } from "@/lib/inscription-locations"
import { CountryCityFields } from "@/components/inscriptions/country-city-fields"
import { apiClient } from "@/lib/api"

export type Step1FormData = {
  childFirstName: string
  childLastName: string
  dateOfBirth: string
  nationalityCountry: string
  nationalityCity: string
  nationalityCityOther: string
  birthCountry: string
  birthCity: string
  birthCityOther: string
  currentAddress: string
  currentAddressLine2: string
  currentCountry: string
  currentCity: string
  currentCityOther: string
  gender: string
  fraternity: string
  rankInFraternity: string
  selectedActivities: string[]
  classeIdSouhaitee: string
  childPhotoBase64: string
  childPhotoFile: string
}

type ValidationMessages = {
  childFirstNameRequired: string
  childFirstNameInvalid: string
  childLastNameRequired: string
  childLastNameInvalid: string
  birthCountryRequired: string
  birthCityRequired: string
  birthCityInvalid: string
  nationalityCountryRequired: string
  nationalityCityRequired: string
  nationalityCityInvalid: string
  currentCountryRequired: string
  currentAddressRequired: string
  currentCityRequired: string
  currentCityInvalid: string
  classRequired: string
  fraternityMustBeNumber: string
  rankMustBeNumber: string
  rankExceedsFraternity: (max: string) => string
  dateRequired: string
  dateInvalidFormat: string
  dateInvalid: string
  dateTooYoung: (min: string, age: string) => string
  dateTooOld: (max: string, age: string) => string
}

export function validateStep1Fields(
  f: Step1FormData,
  agePolicy: ChildAgePolicy,
  msg: ValidationMessages,
): Record<string, string> {
  const errs: Record<string, string> = {}

  if (!f.childFirstName.trim()) errs.childFirstName = msg.childFirstNameRequired
  else if (!isValidName(f.childFirstName)) errs.childFirstName = msg.childFirstNameInvalid

  if (!f.childLastName.trim()) errs.childLastName = msg.childLastNameRequired
  else if (!isValidName(f.childLastName)) errs.childLastName = msg.childLastNameInvalid

  const birthdateError = getBirthdateValidation(f.dateOfBirth, agePolicy, {
    required: msg.dateRequired,
    invalidFormat: msg.dateInvalidFormat,
    invalid: msg.dateInvalid,
    tooYoung: msg.dateTooYoung,
    tooOld: msg.dateTooOld,
  })
  if (birthdateError) errs.dateOfBirth = birthdateError

  Object.assign(
    errs,
    validateCountryCityFields(
      f.nationalityCountry,
      f.nationalityCity,
      f.nationalityCityOther,
      "nationality",
      {
        countryRequired: msg.nationalityCountryRequired,
        cityRequired: msg.nationalityCityRequired,
        cityInvalid: msg.nationalityCityInvalid,
      },
      isValidName,
    ),
  )

  Object.assign(
    errs,
    validateCountryCityFields(
      f.birthCountry,
      f.birthCity,
      f.birthCityOther,
      "birth",
      {
        countryRequired: msg.birthCountryRequired,
        cityRequired: msg.birthCityRequired,
        cityInvalid: msg.birthCityInvalid,
      },
      isValidName,
    ),
  )

  if (!f.currentAddress.trim()) errs.currentAddress = msg.currentAddressRequired

  Object.assign(
    errs,
    validateCountryCityFields(
      f.currentCountry,
      f.currentCity,
      f.currentCityOther,
      "current",
      {
        countryRequired: msg.currentCountryRequired,
        cityRequired: msg.currentCityRequired,
        cityInvalid: msg.currentCityInvalid,
      },
      isValidName,
    ),
  )

  if (!f.classeIdSouhaitee) errs.classeIdSouhaitee = msg.classRequired

  if (f.fraternity && !/^\d+$/.test(f.fraternity)) errs.fraternity = msg.fraternityMustBeNumber

  if (f.rankInFraternity && !/^\d+$/.test(f.rankInFraternity)) errs.rankInFraternity = msg.rankMustBeNumber
  else if (
    f.rankInFraternity && f.fraternity &&
    parseInt(f.rankInFraternity, 10) > parseInt(f.fraternity, 10)
  ) {
    errs.rankInFraternity = msg.rankExceedsFraternity(f.fraternity)
  }

  return errs
}

interface Step1Props {
  formData: Step1FormData
  updateFormData: (data: Partial<Step1FormData>) => void
  classes?: { id: string; nom: string; complet?: boolean; nbEnfants?: number; capacite?: number }[]
  showErrors?: boolean
  onValidationErrors?: (errors: Record<string, string>) => void
}

async function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const MAX = 800
      let { width, height } = img
      if (width > MAX) { height = Math.round(height * MAX / width); width = MAX }
      if (height > MAX) { width = Math.round(width * MAX / height); height = MAX }
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL("image/jpeg", 0.72))
    }
    img.src = dataUrl
  })
}

const ACTIVITY_KEYS = ["garderie", "atelier"] as const

export default function Step1ChildInfo({ formData, updateFormData, classes, showErrors, onValidationErrors }: Step1Props) {
  const t = useTranslations("registration")
  const tv = useTranslations("registration.validation")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [agePolicy, setAgePolicy] = useState<ChildAgePolicy>(() => getDefaultChildAgePolicy())
  const birthdateLimits = getBirthdateLimits(agePolicy)

  const validationMessages = useMemo<ValidationMessages>(
    () => ({
      childFirstNameRequired: tv("childFirstNameRequired"),
      childFirstNameInvalid: tv("childFirstNameInvalid"),
      childLastNameRequired: tv("childLastNameRequired"),
      childLastNameInvalid: tv("childLastNameInvalid"),
      birthCountryRequired: tv("birthCountryRequired"),
      birthCityRequired: tv("birthCityRequired"),
      birthCityInvalid: tv("birthCityInvalid"),
      nationalityCountryRequired: tv("nationalityCountryRequired"),
      nationalityCityRequired: tv("nationalityCityRequired"),
      nationalityCityInvalid: tv("nationalityCityInvalid"),
      currentCountryRequired: tv("currentCountryRequired"),
      currentAddressRequired: tv("currentAddressRequired"),
      currentCityRequired: tv("currentCityRequired"),
      currentCityInvalid: tv("currentCityInvalid"),
      classRequired: tv("classRequired"),
      fraternityMustBeNumber: tv("fraternityMustBeNumber"),
      rankMustBeNumber: tv("rankMustBeNumber"),
      rankExceedsFraternity: (max) => tv("rankExceedsFraternity", { max }),
      dateRequired: tv("dateRequired"),
      dateInvalidFormat: tv("dateInvalidFormat"),
      dateInvalid: tv("dateInvalid"),
      dateTooYoung: (min, age) => tv("dateTooYoung", { min, age }),
      dateTooOld: (max, age) => tv("dateTooOld", { max, age }),
    }),
    [tv],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await apiClient.getChildAgePolicy()
        if (cancelled) return
        setAgePolicy(normalizeChildAgePolicy(res.data))
      } catch {
        if (!cancelled) setAgePolicy(getDefaultChildAgePolicy())
      }
    })()
    return () => { cancelled = true }
  }, [])

  const touch = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }))
  const show = (field: string) => touched[field] || !!showErrors
  const errs = useMemo(
    () => validateStep1Fields(formData, agePolicy, validationMessages),
    [formData, agePolicy, validationMessages],
  )

  useSyncValidationErrors(errs, onValidationErrors)

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError(null)
    updateFormData({ childPhotoBase64: "", childPhotoFile: "" })

    const allowed = ["image/jpeg", "image/png", "image/webp"]
    if (!allowed.includes(file.type)) {
      setPhotoError(tv("photoFormat"))
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setPhotoError(tv("photoTooLarge"))
      return
    }

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const raw = ev.target?.result as string
      const compressed = await compressImage(raw)
      const approxKB = Math.round((compressed.length * 0.75) / 1024)
      if (approxKB > 800) {
        setPhotoError(tv("photoCompressedTooLarge", { size: approxKB }))
        return
      }
      updateFormData({ childPhotoBase64: compressed, childPhotoFile: file.name })
    }
    reader.readAsDataURL(file)
  }

  const renderFieldError = (field: string) =>
    show(field) && errs[field] ? (
      <p className="text-xs text-destructive mt-1.5" role="alert">{errs[field]}</p>
    ) : null

  const fieldInvalid = (field: string) => show(field) && !!errs[field]

  const activityLabel = (key: typeof ACTIVITY_KEYS[number]) => t(`activities.${key}`)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-1">
          <svg className="w-5 h-5 text-accent shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
          </svg>
          {t("child.title")}
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="childLastName" className="text-sm font-medium">
            {t("child.lastName")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="childLastName"
            placeholder={t("child.placeholders.lastName")}
            value={formData.childLastName}
            onChange={(e) => updateFormData({ childLastName: e.target.value })}
            onBlur={() => touch("childLastName")}
            aria-invalid={fieldInvalid("childLastName")}
            className={`mt-2 ${fieldErrorClass(fieldInvalid("childLastName"))}`}
          />
          {renderFieldError("childLastName")}
        </div>
        <div>
          <Label htmlFor="childFirstName" className="text-sm font-medium">
            {t("child.firstName")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="childFirstName"
            placeholder={t("child.placeholders.firstName")}
            value={formData.childFirstName}
            onChange={(e) => updateFormData({ childFirstName: e.target.value })}
            onBlur={() => touch("childFirstName")}
            aria-invalid={fieldInvalid("childFirstName")}
            className={`mt-2 ${fieldErrorClass(fieldInvalid("childFirstName"))}`}
          />
          {renderFieldError("childFirstName")}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dateOfBirth" className="text-sm font-medium">
            {t("child.dateOfBirth")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="dateOfBirth"
            type="date"
            min={birthdateLimits.min}
            max={birthdateLimits.max}
            value={formData.dateOfBirth}
            onChange={(e) => updateFormData({ dateOfBirth: e.target.value })}
            onBlur={() => touch("dateOfBirth")}
            aria-invalid={fieldInvalid("dateOfBirth")}
            className={`mt-2 ${fieldErrorClass(fieldInvalid("dateOfBirth"))}`}
          />
          {renderFieldError("dateOfBirth")}
          {!errs.dateOfBirth && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {t("child.ageHint", {
                min: formatAgeBound(agePolicy.minAge),
                max: formatAgeBound(agePolicy.maxAge),
              })}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-semibold text-foreground">{t("child.nationality")}</h3>
        <CountryCityFields
          idPrefix="nationality"
          countryLabel={t("child.nationalityCountry")}
          cityLabel={t("child.nationalityCity")}
          countryValue={formData.nationalityCountry}
          cityValue={formData.nationalityCity}
          cityOtherValue={formData.nationalityCityOther}
          onCountryChange={(nationalityCountry) =>
            updateFormData({ nationalityCountry, nationalityCity: "", nationalityCityOther: "" })
          }
          onCityChange={(nationalityCity) => updateFormData({ nationalityCity, nationalityCityOther: "" })}
          onCityOtherChange={(nationalityCityOther) => updateFormData({ nationalityCityOther })}
          countryError={fieldInvalid("nationalityCountry") ? errs.nationalityCountry : undefined}
          cityError={fieldInvalid("nationalityCity") ? errs.nationalityCity : undefined}
          cityOtherError={fieldInvalid("nationalityCityOther") ? errs.nationalityCityOther : undefined}
          onBlurCountry={() => touch("nationalityCountry")}
          onBlurCity={() => touch("nationalityCity")}
          onBlurCityOther={() => touch("nationalityCityOther")}
        />
      </div>

      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-semibold text-foreground">{t("child.birthPlace")}</h3>
        <CountryCityFields
          idPrefix="birth"
          countryLabel={t("child.birthCountry")}
          cityLabel={t("child.birthCity")}
          countryValue={formData.birthCountry}
          cityValue={formData.birthCity}
          cityOtherValue={formData.birthCityOther}
          onCountryChange={(birthCountry) =>
            updateFormData({ birthCountry, birthCity: "", birthCityOther: "" })
          }
          onCityChange={(birthCity) => updateFormData({ birthCity, birthCityOther: "" })}
          onCityOtherChange={(birthCityOther) => updateFormData({ birthCityOther })}
          countryError={fieldInvalid("birthCountry") ? errs.birthCountry : undefined}
          cityError={fieldInvalid("birthCity") ? errs.birthCity : undefined}
          cityOtherError={fieldInvalid("birthCityOther") ? errs.birthCityOther : undefined}
          onBlurCountry={() => touch("birthCountry")}
          onBlurCity={() => touch("birthCity")}
          onBlurCityOther={() => touch("birthCityOther")}
        />
      </div>

      <div className="space-y-4 pt-2">
        <h3 className="text-sm font-semibold text-foreground">{t("child.currentResidence")}</h3>
        <div>
          <Label htmlFor="currentAddress" className="text-sm font-medium">
            {t("child.currentAddress")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="currentAddress"
            placeholder={t("child.placeholders.currentAddress")}
            value={formData.currentAddress}
            onChange={(e) => updateFormData({ currentAddress: e.target.value })}
            onBlur={() => touch("currentAddress")}
            aria-invalid={fieldInvalid("currentAddress")}
            className={`mt-2 ${fieldErrorClass(fieldInvalid("currentAddress"))}`}
          />
          {renderFieldError("currentAddress")}
        </div>
        <div>
          <Label htmlFor="currentAddressLine2" className="text-sm font-medium">
            {t("child.currentAddressLine2")}
          </Label>
          <Input
            id="currentAddressLine2"
            placeholder={t("child.placeholders.currentAddressLine2")}
            value={formData.currentAddressLine2}
            onChange={(e) => updateFormData({ currentAddressLine2: e.target.value })}
            className="mt-2"
          />
        </div>
        <CountryCityFields
          idPrefix="current"
          countryLabel={t("child.currentCountry")}
          cityLabel={t("child.currentCity")}
          countryValue={formData.currentCountry}
          cityValue={formData.currentCity}
          cityOtherValue={formData.currentCityOther}
          onCountryChange={(currentCountry) =>
            updateFormData({ currentCountry, currentCity: "", currentCityOther: "" })
          }
          onCityChange={(currentCity) => updateFormData({ currentCity, currentCityOther: "" })}
          onCityOtherChange={(currentCityOther) => updateFormData({ currentCityOther })}
          countryError={fieldInvalid("currentCountry") ? errs.currentCountry : undefined}
          cityError={fieldInvalid("currentCity") ? errs.currentCity : undefined}
          cityOtherError={fieldInvalid("currentCityOther") ? errs.currentCityOther : undefined}
          onBlurCountry={() => touch("currentCountry")}
          onBlurCity={() => touch("currentCity")}
          onBlurCityOther={() => touch("currentCityOther")}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="gender" className="text-sm font-medium">{t("child.gender")}</Label>
          <select
            id="gender"
            className="mt-2 w-full h-10 rounded-md border border-border bg-input px-3 py-2 text-sm transition-colors hover:border-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2"
            value={formData.gender}
            onChange={(e) => updateFormData({ gender: e.target.value })}
          >
            <option value="">—</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g === "M" ? t("child.genderMale") : t("child.genderFemale")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="fraternity" className="text-sm font-medium">{t("child.fraternity")}</Label>
          <Input
            id="fraternity"
            placeholder={t("child.placeholders.fraternity")}
            inputMode="numeric"
            value={formData.fraternity}
            onChange={(e) => updateFormData({ fraternity: e.target.value })}
            onBlur={() => touch("fraternity")}
            aria-invalid={fieldInvalid("fraternity")}
            className={`mt-2 ${fieldErrorClass(fieldInvalid("fraternity"))}`}
          />
          {renderFieldError("fraternity")}
        </div>
        <div>
          <Label htmlFor="rankInFraternity" className="text-sm font-medium">{t("child.rankInFraternity")}</Label>
          <Input
            id="rankInFraternity"
            placeholder={t("child.placeholders.rank")}
            inputMode="numeric"
            value={formData.rankInFraternity}
            onChange={(e) => updateFormData({ rankInFraternity: e.target.value })}
            onBlur={() => touch("rankInFraternity")}
            aria-invalid={fieldInvalid("rankInFraternity")}
            className={`mt-2 ${fieldErrorClass(fieldInvalid("rankInFraternity"))}`}
          />
          {renderFieldError("rankInFraternity")}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">{t("child.photo")}</Label>
        <div className="mt-2 flex items-start gap-4">
          <div
            className="w-24 h-24 rounded-xl border-2 border-dashed border-border bg-white/70 flex items-center justify-center cursor-pointer overflow-hidden hover:border-accent/50 transition-colors shrink-0"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          >
            {formData.childPhotoBase64 ? (
              <img src={formData.childPhotoBase64} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-2">
                <svg className="w-8 h-8 text-muted-foreground mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xs text-muted-foreground">{t("child.addPhoto")}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-accent font-medium hover:text-accent/80 transition-colors"
            >
              {formData.childPhotoBase64 ? t("child.changePhoto") : t("child.choosePhoto")}
            </button>
            <p className="text-xs text-muted-foreground mt-1.5">{t("child.photoHint")}</p>
            {formData.childPhotoFile && !photoError && (
              <p className="text-xs text-accent/90 mt-1">✓ {formData.childPhotoFile}</p>
            )}
            {photoError && <p className="text-xs text-destructive mt-1" role="alert">{photoError}</p>}
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
        </div>
      </div>

      <div>
        <Label htmlFor="classeIdSouhaitee" className="text-sm font-medium">
          {t("child.class")} <span className="text-destructive">*</span>
        </Label>
        <select
          id="classeIdSouhaitee"
            className={`mt-2 w-full h-10 rounded-md border bg-input px-3 py-2 text-sm transition-colors hover:border-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 ${
            fieldInvalid("classeIdSouhaitee") ? "border-destructive ring-1 ring-destructive/30" : "border-border"
          }`}
          value={formData.classeIdSouhaitee}
          onChange={(e) => { updateFormData({ classeIdSouhaitee: e.target.value }); touch("classeIdSouhaitee") }}
          onBlur={() => touch("classeIdSouhaitee")}
          aria-invalid={fieldInvalid("classeIdSouhaitee")}
        >
          <option value="" disabled>{t("child.chooseClass")}</option>
          {classes && classes.length > 0 ? (
            classes.map((c) => (
              <option key={c.id} value={c.id} disabled={c.complet}>
                {c.nom}{c.complet ? ` — ${t("child.classFull")}` : c.capacite ? ` (${c.nbEnfants ?? 0}/${c.capacite})` : ""}
              </option>
            ))
          ) : null}
        </select>
        {renderFieldError("classeIdSouhaitee")}
      </div>

      <div>
        <h3 className="font-medium text-foreground mb-3">{t("child.activities")}</h3>
        <div className="space-y-2">
          {ACTIVITY_KEYS.map((key) => {
            const label = activityLabel(key)
            return (
              <label
                key={key}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/80 border border-border cursor-pointer hover:border-accent/40 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={formData.selectedActivities.includes(label)}
                  onChange={(e) => {
                    updateFormData({
                      selectedActivities: e.target.checked
                        ? [...formData.selectedActivities, label]
                        : formData.selectedActivities.filter((a) => a !== label),
                    })
                  }}
                  className="w-4 h-4 rounded accent-accent"
                />
                <span className="text-sm font-medium">{label}</span>
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}
