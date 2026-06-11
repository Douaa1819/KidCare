/** Clé stable pour indexer enfants / résumés (évite blocages si number vs string). */
export function childKey(id: string | number | null | undefined): string {
  return String(id ?? "")
}
