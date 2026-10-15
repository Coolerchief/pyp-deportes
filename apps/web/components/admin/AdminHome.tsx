'use client';

import {
  type DashboardStats,
  type PublishSummary,
  publishStatusLabels,
  publishTone,
  QUOTE_STATUSES,
  quoteStatusLabels,
} from '@pyp/shared';
import { ArrowRight, CircleAlert, CircleCheck, Clock, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { type Dashboard, fetchDashboard, formatDateTime, plural } from '@/lib/admin/dashboard';
import { getSupabase } from '@/lib/supabase/browser';
import { useAdminSession } from './AdminGate';
import { Button } from './ui/button';
import { Card, CardDescription, CardTitle } from './ui/card';
import { cn } from './ui/cn';

type HomeState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: Dashboard; refreshing: boolean };

const requestsHref = (status?: string) =>
  status ? `/admin/solicitudes?estado=${status}` : '/admin/solicitudes';

function MoreLink({ href, children, dark }: { href: string; children: ReactNode; dark?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'type-small mt-auto inline-flex items-center gap-1 self-start font-semibold underline-offset-4 hover:underline',
        dark ? 'text-blanco' : 'text-noche',
      )}
    >
      {children}
      <ArrowRight aria-hidden="true" className="size-4" />
    </Link>
  );
}

/** A count with its label; the number is the first thing the owner reads. */
function StatCard({
  title,
  value,
  note,
  link,
  dark = false,
}: {
  title: string;
  value: number;
  note: string;
  link?: { href: string; label: string };
  dark?: boolean;
}) {
  return (
    <Card className={dark ? 'bg-noche border-noche' : undefined}>
      <CardTitle className={dark ? 'text-blanco' : undefined}>{title}</CardTitle>
      <p className={cn('type-h1', dark ? 'text-lima' : 'text-noche')}>
        {value.toLocaleString('es-MX')}
      </p>
      <CardDescription className={dark ? 'text-blanco' : undefined}>{note}</CardDescription>
      {link && (
        <MoreLink href={link.href} dark={dark}>
          {link.label}
        </MoreLink>
      )}
    </Card>
  );
}

const toneView = {
  ok: { icon: CircleCheck, className: 'text-exito', text: 'Todo está publicado.' },
  pending: { icon: Clock, className: 'text-noche', text: 'Hay cambios sin publicar.' },
  working: {
    icon: null,
    className: 'text-noche',
    text: 'Publicando… se verá en el sitio en unos 3 minutos.',
  },
  failed: {
    icon: CircleAlert,
    className: 'text-rojo-profundo',
    text: 'La última publicación falló.',
  },
} as const;

