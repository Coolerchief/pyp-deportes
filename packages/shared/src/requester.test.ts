import { describe, expect, it } from 'vitest';
import {
  createQuoteRequesterSchema,
  quoteErrorSummary,
  quoteFieldOf,
  type QuoteField,
} from './quote';
import { neededByDate, requesterDraft, restoreRequester } from './requester';

const NOW = new Date('2026-10-14T18:00:00.000Z'); // 12:00 in Mexico City

describe('requester draft', () => {
  const values = {
    customer: {
      name: 'Ana',
      phone: '55 1234 5678',
      type: 'school_academy',
      organization: 'Liga Sur',
    },
    neededBy: '2026-10-21',
    deliveryMethod: 'shipping',
    requiresInvoice: true,
    note: 'Colores del club',
    privacyAccepted: true,
    privacyVersion: '2026-10',
  } as const;

  it('keeps who and how, never the privacy box, the date or the notes', () => {
    expect(requesterDraft(values)).toEqual({
      name: 'Ana',
      phone: '55 1234 5678',
      type: 'school_academy',
      organization: 'Liga Sur',
      deliveryMethod: 'shipping',
      requiresInvoice: true,
    });
  });

  it('restores a draft saved less than 30 days ago', () => {
    const saved = { savedAt: '2026-10-01T00:00:00.000Z', draft: requesterDraft(values) };
    expect(restoreRequester(saved, NOW).name).toBe('Ana');
  });

  it('forgets old, broken or invalid drafts', () => {
    const draft = requesterDraft(values);
    expect(restoreRequester({ savedAt: '2026-08-01T00:00:00.000Z', draft }, NOW)).toEqual({});
    expect(restoreRequester('basura', NOW)).toEqual({});
    expect(restoreRequester({ savedAt: NOW.toISOString(), draft: { type: 'otro' } }, NOW)).toEqual(
      {},
    );
  });
});

describe('date shortcuts', () => {
  it('put today + 7, + 14 or + 30 days in Mexico City', () => {
    expect(neededByDate(7, NOW)).toBe('2026-10-21');
    expect(neededByDate(14, NOW)).toBe('2026-10-28');
    expect(neededByDate(30, NOW)).toBe('2026-11-13');
  });
});

describe('the error summary of the form', () => {
  it('counts and names the missing data of an empty form, in form order', () => {
    const schema = createQuoteRequesterSchema({ now: () => NOW });
    const result = schema.safeParse({
      customer: { name: '', phone: '55 1234 56', type: 'league_team', organization: '' },
      neededBy: '2026-10-21',
      deliveryMethod: 'pickup',
      requiresInvoice: false,
      note: '',
      privacyAccepted: false,
      privacyVersion: '2026-10',
    });
    expect(result.success).toBe(false);
    const fields = (result.error?.issues ?? [])
      .map((issue) => quoteFieldOf(issue.path))
      .filter((f): f is QuoteField => f !== null);
    expect(quoteErrorSummary(fields)).toBe(
      'Faltan 3 datos para enviar tu cotización: nombre, WhatsApp y aviso de privacidad.',
    );
  });
});
