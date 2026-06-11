"use client"

import { Input } from "@/components/ui/input"
import {
  CHILD_MAX_AGE_MONTHS_CAP,
  CHILD_MAX_AGE_YEARS_CAP,
  formatAgeBound,
  validateAgeBound,
  validateMinNotAboveMax,
  type AgeBound,
  type AgeUnit,
  type ChildAgePolicy,
} from "@/lib/child-age-policy"

type ChildAgeIntervalFieldsProps = {
  policy: ChildAgePolicy
  onMinChange: (bound: AgeBound) => void
  onMaxChange: (bound: AgeBound) => void
  labels: {
    min: string
    max: string
    unitMonths: string
    unitYears: string
    hint?: string
  }
  readOnly?: boolean
  showMin?: boolean
  className?: string
}

function parseAgeInput(raw: string, fallback: number): number {
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

function AgeBoundRow({
  label,
  bound,
  onChange,
  unitMonthsLabel,
  unitYearsLabel,
  readOnly,
  fieldError,
}: {
  label: string
  bound: AgeBound
  onChange: (bound: AgeBound) => void
  unitMonthsLabel: string
  unitYearsLabel: string
  readOnly?: boolean
  fieldError?: string | null
}) {
  const hasError = Boolean(fieldError)
  const isYears = bound.unit === "years"

  const handleValueChange = (raw: string) => {
    if (raw === "") {
      onChange({ ...bound, value: 0 })
      return
    }
    onChange({ ...bound, value: parseAgeInput(raw, bound.value) })
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="flex gap-2">
        <Input
          type="text"
          inputMode="numeric"
          value={String(bound.value)}
          readOnly={readOnly}
          disabled={readOnly}
          onChange={e => handleValueChange(e.target.value)}
          pattern={isYears ? "[0-5]" : "[0-9]*"}
          maxLength={isYears ? 1 : 3}
          title={
            isYears
              ? `0 à ${CHILD_MAX_AGE_YEARS_CAP} ans (ex. 2, 3 ou 4)`
              : `0 à ${CHILD_MAX_AGE_MONTHS_CAP} mois (ex. 6 ou 12)`
          }
          className={`flex-1 ${hasError ? "border-red-400 focus-visible:ring-red-300" : ""}`}
          aria-invalid={hasError}
        />
        <select
          value={bound.unit}
          disabled={readOnly}
          onChange={e => onChange({ ...bound, unit: e.target.value as AgeUnit })}
          className="w-[7.5rem] shrink-0 border border-input rounded-md px-2 py-2 text-sm bg-background"
          aria-label={`${label} — unité`}
        >
          <option value="months">{unitMonthsLabel}</option>
          <option value="years">{unitYearsLabel}</option>
        </select>
      </div>
      {fieldError && <p className="mt-1 text-xs text-red-500">{fieldError}</p>}
    </div>
  )
}

export function ChildAgeIntervalFields({
  policy,
  onMinChange,
  onMaxChange,
  labels,
  readOnly = false,
  showMin = true,
  className,
}: ChildAgeIntervalFieldsProps) {
  const minFieldError = validateAgeBound(policy.minAge, "min")
  const maxFieldError = validateAgeBound(policy.maxAge, "max")
  const orderError =
    !minFieldError && !maxFieldError ? validateMinNotAboveMax(policy) : null

  const minRowError = minFieldError ?? (orderError && showMin ? orderError : null)
  const maxRowError = maxFieldError ?? (orderError && showMin ? orderError : null)

  const minLabel = formatAgeBound(policy.minAge)
  const maxLabel = formatAgeBound(policy.maxAge)
  const hint =
    labels.hint?.replace("{min}", minLabel).replace("{max}", maxLabel) ??
    `De ${minLabel} à ${maxLabel}. Choisissez mois ou ans (max. ${CHILD_MAX_AGE_YEARS_CAP} ans ou ${CHILD_MAX_AGE_MONTHS_CAP} mois).`

  const showHint = !minRowError && !maxRowError

  return (
    <div className={className}>
      <div className={`grid grid-cols-1 ${showMin ? "sm:grid-cols-2" : ""} gap-4`}>
        {showMin && (
          <AgeBoundRow
            label={labels.min}
            bound={policy.minAge}
            onChange={onMinChange}
            unitMonthsLabel={labels.unitMonths}
            unitYearsLabel={labels.unitYears}
            readOnly={readOnly}
            fieldError={minRowError}
          />
        )}
        <AgeBoundRow
          label={labels.max}
          bound={policy.maxAge}
          onChange={onMaxChange}
          unitMonthsLabel={labels.unitMonths}
          unitYearsLabel={labels.unitYears}
          readOnly={readOnly}
          fieldError={maxRowError}
        />
      </div>
      {showHint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
