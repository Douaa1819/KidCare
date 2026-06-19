export const LOCATION_OTHER = "__other__"

export type CountryOption = {
  code: string
  labelFr: string
  labelAr: string
}

export type CityOption = {
  value: string
  labelFr: string
  labelAr: string
}

export const INSCRIPTION_COUNTRIES: CountryOption[] = [
  { code: "MA", labelFr: "Maroc", labelAr: "المغرب" },
  { code: "DZ", labelFr: "Algérie", labelAr: "الجزائر" },
  { code: "TN", labelFr: "Tunisie", labelAr: "تونس" },
  { code: "LY", labelFr: "Libye", labelAr: "ليبيا" },
  { code: "EG", labelFr: "Égypte", labelAr: "مصر" },
  { code: "SA", labelFr: "Arabie saoudite", labelAr: "السعودية" },
  { code: "AE", labelFr: "Émirats arabes unis", labelAr: "الإمارات" },
  { code: "QA", labelFr: "Qatar", labelAr: "قطر" },
  { code: "KW", labelFr: "Koweït", labelAr: "الكويت" },
  { code: "BH", labelFr: "Bahreïn", labelAr: "البحرين" },
  { code: "OM", labelFr: "Oman", labelAr: "عُمان" },
  { code: "JO", labelFr: "Jordanie", labelAr: "الأردن" },
  { code: "LB", labelFr: "Liban", labelAr: "لبنان" },
  { code: "SY", labelFr: "Syrie", labelAr: "سوريا" },
  { code: "IQ", labelFr: "Irak", labelAr: "العراق" },
  { code: "PS", labelFr: "Palestine", labelAr: "فلسطين" },
  { code: "YE", labelFr: "Yémen", labelAr: "اليمن" },
  { code: "SD", labelFr: "Soudan", labelAr: "السودان" },
  { code: "MR", labelFr: "Mauritanie", labelAr: "موريتانيا" },
  { code: "FR", labelFr: "France", labelAr: "فرنسا" },
  { code: "ES", labelFr: "Espagne", labelAr: "إسبانيا" },
  { code: "IT", labelFr: "Italie", labelAr: "إيطاليا" },
  { code: "BE", labelFr: "Belgique", labelAr: "بلجيكا" },
  { code: "NL", labelFr: "Pays-Bas", labelAr: "هولندا" },
  { code: "DE", labelFr: "Allemagne", labelAr: "ألمانيا" },
  { code: "GB", labelFr: "Royaume-Uni", labelAr: "المملكة المتحدة" },
  { code: "US", labelFr: "États-Unis", labelAr: "الولايات المتحدة" },
  { code: "CA", labelFr: "Canada", labelAr: "كندا" },
  { code: "TR", labelFr: "Turquie", labelAr: "تركيا" },
  { code: "OTHER", labelFr: "Autre pays", labelAr: "بلد آخر" },
]

const MA_CITIES: CityOption[] = [
  { value: "Casablanca", labelFr: "Casablanca", labelAr: "الدار البيضاء" },
  { value: "Rabat", labelFr: "Rabat", labelAr: "الرباط" },
  { value: "Marrakech", labelFr: "Marrakech", labelAr: "مراكش" },
  { value: "Fès", labelFr: "Fès", labelAr: "فاس" },
  { value: "Tanger", labelFr: "Tanger", labelAr: "طنجة" },
  { value: "Agadir", labelFr: "Agadir", labelAr: "أكادير" },
  { value: "Meknès", labelFr: "Meknès", labelAr: "مكناس" },
  { value: "Oujda", labelFr: "Oujda", labelAr: "وجدة" },
  { value: "Kénitra", labelFr: "Kénitra", labelAr: "القنيطرة" },
  { value: "Tétouan", labelFr: "Tétouan", labelAr: "تطوان" },
  { value: "Safi", labelFr: "Safi", labelAr: "آسفي" },
  { value: "El Jadida", labelFr: "El Jadida", labelAr: "الجديدة" },
  { value: "Nador", labelFr: "Nador", labelAr: "الناظور" },
  { value: "Beni Mellal", labelFr: "Beni Mellal", labelAr: "بني ملال" },
  { value: "Khénifra", labelFr: "Khénifra", labelAr: "خنيفرة" },
  { value: "Mohammedia", labelFr: "Mohammedia", labelAr: "المحمدية" },
  { value: "Laâyoune", labelFr: "Laâyoune", labelAr: "العيون" },
  { value: "Settat", labelFr: "Settat", labelAr: "سطات" },
  { value: "Berrechid", labelFr: "Berrechid", labelAr: "برشيد" },
  { value: "Taza", labelFr: "Taza", labelAr: "تازة" },
]

