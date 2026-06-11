import { BadRequestException } from '@nestjs/common';

export type AgeUnit = 'months' | 'years';

export type AgeBound = {
  value: number;
  unit: AgeUnit;
};

export type ChildAgePolicy = {
  minAge: AgeBound;
  maxAge: AgeBound;
};

/** Compatibilité interne / anciennes réponses */
export type ChildAgePolicyLegacy = {
  minAgeYears: number;
  maxAgeYears: number;
};

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(String(raw ?? '').trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function parseUnit(raw: string | undefined, fallback: AgeUnit): AgeUnit {
  const u = String(raw ?? '').trim().toLowerCase();
  if (u === 'months' || u === 'month' || u === 'mois') return 'months';
  if (u === 'years' || u === 'year' || u === 'ans' || u === 'an') return 'years';
  return fallback;
}

export function ageBoundToYears(bound: AgeBound): number {
  return bound.unit === 'months' ? bound.value / 12 : bound.value;
}

export const CHILD_MAX_AGE_YEARS_CAP = 5;

export const CHILD_MAX_AGE_MONTHS_CAP = CHILD_MAX_AGE_YEARS_CAP * 12;

export const MAX_AGE_YEARS_REGEX = /^[0-5]$/;

function validateAgeYearsInCap(
  value: number,
  cap: number,
  kind: 'min' | 'max',
): string | null {
  if (!Number.isInteger(value) || value < 0) {
    return 'Saisissez un nombre entier entre 0 et 5.';
  }
  if (value > cap) {
    if (kind === 'min') {
      return `Valeur invalide : l'âge minimum ne peut pas dépasser ${cap} ans (saisie autorisée : 0 à ${cap}, ex. 2 ou 3).`;
    }
    return `Valeur invalide : l'âge maximum ne peut pas dépasser ${cap} ans (saisie autorisée : 0 à ${cap}, ex. 3 ou 4).`;
  }
  return null;
}

export function validateMinAgeYearsValue(
  value: number,
  cap: number = CHILD_MAX_AGE_YEARS_CAP,
): string | null {
  return validateAgeYearsInCap(value, cap, 'min');
}

export function validateMaxAgeYearsValue(
  value: number,
  cap: number = CHILD_MAX_AGE_YEARS_CAP,
): string | null {
  return validateAgeYearsInCap(value, cap, 'max');
}

export function validateAgeBound(bound: AgeBound, kind: 'min' | 'max'): string | null {
  if (!Number.isInteger(bound.value) || bound.value < 0) {
    return 'Saisissez un nombre entier positif.';
  }
  if (bound.unit === 'years') {
    return kind === 'min'
      ? validateMinAgeYearsValue(bound.value)
      : validateMaxAgeYearsValue(bound.value);
  }
  if (bound.value > CHILD_MAX_AGE_MONTHS_CAP) {
    return kind === 'min'
      ? `Valeur invalide : l'âge minimum ne peut pas dépasser ${CHILD_MAX_AGE_MONTHS_CAP} mois (équivalent ${CHILD_MAX_AGE_YEARS_CAP} ans).`
      : `Valeur invalide : l'âge maximum ne peut pas dépasser ${CHILD_MAX_AGE_MONTHS_CAP} mois (équivalent ${CHILD_MAX_AGE_YEARS_CAP} ans).`;
  }
  return null;
}

export function policyToYearBounds(policy: ChildAgePolicy): { minAgeYears: number; maxAgeYears: number } {
  return {
    minAgeYears: ageBoundToYears(policy.minAge),
    maxAgeYears: ageBoundToYears(policy.maxAge),
  };
}

export function formatAgeBound(bound: AgeBound): string {
  if (bound.unit === 'months') {
    return `${bound.value} mois`;
  }
  return `${bound.value} an${bound.value > 1 ? 's' : ''}`;
}

export function formatAgeFromYears(ageYears: number): string {
  if (ageYears < 1) {
    const months = Math.max(0, Math.round(ageYears * 12));
    return `${months} mois`;
  }
  const years = Math.floor(ageYears);
  const extraMonths = Math.round((ageYears - years) * 12);
  if (extraMonths > 0 && years < 2) {
    return years > 0 ? `${years} an et ${extraMonths} mois` : `${extraMonths} mois`;
  }
  return `${years} an${years > 1 ? 's' : ''}`;
}

function readBoundFromEnv(
  valueKey: string,
  unitKey: string,
  legacyYearsKey: string,
  defaultValue: number,
  defaultUnit: AgeUnit,
): AgeBound {
  const legacyYears = process.env[legacyYearsKey];
  if (legacyYears != null && String(legacyYears).trim() !== '') {
    return { value: parsePositiveInt(legacyYears, defaultValue), unit: 'years' };
  }
  return {
    value: parsePositiveInt(process.env[valueKey], defaultValue),
    unit: parseUnit(process.env[unitKey], defaultUnit),
  };
}

export function getChildAgePolicyFromEnv(): ChildAgePolicy {
  let minAge = readBoundFromEnv(
    'CHILD_MIN_AGE_VALUE',
    'CHILD_MIN_AGE_UNIT',
    'CHILD_MIN_AGE_YEARS',
    6,
    'months',
  );
  let maxAge = readBoundFromEnv(
    'CHILD_MAX_AGE_VALUE',
    'CHILD_MAX_AGE_UNIT',
    'CHILD_MAX_AGE_YEARS',
    5,
    'years',
  );

  if (ageBoundToYears(minAge) > ageBoundToYears(maxAge)) {
    [minAge, maxAge] = [maxAge, minAge];
  }

  return { minAge, maxAge };
}

export function normalizeChildAgePolicy(raw: unknown): ChildAgePolicy {
  const o = raw as Record<string, unknown>;

  if (o?.minAge && o?.maxAge && typeof o.minAge === 'object' && typeof o.maxAge === 'object') {
    const min = o.minAge as { value?: unknown; unit?: unknown };
    const max = o.maxAge as { value?: unknown; unit?: unknown };
    const policy: ChildAgePolicy = {
      minAge: {
        value: parsePositiveInt(String(min.value ?? ''), 6),
        unit: parseUnit(String(min.unit ?? ''), 'months'),
      },
      maxAge: {
        value: parsePositiveInt(String(max.value ?? ''), 5),
        unit: parseUnit(String(max.unit ?? ''), 'years'),
      },
    };
    if (ageBoundToYears(policy.minAge) <= ageBoundToYears(policy.maxAge)) {
      return policy;
    }
  }

  if (o?.minAgeYears != null || o?.maxAgeYears != null) {
    const policy: ChildAgePolicy = {
      minAge: { value: parsePositiveInt(String(o.minAgeYears ?? ''), 6), unit: 'years' },
      maxAge: { value: parsePositiveInt(String(o.maxAgeYears ?? ''), 5), unit: 'years' },
    };
    if (ageBoundToYears(policy.minAge) <= ageBoundToYears(policy.maxAge)) {
      return policy;
    }
  }

  return getChildAgePolicyFromEnv();
}

/** Format ISO `YYYY-MM-DD` (champ date). */
export const ISO_DATE_RE = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

export function extractIsoDateKey(value: unknown): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value ?? '').trim();
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

