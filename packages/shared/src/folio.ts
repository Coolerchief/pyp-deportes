// Folio format PYP-{year}-{6-digit sequence} (docs/05-BACKEND-SCHEMA.md §4.5). The database
// assigns it (next_folio); this module formats, parses and recognizes it.

export const FOLIO_PATTERN = /^PYP-(\d{4})-(\d{6})$/;
export const MAX_FOLIO_SEQUENCE = 999_999;

export function formatFolio(year: number, sequence: number): string {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new RangeError(`Año de folio inválido: ${year}`);
  }
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > MAX_FOLIO_SEQUENCE) {
    throw new RangeError(`Consecutivo de folio inválido: ${sequence}`);
  }
  return `PYP-${year}-${String(sequence).padStart(6, '0')}`;
}

export function parseFolio(value: string): { year: number; sequence: number } | null {
  const match = FOLIO_PATTERN.exec(value.trim().toUpperCase());
  if (!match) return null;
  const sequence = Number(match[2]);
  if (sequence < 1) return null;
  return { year: Number(match[1]), sequence };
}

export function isFolio(value: string): boolean {
  return FOLIO_PATTERN.test(value) && parseFolio(value) !== null;
}
