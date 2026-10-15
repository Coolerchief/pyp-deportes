'use client';

import {
  customerTypeLabels,
  periodRange,
  QUOTE_STATUSES,
  type QuoteStatus,
  quoteStatusLabels,
  REQUEST_PERIODS,
  requestPeriodLabels,
  requestsCsv,
} from '@pyp/shared';
import { CircleAlert, Download, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDateTime } from '@/lib/admin/dashboard';
import { downloadText } from '@/lib/admin/importer';
import {
  countByStatus,
  exportRequests,
  filtersRange,
  listRequests,
  readRequestFilters,
  type RequestFilters,
  requestFiltersQuery,
  type RequestRow,
  REQUESTS_PAGE_SIZE,
  REQUESTS_ROUTES,
} from '@/lib/admin/requests';
import { getSupabase } from '@/lib/supabase/browser';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { cn } from '../ui/cn';
import { SelectField } from '../ui/select';
import { formatCalendarDate, RequestStatusBadge } from './RequestStatusBadge';

type ListState =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready';
      rows: RequestRow[];
      total: number;
      counts: Record<QuoteStatus, number>;
    };

const DATE_INPUT =
  'type-body text-noche border-borde-control focus:border-noche focus:outline-lima h-12 w-full rounded-sm border bg-blanco px-3 focus:shadow-[0_0_0_4px_var(--color-noche)] focus:outline-3 focus:outline-offset-0';

function periodText(filters: RequestFilters): string {
  if (filters.period !== 'rango') return requestPeriodLabels[filters.period];
  const { from, to } = filtersRange(filters);
  if (from && to) return `Del ${formatCalendarDate(from)} al ${formatCalendarDate(to)}`;
  if (from) return `Desde el ${formatCalendarDate(from)}`;
  return to ? `Hasta el ${formatCalendarDate(to)}` : 'Todo';
}

const plural = (n: number, one: string, many: string) =>
  `${n.toLocaleString('es-MX')} ${n === 1 ? one : many}`;

/**
 * /admin/solicitudes (UI/UX §9, APP-FLOW §8.4): the requests by date, filters by status, period
 * and search (folio, name or phone) kept in the URL, the count of each status for the period
 * and "Exportar CSV" with the filters applied.
 */
