import { describe, expect, it } from 'vitest';
import {
  createQuoteSubmissionSchema,
  quoteErrorSummary,
  quoteFieldOf,
  type QuoteSubmissionInput,
} from './quote.ts';

// Noon on Oct 11, 2026 in Mexico City.
const schema = createQuoteSubmissionSchema({ now: () => new Date('2026-10-11T18:00:00Z') });

const valid: QuoteSubmissionInput = {
  clientRequestId: '0b6f0b6f-0000-4000-8000-000000000001',
  turnstileToken: 'token',
  customer: { name: 'Juan Pérez', phone: '55 1234 5678', type: 'league_team', organization: '' },
  neededBy: '2026-10-15',
  deliveryMethod: 'pickup',
  privacyAccepted: true,
  privacyVersion: '2026-10',
  items: [{ variantId: '0b6f0b6f-0000-4000-8000-0000000000aa', quantity: 4 }],
};

function messages(input: unknown) {
  const result = schema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

describe('QuoteSubmissionSchema', () => {
  it('accepts a valid request and normalizes it', () => {
    const result = schema.parse(valid);
    expect(result.customer.phone).toBe('5512345678');
    expect(result.customer.organization).toBeUndefined();
    expect(result.requiresInvoice).toBe(false);
    expect(result.note).toBe('');
    expect(result.items[0]).toEqual({
      variantId: valid.items[0]!.variantId,
      quantity: 4,
      personalize: false,
      notes: '',
    });
  });

  it('uses the UI/UX field messages', () => {
    expect(
      messages({
        ...valid,
        customer: { ...valid.customer, name: ' ', phone: '55 1234' },
        privacyAccepted: false,
      }),
    ).toEqual([
      'Escribe tu nombre.',
      'Faltan dígitos: deben ser 10.',
      'Acepta el aviso de privacidad para enviar.',
    ]);
  });

  it('rejects a phone with more than 10 digits (no +52)', () => {
    expect(
      messages({ ...valid, customer: { ...valid.customer, phone: '+52 55 1234 5678' } }),
    ).toEqual(['Faltan dígitos: deben ser 10.']);
  });

  it('takes dates from today (Mexico City) up to 2 years ahead', () => {
    expect(messages({ ...valid, neededBy: '2026-10-11' })).toEqual([]);
    expect(messages({ ...valid, neededBy: '2026-10-10' })).toEqual([
      'Elige una fecha de hoy en adelante.',
    ]);
    expect(messages({ ...valid, neededBy: '2028-10-11' })).toEqual([]);
    expect(messages({ ...valid, neededBy: '2028-10-12' })).toEqual([
      'Elige una fecha dentro de los próximos 2 años.',
    ]);
    expect(messages({ ...valid, neededBy: '2026-13-01' })).toEqual([
      '¿Para cuándo lo necesitas? Elige una fecha.',
    ]);
  });

  it('limits lengths, items and quantities', () => {
    expect(messages({ ...valid, note: 'x'.repeat(1001) })).toHaveLength(1);
    expect(messages({ ...valid, items: [] })).toEqual(['Tu lista está vacía.']);
    expect(messages({ ...valid, items: Array(101).fill(valid.items[0]) })).toHaveLength(1);
    expect(messages({ ...valid, items: [{ ...valid.items[0], quantity: 10_000 }] })).toEqual([
      'Máximo 9999 piezas por talla.',
    ]);
    expect(messages({ ...valid, items: [{ ...valid.items[0], quantity: 1.5 }] })).toEqual([
      'Usa números enteros.',
    ]);
    expect(
      messages({ ...valid, items: [{ ...valid.items[0], notes: 'x'.repeat(501) }] }),
    ).toHaveLength(1);
  });

  it('requires a customer type, a delivery method and ids', () => {
    const result = schema.safeParse({
      ...valid,
      customer: { ...valid.customer, type: 'vecino' },
      deliveryMethod: 'dron',
      clientRequestId: 'x',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual([
      'customer.type',
      'deliveryMethod',
      'clientRequestId',
    ]);
  });
});

describe('quoteErrorSummary', () => {
  it('matches the PRD acceptance text', () => {
    const result = schema.safeParse({
      ...valid,
      customer: { ...valid.customer, name: '', phone: '55' },
      privacyAccepted: false,
    });
    const fields = result
      .error!.issues.map((issue) => quoteFieldOf(issue.path))
      .filter((f) => f !== null);
    expect(quoteErrorSummary(fields)).toBe(
      'Faltan 3 datos para enviar tu cotización: nombre, WhatsApp y aviso de privacidad.',
    );
  });

  it('uses the singular and lists each field once, in form order', () => {
    expect(quoteErrorSummary(['privacyAccepted'])).toBe(
      'Falta 1 dato para enviar tu cotización: aviso de privacidad.',
    );
    expect(quoteErrorSummary(['neededBy', 'name', 'name'])).toBe(
      'Faltan 2 datos para enviar tu cotización: nombre y fecha.',
    );
  });
});
