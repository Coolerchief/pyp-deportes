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

const DAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

/** Day of the week (1 = lunes … 7 = domingo) and "HH:MM" in Mexico City at `at`. */
export function mexicoCityClock(at: Date): { day: number; time: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday')) + 1;
  return { day, time: `${get('hour')}:${get('minute')}` };
}

export type StoreStatus = { open: boolean; text: string };

/**
 * "Abierto ahora · cierra 19:00", "Cerrado · abre hoy 10:00", "Cerrado · abre mañana 10:00" or
 * "Cerrado · abre el lunes 10:00" (APP-FLOW §5), in Mexico City time. null without hours.
 */
export function storeStatus(hours: readonly StoreHoursBlock[], at: Date): StoreStatus | null {
  if (hours.length === 0) return null;
  const { day, time } = mexicoCityClock(at);
  const blocksOn = (d: number) =>
    hours.filter((b) => b.days.includes(d)).sort((a, b) => a.open.localeCompare(b.open));
  const today = blocksOn(day);
  const current = today.find((b) => b.open <= time && time < b.close);
  if (current) return { open: true, text: `Abierto ahora · cierra ${current.close}` };
  const later = today.find((b) => b.open > time);
  if (later) return { open: false, text: `Cerrado · abre hoy ${later.open}` };
  for (let offset = 1; offset <= 7; offset++) {
    const next = ((day - 1 + offset) % 7) + 1;
    const [first] = blocksOn(next);
    if (!first) continue;
    const when = offset === 1 ? 'mañana' : `el ${DAY_NAMES[next - 1]}`;
    return { open: false, text: `Cerrado · abre ${when} ${first.open}` };
  }
  return null;
}

/** Google Maps directions to the store ("Cómo llegar"): coordinates, or the address. */
export function directionsUrl(store: {
  lat: number | null;
  lng: number | null;
  street: string;
  neighborhood: string;
  city: string;
}): string {
  const destination =
    store.lat !== null && store.lng !== null
      ? `${store.lat},${store.lng}`
      : `${store.street}, ${store.neighborhood}, ${store.city}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

/** First name for "Escríbele a Ana", without the brackets of pending data ("[Ana Martínez]"). */
export function firstName(name: string): string {
  return name.replace(/[[\]]/g, '').trim().split(/\s+/)[0] ?? '';
}

/** Initials for the avatar without a photo: "[Ana Martínez]" → "AM". */
export function initials(name: string): string {
  return name
    .replace(/[[\]]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}
