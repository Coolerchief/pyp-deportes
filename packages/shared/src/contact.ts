// How the store's contact data reads on the site: phone, opening hours and WhatsApp links.
// The values come from settings and stores (rule 4); only the format lives here.

import { digitsOnly } from './text';

/** One opening-hours block of `stores.hours` (days: 1 = lunes … 7 = domingo). */
export type StoreHoursBlock = { days: number[]; open: string; close: string };

const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

/** "5565822426" → "55 6582 2426" (Mexico City style: 2 + 4 + 4). Other lengths stay as given. */
export function formatPhone(value: string): string {
  const digits = digitsOnly(value);
  if (digits.length !== 10) return value;
  return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
}

/** `tel:` link for a 10-digit Mexican number. */
export function telUrl(value: string): string {
  return `tel:+52${digitsOnly(value)}`;
}

/** Consecutive days as ranges: [1,2,3,4,5] → "Lun–Vie", [6] → "Sáb", [1,3] → "Lun, Mié". */
function dayRanges(days: readonly number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const ranges: string[] = [];
  for (let i = 0; i < sorted.length;) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === (sorted[j] as number) + 1) j++;
    const from = DAY_SHORT[(sorted[i] as number) - 1];
    const to = DAY_SHORT[(sorted[j] as number) - 1];
    ranges.push(i === j ? `${from}` : `${from}–${to}`);
    i = j + 1;
  }
  return ranges.join(', ');
}

/** Each block as "Lun–Vie 10:00–19:00", in the order they are stored. */
export function storeHoursLines(hours: readonly StoreHoursBlock[]): string[] {
  return hours.map((block) => `${dayRanges(block.days)} ${block.open}–${block.close}`);
}

/** "Lun–Vie 10:00–19:00 · Sáb 10:00–17:00" (footer and menu). */
export function formatStoreHours(hours: readonly StoreHoursBlock[]): string {
  return storeHoursLines(hours).join(' · ');
}

/**
 * wa.me link to a 10-digit Mexican number (TRD §6.5): https://wa.me/52XXXXXXXXXX, with the
 * message URL-encoded when there is one. The quote message itself is built in T3.6.
 */
export function whatsappUrl(number: string, text?: string): string {
  const base = `https://wa.me/52${digitsOnly(number)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
