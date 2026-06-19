import { joinLocationParts } from "@/lib/admin/inscription-dossier";

type PayloadRecord = Record<string, unknown>;

export function pickString(...values: unknown[]): string | null {  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function mergeUniqueTags(...lists: (string[] | undefined | null)[]): string[] {
  const set = new Set<string>();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (typeof item === "string" && item.trim()) set.add(item.trim());
    }
  }
  return Array.from(set);
}

export function resolveInscriptionPayload(
  enfantInscriptions?: Array<{ payload?: unknown }> | null,
  familleInscriptions?: Array<{ enfantId?: string | null; payload?: unknown }> | null,
  enfantId?: string,
): PayloadRecord | null {
  const fromEnfant = enfantInscriptions?.[0]?.payload;
  if (fromEnfant && typeof fromEnfant === "object") return fromEnfant as PayloadRecord;

  const match = familleInscriptions?.find((i) => i.enfantId === enfantId);
  if (match?.payload && typeof match.payload === "object") return match.payload as PayloadRecord;

  const fallback = familleInscriptions?.[0]?.payload;
  if (fallback && typeof fallback === "object") return fallback as PayloadRecord;

  return null;
}

export function resolvePayloadTuteur(
  payload: PayloadRecord | null,
  tuteur: { lien?: string | null; email?: string | null; prenom?: string | null; nom?: string | null },
): PayloadRecord | null {
  if (!payload) return null;
  const tuteurs = Array.isArray(payload.tuteurs) ? (payload.tuteurs as PayloadRecord[]) : [];
  if (!tuteurs.length) return null;

  const email = pickString(tuteur.email)?.toLowerCase();
  const byEmail = tuteurs.find((t) => pickString(t.email)?.toLowerCase() === email);
  if (byEmail) return byEmail;

  const lien = pickString(tuteur.lien);
  const prenom = pickString(tuteur.prenom)?.toLowerCase();
  const byLien = tuteurs.find(
    (t) => pickString(t.lien) === lien && pickString(t.prenom)?.toLowerCase() === prenom,
  );
  return byLien ?? null;
}

export function formatChildAllergies(enfant: {
  intolerances?: string[] | null;
  sansRestriction?: boolean | null;
  profilSante?: {
    allergies?: Array<{ nom?: string | null }> | null;
    intolerances?: Array<{ nom?: string | null }> | null;
    tags?: string[] | null;
  } | null;
  inscriptions?: Array<{ payload?: unknown }> | null;
}, familleInscriptions?: Array<{ enfantId?: string | null; payload?: unknown }> | null): string | null {
  if (enfant.sansRestriction) return "Sans restriction";

  const payload = resolveInscriptionPayload(enfant.inscriptions, familleInscriptions, (enfant as { id?: string }).id);
  const santePayload = (payload?.sante ?? {}) as PayloadRecord;

  const dbAllergies = (enfant.profilSante?.allergies ?? [])
    .map((a) => pickString(a.nom))
    .filter(Boolean) as string[];
  const dbIntolerances = (enfant.profilSante?.intolerances ?? [])
    .map((i) => pickString(i.nom))
    .filter(Boolean) as string[];

  const merged = mergeUniqueTags(
    santePayload.tagsAllergies as string[] | undefined,
    dbAllergies,
    santePayload.tagsIntolerances as string[] | undefined,
    dbIntolerances,
    enfant.intolerances ?? undefined,
  );

  return merged.length > 0 ? merged.join(", ") : null;
}

export function resolveChildPhoto(enfant: {
  photoUrl?: string | null;
  inscriptions?: Array<{ payload?: unknown }> | null;
}, familleInscriptions?: Array<{ enfantId?: string | null; payload?: unknown }> | null): string | null {
  if (enfant.photoUrl?.trim()) return enfant.photoUrl.trim();

  const payload = resolveInscriptionPayload(enfant.inscriptions, familleInscriptions, (enfant as { id?: string }).id);
  const payloadEnfant = (payload?.enfant ?? {}) as PayloadRecord;
  return pickString(payloadEnfant.photoUrl, payload?.childPhotoBase64, payload?.childPhoto);
}

