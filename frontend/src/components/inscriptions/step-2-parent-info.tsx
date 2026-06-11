"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { isValidEmail, isValidName, isValidPhone, normalizePhone } from "@/lib/form-validation"
import { Check, Scale } from "lucide-react"

interface Step2Props {
  formData: Step2FormData
  updateFormData: (data: Partial<Step2FormData>) => void
  showErrors?: boolean
}

const CIN_RE   = /^[A-Za-z]{1,2}[0-9]{4,8}$/

type ParentPrefix = "mother" | "father"

type Step2FormData = {
  motherFirstName: string
  motherLastName: string
  motherPhone: string
  motherEmail: string
  motherAddress: string
  motherProfession: string
  motherCin: string
  fatherFirstName: string
  fatherLastName: string
  fatherPhone: string
  fatherEmail: string
  fatherAddress: string
  fatherProfession: string
  fatherCin: string
  familySituation: string
  responsablePrincipal: ParentPrefix
  declarationHonneur: boolean
}

function formKey(prefix: ParentPrefix, key: string): keyof Step2FormData {
  return `${prefix}${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof Step2FormData
}

function validateParent(prefix: ParentPrefix, f: Step2FormData) {
  const errs: Record<string, string> = {}
  const p = (k: string) => formKey(prefix, k)

  const firstName = String(f[p("firstName")] ?? "")
  const lastName = String(f[p("lastName")] ?? "")
  const email = String(f[p("Email")] ?? "")
  const phone = String(f[p("Phone")] ?? "")
  const cin = String(f[p("Cin")] ?? "")
  const hasAny = firstName || lastName || email || phone

  if (hasAny) {
    if (firstName && !isValidName(firstName))
      errs[p("firstName")] = "Prénom invalide — lettres uniquement, sans chiffres."
    if (lastName && !isValidName(lastName))
      errs[p("lastName")] = "Nom invalide — lettres uniquement, sans chiffres."
    if (email && !isValidEmail(email))
      errs[p("Email")] = "Adresse e-mail invalide (ex : parent@email.com)."
    if (phone && !isValidPhone(phone))
      errs[p("Phone")] = "Numéro invalide — format marocain attendu (ex : 0612345678)."
    if (cin && !CIN_RE.test(cin))
      errs[p("Cin")] = "CIN invalide (ex : AB123456 ou A123456)."
  }
  return errs
}

function validateStep2(f: Step2FormData) {
  const errs: Record<string, string> = {
    ...validateParent("mother", f),
    ...validateParent("father", f),
  }
  const hasEmail = f.motherEmail.trim() || f.fatherEmail.trim()
  if (!hasEmail)
    errs._global = "L'e-mail d'au moins un parent est obligatoire."
  if (!f.declarationHonneur)
    errs.declarationHonneur = "La déclaration sur l'honneur est obligatoire."
  return errs
}

function ParentSection({
  title, prefix, formData, updateFormData, isResponsable, onSetResponsable,
  touched, touch, showErrors,
}: {
  title: string
  prefix: ParentPrefix
  formData: Step2FormData
  updateFormData: (data: Partial<Step2FormData>) => void
  isResponsable: boolean
  onSetResponsable: () => void
  touched: Record<string, boolean>
  touch: (field: string) => void
  showErrors?: boolean
}) {
  const p = (k: string) => formKey(prefix, k)
  const errs = { ...validateParent("mother", formData), ...validateParent("father", formData) }
  const show = (field: string) => touched[field] || !!showErrors
  const renderFieldError = (field: string) =>
    show(field) && errs[field] ? <p className="text-xs text-red-500 mt-1">{errs[field]}</p> : null
  const inputCls = (field: string) =>
    `mt-1 ${show(field) && errs[field] ? "border-red-400 focus-visible:ring-red-300" : ""}`
  const fieldValue = (key: string) => String(formData[p(key)] ?? "")
  const updateField = (key: string, value: string) => {
    updateFormData({ [p(key)]: value } as Partial<Step2FormData>)
  }

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
            className="w-4 h-4 accent-primary"
          />
          <span className={`text-xs font-medium ${isResponsable ? "text-primary" : "text-muted-foreground"}`}>
            {isResponsable ? (
              <>
                <Check className="inline h-3.5 w-3.5 align-[-2px]" aria-hidden /> Responsable principal
              </>
            ) : "Définir comme responsable principal"}
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Prénom</Label>
          <Input
            placeholder="Ex : Amina"
            value={fieldValue("firstName")}
            onChange={(e) => updateField("firstName", e.target.value)}
            onBlur={() => touch(p("firstName"))}
            className={inputCls(p("firstName"))}
          />
          {renderFieldError(p("firstName"))}
        </div>
        <div>
          <Label className="text-sm font-medium">Nom</Label>
          <Input
            placeholder="Ex : Tazi"
            value={fieldValue("lastName")}
            onChange={(e) => updateField("lastName", e.target.value)}
            onBlur={() => touch(p("lastName"))}
            className={inputCls(p("lastName"))}
          />
          {renderFieldError(p("lastName"))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">CIN</Label>
          <Input
            placeholder="Ex : AB123456"
            value={fieldValue("Cin")}
            onChange={(e) => updateField("Cin", e.target.value)}
            onBlur={() => touch(p("Cin"))}
            className={inputCls(p("Cin"))}
          />
          {renderFieldError(p("Cin"))}
        </div>
        <div>
          <Label className="text-sm font-medium">Téléphone</Label>
          <Input
            placeholder="Ex : 0612345678"
            inputMode="tel"
            value={fieldValue("Phone")}
            onChange={(e) => updateField("Phone", normalizePhone(e.target.value))}
            onBlur={() => touch(p("Phone"))}
            className={inputCls(p("Phone"))}
          />
          {renderFieldError(p("Phone"))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">
            E-mail {prefix === "mother" ? <span className="text-red-500">*</span> : null}
          </Label>
          <Input
            type="email"
            placeholder="Ex : parent@email.com"
            value={fieldValue("Email")}
            onChange={(e) => updateField("Email", e.target.value)}
            onBlur={() => touch(p("Email"))}
            className={inputCls(p("Email"))}
          />
          {renderFieldError(p("Email"))}
        </div>
        <div>
          <Label className="text-sm font-medium">Profession</Label>
          <Input
            placeholder="Ex : Médecin"
            value={fieldValue("Profession")}
            onChange={(e) => updateField("Profession", e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Adresse</Label>
        <Input
          placeholder="Ex : 123 Rue de la Paix, Casablanca"
          value={fieldValue("Address")}
          onChange={(e) => updateField("Address", e.target.value)}
          className="mt-1"
        />
      </div>
    </div>
  )
}

export default function Step2ParentInfo({ formData, updateFormData, showErrors }: Step2Props) {
  const familySituations = ["Mariés", "Divorcés", "Séparés", "Union libre"]
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const touch = (field: string) => setTouched(prev => ({ ...prev, [field]: true }))

  const errs = validateStep2(formData)
  const showDecl = touched.declarationHonneur || !!showErrors

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-1">
          <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
          </svg>
          Informations des parents / tuteurs
        </h2>
        <p className="text-sm text-muted-foreground">
          Au moins un parent doit avoir un e-mail. Les champs <span className="text-red-500">*</span> sont obligatoires.
        </p>
      </div>

      {showErrors && errs._global && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {errs._global}
        </div>
      )}

      <ParentSection
        title="Mère"
        prefix="mother"
        formData={formData}
        updateFormData={updateFormData}
        isResponsable={formData.responsablePrincipal === "mother"}
        onSetResponsable={() => updateFormData({ responsablePrincipal: "mother" })}
        touched={touched}
        touch={touch}
        showErrors={showErrors}
      />

      <ParentSection
        title="Père"
        prefix="father"
        formData={formData}
        updateFormData={updateFormData}
        isResponsable={formData.responsablePrincipal === "father"}
        onSetResponsable={() => updateFormData({ responsablePrincipal: "father" })}
        touched={touched}
        touch={touch}
        showErrors={showErrors}
      />

      {/* Situation familiale */}
      <div>
        <Label className="text-sm font-medium">Situation familiale</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          {familySituations.map((situation) => (
            <label
              key={situation}
              className={`flex items-center justify-center p-2.5 rounded-lg border cursor-pointer transition-all text-sm font-medium text-center ${
                formData.familySituation === situation
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-background border-border hover:border-primary/50"
              }`}
            >
              <input
                type="radio"
                name="familySituation"
                value={situation}
                checked={formData.familySituation === situation}
                onChange={(e) => updateFormData({ familySituation: e.target.value })}
                className="sr-only"
              />
              {situation}
            </label>
          ))}
        </div>
      </div>

      {/* Déclaration sur l'honneur */}
      <div className={`p-4 rounded-xl border-2 space-y-3 ${
        showDecl && errs.declarationHonneur
          ? "border-red-300 bg-red-50"
          : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20"
      }`}>
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-2">
          <Scale className="h-4 w-4" aria-hidden /> Déclaration sur l&apos;honneur
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed">
          Cette déclaration est requise pour valider votre dossier d&apos;inscription.
        </p>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={formData.declarationHonneur ?? false}
            onChange={(e) => {
              updateFormData({ declarationHonneur: e.target.checked })
              touch("declarationHonneur")
            }}
            onBlur={() => touch("declarationHonneur")}
            className="w-5 h-5 rounded accent-amber-600 mt-0.5 flex-shrink-0"
          />
          <span className="text-sm font-medium text-amber-800 dark:text-amber-400 leading-relaxed">
            Je soussigné(e), représentant(e) légal(e) de l&apos;enfant, déclare sur l&apos;honneur l&apos;exactitude
            des informations fournies dans ce formulaire d&apos;inscription.{" "}
            <span className="text-red-500">*</span>
          </span>
        </label>
        {showDecl && errs.declarationHonneur && (
          <p className="text-xs text-red-600 font-medium">{errs.declarationHonneur}</p>
        )}
      </div>
    </div>
  )
}
