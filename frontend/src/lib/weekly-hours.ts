import { isValidTime } from "@/lib/form-validation"

export type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
export type TimeInterval = { start: string; end: string }
export type DayHours = { open: boolean; intervals: TimeInterval[] }

export type WeeklyHours = Record<DayKey, DayHours>

export const DAY_KEYS: DayKey[] = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
]

const DEFAULT_INTERVAL: TimeInterval = { start: "07:30", end: "18:00" }

export const DEFAULT_HOURS: WeeklyHours = {
  monday: { open: true, intervals: [{ ...DEFAULT_INTERVAL }] },
  tuesday: { open: true, intervals: [{ ...DEFAULT_INTERVAL }] },
  wednesday: { open: true, intervals: [{ ...DEFAULT_INTERVAL }] },
  thursday: { open: true, intervals: [{ ...DEFAULT_INTERVAL }] },
  friday: { open: true, intervals: [{ ...DEFAULT_INTERVAL }] },
  saturday: { open: false, intervals: [{ start: "08:00", end: "13:00" }] },
  sunday: { open: false, intervals: [{ start: "08:00", end: "13:00" }] },
}

export function cloneHours(hours: WeeklyHours): WeeklyHours {
  return DAY_KEYS.reduce((acc, day) => {
    acc[day] = {
      open: hours[day].open,
      intervals: hours[day].intervals.map(i => ({ ...i })),
    }
    return acc
  }, {} as WeeklyHours)
}

function normalizeInterval(raw: Partial<TimeInterval> | undefined, fallback: TimeInterval): TimeInterval {
  const start = typeof raw?.start === "string" && isValidTime(raw.start) ? raw.start : fallback.start
  const end = typeof raw?.end === "string" && isValidTime(raw.end) ? raw.end : fallback.end
  return { start, end }
}

function migrateLegacyDay(
  value: { open?: boolean; start?: string; end?: string; intervals?: Partial<TimeInterval>[] } | undefined,
  fallback: DayHours,
): DayHours {
  if (!value) return { open: fallback.open, intervals: fallback.intervals.map(i => ({ ...i })) }
  const open = Boolean(value.open)
  if (Array.isArray(value.intervals) && value.intervals.length > 0) {
    return {
      open,
      intervals: value.intervals.map(i => normalizeInterval(i, fallback.intervals[0])),
    }
  }
  if (typeof value.start === "string" || typeof value.end === "string") {
    return {
      open,
      intervals: [normalizeInterval({ start: value.start, end: value.end }, fallback.intervals[0])],
    }
  }
  return { open, intervals: fallback.intervals.map(i => ({ ...i })) }
}

export function parseWeeklyHours(raw?: string | null): {
  hours: WeeklyHours
  legacyText: string | null
  structured: boolean
} {
  if (!raw?.trim()) return { hours: cloneHours(DEFAULT_HOURS), legacyText: null, structured: false }
  try {
    const parsed = JSON.parse(raw) as {
      type?: string
      days?: Partial<Record<DayKey, Parameters<typeof migrateLegacyDay>[0]>>
    }
    if (
      (parsed?.type === "weekly-hours-v2" || parsed?.type === "weekly-hours-v1") &&
      parsed.days
    ) {
      const hours = cloneHours(DEFAULT_HOURS)
      DAY_KEYS.forEach(day => {
        hours[day] = migrateLegacyDay(parsed.days?.[day], DEFAULT_HOURS[day])
      })
      return { hours, legacyText: null, structured: true }
    }
  } catch {
    // free text
  }
  return { hours: cloneHours(DEFAULT_HOURS), legacyText: raw, structured: false }
}

export function serializeWeeklyHours(hours: WeeklyHours): string {
  return JSON.stringify({ type: "weekly-hours-v2", days: hours })
}

export function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  if (!isValidTime(a.start) || !isValidTime(a.end) || !isValidTime(b.start) || !isValidTime(b.end)) {
    return false
  }
  return a.start < b.end && b.start < a.end
}

export function validateDayIntervals(
  intervals: TimeInterval[],
  messages: { empty: string; order: string; overlap: string },
): string | null {
  if (intervals.length === 0) return messages.empty
  for (const interval of intervals) {
    if (!interval.start?.trim() || !interval.end?.trim()) return messages.empty
    if (!isValidTime(interval.start) || !isValidTime(interval.end) || interval.end <= interval.start) {
      return messages.order
    }
  }
  const sorted = [...intervals].sort((x, y) => x.start.localeCompare(y.start))
  for (let i = 0; i < sorted.length - 1; i++) {
    if (intervalsOverlap(sorted[i], sorted[i + 1])) return messages.overlap
  }
  return null
}

export function dayHoursLabel(hours: DayHours, closedLabel: string): string {
  if (!hours.open) return closedLabel
  return hours.intervals
    .filter(i => i.start && i.end)
    .map(i => `${i.start} – ${i.end}`)
    .join(" · ") || closedLabel
}