export function resolveDisplayPhone(...values: Array<string | null | undefined>): string | null {
  for (const v of values) {
    const t = pickString(v);
    if (t) return t;
  }
  return null;
}

export function resolvePayloadEnfant(payload: PayloadRecord | null): PayloadRecord | null {
  if (!payload?.enfant || typeof payload.enfant !== "object") return null;
  return payload.enfant as PayloadRecord;
}

export function resolveUserAddress(...values: Array<string | null | undefined>): string | null {
  return pickString(...values);
}

export function resolveFamilleResidence(
  payload: PayloadRecord | null,
  locale = "fr",
): { adresse: string | null; villePays: string | null } {
  const enfant = resolvePayloadEnfant(payload);
  if (!enfant) return { adresse: null, villePays: null };

  return {
    adresse: pickString(enfant.adresseActuelle),
    villePays: joinLocationParts(
      pickString(enfant.villeActuelle),
      pickString(enfant.paysActuel),
      locale,
    ),
  };
}

export const USER_STATUT_LABELS: Record<string, string> = {
  ACTIVE: "Actif",
  INVITED: "Invité",
  DISABLED: "Désactivé",
  ARCHIVED: "Archivé",
  BLOCKED: "Bloqué",
};

export function formatUserStatut(statut: string): string {
  return USER_STATUT_LABELS[statut] ?? statut;
}

export function formatClasseLabel(classe?: { nom?: string | null; niveau?: string | null } | null): string | null {
  if (!classe?.nom) return null;
  return classe.niveau ? `${classe.nom} · ${classe.niveau}` : classe.nom;
}

export type ClasseOption = {
  id: string;
  nom: string;
  niveau?: string | null;
  enseignants?: Array<{
    enseignant?: {
      utilisateur?: { prenom?: string | null; nom?: string | null } | null;
    } | null;
  }>;
};

export function resolveClasseLabelById(
  classeId: string | null | undefined,
  classes: ClasseOption[],
): string | null {
  if (!classeId) return null;
  const found = classes.find((c) => c.id === classeId);
  return found ? formatClasseLabel(found) : null;
}

export function resolveDesiredClasseId(
  enfant: { id: string; inscriptions?: Array<{ payload?: unknown }> | null },
  familleInscriptions?: Array<{ enfantId?: string | null; payload?: unknown }> | null,
  famillePayload?: PayloadRecord | null,
): string | null {
  const payload =
    resolveInscriptionPayload(enfant.inscriptions, familleInscriptions, enfant.id) ??
    famillePayload;
  return pickString(payload?.classeIdSouhaitee);
}

export function formatClassTeachers(
  classeId: string | null | undefined,
  classes: ClasseOption[],
): string | null {
  if (!classeId) return null;
  const classe = classes.find((c) => c.id === classeId);
  if (!classe?.enseignants?.length) return null;

  const names = classe.enseignants
    .map((row) => {
      const user = row.enseignant?.utilisateur;
      if (!user) return null;
      const name = `${user.prenom ?? ""} ${user.nom ?? ""}`.trim();
      return name || null;
    })
    .filter(Boolean) as string[];

  return names.length > 0 ? names.join(", ") : null;
}

export function formatClassTeachersFromClasse(
  classe?: ClasseOption | { enseignants?: ClasseOption["enseignants"] } | null,
): string | null {
  if (!classe?.enseignants?.length) return null;

  const names = classe.enseignants
    .map((row) => {
      const user = row.enseignant?.utilisateur;
      if (!user) return null;
      const name = `${user.prenom ?? ""} ${user.nom ?? ""}`.trim();
      return name || null;
    })
    .filter(Boolean) as string[];

  return names.length > 0 ? names.join(", ") : null;
}
