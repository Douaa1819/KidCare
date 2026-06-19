"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { MenaPhoneInput } from "@/components/ui/mena-phone-input"
import { Label } from "@/components/ui/label"
import { fieldErrorClass, useSyncValidationErrors } from "@/lib/form-error-focus"
import { isValidEmail, isValidName, isValidPhone } from "@/lib/form-validation"
import { PROFESSION_OPTIONS, PROFESSION_OTHER, type ProfessionOption } from "@/lib/inscription-constants"
import { Check, Scale } from "lucide-react"

export type ParentPrefix = "mother" | "father"

export type Step2FormData = {
  motherFirstName: string
  motherLastName: string
  motherPhone: string
  motherEmail: string
  motherAddress: string
  motherProfession: string
  motherProfessionOther: string
  motherCin: string
  fatherFirstName: string
  fatherLastName: string
  fatherPhone: string
  fatherEmail: string
  fatherAddress: string
  fatherProfession: string
  fatherProfessionOther: string
  fatherCin: string
  familySituation: string
  responsablePrincipal: ParentPrefix
  declarationHonneur: boolean
}

const CIN_RE = /^[A-Za-z]{1,2}[0-9]{4,8}$/

const FAMILY_SITUATION_KEYS = ["married", "divorced", "separated", "civilUnion"] as const

type ValidationMessages = {
  firstNameInvalid: string
  lastNameInvalid: string
  emailInvalid: string
  phoneInvalid: string
  cinInvalid: string
  professionOtherRequired: string
  emailRequired: string
  declarationRequired: string
}

