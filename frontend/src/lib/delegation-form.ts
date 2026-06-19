/** Valeurs stockées côté API / affichées dans les selects « relation ». */
import { isValidCin, isValidName, isValidPhone } from "@/lib/form-validation"

export const DELEGATION_RELATION_CODES = ["Mere", "Pere", "Proche", "Tuteur", "Autre"] as const
export type DelegationRelationCode = (typeof DELEGATION_RELATION_CODES)[number]

export function isDelegationRelationCode(v: string): v is DelegationRelationCode {
  return (DELEGATION_RELATION_CODES as readonly string[]).includes(v)
}

/** Mappe les anciennes valeurs texte ou codes hérités vers la liste fermée. */
export function normalizeDelegationRelation(raw: string | null | undefined): DelegationRelationCode {
  const u = String(raw ?? "").trim()
  if (isDelegationRelationCode(u)) return u
  if (u === "GrandMere" || u === "GrandPere") return "Proche"
  return "Autre"
}

export const DELEGATION_PHONE_MIN_DIGITS = 8
export const DELEGATION_PHONE_MAX_DIGITS = 15

export function countPhoneDigits(value: string): number {
  return value.replace(/\D/g, "").length
}

/** Clé i18n sous `parent.ui.*` (sans préfixe parent.). */
export type DelegationPhoneMessageKey =
  | "delegationPhoneRequiredInline"
  | "delegationPhoneTooShort"
  | "delegationPhoneTooLong"
  | "delegationPhoneInvalid"

export function delegationPhoneMessageKey(phone: string): DelegationPhoneMessageKey | null {
  const p = phone.trim()
  if (!p) return "delegationPhoneRequiredInline"
  const digits = countPhoneDigits(p)
  if (digits < DELEGATION_PHONE_MIN_DIGITS) return "delegationPhoneTooShort"
  if (digits > DELEGATION_PHONE_MAX_DIGITS) return "delegationPhoneTooLong"
  if (!isValidPhone(p)) return "delegationPhoneInvalid"
  return null
}

export type DelegationNameMessageKey = "delegationNameRequiredInline" | "delegationNameInvalid"

export function delegationNomMessageKey(nom: string): DelegationNameMessageKey | null {
  if (nom.trim().length === 0) return "delegationNameRequiredInline"
  if (!isValidName(nom)) return "delegationNameInvalid"
  return null
}

const CIN_MAX = 32

/** CIN optionnel : chaîne nettoyée ou undefined si vide. */
export function normalizeDelegationCin(cin: string): string | undefined {
  const t = cin.trim()
  if (!t) return undefined
  return t.slice(0, CIN_MAX)
}

export function delegationCinTooLong(cin: string): boolean {
  return cin.trim().length > CIN_MAX
}

export type DelegationCinMessageKey = "delegationCinTooLong" | "delegationCinInvalid"

export function delegationCinMessageKey(cin: string): DelegationCinMessageKey | null {
  const value = cin.trim()
  if (!value) return null
  if (delegationCinTooLong(value)) return "delegationCinTooLong"
  if (!isValidCin(value)) return "delegationCinInvalid"
  return null
}

export type DelegationRelationDetailMessageKey = "delegationRelationDetailRequired" | "delegationRelationDetailInvalid"

export function delegationRelationDetailMessageKey(relation: DelegationRelationCode, detail?: string): DelegationRelationDetailMessageKey | null {
  if (relation !== "Autre") return null
  const value = String(detail ?? "").trim()
  if (!value) return "delegationRelationDetailRequired"
  if (!isValidName(value)) return "delegationRelationDetailInvalid"
  return null
}

export type DelegationFormPayload = {
  nom: string
  telephone: string
  cin: string
  relation: DelegationRelationCode
  relationDetail?: string
}

export function toApiDelegationBody(form: DelegationFormPayload): { nom: string; telephone: string; cin: string; relation: string } {
  const cin = normalizeDelegationCin(form.cin)
  const relation = form.relation === "Autre" ? String(form.relationDetail ?? "").trim() : form.relation
  return {
    nom: form.nom.trim(),
    telephone: form.telephone.trim(),
    cin: cin ?? "",
    relation,
  }
}

export function isDelegationFormValid(form: DelegationFormPayload): boolean {
  if (delegationNomMessageKey(form.nom)) return false
  if (delegationPhoneMessageKey(form.telephone)) return false
  if (!isDelegationRelationCode(form.relation)) return false
  if (delegationRelationDetailMessageKey(form.relation, form.relationDetail)) return false
  if (delegationCinMessageKey(form.cin)) return false
  return true
}
