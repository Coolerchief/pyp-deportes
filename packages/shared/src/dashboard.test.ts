import { describe, expect, it } from 'vitest';
import {
  DashboardStatsSchema,
  type LastPublish,
  LastPublishSchema,
  publishTone,
} from './dashboard.ts';

const stats = {
  newCount: 3,
  last7Days: 5,
  last30Days: 12,
  byStatus: { new: 3, in_progress: 2, quoted: 4, won: 2, lost: 1 },
  productsWithoutPhoto: 56,
  topProducts: [
    { productId: 'p1', name: 'Balón de Fútbol No. 5', sku: 'BAL-001', pieces: 40, requests: 2 },
  ],
};

const run = (status: LastPublish['status']): LastPublish => ({
  status,
  reason: 'manual',
  created_at: '2026-10-14T16:00:00Z',
  finished_at: null,
  error: null,
  run_url: null,
});

describe('DashboardStatsSchema', () => {
  it('reads what admin_dashboard_stats returns', () => {
    expect(DashboardStatsSchema.parse(stats)).toEqual(stats);
  });

  it('rejects a missing status or a negative count', () => {
    const byStatus: Partial<typeof stats.byStatus> = { ...stats.byStatus };
    delete byStatus.lost;
    expect(DashboardStatsSchema.safeParse({ ...stats, byStatus }).success).toBe(false);
    expect(DashboardStatsSchema.safeParse({ ...stats, newCount: -1 }).success).toBe(false);
    expect(DashboardStatsSchema.safeParse(null).success).toBe(false);
  });

  it('reads a publish run', () => {
    expect(LastPublishSchema.parse(run('success')).status).toBe('success');
    expect(LastPublishSchema.safeParse({ ...run('success'), status: 'done' }).success).toBe(false);
  });
});

describe('publishTone', () => {
  it('puts a running or failed publish before the pending changes', () => {
    expect(publishTone({ pending: true, last: null })).toBe('pending');
    expect(publishTone({ pending: false, last: run('success') })).toBe('ok');
    expect(publishTone({ pending: true, last: run('success') })).toBe('pending');
    expect(publishTone({ pending: true, last: run('queued') })).toBe('working');
    expect(publishTone({ pending: false, last: run('running') })).toBe('working');
    expect(publishTone({ pending: false, last: run('failed') })).toBe('failed');
  });
});
