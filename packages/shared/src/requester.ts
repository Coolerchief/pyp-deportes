// Requester data remembered in the browser (T3.5, APP-FLOW §4.2 and §4.5) and the date
// shortcuts of the quote form.

import { z } from 'zod';
import { addDays, mexicoCityDate } from './dates.ts';
import { CUSTOMER_TYPES, DELIVERY_METHODS } from './labels.ts';
import { QUOTE_LIMITS, type QuoteRequesterInput } from './quote.ts';
import { QUOTE_MAX_AGE_DAYS } from './quote-list.ts';

/** localStorage key of the requester's data; the privacy box is never saved. */
export const REQUESTER_STORAGE_KEY = 'pyp.requester.v1';

/** What gets prefilled next time: who and how, not when (a past date) nor the notes. */
export const RequesterDraftSchema = z
  .object({
    name: z.string().max(QUOTE_LIMITS.nameMax),
    phone: z.string().max(20),
    type: z.enum(CUSTOMER_TYPES),
    organization: z.string().max(QUOTE_LIMITS.organizationMax),
    deliveryMethod: z.enum(DELIVERY_METHODS),
    requiresInvoice: z.boolean(),
  })
  .partial();
export type RequesterDraft = z.output<typeof RequesterDraftSchema>;

/** The part of a sent form that is remembered. */
export function requesterDraft(values: QuoteRequesterInput): RequesterDraft {
  return {
    name: values.customer.name,
    phone: values.customer.phone,
    type: values.customer.type as RequesterDraft['type'],
    organization: values.customer.organization ?? '',
    deliveryMethod: values.deliveryMethod as RequesterDraft['deliveryMethod'],
    requiresInvoice: values.requiresInvoice ?? false,
  };
}

/** Saved shape: { savedAt, draft }. Anything broken, unknown or older than 30 days → {}. */
export function restoreRequester(saved: unknown, now: Date): RequesterDraft {
  if (!saved || typeof saved !== 'object') return {};
  const { savedAt, draft } = saved as { savedAt?: unknown; draft?: unknown };
  if (typeof savedAt !== 'string') return {};
  const age = now.getTime() - new Date(savedAt).getTime();
  if (!(age >= 0 && age <= QUOTE_MAX_AGE_DAYS * 86_400_000)) return {};
  const parsed = RequesterDraftSchema.safeParse(draft);
  return parsed.success ? parsed.data : {};
}

/** "¿Para cuándo lo necesitas?" shortcuts: today + 7, + 14 and + 30 days (APP-FLOW §4.2). */
export const NEEDED_BY_SHORTCUTS = [
  { label: 'Esta semana', days: 7 },
  { label: '2 semanas', days: 14 },
  { label: '1 mes', days: 30 },
] as const;

/** The date (YYYY-MM-DD, Mexico City) a shortcut puts in the field. */
export function neededByDate(days: number, now: Date = new Date()): string {
  return addDays(mexicoCityDate(now), days);
}