function formKey(prefix: ParentPrefix, key: string): keyof Step2FormData {
  return `${prefix}${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof Step2FormData
}

export function validateParentFields(
  prefix: ParentPrefix,
  f: Step2FormData,
  msg: ValidationMessages,
): Record<string, string> {
  const errs: Record<string, string> = {}
  const p = (k: string) => formKey(prefix, k)

  const firstName = String(f[p("firstName")] ?? "")
  const lastName = String(f[p("lastName")] ?? "")
  const email = String(f[p("Email")] ?? "")
  const phone = String(f[p("Phone")] ?? "")
  const cin = String(f[p("Cin")] ?? "")
  const profession = String(f[p("Profession")] ?? "")
  const professionOther = String(f[p("ProfessionOther")] ?? "")
  const hasAny = firstName || lastName || email || phone

  if (hasAny) {
    if (firstName && !isValidName(firstName)) errs[p("firstName")] = msg.firstNameInvalid
    if (lastName && !isValidName(lastName)) errs[p("lastName")] = msg.lastNameInvalid
    if (email && !isValidEmail(email)) errs[p("Email")] = msg.emailInvalid
    if (phone && !isValidPhone(phone)) errs[p("Phone")] = msg.phoneInvalid
    if (cin && !CIN_RE.test(cin)) errs[p("Cin")] = msg.cinInvalid
    if (profession === PROFESSION_OTHER && !professionOther.trim()) {
      errs[p("ProfessionOther")] = msg.professionOtherRequired
    }
  }
  return errs
}

export function validateStep2Fields(f: Step2FormData, msg: ValidationMessages): Record<string, string> {
  const errs: Record<string, string> = {
    ...validateParentFields("mother", f, msg),
    ...validateParentFields("father", f, msg),
  }
  if (!f.motherEmail.trim() && !f.fatherEmail.trim()) errs._global = msg.emailRequired
  if (!f.declarationHonneur) errs.declarationHonneur = msg.declarationRequired
  return errs
}

interface Step2Props {
  formData: Step2FormData
  updateFormData: (data: Partial<Step2FormData>) => void
  showErrors?: boolean
  onValidationErrors?: (errors: Record<string, string>) => void
}

function ParentSection({
  title,
  prefix,
  firstNamePlaceholder,
  formData,
  updateFormData,
  isResponsable,
  onSetResponsable,
  touched,
  touch,
  showErrors,
  validationMessages,
  t,
  tp,
}: {
  title: string
  prefix: ParentPrefix
  firstNamePlaceholder: string
  formData: Step2FormData
  updateFormData: (data: Partial<Step2FormData>) => void
  isResponsable: boolean
  onSetResponsable: () => void
  touched: Record<string, boolean>
  touch: (field: string) => void
  showErrors?: boolean
  validationMessages: ValidationMessages
  t: ReturnType<typeof useTranslations>
  tp: ReturnType<typeof useTranslations>
}) {
  const p = (k: string) => formKey(prefix, k)
  const errs = {
    ...validateParentFields("mother", formData, validationMessages),
    ...validateParentFields("father", formData, validationMessages),
  }
  const show = (field: string) => touched[field] || !!showErrors
  const fieldInvalid = (field: string) => show(field) && !!errs[field]
  const renderFieldError = (field: string) =>
    fieldInvalid(field) ? <p className="text-xs text-destructive mt-1.5" role="alert">{errs[field]}</p> : null
  const inputCls = (field: string) => `mt-2 ${fieldErrorClass(fieldInvalid(field))}`
  const fieldValue = (key: string) => String(formData[p(key)] ?? "")
  const updateField = (key: string, value: string) => {
    updateFormData({ [p(key)]: value } as Partial<Step2FormData>)
  }
  const profession = fieldValue("Profession")
  const professionFieldId = p("Profession")
  const professionOtherFieldId = p("ProfessionOther")

  return (
    <div className="space-y-4 pb-6 border-b border-border last:border-0 last:pb-0">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="responsablePrincipal"
            checked={isResponsable}
            onChange={onSetResponsable}
            className="w-4 h-4 accent-accent"
          />
          <span className={`text-xs font-medium ${isResponsable ? "text-accent" : "text-muted-foreground"}`}>
            {isResponsable ? (
              <><Check className="inline h-3.5 w-3.5 align-[-2px]" aria-hidden /> {t("parents.responsablePrincipal")}</>
            ) : t("parents.setResponsable")}
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={p("firstName")} className="text-sm font-medium">{t("parents.firstName")}</Label>
          <Input
            id={p("firstName")}
            placeholder={firstNamePlaceholder}
            value={fieldValue("firstName")}
            onChange={(e) => updateField("firstName", e.target.value)}
            onBlur={() => touch(p("firstName"))}
            aria-invalid={fieldInvalid(p("firstName"))}
            className={inputCls(p("firstName"))}
          />
          {renderFieldError(p("firstName"))}
        </div>
        <div>
          <Label htmlFor={p("lastName")} className="text-sm font-medium">{t("parents.lastName")}</Label>
          <Input
            id={p("lastName")}
            placeholder={t("parents.placeholders.lastName")}
            value={fieldValue("lastName")}
            onChange={(e) => updateField("lastName", e.target.value)}
            onBlur={() => touch(p("lastName"))}
            aria-invalid={fieldInvalid(p("lastName"))}
            className={inputCls(p("lastName"))}
          />
          {renderFieldError(p("lastName"))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={p("Cin")} className="text-sm font-medium">{t("parents.cin")}</Label>
          <Input
            id={p("Cin")}
            placeholder={t("parents.placeholders.cin")}
            value={fieldValue("Cin")}
            onChange={(e) => updateField("Cin", e.target.value)}
            onBlur={() => touch(p("Cin"))}
            aria-invalid={fieldInvalid(p("Cin"))}
            className={inputCls(p("Cin"))}
          />
          {renderFieldError(p("Cin"))}
        </div>
        <div>
          <Label htmlFor={p("Phone")} className="text-sm font-medium">{t("parents.phone")}</Label>
          <div className="mt-2">
            <MenaPhoneInput
              id={p("Phone")}
              value={fieldValue("Phone")}
              onChange={(v) => updateField("Phone", v)}
              onBlur={() => touch(p("Phone"))}
              aria-invalid={fieldInvalid(p("Phone"))}
              inputClassName={fieldInvalid(p("Phone")) ? "border-destructive ring-1 ring-destructive/30" : undefined}
            />
          </div>
          {renderFieldError(p("Phone"))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={p("Email")} className="text-sm font-medium">
            {t("parents.email")} {prefix === "mother" ? <span className="text-destructive">*</span> : null}
          </Label>
          <Input
            id={p("Email")}
            type="email"
            placeholder={t("parents.placeholders.email")}
            value={fieldValue("Email")}
            onChange={(e) => updateField("Email", e.target.value)}
            onBlur={() => touch(p("Email"))}
            aria-invalid={fieldInvalid(p("Email"))}
            className={inputCls(p("Email"))}
          />
          {renderFieldError(p("Email"))}
        </div>
        <div>
          <Label htmlFor={professionFieldId} className="text-sm font-medium">{t("parents.profession")}</Label>
          <select
            id={professionFieldId}
            className="mt-2 w-full h-10 rounded-md border border-border bg-input px-3 py-2 text-sm transition-colors hover:border-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2"
            value={profession}
            onChange={(e) => {
              updateField("Profession", e.target.value)
              if (e.target.value !== PROFESSION_OTHER) updateField("ProfessionOther", "")
            }}
          >
            <option value="">{tp("select")}</option>
            {PROFESSION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{tp(opt as ProfessionOption)}</option>
            ))}
          </select>
        </div>
      </div>

      {profession === PROFESSION_OTHER && (
        <div>
          <Label htmlFor={professionOtherFieldId} className="text-sm font-medium">
            {t("parents.professionOther")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id={professionOtherFieldId}
            placeholder={t("parents.placeholders.professionOther")}
            value={fieldValue("ProfessionOther")}
            onChange={(e) => updateField("ProfessionOther", e.target.value)}
            onBlur={() => touch(professionOtherFieldId)}
            aria-invalid={fieldInvalid(professionOtherFieldId)}
            className={inputCls(professionOtherFieldId)}
          />
          {renderFieldError(professionOtherFieldId)}
        </div>
      )}

      <div>
        <Label htmlFor={p("Address")} className="text-sm font-medium">{t("parents.address")}</Label>
        <Input
          id={p("Address")}
          placeholder={t("parents.placeholders.address")}
          value={fieldValue("Address")}
          onChange={(e) => updateField("Address", e.target.value)}
          className="mt-2"
        />
      </div>
    </div>
  )
}

export default function Step2ParentInfo({ formData, updateFormData, showErrors, onValidationErrors }: Step2Props) {
  const t = useTranslations("registration")
  const tv = useTranslations("registration.validation")
  const tp = useTranslations("registration.professions")
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const touch = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }))

  const validationMessages = useMemo<ValidationMessages>(
    () => ({
      firstNameInvalid: tv("firstNameInvalid"),
      lastNameInvalid: tv("lastNameInvalid"),
      emailInvalid: tv("emailInvalid"),
      phoneInvalid: tv("phoneInvalid"),
      cinInvalid: tv("cinInvalid"),
      professionOtherRequired: tv("professionOtherRequired"),
      emailRequired: tv("emailRequired"),
      declarationRequired: tv("declarationRequired"),
    }),
    [tv],
  )

  const errs = useMemo(
    () => validateStep2Fields(formData, validationMessages),
    [formData, validationMessages],
  )
  const showDecl = touched.declarationHonneur || !!showErrors

  useSyncValidationErrors(errs, onValidationErrors)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-1">
          <svg className="w-5 h-5 text-accent shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
          </svg>
          {t("parents.title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("parents.emailHint")}</p>
      </div>

      {showErrors && errs._global && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive" role="alert">
          {errs._global}
        </div>
      )}

      <ParentSection
        title={t("parents.mother")}
        prefix="mother"
        firstNamePlaceholder={t("parents.placeholders.motherFirstName")}
        formData={formData}
        updateFormData={updateFormData}
        isResponsable={formData.responsablePrincipal === "mother"}
        onSetResponsable={() => updateFormData({ responsablePrincipal: "mother" })}
        touched={touched}
        touch={touch}
        showErrors={showErrors}
        validationMessages={validationMessages}
        t={t}
        tp={tp}
      />

      <ParentSection
        title={t("parents.father")}
        prefix="father"
        firstNamePlaceholder={t("parents.placeholders.fatherFirstName")}
        formData={formData}
        updateFormData={updateFormData}
        isResponsable={formData.responsablePrincipal === "father"}
        onSetResponsable={() => updateFormData({ responsablePrincipal: "father" })}
        touched={touched}
        touch={touch}
        showErrors={showErrors}
        validationMessages={validationMessages}
        t={t}
        tp={tp}
      />

      <div>
        <Label className="text-sm font-medium">{t("parents.familySituation")}</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          {FAMILY_SITUATION_KEYS.map((key) => {
            const label = t(`parents.situations.${key}`)
            return (
              <label
                key={key}
                className={`flex items-center justify-center p-2.5 rounded-lg border cursor-pointer transition-all text-sm font-medium text-center ${
                  formData.familySituation === key
                    ? "bg-accent/10 border-accent text-accent"
                    : "bg-white/80 border-border hover:border-accent/40"
                }`}
              >
                <input
                  type="radio"
                  name="familySituation"
                  value={key}
                  checked={formData.familySituation === key}
                  onChange={(e) => updateFormData({ familySituation: e.target.value })}
                  className="sr-only"
                />
                {label}
              </label>
            )
          })}
        </div>
      </div>

      <div className={`p-4 rounded-xl border-2 space-y-3 ${
        showDecl && errs.declarationHonneur
          ? "border-destructive/40 bg-destructive/5"
          : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20"
      }`}>
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-2">
          <Scale className="h-4 w-4 shrink-0" aria-hidden /> {t("parents.declarationTitle")}
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed">{t("parents.declarationHint")}</p>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            id="declarationHonneur"
            type="checkbox"
            checked={formData.declarationHonneur ?? false}
            onChange={(e) => {
              updateFormData({ declarationHonneur: e.target.checked })
              touch("declarationHonneur")
            }}
            onBlur={() => touch("declarationHonneur")}
            className="w-5 h-5 rounded accent-amber-600 mt-0.5 shrink-0"
          />
          <span className="text-sm font-medium text-amber-800 dark:text-amber-400 leading-relaxed">
            {t("parents.declarationText")} <span className="text-destructive">*</span>
          </span>
        </label>
        {showDecl && errs.declarationHonneur && (
          <p className="text-xs text-destructive font-medium" role="alert">{errs.declarationHonneur}</p>
        )}
      </div>
    </div>
  )
}
