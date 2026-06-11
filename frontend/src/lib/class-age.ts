import {
  getDefaultChildAgePolicy,
  type AgeBound,
  type ChildAgePolicy,
} from "@/lib/child-age-policy"

function parseUnit(raw: string): AgeBound["unit"] {
  const u = raw.trim().toLowerCase()
  if (u === "months" || u === "month" || u === "mois" || u === "m") return "months"
  return "years"
}

function parseBound(raw: unknown): AgeBound | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as { value?: unknown; unit?: unknown }
  const value = Number.parseInt(String(o.value ?? ""), 10)
  if (!Number.isFinite(value) || value < 0) return null
  return { value, unit: parseUnit(String(o.unit ?? "years")) }
}

/** Lit `trancheAge` (JSON ou ancien format "2-5" en années). */
export function parseTrancheAgeToPolicy(trancheAge?: string | null): ChildAgePolicy | null {
  const raw = trancheAge?.trim()
  if (!raw) return null

  if (raw.startsWith("{")) {
    try {
      const o = JSON.parse(raw) as { min?: unknown; max?: unknown }
      const minAge = parseBound(o.min)
      const maxAge = parseBound(o.max)
      if (minAge && maxAge) return { minAge, maxAge }
    } catch {
      /* legacy */
    }
  }

  const m = raw.match(/^(\d+(?:[.,]\d+)?)\s*[-–—]\s*(\d+(?:[.,]\d+)?)/)
  if (m) {
    const minV = Math.round(Number(m[1].replace(",", ".")))
    const maxV = Math.round(Number(m[2].replace(",", ".")))
    if (Number.isFinite(minV) && Number.isFinite(maxV)) {
      return {
        minAge: { value: minV, unit: "years" },
        maxAge: { value: maxV, unit: "years" },
      }
    }
  }

  return null
}

export function formatTrancheAgeFromPolicy(policy: ChildAgePolicy): string {
  return JSON.stringify({ min: policy.minAge, max: policy.maxAge })
}

export function resolveChildAgePolicyForClasse(trancheAge?: string | null): ChildAgePolicy {
  return parseTrancheAgeToPolicy(trancheAge) ?? getDefaultChildAgePolicy()
}

/** @deprecated Utiliser parseTrancheAgeToPolicy */
export function parseTrancheAge(s?: string | null): { minAge: string; maxAge: string } {
  const policy = parseTrancheAgeToPolicy(s)
  if (!policy) return { minAge: "", maxAge: "" }
  return {
    minAge: String(policy.minAge.value),
    maxAge: String(policy.maxAge.value),
  }
}

/** @deprecated Utiliser formatTrancheAgeFromPolicy */
export function formatTrancheAge(minAge: string, maxAge: string): string {
  const min = minAge.trim()
  const max = maxAge.trim()
  if (!min || !max) return ""
  const minN = Number(min)
  const maxN = Number(max)
  if (!Number.isFinite(minN) || !Number.isFinite(maxN)) return ""
  return formatTrancheAgeFromPolicy({
    minAge: { value: Math.round(minN), unit: "years" },
    maxAge: { value: Math.round(maxN), unit: "years" },
  })
}

export function displayTrancheAge(s?: string | null): string {
  const policy = parseTrancheAgeToPolicy(s)
  if (!policy) return s?.trim() ?? ""
  const min =
    policy.minAge.unit === "months"
      ? `${policy.minAge.value} mois`
      : `${policy.minAge.value} an${policy.minAge.value > 1 ? "s" : ""}`
  const max =
    policy.maxAge.unit === "months"
      ? `${policy.maxAge.value} mois`
      : `${policy.maxAge.value} an${policy.maxAge.value > 1 ? "s" : ""}`
  return `${min} – ${max}`
}
