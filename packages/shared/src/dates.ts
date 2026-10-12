// Business days are counted in Mexico City (docs/05-BACKEND-SCHEMA.md §1.8).

export const BUSINESS_TIME_ZONE = 'America/Mexico_City';

const isoDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Calendar date in Mexico City as 'YYYY-MM-DD'. */
export function mexicoCityDate(at: Date = new Date()): string {
  return isoDateFormat.format(at);
}

/** Year in Mexico City (folios restart every year in that time zone). */
export function mexicoCityYear(at: Date = new Date()): number {
  return Number(mexicoCityDate(at).slice(0, 4));
}

/** True for a real calendar date written as 'YYYY-MM-DD'. */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Adds days to a 'YYYY-MM-DD' date (calendar arithmetic, no time zone involved). */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Adds years to a 'YYYY-MM-DD' date; Feb 29 falls back to Feb 28 when needed. */
export function addYears(isoDate: string, years: number): string {
  const [year, month, day] = isoDate.split('-').map(Number) as [number, number, number];
  const target = new Date(Date.UTC(year + years, month - 1, day));
  if (target.getUTCMonth() !== month - 1) target.setUTCDate(0);
  return target.toISOString().slice(0, 10);
}
