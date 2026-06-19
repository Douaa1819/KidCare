/**
 * Scroll to and focus the first invalid field after validation.
 * Fields must expose `id` matching the error key and `aria-invalid="true"` when invalid.
 */
import { useEffect, useRef } from "react"
export function focusFirstFormError(errorKeys: string[]): void {
  if (errorKeys.length === 0) return

  requestAnimationFrame(() => {
    for (const key of errorKeys) {
      const el = document.getElementById(key)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        el.focus({ preventScroll: true })
        return
      }
    }
    const fallback = document.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (fallback) {
      fallback.scrollIntoView({ behavior: "smooth", block: "center" })
      fallback.focus({ preventScroll: true })
    }
  })
}

export function fieldErrorClass(hasError: boolean): string {
  return hasError
    ? "border-destructive ring-1 ring-destructive/30 focus-visible:ring-destructive/50 aria-invalid"
    : ""
}

export function shallowEqualStringRecord(
  a: Record<string, string>,
  b: Record<string, string>,
): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((key) => a[key] === b[key])
}

/** Push live field errors to parent without infinite update loops. */
export function useSyncValidationErrors(
  errors: Record<string, string>,
  onValidationErrors?: (errors: Record<string, string>) => void,
) {
  const lastSent = useRef<Record<string, string> | null>(null)

  useEffect(() => {
    if (!onValidationErrors) return
    if (lastSent.current && shallowEqualStringRecord(lastSent.current, errors)) return
    lastSent.current = errors
    onValidationErrors(errors)
  }, [errors, onValidationErrors])
}
