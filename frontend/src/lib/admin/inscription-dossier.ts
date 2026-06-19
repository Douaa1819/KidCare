import { getCountryLabel } from "@/lib/inscription-locations";
import { formatAgeFromBirthdate } from "@/lib/child-age-policy";

function pick(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export function formatInscriptionGender(genre?: string | null): string | null {
  if (!genre) return null;
  if (genre === "M") return "Masculin";
  if (genre === "F") return "Féminin";
  return genre;
}

export function formatCountryLabel(codeOrLabel: string | undefined | null, locale: string): string | null {
  if (!codeOrLabel?.trim()) return null;
  const raw = codeOrLabel.trim();
  if (/^[A-Z]{2}$/.test(raw)) {
    return getCountryLabel(raw, locale);
  }
  return raw;
}

export function joinLocationParts(
  city?: string | null,
  country?: string | null,
  locale?: string,
): string | null {
  const cityLabel = city?.trim() || null;
  const countryLabel = country ? formatCountryLabel(country, locale ?? "fr") : null;
  if (cityLabel && countryLabel) return `${cityLabel}, ${countryLabel}`;
  return cityLabel || countryLabel;
}

export type TuteurPayload = {
  prenom?: string;
  nom?: string;
  lien?: string;
  principal?: boolean;
};

export function getPrincipalParentLabel(tuteurs: TuteurPayload[]): string | null {
  const principal = tuteurs.find((t) => t.principal);
  if (!principal) return null;
  const name = `${principal.prenom ?? ""} ${principal.nom ?? ""}`.trim();
  if (name) return name;
  if (principal.lien === "Mere") return "Mère";
  if (principal.lien === "Pere") return "Père";
  return null;
}

export function extractEnfantDossierFields(
  enfant: Record<string, unknown>,
  locale: string,
): Array<{ label: string; value: string | null; multiline?: boolean }> {
  const birthRaw = pick(enfant.dateNaissance);
  const birthIso = birthRaw?.slice(0, 10) ?? null;
  const birthDateLabel = birthIso
    ? new Date(`${birthIso}T12:00:00`).toLocaleDateString(locale === "ar" ? "ar-MA" : locale, {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : birthRaw;
  const ageLabel = birthIso ? formatAgeFromBirthdate(birthIso) : null;

  return [
    { label: "Date de naissance", value: birthDateLabel },
    { label: "Âge", value: ageLabel },
    { label: "Genre", value: formatInscriptionGender(pick(enfant.genre)) },
    {
      label: "Nationalité",
      value: joinLocationParts(
        pick(enfant.nationaliteVille),
        pick(enfant.nationalitePays),
        locale,
      ),
    },
    {
      label: "Lieu de naissance",
      value: joinLocationParts(
        pick(enfant.villeNaissance),
        pick(enfant.paysNaissance),
        locale,
      ),
    },
    {
      label: "Adresse actuelle",
      value: pick(enfant.adresseActuelle),
      multiline: true,
    },
    {
      label: "Ville / pays de résidence",
      value: joinLocationParts(
        pick(enfant.villeActuelle),
        pick(enfant.paysActuel),
        locale,
      ),
    },
    { label: "Nombre de frères et sœurs", value: pick(enfant.fraternity) },
    { label: "Rang dans la fratrie", value: pick(enfant.rankInFraternity) },
  ];
}

export function extractFamilleDossierFields(
  famille: Record<string, unknown>,
  tuteurs: TuteurPayload[],
  locale: string,
): Array<{ label: string; value: string | null }> {
  const langue = pick(famille.languePreferee);
  return [
    { label: "Situation familiale", value: pick(famille.situationFamiliale) },
    { label: "Responsable principal", value: getPrincipalParentLabel(tuteurs) },
    {
      label: "Langue préférée",
      value: langue === "fr" ? "Français" : langue === "ar" ? "Arabe" : langue,
    },
    { label: "Adresse de facturation", value: pick(famille.adresseFacturation) },
    { label: "Email principal", value: pick(famille.emailPrincipal) },
  ];
}
