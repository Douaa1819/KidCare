/**
 * Jour calendaire → minuit UTC pour ce jour (composantes UTC de la date parsée).
 * Évite le bug de `new Date(y, m, d)` en fuseau serveur qui décale le stockage d’un jour.
 */
export function toUtcMidnightForCalendarDate(input: string): Date {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) {
    throw new Error('Invalid date');
  }
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  );
}

/** [start, endExclusive) pour un jour YYYY-MM-DD (filtres Prisma `gte` / `lt`). */
export function utcDayRangeExclusiveEnd(ymd: string): {
  start: Date;
  endExclusive: Date;
} {
  const start = toUtcMidnightForCalendarDate(ymd);
  const endExclusive = new Date(
    Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  );
  return { start, endExclusive };
}

/** Période inclusive min..max (jours calendaires UTC). */
export function utcRangeMinMaxInclusive(
  dateMin: string,
  dateMax: string,
): { start: Date; endExclusive: Date } {
  const start = toUtcMidnightForCalendarDate(dateMin);
  const maxDay = toUtcMidnightForCalendarDate(dateMax);
  const endExclusive = new Date(
    Date.UTC(
      maxDay.getUTCFullYear(),
      maxDay.getUTCMonth(),
      maxDay.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  );
  return { start, endExclusive };
}
