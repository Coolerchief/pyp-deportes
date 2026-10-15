import {
  BUSINESS_TIME_ZONE,
  type Database,
  type DashboardStats,
  DashboardStatsSchema,
  LastPublishSchema,
  type PublishSummary,
} from '@pyp/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

// Panel home data (UI/UX §9): admin_dashboard_stats(), has_unpublished_changes() and the last
// row of publish_runs. Three requests in parallel; any failure shows one error with "Reintentar".

export type Dashboard = { stats: DashboardStats; publish: PublishSummary };

export async function fetchDashboard(supabase: SupabaseClient<Database>): Promise<Dashboard> {
  const [stats, pending, last] = await Promise.all([
    supabase.rpc('admin_dashboard_stats'),
    supabase.rpc('has_unpublished_changes'),
    supabase
      .from('publish_runs')
      .select('status, reason, created_at, finished_at, error, run_url')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const error = stats.error ?? pending.error ?? last.error;
  if (error) throw error;
  return {
    stats: DashboardStatsSchema.parse(stats.data),
    publish: {
      pending: pending.data === true,
      last: last.data ? LastPublishSchema.parse(last.data) : null,
    },
  };
}

const dateTimeFormat = new Intl.DateTimeFormat('es-MX', {
  timeZone: BUSINESS_TIME_ZONE,
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** "14 oct, 10:32" in Mexico City time. */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso)).replace('.', '');
}

/** "1 solicitud", "3 solicitudes". */
export function plural(count: number, one: string, many: string): string {
  return `${count.toLocaleString('es-MX')} ${count === 1 ? one : many}`;
}
