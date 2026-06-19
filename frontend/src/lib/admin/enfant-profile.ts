import { formatAgeFromBirthdate } from "@/lib/child-age-policy";

export type ProfileField = { labelKey: string; value: string | null; multiline?: boolean };

export type ProfileTuteur = {
  key: string;
  roleKey: string;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  profession: string | null;
  cin: string | null;
  principal: boolean;
  accountStatus: string | null;
  archived: boolean;
};

export type ProfileAuthorizedPerson = {
  name: string;
  relationship: string | null;
  phone: string | null;
  cin: string | null;
};

/** Payload inscription : `name` / `relationship` / `phone` — DB délégation : `nom` / `relation` / `telephone` */
export function normalizeAuthorizedPerson(raw: Record<string, unknown>): ProfileAuthorizedPerson {
  return {
    name: pickString(raw.name, raw.nom) ?? "—",
    relationship: pickString(raw.relationship, raw.relation),
    phone: pickString(raw.phone, raw.telephone),
    cin: pickString(raw.cin),
  };
}

/** Photo enfant dans le payload d'inscription (base64 ou URL) */
export function resolveInscriptionChildPhoto(payload: Record<string, unknown>): string | null {
  const enfant = (payload.enfant ?? {}) as Record<string, unknown>;
  return pickString(enfant.photoUrl, payload.childPhotoBase64, payload.childPhoto);
}

export type EnfantProfileData = {
  fullName: string;
  photoUrl: string | null;
  archived: boolean;
  archivedAt: string | null;
  identityFields: ProfileField[];
  healthFields: ProfileField[];
  healthTags: { maladies: string[]; allergies: string[]; intolerances: string[]; other: string[] };
  restrictionLabel: string | null;
  restrictionDetails: string | null;
  sansRestriction: boolean;
  tuteurs: ProfileTuteur[];
  guardians: ProfileTuteur[];
  emergencyContacts: ProfileTuteur[];
  authorizedPersons: ProfileAuthorizedPerson[];
  familleFields: ProfileField[];
  inscriptionFields: ProfileField[];
  consentFields: ProfileField[];
  adminRemarks: string | null;
  parentRemarks: string | null;
  hasPhotoDocument: boolean;
  classeLabel: string | null;
  desiredClasseLabel: string | null;
};

type ClasseOption = { id: string; nom: string; niveau?: string | null };

function pickString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function joinLocation(parts: (string | null | undefined)[]): string | null {
  const filtered = parts.filter((p): p is string => Boolean(p && p.trim()));
  return filtered.length > 0 ? filtered.join(", ") : null;
}

function mergeUniqueTags(...lists: (string[] | undefined | null)[]): string[] {
  const set = new Set<string>();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (typeof item === "string" && item.trim()) set.add(item.trim());
    }
  }
  return [...set];
}

function resolveClasseLabel(
  classeId: string | null | undefined,
  classes: ClasseOption[],
): string | null {
  if (!classeId) return null;
  const found = classes.find((c) => c.id === classeId);
  return found ? found.nom : classeId;
}

function accountStatusFromTuteur(tut: Record<string, unknown>): string | null {
  const user = tut.utilisateur as Record<string, unknown> | null | undefined;
  if (!user) return null;
  if (user.archivedAt) return "ARCHIVED";
  return typeof user.statut === "string" ? user.statut : null;
}

function mapPayloadTuteur(tut: Record<string, unknown>, dbMatch?: Record<string, unknown>): ProfileTuteur {
  const lien = pickString(tut.lien) ?? "Autre";
  const roleKey =
    lien === "Mere" ? "mother" : lien === "Pere" ? "father" : "guardian";
  return {
    key: pickString(tut.email, tut.telephone, `${tut.prenom}-${tut.nom}`, lien) ?? roleKey,
    roleKey,
    prenom: pickString(tut.prenom) ?? "",
    nom: pickString(tut.nom) ?? "",
    email: pickString(tut.email),
    telephone: pickString(tut.telephone),
    adresse: pickString(tut.adresse),
    profession: pickString(tut.profession),
    cin: pickString(tut.cin),
    principal: Boolean(tut.principal),
    accountStatus: dbMatch ? accountStatusFromTuteur(dbMatch) : null,
    archived: Boolean((dbMatch?.utilisateur as Record<string, unknown> | undefined)?.archivedAt),
  };
}

function mapDbTuteur(tut: Record<string, unknown>): ProfileTuteur {
  const lien = pickString(tut.lien) ?? "Autre";
  const roleKey =
    lien === "Mere" ? "mother" : lien === "Pere" ? "father" : "guardian";
  return {
    key: pickString(tut.id, tut.email, tut.telephone) ?? roleKey,
    roleKey,
    prenom: pickString(tut.prenom) ?? "",
    nom: pickString(tut.nom) ?? "",
    email: pickString(tut.email),
    telephone: pickString(tut.telephone),
    adresse: pickString(tut.adresse),
    profession: null,
    cin: null,
    principal: Boolean(tut.principal),
    accountStatus: accountStatusFromTuteur(tut),
    archived: Boolean((tut.utilisateur as Record<string, unknown> | undefined)?.archivedAt),
  };
}