/** "Cambios sin publicar" and the last build (UI/UX §9). The button works from T4.10. */
function PublishCard({ publish }: { publish: PublishSummary }) {
  const tone = publishTone(publish);
  const view = toneView[tone];
  const Icon = view.icon;
  const { last } = publish;
  return (
    <Card>
      <CardTitle>Publicación</CardTitle>
      <p className={cn('type-body-strong flex items-start gap-2', view.className)}>
        {Icon ? <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" /> : <Spinner />}
        {view.text}
      </p>
      {tone === 'failed' && publish.pending && (
        <CardDescription>Los cambios siguen sin llegar al sitio.</CardDescription>
      )}
      {tone === 'failed' && last?.error && (
        <CardDescription className="break-words">{last.error}</CardDescription>
      )}
      <CardDescription>
        {last
          ? `Última publicación: ${publishStatusLabels[last.status].toLowerCase()} · ${formatDateTime(last.finished_at ?? last.created_at)}`
          : 'Aún no hay publicaciones registradas.'}
      </CardDescription>
      <div className="mt-auto flex flex-col gap-2">
        <Button disabled aria-describedby="publicar-pronto" className="w-full">
          Publicar cambios
        </Button>
        <p id="publicar-pronto" className="type-caption text-grafito-suave">
          Publicar desde el panel estará disponible pronto.
        </p>
      </div>
    </Card>
  );
}

function StatusCard({ stats }: { stats: DashboardStats }) {
  const total = QUOTE_STATUSES.reduce((sum, status) => sum + stats.byStatus[status], 0);
  return (
    <Card>
      <CardTitle>Solicitudes por estado</CardTitle>
      <ul className="divide-linea flex flex-col divide-y">
        {QUOTE_STATUSES.map((status) => (
          <li key={status}>
            <Link
              href={requestsHref(status)}
              aria-label={`${quoteStatusLabels[status]}: ${stats.byStatus[status]}`}
              className="type-body hover:bg-gis flex h-11 items-center justify-between gap-3 px-1"
            >
              <span className="text-grafito">{quoteStatusLabels[status]}</span>
              <span className="text-noche font-semibold tabular-nums">
                {stats.byStatus[status].toLocaleString('es-MX')}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <CardDescription>
        {plural(total, 'solicitud en total', 'solicitudes en total')}
      </CardDescription>
    </Card>
  );
}

function TopProductsCard({ stats }: { stats: DashboardStats }) {
  return (
    <Card>
      <CardTitle>Lo más pedido</CardTitle>
      <CardDescription>Piezas solicitadas en los últimos 30 días.</CardDescription>
      {stats.topProducts.length === 0 ? (
        <p className="type-body text-grafito">Aún no hay solicitudes en los últimos 30 días.</p>
      ) : (
        <ol className="divide-linea flex flex-col divide-y">
          {stats.topProducts.map((product, index) => (
            <li key={product.productId} className="flex items-center gap-3 py-2">
              <span className="type-small text-grafito-suave w-5 shrink-0 text-right tabular-nums">
                {index + 1}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="type-body text-noche truncate font-medium">{product.name}</span>
                <span className="type-caption text-grafito-suave">{product.sku}</span>
              </span>
              <span className="type-small text-grafito shrink-0 text-right">
                <span className="text-noche block font-semibold">
                  {plural(product.pieces, 'pieza', 'piezas')}
                </span>
                {plural(product.requests, 'solicitud', 'solicitudes')}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function LoadingHome() {
  return (
    <>
      <p role="status" className="sr-only">
        Cargando el inicio…
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} tone="linea" className="h-44 rounded-sm" />
        ))}
      </div>
    </>
  );
}

/**
 * Panel home (UI/UX §9, T4.2): new requests, the week's, products without photo and the
 * publish state, then requests by status and the most requested products.
 */
export function AdminHome() {
  const { staff } = useAdminSession();
  const [state, setState] = useState<HomeState>({ status: 'loading' });

  const load = useCallback(async () => {
    const supabase = getSupabase();
    try {
      if (!supabase) throw new Error('Sin Supabase');
      const data = await fetchDashboard(supabase);
      setState({ status: 'ready', data, refreshing: false });
    } catch {
      setState({ status: 'error' });
    }
  }, []);

  useEffect(() => {
    // Async so the state never changes during the effect itself.
    void Promise.resolve().then(load);
  }, [load]);

  function refresh() {
    setState((current) =>
      current.status === 'ready' ? { ...current, refreshing: true } : { status: 'loading' },
    );
    void load();
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="type-eyebrow text-grafito-suave">Inicio</p>
          <h1 className="type-h2 text-noche">Hola, {staff.fullName}</h1>
        </div>
        {state.status === 'ready' && (
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            loading={state.refreshing}
            loadingText="Actualizando…"
          >
            <RefreshCw aria-hidden="true" />
            Actualizar
          </Button>
        )}
      </header>

      {state.status === 'loading' && <LoadingHome />}

      {state.status === 'error' && (
        <Card role="alert" className="items-start">
          <p className="type-body-strong text-rojo-profundo flex items-start gap-2">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            No pudimos cargar el inicio. Revisa tu conexión e inténtalo de nuevo.
          </p>
          <Button variant="outline" onClick={refresh}>
            <RefreshCw aria-hidden="true" />
            Reintentar
          </Button>
        </Card>
      )}

      {state.status === 'ready' && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              dark
              title="Solicitudes nuevas"
              value={state.data.stats.newCount}
              note={state.data.stats.newCount === 0 ? 'Ninguna esperando.' : 'Esperan respuesta.'}
              link={{ href: requestsHref('new'), label: 'Ver nuevas' }}
            />
            <StatCard
              title="Esta semana"
              value={state.data.stats.last7Days}
              note={`Solicitudes de los últimos 7 días. En 30 días: ${state.data.stats.last30Days.toLocaleString('es-MX')}.`}
              link={{ href: requestsHref(), label: 'Ver solicitudes' }}
            />
            <StatCard
              title="Productos sin foto"
              value={state.data.stats.productsWithoutPhoto}
              note="Borradores y publicados, sin contar los archivados."
              link={{ href: '/admin/productos?foto=sin', label: 'Ver productos' }}
            />
            <PublishCard publish={state.data.publish} />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <StatusCard stats={state.data.stats} />
            <TopProductsCard stats={state.data.stats} />
          </div>
        </>
      )}
    </div>
  );
}
