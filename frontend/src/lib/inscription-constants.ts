export const PROFESSION_OPTIONS = [
  "employe",
  "fonctionnaire",
  "enseignant",
  "medecin",
  "ingenieur",
  "commercant",
  "entrepreneur",
  "etudiant",
  "sans_emploi",
  "retraite",
  "autre",
] as const

export type ProfessionOption = (typeof PROFESSION_OPTIONS)[number]

export const PROFESSION_OTHER = "autre" as const

export const GENDER_OPTIONS = ["M", "F"] as const
