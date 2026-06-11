import { apiClient } from "@/lib/api"
import { childKey } from "@/lib/child-id"

export type ClassDayStats = {
  present: number
  absent: number
  justified: number
  resumes: number
  attendanceRate: number
}

const EMPTY_STATS: ClassDayStats = {
  present: 0,
  absent: 0,
  justified: 0,
  resumes: 0,
  attendanceRate: 0,
}

/** Taux = présents / (présents + absents) × 100 — absences justifiées hors dénominateur. */
export function computeAttendanceRate(present: number, absent: number): number {
  const total = present + absent
  if (total <= 0) return 0
  return Math.round((present / total) * 100)
}

/** Dérive les KPI depuis l’état local de la page présence (même formules que fetch). */
export function statsFromAttendanceMap(
  attendanceData: Record<string, "Present" | "Absent" | undefined>,
  childResumes: Record<string, unknown>,
): ClassDayStats {
  const present = Object.values(attendanceData).filter((v) => v === "Present").length
  const absent = Object.values(attendanceData).filter((v) => v === "Absent").length
  const resumes = Object.keys(childResumes).length
  return {
    present,
    absent,
    justified: 0,
    resumes,
    attendanceRate: computeAttendanceRate(present, absent),
  }
}

/**
 * Statistiques jour/classe — même source que le dashboard enseignant :
 * GET /presences + GET /daily-resumes (pas /summary dont les clés diffèrent).
 */
export async function fetchClassDayStats(
  classeId: string,
  dateYmd: string,
): Promise<ClassDayStats> {
  let allPresences: Array<{
    enfantId?: string
    enfant?: { id?: string }
    statut?: string
  }> = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const presRes = await apiClient.getPresences(classeId, dateYmd, page, 100)
    const items = presRes.data?.items ?? presRes.data?.data ?? []
    if (!Array.isArray(items) || items.length === 0) {
      hasMore = false
      break
    }
    allPresences = [...allPresences, ...items]
    if (!(presRes.data?.hasNext ?? false) || items.length < 100) hasMore = false
    else page++
  }

  const byChild = new Map<string, "Present" | "Absent" | "Justifie">()
  for (const p of allPresences) {
    const id = p.enfantId ?? p.enfant?.id
    if (!id || !p.statut) continue
    const key = childKey(id)
    if (p.statut === "Present" || p.statut === "Absent" || p.statut === "Justifie") {
      byChild.set(key, p.statut)
    }
  }

  let present = 0
  let absent = 0
  let justified = 0
  Array.from(byChild.values()).forEach(statut => {
    if (statut === "Present") present++
    else if (statut === "Absent") absent++
    else if (statut === "Justifie") justified++
  })

  const resumesRes = await apiClient.getResumes(classeId, dateYmd)
  const resumesPayload = resumesRes.data?.data ?? resumesRes.data ?? []
  const resumes = Array.isArray(resumesPayload) ? resumesPayload.length : 0

  return {
    present,
    absent,
    justified,
    resumes,
    attendanceRate: computeAttendanceRate(present, absent),
  }
}

export { EMPTY_STATS }
