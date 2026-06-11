import { toast } from "sonner"

type ApiErr = {
  response?: { data?: { message?: unknown } }
  message?: string
}

type FeedbackMessages = Record<string, string>

let feedbackMessages: FeedbackMessages = {}

const VALIDATION_HINT_KEYS: Array<{ test: RegExp; key: string }> = [
  { test: /startAt.*endAt|endAt.*startAt/i, key: "endAfterStart" },
  { test: /cost.*(less than|minimum|min)/i, key: "costNegative" },
  { test: /cost.*(positive|greater)/i, key: "costPositive" },
  { test: /cost.*(number|numeric)/i, key: "costNumeric" },
  { test: /currency/i, key: "currencyInvalid" },
  { test: /classe.*(not found|introuvable)/i, key: "classNotFound" },
  { test: /forbidden|403/i, key: "forbidden" },
  { test: /unauthorized|401/i, key: "sessionExpired" },
]

export function initFeedbackMessages(messages: FeedbackMessages) {
  feedbackMessages = messages
}

function fb(key: string, fallback: string): string {
  return feedbackMessages[key] ?? fallback
}

/** Extrait un message lisible depuis une erreur API axios. */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const ax = err as ApiErr
  const msg = ax?.response?.data?.message
  let raw = fallback
  if (typeof msg === "string" && msg.trim()) raw = msg.trim()
  else if (Array.isArray(msg)) raw = msg.filter((m) => typeof m === "string").join(", ")
  else if (typeof ax?.message === "string" && ax.message.trim() && !ax.message.includes("status code"))
    raw = ax.message.trim()
  return humanizeValidationMessage(raw)
}

export function humanizeValidationMessage(message: string): string {
  const trimmed = message.trim()
  if (!trimmed) return trimmed
  for (const { test, key } of VALIDATION_HINT_KEYS) {
    if (test.test(trimmed)) return fb(key, trimmed)
  }
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => {
            if (typeof item === "string") return humanizeValidationMessage(item)
            if (item && typeof item === "object" && "constraints" in item) {
              const c = (item as { constraints?: Record<string, string> }).constraints
              if (c) return Object.values(c).map(humanizeValidationMessage).join(" ")
            }
            return ""
          })
          .filter(Boolean)
          .join(" ")
      }
    } catch {
      /* ignore */
    }
  }
  return trimmed
}

export function notifySuccess(message: string) {
  toast.success(message)
}

export function notifyError(message: string) {
  toast.error(message)
}