export function isValidIsoDateString(value: string): boolean {
  const v = value.trim();
  if (!ISO_DATE_RE.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function assertValidIsoBirthdate(value: unknown): void {
  const key = extractIsoDateKey(value);
  if (!key || !isValidIsoDateString(key)) {
    throw new BadRequestException(
      'Date de naissance invalide : format attendu AAAA-MM-JJ (ex. 2021-03-15).',
    );
  }
}

export function computeAgeYearsFromBirthdate(value: Date | string): number | null {
  const birthdate = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(birthdate.getTime())) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const dob = new Date(birthdate);
  dob.setHours(12, 0, 0, 0);
  return (today.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

export function validateChildAgePolicyBounds(policy: ChildAgePolicy): void {
  for (const bound of [policy.minAge, policy.maxAge]) {
    if (!Number.isInteger(bound.value) || bound.value < 0) {
      throw new BadRequestException("L'âge doit être un entier positif.");
    }
  }

  if (policy.minAge.unit === 'months' && policy.minAge.value > 12 * 18) {
    throw new BadRequestException("L'âge minimum en mois est trop élevé.");
  }
  const minErr = validateAgeBound(policy.minAge, 'min');
  if (minErr) throw new BadRequestException(minErr);
  const maxErr = validateAgeBound(policy.maxAge, 'max');
  if (maxErr) throw new BadRequestException(maxErr);

  if (ageBoundToYears(policy.minAge) > ageBoundToYears(policy.maxAge)) {
    throw new BadRequestException("L'âge minimum ne peut pas être supérieur à l'âge maximum.");
  }
}

export function validateChildBirthdateForPolicy(
  value: unknown,
  policy: ChildAgePolicy = getChildAgePolicyFromEnv(),
): void {
  if (!value) {
    throw new BadRequestException('La date de naissance est obligatoire.');
  }
  assertValidIsoBirthdate(value);
  const isoKey = extractIsoDateKey(value)!;
  const birthdate = new Date(`${isoKey}T12:00:00.000Z`);
  if (Number.isNaN(birthdate.getTime())) {
    throw new BadRequestException('Date de naissance invalide.');
  }

  const ageYears = computeAgeYearsFromBirthdate(birthdate);
  if (ageYears == null) {
    throw new BadRequestException('Date de naissance invalide.');
  }

  validateChildAgePolicyBounds(policy);

  const minYears = ageBoundToYears(policy.minAge);
  const maxYears = ageBoundToYears(policy.maxAge);

  if (ageYears < minYears) {
    throw new BadRequestException(
      `L'enfant doit avoir au moins ${formatAgeBound(policy.minAge)} (âge actuel : ${formatAgeFromYears(ageYears)}).`,
    );
  }
  if (ageYears > maxYears) {
    throw new BadRequestException(
      `L'enfant ne peut pas avoir plus de ${formatAgeBound(policy.maxAge)} (âge actuel : ${formatAgeFromYears(ageYears)}).`,
    );
  }
}
