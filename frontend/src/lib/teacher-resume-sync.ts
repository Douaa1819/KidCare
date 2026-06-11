import { apiClient } from "@/lib/api"
import { childKey } from "@/lib/child-id"

export type ResumeListRow = {
  id?: string
  enfantId?: string | number
  enfant?: { id?: string | number }
}

export function findResumeIdForChild(
  resumes: ResumeListRow[] | null | undefined,
  enfantId: string,
): string | null {
  if (!Array.isArray(resumes)) return null
  const key = childKey(enfantId)
  const found = resumes.find(r => {
    const rid = r.enfantId ?? r.enfant?.id
    return rid != null && childKey(rid) === key
  })
  return found?.id ? String(found.id) : null
}

export async function fetchResumeIdForChild(
  classeId: string,
  dateYmd: string,
  enfantId: string,
): Promise<string | null> {
  // Recherche ciblée (évite pagination / filtres classe qui masquent l'enfant)
  const direct = await apiClient.getResumes(classeId, dateYmd, 1, 5, enfantId)
  const directRows =
    (direct.data as { data?: ResumeListRow[] })?.data ?? direct.data ?? []
  const fromDirect = findResumeIdForChild(
    Array.isArray(directRows) ? directRows : [],
    enfantId,
  )
  if (fromDirect) return fromDirect

  const res = await apiClient.getResumes(classeId, dateYmd, 1, 200)
  const resumes = (res.data as { data?: ResumeListRow[] })?.data ?? res.data ?? []
  return findResumeIdForChild(Array.isArray(resumes) ? resumes : [], enfantId)
}

export type SaveChildResumeParams = {
  classeId: string
  enfantId: string
  dateYmd: string
  existingResumeId?: string | null
  payload: Record<string, unknown>
}

/** Crée ou met à jour un résumé et retourne toujours l’id persisté si possible. */
export async function saveChildDailyResume(params: SaveChildResumeParams): Promise<string> {
  const { classeId, enfantId, dateYmd, existingResumeId, payload } = params
  const key = childKey(enfantId)

  if (existingResumeId) {
    await apiClient.updateResume(existingResumeId, payload)
    return existingResumeId
  }

  try {
    const res = await apiClient.createResume({
      enfantId,
      date: dateYmd,
      ...payload,
    })
    const body = res.data as Record<string, unknown>
    const created =
      (typeof body?.id === "string" && body.id) ||
      (typeof body?.resumeId === "string" && body.resumeId) ||
      null
    if (created) return created
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: unknown } } }
    const msg = ax.response?.data?.message
    const msgStr = Array.isArray(msg) ? msg.join(", ") : String(msg ?? "")
    if (!msgStr.includes("existe déjà") && !msgStr.includes("already exists")) {
      throw e
    }
  }

  const foundId = await fetchResumeIdForChild(classeId, dateYmd, enfantId)
  if (!foundId) {
    throw new Error(
      `Un résumé existe déjà pour cet enfant aujourd'hui, mais l'application n'a pas pu le recharger. Rechargez la page puis réessayez.`,
    )
  }
  await apiClient.updateResume(foundId, payload)
  return foundId
}
