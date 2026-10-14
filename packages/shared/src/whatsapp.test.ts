import { describe, expect, it } from 'vitest';
import {
  buildCompactQuoteMessage,
  buildQuoteMessage,
  buildWaUrl,
  type QuoteMessageInput,
  WA_URL_MAX,
} from './whatsapp.ts';

const NUMBER = '5500000000';

const input: QuoteMessageInput = {
  folio: 'PYP-2026-000123',
  customer: { name: 'Juan Pérez', type: 'league_team', organization: 'Liga Coapa Sub-12' },
  neededBy: '2026-10-15',
  deliveryMethod: 'pickup',
  requiresInvoice: true,
  note: 'Colores del club: verde y blanco.',
  products: [
    {
      name: 'Uniforme de Fútbol Completo',
      sku: 'UNI-001',
      lines: [
        { label: 'CH', quantity: 4 },
        { label: 'M', quantity: 8 },
        { label: 'G', quantity: 6 },
        { label: 'XG', quantity: 2 },
      ],
      personalize: true,
      notes: 'escudo al pecho, nombre y número',
    },
    {
      name: 'Balón Fútbol Molten',
      sku: 'BAL-005',
      lines: [{ label: '#5 · Blanco/Rojo', quantity: 12, sku: 'BAL-005-5-BLANCO-ROJO' }],
      personalize: false,
      notes: '',
    },
    {
      name: 'Conos para Entrenamiento',
      sku: 'ENT-001',
      lines: [{ label: '23 cm · Naranja', quantity: 10, sku: 'ENT-001-23CM-NARANJA' }],
      personalize: false,
      notes: '',
    },
  ],
};

describe('buildQuoteMessage', () => {
  it('writes the full format of TRD §6.5', () => {
    expect(buildQuoteMessage(input)).toMatchInlineSnapshot(`
      "¡Hola! Quiero cotizar. Folio *PYP-2026-000123*

      *Cliente:* Juan Pérez · Liga o equipo
      *Equipo/institución:* Liga Coapa Sub-12
      *Lo necesito para:* 15/10/2026
      *Entrega:* Recoger en tienda · *Factura:* Sí

      *Productos (3 · 42 piezas)*
      1. Uniforme de Fútbol Completo (UNI-001) — 20 pzs
         CH 4 · M 8 · G 6 · XG 2
         ✎ Personalizar: escudo al pecho, nombre y número
      2. Balón Fútbol Molten #5 Blanco/Rojo (BAL-005-5-BLANCO-ROJO) — 12 pzs
      3. Conos para Entrenamiento 23 cm Naranja (ENT-001-23CM-NARANJA) — 10 pzs

      *Nota:* Colores del club: verde y blanco."
    `);
  });

  it('writes the message without folio, institution or note', () => {
    expect(
      buildQuoteMessage({
        ...input,
        folio: null,
        customer: { name: 'Ana', type: 'individual' },
        deliveryMethod: 'shipping',
        requiresInvoice: false,
        note: '  ',
        products: [{ ...input.products[0]!, notes: '' }],
      }),
    ).toMatchInlineSnapshot(`
      "¡Hola! Quiero cotizar.

      *Cliente:* Ana · Particular
      *Lo necesito para:* 15/10/2026
      *Entrega:* Envío · *Factura:* No

      *Productos (1 · 20 piezas)*
      1. Uniforme de Fútbol Completo (UNI-001) — 20 pzs
         CH 4 · M 8 · G 6 · XG 2
         ✎ Personalizar: por definir"
    `);
  });

  it('writes the compact format, one line per product and the folio for the detail', () => {
    expect(buildCompactQuoteMessage(input, NUMBER)).toMatchInlineSnapshot(`
      "¡Hola! Quiero cotizar. Folio *PYP-2026-000123*

      *Cliente:* Juan Pérez · Liga o equipo
      *Equipo/institución:* Liga Coapa Sub-12
      *Lo necesito para:* 15/10/2026
      *Entrega:* Recoger en tienda · *Factura:* Sí

      *Productos (3 · 42 piezas)*
      1. Uniforme de Fútbol Completo (UNI-001) — 20 pzs
      2. Balón Fútbol Molten #5 Blanco/Rojo (BAL-005-5-BLANCO-ROJO) — 12 pzs
      3. Conos para Entrenamiento 23 cm Naranja (ENT-001-23CM-NARANJA) — 10 pzs

      Detalle completo en el folio *PYP-2026-000123*."
    `);
  });
});