export function RequestsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const query = params.toString();
  const filters = useMemo(() => readRequestFilters(new URLSearchParams(query)), [query]);
  const [state, setState] = useState<ListState>({ status: 'loading' });
  const [search, setSearch] = useState(filters.q);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    try {
      if (!supabase) throw new Error('Sin Supabase');
      const [list, counts] = await Promise.all([
        listRequests(supabase, filters),
        countByStatus(supabase, filters),
      ]);
      setState({ status: 'ready', ...list, counts });
    } catch {
      setState({ status: 'error' });
    }
  }, [filters]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load, attempt]);

  function go(next: Partial<RequestFilters>) {
    const target = requestFiltersQuery({ ...filters, page: 1, ...next });
    if (target === requestFiltersQuery(filters)) return;
    setState({ status: 'loading' });
    router.replace(`${pathname}${target}`);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    go({ q: search.trim() });
  }

  async function exportCsv() {
    const supabase = getSupabase();
    if (!supabase) return;
    setExporting(true);
    setExportError(false);
    try {
      const rows = await exportRequests(supabase, filters);
      downloadText('solicitudes.csv', requestsCsv(rows));
    } catch {
      setExportError(true);
    } finally {
      setExporting(false);
    }
  }

  const from = (filters.page - 1) * REQUESTS_PAGE_SIZE;
  const ready = state.status === 'ready' ? state : null;
  const periodTotal = ready ? QUOTE_STATUSES.reduce((sum, s) => sum + ready.counts[s], 0) : 0;
  const range = filtersRange(filters);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="type-h2 text-noche">Solicitudes</h1>
        <Button
          variant="outline"
          size="sm"
          loading={exporting}
          loadingText="Exportando…"
          disabled={!ready || ready.total === 0}
          onClick={() => void exportCsv()}
        >
          <Download aria-hidden="true" />
          Exportar CSV
        </Button>
      </header>
      {exportError && (
        <p
          role="alert"
          className="type-small text-rojo-profundo flex items-start gap-2 font-medium"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          No pudimos exportar. Revisa tu conexión e inténtalo de nuevo.
        </p>
      )}

      <Card className="gap-4">
        <form role="search" onSubmit={submitSearch} className="flex gap-2">
          <label htmlFor="buscar-solicitud" className="sr-only">
            Buscar por folio, nombre o teléfono
          </label>
          <input
            id="buscar-solicitud"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Folio, nombre o teléfono"
            className="type-body text-noche border-borde-control placeholder:text-grafito-suave focus:border-noche focus:outline-lima h-12 min-w-0 flex-1 rounded-sm border bg-blanco px-3 focus:shadow-[0_0_0_4px_var(--color-noche)] focus:outline-3 focus:outline-offset-0"
          />
          <Button type="submit" aria-label="Buscar" className="px-4">
            <Search aria-hidden="true" />
            <span className="hidden sm:inline">Buscar</span>
          </Button>
        </form>
        <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
          <SelectField
            label="Periodo"
            value={filters.period}
            options={[
              ...REQUEST_PERIODS.map((p) => ({ value: p, label: requestPeriodLabels[p] })),
              { value: 'rango', label: 'Elegir fechas…' },
            ]}
            onChange={(event) => {
              const value = event.target.value as RequestFilters['period'];
              if (value === 'rango') {
                // Start from the current period so the range is never empty.
                const current = periodRange(
                  filters.period === 'rango' || filters.period === 'todo' ? 'mes' : filters.period,
                );
                const today = periodRange('hoy').to!;
                go({ period: 'rango', from: current.from ?? today, to: current.to ?? today });
              } else go({ period: value, from: '', to: '' });
            }}
          />
          {filters.period === 'rango' && (
            <>
              <label className="type-small text-noche flex flex-col gap-1 font-semibold">
                Desde
                <input
                  type="date"
                  value={filters.from}
                  max={filters.to || undefined}
                  onChange={(event) => go({ period: 'rango', from: event.target.value })}
                  className={DATE_INPUT}
                />
              </label>
              <label className="type-small text-noche flex flex-col gap-1 font-semibold">
                Hasta
                <input
                  type="date"
                  value={filters.to}
                  min={filters.from || undefined}
                  onChange={(event) => go({ period: 'rango', to: event.target.value })}
                  className={DATE_INPUT}
                />
              </label>
            </>
          )}
        </div>
        <div role="group" aria-label="Estado" className="flex flex-wrap gap-2">
          {(['', ...QUOTE_STATUSES] as const).map((status) => {
            const active = filters.status === status;
            const count = ready ? (status ? ready.counts[status] : periodTotal) : null;
            return (
              <button
                key={status || 'todas'}
                type="button"
                aria-pressed={active}
                aria-label={`${status ? quoteStatusLabels[status] : 'Todas'}${count !== null ? ` (${count})` : ''}`}
                onClick={() => go({ status })}
                className={cn(
                  'type-small inline-flex h-10 items-center gap-2 rounded-sm border px-3 font-semibold',
                  active
                    ? 'bg-noche text-blanco border-noche'
                    : 'border-borde-control text-noche hover:bg-gis bg-blanco',
                )}
              >
                {status ? quoteStatusLabels[status] : 'Todas'}
                {count !== null && (
                  <span className="tabular-nums">{count.toLocaleString('es-MX')}</span>
                )}
              </button>
            );
          })}
        </div>
        {ready && (
          <p className="type-body text-noche" aria-live="polite">
            <strong>{periodText(filters)}:</strong>{' '}
            {plural(periodTotal, 'solicitud', 'solicitudes')} ·{' '}
            {plural(ready.counts.won, 'ganada', 'ganadas')}
            {periodTotal > 0 && ` (${Math.round((ready.counts.won / periodTotal) * 100)} %)`}
            {filters.q && ` con “${filters.q}”`}.
          </p>
        )}
      </Card>

      {state.status === 'loading' && (
        <>
          <p role="status" className="sr-only">
            Cargando solicitudes…
          </p>
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((key) => (
              <Skeleton key={key} tone="linea" className="h-20 rounded-sm" />
            ))}
          </div>
        </>
      )}

      {state.status === 'error' && (
        <Card role="alert" className="items-start">
          <p className="type-body-strong text-rojo-profundo flex items-start gap-2">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            No pudimos cargar las solicitudes. Revisa tu conexión e inténtalo de nuevo.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setState({ status: 'loading' });
              setAttempt((n) => n + 1);
            }}
          >
            <RefreshCw aria-hidden="true" />
            Reintentar
          </Button>
        </Card>
      )}

      {ready && ready.rows.length === 0 && (
        <Card className="items-start">
          <p className="type-body-strong text-noche">
            {filters.status || filters.q || range.from || range.to
              ? 'Ninguna solicitud con estos filtros'
              : 'Aún no hay solicitudes'}
          </p>
          <p className="type-body text-grafito">
            Las solicitudes llegan cuando alguien envía su lista desde el sitio.
          </p>
          {(filters.status || filters.q || filters.period !== 'todo') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearch('');
                go({ status: '', q: '', period: 'todo', from: '', to: '' });
              }}
            >
              Ver todas
            </Button>
          )}
        </Card>
      )}

      {ready && ready.rows.length > 0 && (
        <>
          <ul className="flex flex-col gap-2 lg:hidden">
            {ready.rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={REQUESTS_ROUTES.detail(row.id)}
                  className="border-linea shadow-card hover:border-borde-control flex flex-col gap-1 rounded-sm border bg-blanco p-3"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="type-body-strong text-noche">{row.folio}</span>
                    <RequestStatusBadge status={row.status} />
                  </span>
                  <span className="type-body text-noche">
                    {row.customerName}
                    {row.organization ? ` · ${row.organization}` : ''}
                  </span>
                  <span className="type-caption text-grafito-suave">
                    {formatDateTime(row.createdAt)} · {plural(row.totalPieces, 'pieza', 'piezas')} ·
                    para el {formatCalendarDate(row.neededBy)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-linea shadow-card hidden overflow-hidden rounded-sm border bg-blanco lg:block">
            <table className="w-full text-left">
              <thead className="bg-gis type-small text-grafito">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Folio
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Fecha
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Cliente
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Tipo
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Piezas
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Para cuándo
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-linea divide-y">
                {ready.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gis">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={REQUESTS_ROUTES.detail(row.id)}
                        className="type-body text-noche font-semibold underline-offset-4 hover:underline"
                      >
                        {row.folio}
                      </Link>
                    </td>
                    <td className="type-small text-grafito px-4 py-3 whitespace-nowrap">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="type-body text-noche px-4 py-3">
                      {row.customerName}
                      {row.organization && (
                        <span className="type-small text-grafito-suave block">
                          {row.organization}
                        </span>
                      )}
                    </td>
                    <td className="type-small text-grafito px-4 py-3">
                      {customerTypeLabels[row.customerType]}
                    </td>
                    <td className="type-body text-noche px-4 py-3 text-right tabular-nums">
                      {row.totalPieces.toLocaleString('es-MX')}
                    </td>
                    <td className="type-small text-grafito px-4 py-3 whitespace-nowrap">
                      {formatCalendarDate(row.neededBy)}
                    </td>
                    <td className="px-4 py-3">
                      <RequestStatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ready.total > REQUESTS_PAGE_SIZE && (
            <nav aria-label="Páginas" className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page <= 1}
                onClick={() => go({ page: filters.page - 1 })}
              >
                Anterior
              </Button>
              <p className="type-small text-grafito">
                {from + 1}–{from + ready.rows.length} de {ready.total.toLocaleString('es-MX')}
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={from + ready.rows.length >= ready.total}
                onClick={() => go({ page: filters.page + 1 })}
              >
                Siguiente
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
