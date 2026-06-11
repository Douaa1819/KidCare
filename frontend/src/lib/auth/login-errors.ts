export type LoginErrorCode =
  | "USER_NOT_FOUND"
  | "INVALID_PASSWORD"
  | "ACCOUNT_DISABLED"
  | "ACCOUNT_ARCHIVED"
  | "INVITATION_EXPIRED"
  | "ACCOUNT_NOT_ACTIVATED"
  | "ACCESS_RESTRICTED"
  | "TOO_MANY_ATTEMPTS"
  | "SERVER_ERROR"

export type LoginField = "email" | "password" | "form"

export type ParsedLoginError = {
  code: LoginErrorCode | null
  message: string
  field: LoginField
}

const EMAIL_FIELD_CODES = new Set<LoginErrorCode>([
  "USER_NOT_FOUND",
  "ACCOUNT_NOT_ACTIVATED",
  "INVITATION_EXPIRED",
])

const PASSWORD_FIELD_CODES = new Set<LoginErrorCode>(["INVALID_PASSWORD"])

const FORM_FIELD_CODES = new Set<LoginErrorCode>([
  "ACCOUNT_DISABLED",
  "ACCOUNT_ARCHIVED",
  "ACCESS_RESTRICTED",
  "TOO_MANY_ATTEMPTS",
  "SERVER_ERROR",
])

/** Ne pas tenter la connexion super-admin après ces codes. */
export const SKIP_ADMIN_FALLBACK_CODES = new Set<LoginErrorCode>([
  "ACCOUNT_DISABLED",
  "ACCOUNT_ARCHIVED",
  "INVITATION_EXPIRED",
  "ACCOUNT_NOT_ACTIVATED",
  "ACCESS_RESTRICTED",
  "TOO_MANY_ATTEMPTS",
  "SERVER_ERROR",
])

function fieldForCode(code: LoginErrorCode | null): LoginField {
  if (!code) return "form"
  if (EMAIL_FIELD_CODES.has(code)) return "email"
  if (PASSWORD_FIELD_CODES.has(code)) return "password"
  if (FORM_FIELD_CODES.has(code)) return "form"
  return "form"
}

function normalizeCode(raw: unknown): LoginErrorCode | null {
  if (typeof raw !== "string") return null
  const codes: LoginErrorCode[] = [
    "USER_NOT_FOUND",
    "INVALID_PASSWORD",
    "ACCOUNT_DISABLED",
    "ACCOUNT_ARCHIVED",
    "INVITATION_EXPIRED",
    "ACCOUNT_NOT_ACTIVATED",
    "ACCESS_RESTRICTED",
    "TOO_MANY_ATTEMPTS",
    "SERVER_ERROR",
  ]
  return codes.includes(raw as LoginErrorCode) ? (raw as LoginErrorCode) : null
}

function legacyCodeFromMessage(msg: string): LoginErrorCode | null {
  if (/aucun compte|introuvable|not found|لا يوجد حساب/i.test(msg)) return "USER_NOT_FOUND"
  if (/mot de passe incorrect|incorrect password|كلمة المرور غير صحيحة/i.test(msg)) return "INVALID_PASSWORD"
  if (/archiv/i.test(msg)) return "ACCOUNT_ARCHIVED"
  if (/désactiv|desactiv|disabled|تعطيل/i.test(msg)) return "ACCOUNT_DISABLED"
  if (/invitation.*expir|انتهت الدعوة/i.test(msg)) return "INVITATION_EXPIRED"
  if (/pas encore activ|non activ|غير مفعّل/i.test(msg)) return "ACCOUNT_NOT_ACTIVATED"
  if (/trop de tentatives|too many|محاولات كثيرة/i.test(msg)) return "TOO_MANY_ATTEMPTS"
  if (/email ou mot de passe|identifiants?.*incorrect/i.test(msg)) return "INVALID_PASSWORD"
  return null
}

export async function parseLoginResponse(
  res: Response,
  t: (key: string) => string,
): Promise<ParsedLoginError> {
  const errBody = await res.json().catch(() => ({}))
  const body = errBody as { code?: unknown; message?: unknown }
  const rawMsg = body.message
  const msg = Array.isArray(rawMsg)
    ? rawMsg.join(" ")
    : typeof rawMsg === "string"
      ? rawMsg
      : ""

  let code = normalizeCode(body.code)
  if (!code && msg) code = legacyCodeFromMessage(msg)
  if (!code && res.status === 429) code = "TOO_MANY_ATTEMPTS"
  if (!code && res.status >= 500) code = "SERVER_ERROR"

  const translationKey = code ? `errors.codes.${code}` : null
  const translated = translationKey ? t(translationKey) : ""
  const message =
    translated && !translated.startsWith("errors.codes.")
      ? translated
      : msg || t("errors.connectionFailed")

  return {
    code,
    message,
    field: fieldForCode(code),
  }
}
