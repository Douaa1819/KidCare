import {
  CHILD_ENROLLMENT_AGE_POLICY,
  computeAgeYearsFromBirthdate,
  getBirthdateLimits as getBirthdateLimitsFromPolicy,
  getBirthdateValidation as getBirthdateValidationFromPolicy,
  getDefaultChildAgePolicy,
  ISO_DATE_RE,
  isValidIsoDateString,
  type ChildAgePolicy,
} from "@/lib/child-age-policy"

export { CHILD_ENROLLMENT_AGE_POLICY, ISO_DATE_RE, isValidIsoDateString }

const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ\u0600-\u06FF' -]+$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
const MOROCCAN_PHONE_RE = /^(0[5-7]\d{8}|\+212[5-7]\d{8}|00212[5-7]\d{8})$/
const CIN_RE = /^[A-Za-z]{1,2}[0-9]{4,8}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/** @deprecated Utiliser getDefaultChildAgePolicy() */
export const CHILD_MIN_AGE_YEARS = (() => {
  const p = getDefaultChildAgePolicy()
  return p.minAge.unit === "years" ? p.minAge.value : p.minAge.value / 12
})()
/** @deprecated Utiliser getDefaultChildAgePolicy() */
export const CHILD_MAX_AGE_YEARS = getDefaultChildAgePolicy().maxAge.value

export type { ChildAgePolicy }
export { computeAgeYearsFromBirthdate, getDefaultChildAgePolicy }

export function isValidName(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.length >= 2 && NAME_RE.test(trimmed)
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

export function normalizePhone(value: string): string {
  return value.replace(/[\s.-]/g, "")
}

export function isValidPhone(value: string): boolean {
  return MOROCCAN_PHONE_RE.test(normalizePhone(value))
}

export function isValidCin(value: string): boolean {
  return CIN_RE.test(value.trim())
}

export function getBirthdateValidation(
  value: string,
  policy: ChildAgePolicy = getDefaultChildAgePolicy(),
  messages?: Parameters<typeof getBirthdateValidationFromPolicy>[2],
): string | null {
  return getBirthdateValidationFromPolicy(value, policy, messages)
}

/** Ajout enfant : 6 mois minimum, 5 ans maximum + format `YYYY-MM-DD`. */
export function getChildEnrollmentBirthdateValidation(
  value: string,
  messages?: {
    required?: string
    invalidFormat?: string
    invalid?: string
    tooYoung?: (minLabel: string, ageLabel: string) => string
    tooOld?: (maxLabel: string, ageLabel: string) => string
  },
): string | null {
  return getBirthdateValidationFromPolicy(value, CHILD_ENROLLMENT_AGE_POLICY, messages)
}

export function getBirthdateLimits(policy: ChildAgePolicy = getDefaultChildAgePolicy()) {
  return getBirthdateLimitsFromPolicy(policy)
}

export function getChildEnrollmentBirthdateLimits() {
  return getBirthdateLimitsFromPolicy(CHILD_ENROLLMENT_AGE_POLICY)
}

export function isValidTime(value: string): boolean {
  return TIME_RE.test(value)
}

export function validateTimeRange(date: string, startTime: string, endTime: string): string | null {
  if (!date || !isValidTime(startTime) || !isValidTime(endTime)) {
    return "Veuillez renseigner une date et des heures valides."
  }
  const start = new Date(`${date}T${startTime}:00`)
  const end = new Date(`${date}T${endTime}:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Horaire invalide."
  if (end <= start) return "L'heure de fin doit être après l'heure de début."
  return null
}

export function formatFoodRestriction(value?: string | null): string {
  switch (value) {
    case "sans_restriction":
      return "Sans restriction"
    case "sans_porc":
      return "Sans porc"
    case "vegetarien":
      return "Végétarien"
    case "allergies":
      return "Allergies"
    case "autre":
      return "Autre"
    default:
      return value?.replace(/_/g, " ") ?? "—"
  }
}
