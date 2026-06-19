export const HEALTH_TAGS_FR = {
  maladies: [
    "Asthme", "Épilepsie", "Diabète type 1", "Diabète type 2",
    "Drépanocytose", "Cardiopathie", "Hémophilie", "Mucoviscidose",
    "Hypothyroïdie", "Autisme / TSA", "TDAH", "Eczéma",
    "Prématuré", "Handicap moteur", "Handicap visuel", "Autre",
  ],
  allergies: [
    "Arachides", "Lait", "Œufs", "Fruits de mer", "Poisson",
    "Gluten (blé)", "Soja", "Fruits à coque", "Sésame",
    "Latex", "Pénicilline", "Pollen", "Autre",
  ],
  intolerances: [
    "Lactose", "Gluten", "Fructose", "Sucre (saccharose)",
    "Colorants alimentaires", "Conservateurs", "Glutamate (MSG)",
    "Histamine", "Arachide", "Autre",
  ],
  suivi: [
    "Suivi médical régulier", "Port de lunettes", "Appareil auditif",
    "Troubles du langage", "Troubles du comportement", "Troubles du sommeil",
    "Traitement en cours", "Kinésithérapie", "Orthophonie",
  ],
} as const

export const HEALTH_TAGS_AR = {
  maladies: [
    "الربو", "الصرع", "السكري النوع 1", "السكري النوع 2",
    "فقر الدم المنجلي", "أمراض القلب", "الهيموفيليا", "التليف الكيسي",
    "قصور الغدة الدرقية", "التوحد", "فرط الحركة", "الأكزيما",
    "ولادة مبكرة", "إعاقة حركية", "إعاقة بصرية", "أخرى",
  ],
  allergies: [
    "الفول السوداني", "الحليب", "البيض", "المأكولات البحرية", "السمك",
    "الغلوتين", "الصويا", "المكسرات", "السمسم",
    "اللاتكس", "البنسلين", "حبوب اللقاح", "أخرى",
  ],
  intolerances: [
    "اللاكتوز", "الغلوتين", "الفركتوز", "السكر",
    "ملونات غذائية", "مواد حافظة", "الغلوتامات",
    "الهيستامين", "الفول السوداني", "أخرى",
  ],
  suivi: [
    "متابعة طبية منتظمة", "نظارات", "سماعة أذن",
    "اضطرابات النطق", "اضطرابات السلوك", "اضطرابات النوم",
    "علاج جاري", "علاج طبيعي", "علاج النطق",
  ],
} as const

export function getHealthTags(locale: string) {
  return locale === "ar" ? HEALTH_TAGS_AR : HEALTH_TAGS_FR
}
