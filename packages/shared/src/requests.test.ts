import { describe, expect, it } from 'vitest';
import { parseCsv } from './import-file.ts';
import {
  mexicoCityDateTime,
  periodRange,
  rangeBounds,
  requestChatMessage,
  requestsCsv,
} from './requests.ts';

// 14-oct-2026 01:30 UTC is still 13-oct in Mexico City (UTC−6).
const NOW = new Date('2026-10-14T01:30:00Z');

describe('periods', () => {
  it('counts days in Mexico City', () => {
    expect(periodRange('hoy', NOW)).toEqual({ from: '2026-10-13', to: '2026-10-13' });
    expect(periodRange('semana', NOW)).toEqual({ from: '2026-10-07', to: '2026-10-13' });
    expect(periodRange('mes', NOW)).toEqual({ from: '2026-10-01', to: '2026-10-13' });
    expect(periodRange('mes-pasado', NOW)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(periodRange('todo', NOW)).toEqual({ from: null, to: null });
    expect(periodRange('mes-pasado', new Date('2026-01-15T18:00:00Z'))).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    });
  });

  it('turns a range into created_at bounds (the last day included)', () => {
    expect(rangeBounds({ from: '2026-10-01', to: '2026-10-31' })).toEqual({
      gte: '2026-10-01T00:00:00-06:00',
      lt: '2026-11-01T00:00:00-06:00',
    });
    expect(rangeBounds({ from: null, to: null })).toEqual({ gte: null, lt: null });
  });
});

describe('chat and export', () => {
  it('greets the customer by first name with the folio', () => {
    expect(requestChatMessage('Laura Gómez Ruiz', 'PYP-2026-000123')).toBe(
      'Hola Laura, te escribo por tu solicitud PYP-2026-000123.',
    );
  });

  it('writes Mexico City times', () => {
    expect(mexicoCityDateTime('2026-10-14T01:30:00Z')).toBe('2026-10-13 19:30');
    expect(mexicoCityDateTime('2026-10-14T06:05:00Z')).toBe('2026-10-14 00:05');
  });

  it('exports one row per request in Spanish', () => {
    const csv = requestsCsv([
      {
        folio: 'PYP-2026-000123',
        created_at: '2026-10-14T16:32:00Z',
        status: 'lost',
        customer_name: 'Laura Gómez',
        customer_phone: '5512345678',
        customer_type: 'league_team',
        organization: 'Liga Coapa, A.C.',
        total_pieces: 40,
        needed_by: '2026-11-01',
        delivery_method: 'pickup',
        requires_invoice: true,
        note: 'Con número en la espalda',
        lost_reason: 'Precio',
        internal_note: '',
      },
    ]);
    const [header, row] = parseCsv(csv);
    expect(header?.slice(0, 3)).toEqual(['folio', 'fecha', 'estado']);
    expect(row).toEqual([
      'PYP-2026-000123',
      '2026-10-14 10:32',
      'Perdida',
      'Laura Gómez',
      '5512345678',
      'Liga o equipo',
      'Liga Coapa, A.C.',
      '40',
      '2026-11-01',
      'Recoger en tienda Coapa',
      'sí',
      'Con número en la espalda',
      'Precio',
      '',
    ]);
  });
});