export const CITIES_BY_COUNTRY: Record<string, CityOption[]> = {
  MA: MA_CITIES,
  DZ: [
    { value: "Alger", labelFr: "Alger", labelAr: "الجزائر" },
    { value: "Oran", labelFr: "Oran", labelAr: "وهران" },
    { value: "Constantine", labelFr: "Constantine", labelAr: "قسنطينة" },
    { value: "Annaba", labelFr: "Annaba", labelAr: "عنابة" },
    { value: "Blida", labelFr: "Blida", labelAr: "البليدة" },
  ],
  TN: [
    { value: "Tunis", labelFr: "Tunis", labelAr: "تونس" },
    { value: "Sfax", labelFr: "Sfax", labelAr: "صفاقس" },
    { value: "Sousse", labelFr: "Sousse", labelAr: "سوسة" },
    { value: "Kairouan", labelFr: "Kairouan", labelAr: "القيروان" },
  ],
  FR: [
    { value: "Paris", labelFr: "Paris", labelAr: "باريس" },
    { value: "Lyon", labelFr: "Lyon", labelAr: "ليون" },
    { value: "Marseille", labelFr: "Marseille", labelAr: "مرسيليا" },
    { value: "Toulouse", labelFr: "Toulouse", labelAr: "تولوز" },
  ],
  ES: [
    { value: "Madrid", labelFr: "Madrid", labelAr: "مدريد" },
    { value: "Barcelone", labelFr: "Barcelone", labelAr: "برشلونة" },
  ],
  SA: [
    { value: "Riyad", labelFr: "Riyad", labelAr: "الرياض" },
    { value: "Djeddah", labelFr: "Djeddah", labelAr: "جدة" },
    { value: "La Mecque", labelFr: "La Mecque", labelAr: "مكة" },
  ],
  AE: [
    { value: "Dubaï", labelFr: "Dubaï", labelAr: "دبي" },
    { value: "Abou Dabi", labelFr: "Abou Dabi", labelAr: "أبو ظبي" },
    { value: "Charjah", labelFr: "Charjah", labelAr: "الشارقة" },
  ],
}

export function getCitiesForCountry(countryCode: string): CityOption[] {
  return CITIES_BY_COUNTRY[countryCode] ?? []
}

export function countryHasCityList(countryCode: string): boolean {
  return countryCode !== "OTHER" && getCitiesForCountry(countryCode).length > 0
}

export function getCountryLabel(code: string, locale: string): string {
  const c = INSCRIPTION_COUNTRIES.find((x) => x.code === code)
  if (!c) return code
  return locale === "ar" ? c.labelAr : c.labelFr
}

export function getCityLabel(countryCode: string, cityValue: string, locale: string): string {
  const city = getCitiesForCountry(countryCode).find((x) => x.value === cityValue)
  if (!city) return cityValue
  return locale === "ar" ? city.labelAr : city.labelFr
}

export function resolveCityValue(
  countryCode: string,
  city: string,
  cityOther: string,
): string {
  if (city === LOCATION_OTHER) return cityOther.trim()
  if (countryCode === "OTHER") return cityOther.trim()
  return city.trim()
}

export function validateCountryCityFields(
  country: string,
  city: string,
  cityOther: string,
  fieldPrefix: string,
  msg: {
    countryRequired: string
    cityRequired: string
    cityInvalid: string
  },
  isValidName: (value: string) => boolean,
): Record<string, string> {
  const errs: Record<string, string> = {}

  if (!country.trim()) {
    errs[`${fieldPrefix}Country`] = msg.countryRequired
    return errs
  }

  const needsOther =
    country === "OTHER" || city === LOCATION_OTHER || !countryHasCityList(country)
  const resolved = resolveCityValue(country, city, cityOther)

  if (!resolved) {
    if (needsOther) errs[`${fieldPrefix}CityOther`] = msg.cityRequired
    else errs[`${fieldPrefix}City`] = msg.cityRequired
    return errs
  }

  if (!isValidName(resolved)) {
    if (needsOther) errs[`${fieldPrefix}CityOther`] = msg.cityInvalid
    else errs[`${fieldPrefix}City`] = msg.cityInvalid
  }

  return errs
}
