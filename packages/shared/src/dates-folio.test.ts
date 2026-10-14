import { describe, expect, it } from 'vitest';
import { addDays, addYears, isIsoDate, mexicoCityDate, mexicoCityYear } from './dates.ts';
import { formatFolio, isFolio, parseFolio } from './folio.ts';

describe('Mexico City dates', () => {
  it('uses the Mexico City calendar day, not UTC', () => {
    // 05:30 UTC on Jan 1 is still 23:30 on Dec 31 in Mexico City (UTC-6).
    expect(mexicoCityDate(new Date('2027-01-01T05:30:00Z'))).toBe('2026-12-31');
    expect(mexicoCityYear(new Date('2027-01-01T05:30:00Z'))).toBe(2026);
    expect(mexicoCityDate(new Date('2027-01-01T06:30:00Z'))).toBe('2027-01-01');
  });

  it('recognizes real calendar dates only', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('15/10/2026')).toBe(false);
  });

  it('adds days and years', () => {
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04');
    expect(addYears('2026-10-11', 2)).toBe('2028-10-11');
    expect(addYears('2028-02-29', 1)).toBe('2029-02-28');
  });
});

describe('folio', () => {
  it('formats PYP-{year}-{6 digits}', () => {
    expect(formatFolio(2026, 123)).toBe('PYP-2026-000123');
    expect(formatFolio(2026, 999_999)).toBe('PYP-2026-999999');
  });

  it('rejects sequences out of range', () => {
    expect(() => formatFolio(2026, 0)).toThrow(RangeError);
    expect(() => formatFolio(2026, 1_000_000)).toThrow(RangeError);
  });

  it('parses folios, tolerating case and spaces', () => {
    expect(parseFolio(' pyp-2026-000123 ')).toEqual({ year: 2026, sequence: 123 });
    expect(parseFolio('PYP-2026-123')).toBeNull();
    expect(parseFolio('PYP-2026-000000')).toBeNull();
  });

  it('recognizes only exact folios', () => {
    expect(isFolio('PYP-2026-000123')).toBe(true);
    expect(isFolio('pyp-2026-000123')).toBe(false);
  });
});
