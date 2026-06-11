import {
  getChildAgePolicyFromEnv,
  validateChildBirthdateForPolicy,
  type AgeBound,
  type AgeUnit,
  type ChildAgePolicy,
} from './child-age-policy';

function parseUnit(raw: string): AgeUnit {
  const u = raw.trim().toLowerCase();
  if (u === 'months' || u === 'month' || u === 'mois' || u === 'm') return 'months';
  return 'years';
}

function parseBound(raw: unknown): AgeBound | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as { value?: unknown; unit?: unknown };
  const value = Number.parseInt(String(o.value ?? ''), 10);
  if (!Number.isFinite(value) || value < 0) return null;
  return { value, unit: parseUnit(String(o.unit ?? 'years')) };
}

/** Lit `trancheAge` (JSON ou ancien format "2-5" en années). */
export function parseTrancheAgePolicy(trancheAge?: string | null): ChildAgePolicy | null {
  const raw = trancheAge?.trim();
  if (!raw) return null;

  if (raw.startsWith('{')) {
    try {
      const o = JSON.parse(raw) as { min?: unknown; max?: unknown };
      const minAge = parseBound(o.min);
      const maxAge = parseBound(o.max);
      if (minAge && maxAge) return { minAge, maxAge };
    } catch {
      /* legacy below */
    }
  }

  const m = raw.match(/^(\d+(?:[.,]\d+)?)\s*[-–—]\s*(\d+(?:[.,]\d+)?)/);
  if (m) {
    const minV = Math.round(Number(m[1].replace(',', '.')));
    const maxV = Math.round(Number(m[2].replace(',', '.')));
    if (Number.isFinite(minV) && Number.isFinite(maxV)) {
      return {
        minAge: { value: minV, unit: 'years' },
        maxAge: { value: maxV, unit: 'years' },
      };
    }
  }

  return null;
}

export function formatTrancheAgePolicy(policy: ChildAgePolicy): string {
  return JSON.stringify({ min: policy.minAge, max: policy.maxAge });
}

export function resolveChildAgePolicyForClasse(trancheAge?: string | null): ChildAgePolicy {
  return parseTrancheAgePolicy(trancheAge) ?? getChildAgePolicyFromEnv();
}

export function validateChildBirthdateForClasse(
  dateNaissance: unknown,
  trancheAge?: string | null,
): void {
  validateChildBirthdateForPolicy(dateNaissance, resolveChildAgePolicyForClasse(trancheAge));
}
