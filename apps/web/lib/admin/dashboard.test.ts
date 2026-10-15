import { describe, expect, it } from 'vitest';
import { fetchDashboard, formatDateTime, plural } from './dashboard';

const STATS = {
  newCount: 3,
  last7Days: 5,
  last30Days: 12,
  byStatus: { new: 3, in_progress: 2, quoted: 4, won: 2, lost: 1 },
  productsWithoutPhoto: 56,
  topProducts: [
    { productId: 'p1', name: 'Balón de Fútbol No. 5', sku: 'BAL-001', pieces: 40, requests: 2 },
  ],
};

const RUN = {
  status: 'success',
  reason: 'manual',
  created_at: '2026-10-14T16:00:00Z',
  finished_at: '2026-10-14T16:03:00Z',
  error: null,
  run_url: null,
};

type Result = { data: unknown; error: unknown };

function fakeClient(results: { stats: Result; pending: Result; last: Result }) {
  const calls: unknown[][] = [];
  const query = {
    select: (...a: unknown[]) => (calls.push(['select', ...a]), query),
    order: (...a: unknown[]) => (calls.push(['order', ...a]), query),
    limit: (...a: unknown[]) => (calls.push(['limit', ...a]), query),
    maybeSingle: async () => results.last,
  };
  const client = {
    rpc: async (name: string) => {
      calls.push(['rpc', name]);
      return name === 'admin_dashboard_stats' ? results.stats : results.pending;
    },
    from: (table: string) => (calls.push(['from', table]), query),
  };
  return { client: client as never, calls };
}

const ok = (data: unknown): Result => ({ data, error: null });

describe('fetchDashboard', () => {
  it('reads the stats, the pending changes and the last publish', async () => {
    const { client, calls } = fakeClient({
      stats: ok(STATS),
      pending: ok(true),
      last: ok(RUN),
    });
    expect(await fetchDashboard(client)).toEqual({
      stats: STATS,
      publish: { pending: true, last: RUN },
    });
    expect(calls).toEqual([
      ['rpc', 'admin_dashboard_stats'],
      ['rpc', 'has_unpublished_changes'],
      ['from', 'publish_runs'],
      ['select', 'status, reason, created_at, finished_at, error, run_url'],
      ['order', 'created_at', { ascending: false }],
      ['limit', 1],
    ]);
  });

  it('works before the first publish', async () => {
    const { client } = fakeClient({ stats: ok(STATS), pending: ok(true), last: ok(null) });
    expect((await fetchDashboard(client)).publish).toEqual({ pending: true, last: null });
  });

  it('fails when any request fails or the stats change shape', async () => {
    const failed = { data: null, error: new Error('red') };
    await expect(
      fetchDashboard(fakeClient({ stats: ok(STATS), pending: failed, last: ok(null) }).client),
    ).rejects.toThrow('red');
    await expect(
      fetchDashboard(
        fakeClient({ stats: ok({ newCount: 1 }), pending: ok(false), last: ok(null) }).client,
      ),
    ).rejects.toThrow();
  });
});

describe('formatting', () => {
  it('writes dates in Mexico City time', () => {
    expect(formatDateTime('2026-10-14T16:03:00Z')).toBe('14 oct, 10:03');
  });

  it('pluralizes counts', () => {
    expect(plural(1, 'pieza', 'piezas')).toBe('1 pieza');
    expect(plural(1200, 'pieza', 'piezas')).toBe('1,200 piezas');
  });
});