describe('buildWaUrl', () => {
  // 100 lines: 25 products × 4 sizes, each personalized with a long note.
  const big: QuoteMessageInput = {
    ...input,
    products: Array.from({ length: 25 }, (_, i) => ({
      name: `Uniforme de Fútbol Completo modelo ${i + 1}`,
      sku: `UNI-${String(i + 1).padStart(3, '0')}`,
      lines: ['CH', 'M', 'G', 'XG'].map((label) => ({ label, quantity: 12 })),
      personalize: true,
      notes: 'Escudo al pecho, nombre y número en la espalda, colores verde y blanco.',
    })),
  };

  it('uses the full message when it fits', () => {
    const { url, format } = buildWaUrl(NUMBER, input);
    expect(format).toBe('full');
    expect(url.startsWith('https://wa.me/525500000000?text=')).toBe(true);
    expect(decodeURIComponent(url.split('?text=')[1]!)).toBe(buildQuoteMessage(input));
  });

  it('turns a 100-line list into a valid compact URL under 4 000 characters', () => {
    const { url, format, message } = buildWaUrl(NUMBER, big);
    expect(format).toBe('compact');
    expect(url.length).toBeLessThanOrEqual(WA_URL_MAX);
    expect(() => new URL(url)).not.toThrow();
    expect(message).toContain('Detalle completo en el folio *PYP-2026-000123*.');
    expect(message).toContain('*Productos (25 · 1200 piezas)*');
    expect(message).toContain('25. Uniforme de Fútbol Completo modelo 25 (UNI-025) — 48 pzs');
  });

  it('sums up the last products when even the compact list is too long', () => {
    // 100 lines as 100 different products: one line each, still too long for one URL.
    const hundred: QuoteMessageInput = {
      ...input,
      products: Array.from({ length: 100 }, (_, i) => ({
        name: `Guante de box profesional de piel modelo ${i + 1}`,
        sku: `BOX-${String(i + 1).padStart(3, '0')}`,
        lines: [{ label: '12 oz · Rojo', quantity: 2, sku: `BOX-${i + 1}-12OZ-ROJO` }],
        personalize: false,
        notes: '',
      })),
    };
    const { url, format, message } = buildWaUrl(NUMBER, hundred);
    expect(format).toBe('compact');
    expect(url.length).toBeLessThanOrEqual(WA_URL_MAX);
    expect(() => new URL(url)).not.toThrow();
    expect(message).toContain('*Productos (100 · 200 piezas)*');
    expect(message).toMatch(/\n… y \d+ productos más\n/);
  });

  it('says "1 pieza" in the title for a single piece', () => {
    const one = buildQuoteMessage({
      ...input,
      products: [{ ...input.products[1]!, lines: [{ label: '#5', quantity: 1 }] }],
    });
    expect(one).toContain('*Productos (1 · 1 pieza)*');
  });

  it('always sends the full message without folio, however long', () => {
    const { url, format } = buildWaUrl(NUMBER, { ...big, folio: null });
    expect(format).toBe('full');
    expect(url.length).toBeGreaterThan(WA_URL_MAX);
    expect(() => new URL(url)).not.toThrow();
    expect(decodeURIComponent(new URL(url).searchParams.get('text') ?? '')).toContain(
      '25. Uniforme de Fútbol Completo modelo 25 (UNI-025) — 48 pzs',
    );
  });
});
