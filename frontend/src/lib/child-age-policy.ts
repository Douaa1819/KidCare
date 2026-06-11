export type AgeUnit = "months" | "years"

export type AgeBound = {
  value: number
  unit: AgeUnit
}

export type ChildAgePolicy = {
  minAge: AgeBound
  maxAge: AgeBound
}

const DEFAULT_POLICY: ChildAgePolicy = {
  minAge: { value: 6, unit: "months" },
  maxAge: { value: 5, unit: "years" },
}

/** Politique inscription enfant : entre 6 mois et 5 ans (pas plus). */
export const CHILD_ENROLLMENT_AGE_POLICY: ChildAgePolicy = {
  minAge: { value: 6, unit: "months" },
  maxAge: { value: 5, unit: "years" },
}

/** Format ISO `YYYY-MM-DD` (champ `type="date"`). */
export const ISO_DATE_RE = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/

export function isValidIsoDateString(value: string): boolean {
  const v = value.trim()
  if (!ISO_DATE_RE.test(v)) return false
  const [y, m, d] = v.split("-").map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(String(raw ?? "").trim(), 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

function parseUnit(raw: string | undefined, fallback: AgeUnit): AgeUnit {
  const u = String(raw ?? "").trim().toLowerCase()
  if (u === "months" || u === "month" || u === "mois") return "months"
  if (u === "years" || u === "year" || u === "ans" || u === "an") return "years"
  return fallback
}

export function ageBoundToYears(bound: AgeBound): number {
  return bound.unit === "months" ? bound.value / 12 : bound.value
}

/** Plafond âge maximum en années (saisie : 0 à 5). */
export const CHILD_MAX_AGE_YEARS_CAP = 5

export const CHILD_MAX_AGE_MONTHS_CAP = CHILD_MAX_AGE_YEARS_CAP * 12

/** Années entières autorisées (min / max) : 0, 1, 2, 3, 4 ou 5. */
export const AGE_YEARS_REGEX = /^[0-5]$/
/** @deprecated Utiliser AGE_YEARS_REGEX */
export const MAX_AGE_YEARS_REGEX = AGE_YEARS_REGEX

function validateAgeYearsInCap(
  value: number,
  cap: number,
  kind: "min" | "max",
): string | null {
  if (!Number.isInteger(value) || value < 0) {
    return "Saisissez un nombre entier entre 0 et 5."
  }
  if (value > cap) {
    if (kind === "min") {
      return `Valeur invalide : l'âge minimum ne peut pas dépasser ${cap} ans (saisie autorisée : 0 à ${cap}, ex. 2 ou 3).`
    }
    return `Valeur invalide : l'âge maximum ne peut pas dépasser ${cap} ans (saisie autorisée : 0 à ${cap}, ex. 3 ou 4).`
  }
  return null
}

export function validateMinAgeYearsValue(
  value: number,
  cap: number = CHILD_MAX_AGE_YEARS_CAP,
): string | null {
  return validateAgeYearsInCap(value, cap, "min")
}

export function validateMaxAgeYearsValue(
  value: number,
  cap: number = CHILD_MAX_AGE_YEARS_CAP,
): string | null {
  return validateAgeYearsInCap(value, cap, "max")
}

export function validateAgeBound(bound: AgeBound, kind: "min" | "max"): string | null {
  if (!Number.isInteger(bound.value) || bound.value < 0) {
    return "Saisissez un nombre entier positif."
  }
  if (bound.unit === "years") {
    return kind === "min" ? validateMinAgeYearsValue(bound.value) : validateMaxAgeYearsValue(bound.value)
  }
  if (bound.value > CHILD_MAX_AGE_MONTHS_CAP) {
    return kind === "min"
      ? `Valeur invalide : l'âge minimum ne peut pas dépasser ${CHILD_MAX_AGE_MONTHS_CAP} mois (équivalent ${CHILD_MAX_AGE_YEARS_CAP} ans).`
      : `Valeur invalide : l'âge maximum ne peut pas dépasser ${CHILD_MAX_AGE_MONTHS_CAP} mois (équivalent ${CHILD_MAX_AGE_YEARS_CAP} ans).`
  }
  return null
}

export function validateMinNotAboveMax(policy: ChildAgePolicy): string | null {
  if (ageBoundToYears(policy.minAge) > ageBoundToYears(policy.maxAge)) {
    return "L'âge minimum ne peut pas être supérieur à l'âge maximum."
  }
  return null
}

export function policyToYearBounds(policy: ChildAgePolicy): { minAgeYears: number; maxAgeYears: number } {
  return {
    minAgeYears: ageBoundToYears(policy.minAge),
    maxAgeYears: ageBoundToYears(policy.maxAge),
  }
}

export function formatAgeBound(bound: AgeBound, labels?: { months: string; years: string }): string {
  if (bound.unit === "months") {
    return labels?.months ? labels.months.replace("{value}", String(bound.value)) : `${bound.value} mois`
  }
  const y = bound.value
  return labels?.years
    ? labels.years.replace("{value}", String(y))
    : `${y} an${y > 1 ? "s" : ""}`
}

export function formatAgeFromYears(ageYears: number): string {
  if (ageYears < 1) {
    const months = Math.max(0, Math.round(ageYears * 12))
    return `${months} mois`
  }
  const years = Math.floor(ageYears)
  const extraMonths = Math.round((ageYears - years) * 12)
  if (extraMonths > 0 && years < 2) {
    return years > 0 ? `${years} an et ${extraMonths} mois` : `${extraMonths} mois`
  }
  return `${years} an${years > 1 ? "s" : ""}`
}

function readBoundFromEnv(
  valueKey: string,
  unitKey: string,
  legacyYearsKey: string,
  defaultValue: number,
  defaultUnit: AgeUnit,
): AgeBound {
  const legacyYears = process.env[legacyYearsKey]
  if (legacyYears != null && String(legacyYears).trim() !== "") {
    return { value: parsePositiveInt(legacyYears, defaultValue), unit: "years" }
  }
  return {
    value: parsePositiveInt(process.env[valueKey], defaultValue),
    unit: parseUnit(process.env[unitKey], defaultUnit),
  }
}

export function getDefaultChildAgePolicy(): ChildAgePolicy {
  let minAge = readBoundFromEnv(
    "NEXT_PUBLIC_CHILD_MIN_AGE_VALUE",
    "NEXT_PUBLIC_CHILD_MIN_AGE_UNIT",
    "NEXT_PUBLIC_CHILD_MIN_AGE_YEARS",
    DEFAULT_POLICY.minAge.value,
    DEFAULT_POLICY.minAge.unit,
  )
  let maxAge = readBoundFromEnv(
    "NEXT_PUBLIC_CHILD_MAX_AGE_VALUE",
    "NEXT_PUBLIC_CHILD_MAX_AGE_UNIT",
    "NEXT_PUBLIC_CHILD_MAX_AGE_YEARS",
    DEFAULT_POLICY.maxAge.value,
    DEFAULT_POLICY.maxAge.unit,
  )
  if (ageBoundToYears(minAge) > ageBoundToYears(maxAge)) {
    return { ...DEFAULT_POLICY }
  }
  return { minAge, maxAge }
}

export function normalizeChildAgePolicy(raw: unknown): ChildAgePolicy {
  const o = raw as Record<string, unknown>

  if (o?.minAge && o?.maxAge && typeof o.minAge === "object" && typeof o.maxAge === "object") {
    const min = o.minAge as { value?: unknown; unit?: unknown }
    const max = o.maxAge as { value?: unknown; unit?: unknown }
    const policy: ChildAgePolicy = {
      minAge: {
        value: parsePositiveInt(String(min.value ?? ""), DEFAULT_POLICY.minAge.value),
        unit: parseUnit(String(min.unit ?? ""), DEFAULT_POLICY.minAge.unit),
      },
      maxAge: {
        value: parsePositiveInt(String(max.value ?? ""), DEFAULT_POLICY.maxAge.value),
        unit: parseUnit(String(max.unit ?? ""), DEFAULT_POLICY.maxAge.unit),
      },
    }
    if (ageBoundToYears(policy.minAge) <= ageBoundToYears(policy.maxAge)) {
      return policy
    }
  }

  if (o?.minAgeYears != null || o?.maxAgeYears != null) {
    return {
      minAge: { value: parsePositiveInt(String(o.minAgeYears ?? ""), 6), unit: "years" },
      maxAge: { value: parsePositiveInt(String(o.maxAgeYears ?? ""), 5), unit: "years" },
    }
  }

  return getDefaultChildAgePolicy()
}

export function computeAgeYearsFromBirthdate(value: string): number | null {
  if (!value) return null
  const dob = new Date(`${value}T12:00:00`)
  if (Number.isNaN(dob.getTime())) return null
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return (today.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
}

export function validateChildAgePolicy(
  policy: ChildAgePolicy,
  messages?: {
    invalid?: string
    minGtMax?: string
    minInvalid?: string
    maxInvalid?: string
  },
): string | null {
  for (const bound of [policy.minAge, policy.maxAge]) {
    if (!Number.isInteger(bound.value) || bound.value < 0) {
      return messages?.invalid ?? "Les valeurs d'âge doivent être des entiers positifs."
    }
  }
  const minErr = validateAgeBound(policy.minAge, "min")
  if (minErr) return messages?.minInvalid ?? minErr
  const maxErr = validateAgeBound(policy.maxAge, "max")
  if (maxErr) return messages?.maxInvalid ?? maxErr
  const orderErr = validateMinNotAboveMax(policy)
  if (orderErr) return messages?.minGtMax ?? orderErr
  return null
}

/** @deprecated Utiliser validateChildAgePolicy */
export function validateChildAgeInterval(
  minAgeYears: number,
  maxAgeYears: number,
  messages?: {
    invalid?: string
    minGtMax?: string
    minRange?: string
    maxRange?: string
  },
): string | null {
  return validateChildAgePolicy(
    {
      minAge: { value: Math.round(minAgeYears * 12), unit: "months" },
      maxAge: { value: maxAgeYears, unit: "years" },
    },
    messages,
  )
}

export function getBirthdateValidation(
  value: string,
  policy: ChildAgePolicy,
  messages?: {
    required?: string
    invalidFormat?: string
    invalid?: string
    tooYoung?: (minLabel: string, ageLabel: string) => string
    tooOld?: (maxLabel: string, ageLabel: string) => string
  },
): string | null {
  if (!value?.trim()) return messages?.required ?? "La date de naissance est obligatoire."

  if (!isValidIsoDateString(value)) {
    return messages?.invalidFormat ?? "Format invalide : utilisez AAAA-MM-JJ (ex. 2021-03-15)."
  }

  const intervalError = validateChildAgePolicy(policy)
  if (intervalError) return intervalError

  const ageYears = computeAgeYearsFromBirthdate(value)
  if (ageYears == null) return messages?.invalid ?? "Date de naissance invalide."

  const minYears = ageBoundToYears(policy.minAge)
  const maxYears = ageBoundToYears(policy.maxAge)
  const minLabel = formatAgeBound(policy.minAge)
  const maxLabel = formatAgeBound(policy.maxAge)
  const ageLabel = formatAgeFromYears(ageYears)

  if (ageYears < minYears) {
    return (
      messages?.tooYoung?.(minLabel, ageLabel) ??
      `L'enfant doit avoir au moins ${minLabel} (âge actuel : ${ageLabel}).`
    )
  }
  if (ageYears > maxYears) {
    return (
      messages?.tooOld?.(maxLabel, ageLabel) ??
      `L'enfant ne peut pas avoir plus de ${maxLabel} (âge actuel : ${ageLabel}).`
    )
  }
  return null
}

export function getBirthdateLimits(policy: ChildAgePolicy) {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const { minAgeYears, maxAgeYears } = policyToYearBounds(policy)
  const oldest = new Date(today.getTime() - maxAgeYears * 365.25 * 24 * 60 * 60 * 1000)
  const youngest = new Date(today.getTime() - minAgeYears * 365.25 * 24 * 60 * 60 * 1000)
  const toKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  return { min: toKey(oldest), max: toKey(youngest) }
}
