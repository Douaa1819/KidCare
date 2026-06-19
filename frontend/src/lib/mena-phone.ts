export type MenaPhoneCountry = {
  code: string
  dialCode: string
  flag: string
  labelFr: string
  labelAr: string
  /** National number (optional leading 0), digits only */
  localPattern: RegExp
  placeholderFr: string
  placeholderAr: string
}

/** Pays MENA — sélecteur téléphone (indicatif + numéro local). */
export const MENA_PHONE_COUNTRIES: MenaPhoneCountry[] = [
  { code: "MA", dialCode: "212", flag: "🇲🇦", labelFr: "Maroc", labelAr: "المغرب", localPattern: /^0?[5-7]\d{8}$/, placeholderFr: "06 12 34 56 78", placeholderAr: "06 12 34 56 78" },
  { code: "DZ", dialCode: "213", flag: "🇩🇿", labelFr: "Algérie", labelAr: "الجزائر", localPattern: /^0?[5-7]\d{8}$/, placeholderFr: "05 12 34 56 78", placeholderAr: "05 12 34 56 78" },
  { code: "TN", dialCode: "216", flag: "🇹🇳", labelFr: "Tunisie", labelAr: "تونس", localPattern: /^0?[29]\d{7}$/, placeholderFr: "20 123 456", placeholderAr: "20 123 456" },
  { code: "LY", dialCode: "218", flag: "🇱🇾", labelFr: "Libye", labelAr: "ليبيا", localPattern: /^0?9[1-6]\d{7}$/, placeholderFr: "91 234 5678", placeholderAr: "91 234 5678" },
  { code: "EG", dialCode: "20", flag: "🇪🇬", labelFr: "Égypte", labelAr: "مصر", localPattern: /^0?1[0125]\d{8}$/, placeholderFr: "01 0123 4567", placeholderAr: "01 0123 4567" },
  { code: "SA", dialCode: "966", flag: "🇸🇦", labelFr: "Arabie saoudite", labelAr: "السعودية", localPattern: /^0?5\d{8}$/, placeholderFr: "05 1234 5678", placeholderAr: "05 1234 5678" },
  { code: "AE", dialCode: "971", flag: "🇦🇪", labelFr: "Émirats arabes unis", labelAr: "الإمارات", localPattern: /^0?5\d{8}$/, placeholderFr: "05 1234 5678", placeholderAr: "05 1234 5678" },
  { code: "QA", dialCode: "974", flag: "🇶🇦", labelFr: "Qatar", labelAr: "قطر", localPattern: /^0?[3567]\d{7}$/, placeholderFr: "3312 3456", placeholderAr: "3312 3456" },
  { code: "KW", dialCode: "965", flag: "🇰🇼", labelFr: "Koweït", labelAr: "الكويت", localPattern: /^0?[569]\d{7}$/, placeholderFr: "5012 3456", placeholderAr: "5012 3456" },
  { code: "BH", dialCode: "973", flag: "🇧🇭", labelFr: "Bahreïn", labelAr: "البحرين", localPattern: /^0?[369]\d{7}$/, placeholderFr: "3612 3456", placeholderAr: "3612 3456" },
  { code: "OM", dialCode: "968", flag: "🇴🇲", labelFr: "Oman", labelAr: "عُمان", localPattern: /^0?9\d{7}$/, placeholderFr: "9123 4567", placeholderAr: "9123 4567" },
  { code: "JO", dialCode: "962", flag: "🇯🇴", labelFr: "Jordanie", labelAr: "الأردن", localPattern: /^0?7\d{8}$/, placeholderFr: "07 9123 4567", placeholderAr: "07 9123 4567" },
  { code: "LB", dialCode: "961", flag: "🇱🇧", labelFr: "Liban", labelAr: "لبنان", localPattern: /^0?[37]\d{6,7}$/, placeholderFr: "03 123 456", placeholderAr: "03 123 456" },
  { code: "SY", dialCode: "963", flag: "🇸🇾", labelFr: "Syrie", labelAr: "سوريا", localPattern: /^0?9\d{8}$/, placeholderFr: "09 1234 5678", placeholderAr: "09 1234 5678" },
  { code: "IQ", dialCode: "964", flag: "🇮🇶", labelFr: "Irak", labelAr: "العراق", localPattern: /^0?7[0-9]\d{8}$/, placeholderFr: "07 9123 4567", placeholderAr: "07 9123 4567" },
  { code: "PS", dialCode: "970", flag: "🇵🇸", labelFr: "Palestine", labelAr: "فلسطين", localPattern: /^0?5[69]\d{7}$/, placeholderFr: "05 9123 4567", placeholderAr: "05 9123 4567" },
  { code: "YE", dialCode: "967", flag: "🇾🇪", labelFr: "Yémen", labelAr: "اليمن", localPattern: /^0?7[0137]\d{7}$/, placeholderFr: "712 345 678", placeholderAr: "712 345 678" },
  { code: "SD", dialCode: "249", flag: "🇸🇩", labelFr: "Soudan", labelAr: "السودان", localPattern: /^0?9[0-9]\d{8}$/, placeholderFr: "09 1234 5678", placeholderAr: "09 1234 5678" },
  { code: "MR", dialCode: "222", flag: "🇲🇷", labelFr: "Mauritanie", labelAr: "موريتانيا", localPattern: /^0?[234]\d{7}$/, placeholderFr: "22 12 34 56", placeholderAr: "22 12 34 56" },
]

