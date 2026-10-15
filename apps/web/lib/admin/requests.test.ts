import { describe, expect, it, vi } from 'vitest';
import {
  countByStatus,
  exportRequests,
  fetchRequest,
  filtersRange,
  listRequests,
  readRequestFilters,
  requestFiltersQuery,
  searchFilter,
  setRequestStatus,
} from './requests';

const NOW = new Date('2026-10-14T18:00:00Z');

describe('filters in the URL', () => {
  it('reads periods, ranges, status, search and page', () => {
    expect(
      readRequestFilters(new URLSearchParams('estado=won&periodo=mes&q=laura&pagina=2')),
    ).toEqual({
      status: 'won',
      period: 'mes',
      from: '',
      to: '',
      q: 'laura',
      page: 2,
    });
    const range = readRequestFilters(new URLSearchParams('desde=2026-09-01&hasta=2026-09-30'));
    expect(range.period).toBe('rango');
    expect(filtersRange(range, NOW)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(
      readRequestFilters(new URLSearchParams('estado=otro&periodo=siempre&desde=ayer')),
    ).toMatchObject({
      status: '',
      period: 'todo',
      from: '',
    });
  });

  it('writes only what differs from "everything"', () => {
    expect(requestFiltersQuery({ status: 'new', period: 'todo', page: 1 })).toBe('?estado=new');
    expect(requestFiltersQuery({ period: 'rango', from: '2026-09-01', to: '2026-09-30' })).toBe(
      '?desde=2026-09-01&hasta=2026-09-30',
    );
    expect(requestFiltersQuery({ period: 'mes', q: 'PYP-2026', page: 3 })).toBe(
      '?periodo=mes&q=PYP-2026&pagina=3',
    );
  });

  it('searches folio, name or phone without PostgREST syntax from the user', () => {
    expect(searchFilter('Laura')).toBe('folio.ilike.*Laura*,customer_name.ilike.*Laura*');
    expect(searchFilter('55 1234-5678')).toBe(
      'folio.ilike.*55 1234-5678*,customer_name.ilike.*55 1234-5678*,customer_phone.like.*5512345678*',
    );
    expect(searchFilter('a,b(c)*')).toBe('folio.ilike.*a b c*,customer_name.ilike.*a b c*');
    expect(searchFilter('  ')).toBeNull();
  });
});

function fakeClient(result: { data?: unknown; error?: unknown; count?: number }) {
  const calls: unknown[][] = [];
  const query: Record<string, unknown> = {};
  for (const method of ['select', 'order', 'range', 'eq', 'gte', 'lt', 'or']) {
    query[method] = (...args: unknown[]) => (calls.push([method, ...args]), query);
  }
  query.maybeSingle = async () => result;
  query.then = (resolve: (value: unknown) => void) => resolve(result);
  return { client: { from: (t: string) => (calls.push(['from', t]), query) } as never, calls };
}

describe('listRequests / countByStatus', () => {
  it('filters by period in Mexico City, status and search, newest first', async () => {
    const { client, calls } = fakeClient({
      data: [
        {
          id: 'q1',
          folio: 'PYP-2026-000001',
          created_at: '2026-10-14T16:00:00Z',
          customer_name: 'Laura',
          customer_phone: '5500000101',
          customer_type: 'league_team',
          organization: null,
          total_pieces: 10,
          status: 'won',
          needed_by: '2026-11-20',
        },
      ],
      error: null,
      count: 1,
    });
    const filters = readRequestFilters(new URLSearchParams('estado=won&periodo=mes&q=laura'));
    const result = await listRequests(client, filters, NOW);
    expect(result.total).toBe(1);
    expect(result.rows[0]).toMatchObject({
      folio: 'PYP-2026-000001',
      status: 'won',
      totalPieces: 10,
    });
    expect(calls.slice(2)).toEqual([
      ['order', 'created_at', { ascending: false }],
      ['range', 0, 49],
      ['gte', 'created_at', '2026-10-01T00:00:00-06:00'],
      ['lt', 'created_at', '2026-10-15T00:00:00-06:00'],
      ['or', 'folio.ilike.*laura*,customer_name.ilike.*laura*'],
      ['eq', 'status', 'won'],
    ]);
  });

  it('counts each status of the period, leaving the status filter out', async () => {
    const seen: unknown[][] = [];
    const client = {
      from: () => {
        const q: Record<string, unknown> = {};
        let status = '';
        for (const m of ['select', 'gte', 'lt', 'or'])
          q[m] = (...a: unknown[]) => (seen.push([m, ...a]), q);
        q.eq = (_c: string, value: string) => ((status = value), q);
        q.then = (resolve: (v: unknown) => void) =>
          resolve({ count: { new: 4, won: 3 }[status] ?? 0, error: null });
        return q;
      },
    };
    const filters = readRequestFilters(new URLSearchParams('estado=new&periodo=mes'));
    expect(await countByStatus(client as never, filters, NOW)).toEqual({
      new: 4,
      in_progress: 0,
      quoted: 0,
      won: 3,
      lost: 0,
    });
    expect(seen.filter(([m]) => m === 'select')[0]).toEqual([
      'select',
      'id',
      { count: 'exact', head: true },
    ]);
  });
});

describe('exportRequests', () => {
  it('reads 1000 at a time until the end', async () => {
    const pages = [Array.from({ length: 1000 }, () => ({ folio: 'x' })), [{ folio: 'y' }]];
    const ranges: unknown[] = [];
    const client = {
      from: () => {
        const q: Record<string, unknown> = {};
        for (const m of ['select', 'order', 'gte', 'lt', 'or', 'eq']) q[m] = () => q;
        q.range = (from: number, to: number) => (ranges.push([from, to]), q);
        q.then = (resolve: (v: unknown) => void) => resolve({ data: pages.shift(), error: null });
        return q;
      },
    };
    const rows = await exportRequests(
      client as never,
      readRequestFilters(new URLSearchParams()),
      NOW,
    );
    expect(rows).toHaveLength(1001);
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });
});

describe('fetchRequest', () => {
  it('orders the lines and puts the newest history first', async () => {
    const { client } = fakeClient({
      data: {
        id: '0b6f0b6f-0000-4000-8000-000000000001',
        folio: 'PYP-2026-000001',
        created_at: '2026-10-14T16:00:00Z',
        customer_name: 'Laura',
        customer_phone: '5500000101',
        customer_type: 'league_team',
        organization: 'Liga',
        total_pieces: 30,
        status: 'quoted',
        needed_by: '2026-11-20',
        delivery_method: 'pickup',
        requires_invoice: true,
        note: '',
        lost_reason: null,
        internal_note: '',
        store: { name: 'Coapa' },
        quote_request_items: [
          {
            line_no: 2,
            product_id: null,
            product_name: 'B',
            sku: 'B',
            variant_label: null,
            quantity: 20,
            personalize: false,
            notes: '',
          },
          {
            line_no: 1,
            product_id: 'p1',
            product_name: 'A',
            sku: 'A-M',
            variant_label: 'M',
            quantity: 10,
            personalize: true,
            notes: 'Escudo',
          },
        ],
        quote_status_history: [
          {
            id: 1,
            from_status: null,
            to_status: 'new',
            changed_by: null,
            note: '',
            created_at: '2026-10-14T16:00:00Z',
          },
          {
            id: 2,
            from_status: 'new',
            to_status: 'quoted',
            changed_by: 'u1',
            note: 'Enviada',
            created_at: '2026-10-14T17:00:00Z',
          },
        ],
      },
      error: null,
    });
    const request = (await fetchRequest(client, '0b6f0b6f-0000-4000-8000-000000000001'))!;
    expect(request.lines.map((l) => l.lineNo)).toEqual([1, 2]);
    expect(request.history.map((h) => h.toStatus)).toEqual(['quoted', 'new']);
    expect(request.storeName).toBe('Coapa');
    expect(await fetchRequest(client, 'no-es-id')).toBeNull();
  });
});

describe('setRequestStatus', () => {
  it('sends the reason only when it is lost', async () => {
    const rpc = vi.fn(async () => ({ error: null }));
    await setRequestStatus({ rpc } as never, 'q1', 'quoted', { note: ' Enviada ' });
    await setRequestStatus({ rpc } as never, 'q1', 'lost', { lostReason: ' Precio ' });
    expect(rpc.mock.calls).toEqual([
      [
        'admin_set_quote_status',
        { id: 'q1', to_status: 'quoted', note: 'Enviada', lost_reason: undefined },
      ],
      ['admin_set_quote_status', { id: 'q1', to_status: 'lost', note: '', lost_reason: 'Precio' }],
    ]);
  });
});
