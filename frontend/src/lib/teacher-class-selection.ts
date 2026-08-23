export const TEACHER_CLASS_STORAGE_KEY = "kidcare-teacher-selected-classe-id"

export type TeacherClasse = { id: string; nom: string }

/** Dernière classe utilisée si encore valide, sinon la première. */
export function resolveInitialClassId(classIds: string[]): string | null {
  if (!classIds.length) return null
  try {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(TEACHER_CLASS_STORAGE_KEY)
      if (saved && classIds.includes(saved)) return saved
    }
  } catch {
    /* ignore */
  }
  return classIds[0] ?? null
}

export function persistTeacherClassId(classId: string): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(TEACHER_CLASS_STORAGE_KEY, classId)
    }
  } catch {
    /* ignore */
  }
}

export function parseTeacherClassesFromApi(raw: unknown): TeacherClasse[] {
  const list = Array.isArray((raw as { data?: unknown })?.data)
    ? (raw as { data: unknown[] }).data
    : Array.isArray(raw)
      ? raw
      : []
  return list
    .map((c: { id?: string; nom?: string; name?: string }) => ({
      id: String(c.id ?? ""),
      nom: String(c.nom ?? c.name ?? "").trim() || "Classe",
    }))
    .filter(c => c.id.length > 0)
}