export const DEFAULT_MENA_PHONE_COUNTRY = "MA"

const byCode = new Map(MENA_PHONE_COUNTRIES.map((c) => [c.code, c]))
const byDialDesc = [...MENA_PHONE_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length)

export function getMenaPhoneCountry(code: string): MenaPhoneCountry | undefined {
  return byCode.get(code)
}

export function getMenaPhoneCountryLabel(code: string, locale: string): string {
  const c = getMenaPhoneCountry(code)
  if (!c) return code
  return locale === "ar" ? c.labelAr : c.labelFr
}

export function getMenaPhoneCountryFlag(code: string): string {
  const c = getMenaPhoneCountry(code)
  if (c?.flag) return c.flag
  return code
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 2)
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("")
}

export function formatMenaPhoneDialCode(code: string): string {
  const c = getMenaPhoneCountry(code)
  return c ? `+${c.dialCode}` : "+"
}

export function getMenaPhonePlaceholder(code: string, locale: string): string {
  const c = getMenaPhoneCountry(code)
  if (!c) return ""
  return locale === "ar" ? c.placeholderAr : c.placeholderFr
}

/** Chiffres uniquement — retire +, espaces, tirets, 00 international. */
export function normalizePhoneDigits(value: string): string {
  let n = value.replace(/[\s.\-()]/g, "")
  if (n.startsWith("+")) n = n.slice(1)
  if (n.startsWith("00")) n = n.slice(2)
  return n.replace(/\D/g, "")
}

export function detectMenaPhoneCountry(digits: string): MenaPhoneCountry | undefined {
  if (!digits) return undefined
  for (const c of byDialDesc) {
    if (digits.startsWith(c.dialCode) && digits.length > c.dialCode.length) return c
  }
  return undefined
}

export function parseMenaPhone(
  value: string,
  fallbackCountry: string = DEFAULT_MENA_PHONE_COUNTRY,
): { countryCode: string; local: string } {
  const digits = normalizePhoneDigits(value)
  if (!digits) return { countryCode: fallbackCountry, local: "" }

  const detected = detectMenaPhoneCountry(digits)
  if (detected) {
    return { countryCode: detected.code, local: digits.slice(detected.dialCode.length) }
  }

  if (digits.startsWith("0")) {
    return { countryCode: fallbackCountry, local: digits }
  }

  return { countryCode: fallbackCountry, local: digits }
}

export function formatMenaPhone(countryCode: string, local: string): string {
  const country = getMenaPhoneCountry(countryCode) ?? getMenaPhoneCountry(DEFAULT_MENA_PHONE_COUNTRY)!
  const localDigits = local.replace(/\D/g, "")
  if (!localDigits) return ""
  const national = localDigits.startsWith("0") ? localDigits.slice(1) : localDigits
  return `+${country.dialCode}${national}`
}

export function isValidMenaPhoneForCountry(countryCode: string, local: string): boolean {
  const country = getMenaPhoneCountry(countryCode)
  if (!country) return false
  const digits = local.replace(/\D/g, "")
  if (!digits) return false
  return country.localPattern.test(digits)
}

export function isValidMenaPhone(value: string): boolean {
  const digits = normalizePhoneDigits(value)
  if (!digits) return false

  const detected = detectMenaPhoneCountry(digits)
  if (detected) {
    const local = digits.slice(detected.dialCode.length)
    return isValidMenaPhoneForCountry(detected.code, local)
  }

  if (digits.startsWith("0")) {
    return MENA_PHONE_COUNTRIES.some((c) => isValidMenaPhoneForCountry(c.code, digits))
  }

  return MENA_PHONE_COUNTRIES.some((c) => {
    const full = `${c.dialCode}${digits}`
    const detectedInner = detectMenaPhoneCountry(full)
    if (!detectedInner || detectedInner.code !== c.code) return false
    return isValidMenaPhoneForCountry(c.code, digits)
  })
}
