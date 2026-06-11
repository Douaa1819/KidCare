export type DelegationRow = {
  id: string
  name: string
  role?: string | null
  phone?: string | null
}

export type DelegationApiPayload = {
  id: string
  nom: string
  telephone: string
  relation?: string
  cin?: string
}

/** Extrait une délégation depuis la réponse axios (à plat ou imbriquée). */
export function parseDelegationFromResponse(data: unknown): DelegationApiPayload | null {
  if (!data || typeof data !== "object") return null
  const root = data as Record<string, unknown>
  const layer =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root
  const id = layer.id
  const nom = layer.nom
  const telephone = layer.telephone
  if (typeof id !== "string" || !id.trim()) return null
  if (typeof nom !== "string") return null
  if (typeof telephone !== "string") return null
  return {
    id: id.trim(),
    nom: nom.trim(),
    telephone: telephone.trim(),
    relation: typeof layer.relation === "string" ? layer.relation : undefined,
    cin: typeof layer.cin === "string" ? layer.cin : undefined,
  }
}

export function mapEnfantDelegations(enfant: { delegations?: unknown } | null | undefined): DelegationRow[] {
  const delegations = Array.isArray(enfant?.delegations) ? enfant.delegations : []
  const rows: DelegationRow[] = []
  for (const raw of delegations) {
    const d = raw as { id?: unknown; nom?: unknown; relation?: unknown; telephone?: unknown }
    if (d?.id == null || String(d.id).length === 0) continue
    rows.push({
      id: String(d.id),
      name: String(d.nom ?? ""),
      role: d.relation != null ? String(d.relation) : null,
      phone: d.telephone != null ? String(d.telephone) : null,
    })
  }
  return rows
}