function mergeTuteurs(
  dbTuteurs: Record<string, unknown>[],
  payloadTuteurs: Record<string, unknown>[],
): ProfileTuteur[] {
  if (payloadTuteurs.length > 0) {
    return payloadTuteurs.map((pt) => {
      const dbMatch = dbTuteurs.find(
        (dt) =>
          (pickString(dt.email) && pickString(dt.email) === pickString(pt.email)) ||
          (pickString(dt.lien) === pickString(pt.lien) &&
            pickString(dt.prenom)?.toLowerCase() === pickString(pt.prenom)?.toLowerCase()),
      );
      const mapped = mapPayloadTuteur(pt, dbMatch);
      if (!mapped.adresse && dbMatch) mapped.adresse = pickString(dbMatch.adresse);
      if (!mapped.accountStatus && dbMatch) {
        mapped.accountStatus = accountStatusFromTuteur(dbMatch);
        mapped.archived = Boolean(
          (dbMatch.utilisateur as Record<string, unknown> | undefined)?.archivedAt,
        );
      }
      return mapped;
    });
  }
  return dbTuteurs.map(mapDbTuteur);
}

export function buildEnfantProfile(
  enfant: Record<string, unknown>,
  classes: ClasseOption[],
  locale: string,
): EnfantProfileData {
  const payload = (Array.isArray(enfant.inscriptions) && enfant.inscriptions[0]
    ? (enfant.inscriptions[0] as Record<string, unknown>).payload
    : null) as Record<string, unknown> | null;
  const inscription = Array.isArray(enfant.inscriptions)
    ? (enfant.inscriptions[0] as Record<string, unknown> | undefined)
    : undefined;
  const payloadEnfant = (payload?.enfant ?? {}) as Record<string, unknown>;
  const payloadFamille = (payload?.famille ?? {}) as Record<string, unknown>;
  const santePayload = (payload?.sante ?? {}) as Record<string, unknown>;
  const restrictions = (payload?.restrictions ?? {}) as Record<string, unknown>;
  const profilSante = (enfant.profilSante ?? null) as Record<string, unknown> | null;
  const dbFamille = (enfant.famille ?? {}) as Record<string, unknown>;
  const dbTuteurs = Array.isArray(dbFamille.tuteurs)
    ? (dbFamille.tuteurs as Record<string, unknown>[])
    : [];
  const payloadTuteurs = Array.isArray(payload?.tuteurs)
    ? (payload.tuteurs as Record<string, unknown>[])
    : [];

  const prenom = pickString(enfant.prenom, payloadEnfant.prenom) ?? "";
  const nom = pickString(enfant.nom, payloadEnfant.nom) ?? "";
  const fullName = `${prenom} ${nom}`.trim() || "—";

  const birthIso =
    pickString(enfant.dateNaissance, payloadEnfant.dateNaissance)?.slice(0, 10) ?? null;
  const birthDateLabel = birthIso
    ? new Date(birthIso).toLocaleDateString(locale, {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;
  const ageLabel = birthIso ? formatAgeFromBirthdate(birthIso) : null;

  const classe = enfant.classe as { nom?: string; niveau?: string } | null | undefined;
  const classeLabel = pickString(classe?.nom) ?? null;
  const desiredClasseLabel = resolveClasseLabel(
    pickString(payload?.classeIdSouhaitee),
    classes,
  );

  const dbAllergies = Array.isArray(profilSante?.allergies)
    ? (profilSante.allergies as Array<{ nom?: string } | string>).map((a) =>
        typeof a === "string" ? a : pickString(a.nom),
      ).filter(Boolean) as string[]
    : [];
  const dbIntolerances = Array.isArray(profilSante?.intolerances)
    ? (profilSante.intolerances as Array<{ nom?: string }>).map((i) => pickString(i.nom)).filter(Boolean) as string[]
    : [];
  const dbTags = Array.isArray(profilSante?.tags) ? (profilSante.tags as string[]) : [];

  const maladies = mergeUniqueTags(
    santePayload.tagsMaladies as string[] | undefined,
    dbTags,
  );
  const allergies = mergeUniqueTags(
    santePayload.tagsAllergies as string[] | undefined,
    dbAllergies,
  );
  const intolerances = mergeUniqueTags(
    santePayload.tagsIntolerances as string[] | undefined,
    dbIntolerances,
    enfant.intolerances as string[] | undefined,
  );
  const otherHealthTags = mergeUniqueTags(
    santePayload.tags as string[] | undefined,
    dbTags,
  );

  const restrictionKey = pickString(
    santePayload.restrictionAlimentaire,
    profilSante?.restrictionAlimentaire,
  );
  const sansRestriction =
    Boolean(restrictions.sansRestriction) ||
    Boolean(enfant.sansRestriction) ||
    restrictionKey === "sans_restriction";

  const delegations = Array.isArray(enfant.delegations) ? enfant.delegations : [];
  const payloadPersons = Array.isArray(restrictions.personnesAutorisees)
    ? (restrictions.personnesAutorisees as Record<string, unknown>[])
    : [];

  const authorizedPersons: ProfileAuthorizedPerson[] =
    delegations.length > 0
      ? delegations.map((d: Record<string, unknown>) => normalizeAuthorizedPerson(d))
      : payloadPersons.map((p) => normalizeAuthorizedPerson(p as Record<string, unknown>));

  const allTuteurs = mergeTuteurs(dbTuteurs, payloadTuteurs);
  const mothers = allTuteurs.filter((t) => t.roleKey === "mother");
  const fathers = allTuteurs.filter((t) => t.roleKey === "father");
  const guardians = allTuteurs.filter((t) => t.roleKey === "guardian");
  const orderedTuteurs = [...mothers, ...fathers, ...guardians];
  const emergencyContacts = orderedTuteurs.filter((t) => t.principal || t.telephone);

  const archivedAt = enfant.archivedAt
    ? new Date(String(enfant.archivedAt)).toISOString()
    : null;

  const inscriptionCreated = inscription?.createdAt
    ? new Date(String(inscription.createdAt)).toLocaleDateString(locale, {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  return {
    fullName,
    photoUrl: pickString(enfant.photoUrl, payloadEnfant.photoUrl),
    archived: Boolean(enfant.archivedAt),
    archivedAt: archivedAt
      ? new Date(archivedAt).toLocaleDateString(locale, {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : null,
    classeLabel,
    desiredClasseLabel,
    identityFields: [
      { labelKey: "fullName", value: fullName },
      { labelKey: "dateOfBirth", value: birthDateLabel },
      { labelKey: "age", value: ageLabel },
      {
        labelKey: "gender",
        value: pickString(enfant.genre, payloadEnfant.genre),
      },
      { labelKey: "birthCity", value: joinLocation([pickString(payloadEnfant.villeNaissance), pickString(payloadEnfant.paysNaissance)]) },
      {
        labelKey: "nationality",
        value: joinLocation([pickString(payloadEnfant.nationaliteVille), pickString(payloadEnfant.nationalitePays)]),
      },
      { labelKey: "currentAddress", value: pickString(payloadEnfant.adresseActuelle), multiline: true },
      {
        labelKey: "currentCity",
        value: joinLocation([pickString(payloadEnfant.villeActuelle), pickString(payloadEnfant.paysActuel)]),
      },
      { labelKey: "class", value: classeLabel },
      { labelKey: "desiredClass", value: desiredClasseLabel },
      { labelKey: "siblingCount", value: pickString(payloadEnfant.fraternity) },
      { labelKey: "siblingRank", value: pickString(payloadEnfant.rankInFraternity) },
    ],
    healthFields: [
      { labelKey: "height", value: pickString(santePayload.taille) ? `${santePayload.taille} cm` : null },
      { labelKey: "weight", value: pickString(santePayload.poids) ? `${santePayload.poids} kg` : null },
      { labelKey: "familyHistory", value: pickString(santePayload.antecedentsFamiliaux), multiline: true },
      { labelKey: "surgicalInterventions", value: pickString(santePayload.interventionsChirurgicales), multiline: true },
      { labelKey: "doctor", value: pickString(profilSante?.medecin) },
      { labelKey: "medicalNotes", value: pickString(profilSante?.notes, payload?.commentaire), multiline: true },
      { labelKey: "dietaryNotes", value: pickString(santePayload.restrictionDetails), multiline: true },
    ],
    healthTags: { maladies, allergies, intolerances, other: otherHealthTags },
    restrictionLabel: restrictionKey,
    restrictionDetails: pickString(santePayload.restrictionDetails),
    sansRestriction,
    tuteurs: orderedTuteurs,
    guardians,
    emergencyContacts,
    authorizedPersons,
    familleFields: [
      {
        labelKey: "familyEmail",
        value: pickString(dbFamille.emailPrincipal, payloadFamille.emailPrincipal),
      },
      {
        labelKey: "familyLanguage",
        value: pickString(dbFamille.languePreferee, payloadFamille.languePreferee),
      },
      {
        labelKey: "familySituation",
        value: pickString(payloadFamille.situationFamiliale),
      },
      {
        labelKey: "billingAddress",
        value: pickString(dbFamille.adresseFacturation, payloadFamille.adresseFacturation),
        multiline: true,
      },
    ],
    inscriptionFields: [
      { labelKey: "registrationStatus", value: pickString(inscription?.statut) },
      { labelKey: "registrationDate", value: inscriptionCreated },
    ],
    consentFields: [
      {
        labelKey: "declarationHonneur",
        value: payload?.declarationHonneur === true ? "yes" : payload?.declarationHonneur === false ? "no" : null,
      },
      {
        labelKey: "confirmationExacte",
        value: payload?.confirmationExacte === true ? "yes" : payload?.confirmationExacte === false ? "no" : null,
      },
    ],
    adminRemarks: pickString(enfant.remarques),
    parentRemarks: pickString(payload?.commentaire, santePayload.remarks),
    hasPhotoDocument: Boolean(pickString(enfant.photoUrl, payloadEnfant.photoUrl)),
  };
}
