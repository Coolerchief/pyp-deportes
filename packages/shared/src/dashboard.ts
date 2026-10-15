// Panel home (UI/UX §9): the shape admin_dashboard_stats() returns (BACKEND-SCHEMA §8) and the
// state of the last publish. Validated so a change in the database shows up as an error instead
// of empty cards.

import { z } from 'zod';
import { PUBLISH_STATUSES, QUOTE_STATUSES } from './labels.ts';

const count = z.number().int().nonnegative();

export const DashboardStatsSchema = z.object({
  newCount: count,
  last7Days: count,
  last30Days: count,
  byStatus: z.object(
    Object.fromEntries(QUOTE_STATUSES.map((status) => [status, count])) as Record<
      (typeof QUOTE_STATUSES)[number],
      typeof count
    >,
  ),
  productsWithoutPhoto: count,
  topProducts: z.array(
    z.object({
      productId: z.string(),
      name: z.string(),
      sku: z.string(),
      pieces: count,
      requests: count,
    }),
  ),
});
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;

export const LastPublishSchema = z.object({
  status: z.enum(PUBLISH_STATUSES),
  reason: z.string(),
  created_at: z.string(),
  finished_at: z.string().nullable(),
  error: z.string().nullable(),
  run_url: z.string().nullable(),
});
export type LastPublish = z.infer<typeof LastPublishSchema>;

export type PublishSummary = {
  /** Something public changed after the last successful publish. */
  pending: boolean;
  last: LastPublish | null;
};

export type PublishTone = 'ok' | 'pending' | 'working' | 'failed';

/** What the "Cambios sin publicar" card says, from the most urgent case down. */
export function publishTone({ pending, last }: PublishSummary): PublishTone {
  if (last?.status === 'queued' || last?.status === 'running') return 'working';
  if (last?.status === 'failed') return 'failed';
  return pending ? 'pending' : 'ok';
}
