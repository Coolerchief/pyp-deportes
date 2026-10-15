'use client';

import {
  customerTypeLabels,
  deliveryMethodLabels,
  formatPhone,
  type QuoteStatus,
  quoteStatusLabels,
  quoteStatusTransitions,
  requestChatMessage,
  telUrl,
  whatsappUrl,
} from '@pyp/shared';
import { ArrowLeft, CircleAlert, CircleCheck, Phone, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { WhatsAppGlyph } from '@/components/layout/WhatsAppGlyph';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDateTime } from '@/lib/admin/dashboard';
import { PRODUCTS_ROUTES } from '@/lib/admin/products';
import {
  fetchRequest,
  type RequestDetail,
  REQUESTS_ROUTES,
  setRequestNote,
  setRequestStatus,
  staffNames,
} from '@/lib/admin/requests';
import { getSupabase } from '@/lib/supabase/browser';
import { useAdminSession } from '../AdminGate';
import { Button, buttonVariants } from '../ui/button';
import { Card, CardTitle } from '../ui/card';
import { cn } from '../ui/cn';
import { formatCalendarDate, RequestStatusBadge } from './RequestStatusBadge';

/** What each transition button says (Schema §4.5). */
const ACTION: Record<QuoteStatus, string> = {
  new: 'Nueva',
  in_progress: 'En atención',
  quoted: 'Cotizada',
  won: 'Ganada',
  lost: 'Perdida',
};

type Notice = { tone: 'ok' | 'error'; text: string };

function NoticeLine({ notice }: { notice: Notice }) {
  const Icon = notice.tone === 'error' ? CircleAlert : CircleCheck;
  return (
    <p
      role={notice.tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'type-small flex items-start gap-2 font-medium',
        notice.tone === 'error' ? 'text-rojo-profundo' : 'text-noche',
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn('mt-0.5 size-4 shrink-0', notice.tone === 'ok' && 'text-exito')}
      />
      {notice.text}
    </p>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="type-caption text-grafito-suave">{label}</dt>
      <dd className="type-body text-noche break-words">{children}</dd>
    </div>
  );
}

const TEXTAREA =
  'type-body text-noche border-borde-control focus:border-noche focus:outline-lima w-full min-h-24 resize-y rounded-sm border bg-blanco p-3 focus:shadow-[0_0_0_4px_var(--color-noche)] focus:outline-3 focus:outline-offset-0';

/** The status card: one tap per allowed transition; "Perdida" asks for the reason. */
function StatusCard({
  request,
  onChanged,
  names,
}: {
  request: RequestDetail;
  onChanged: () => Promise<void>;
  names: Map<string, string>;
}) {
  const { staff } = useAdminSession();
  const [target, setTarget] = useState<QuoteStatus | null>(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const next = quoteStatusTransitions[request.status];

  async function change(to: QuoteStatus) {
    const supabase = getSupabase();
    if (!supabase) return;
    if (to === 'lost' && !reason.trim()) {
      setNotice({ tone: 'error', text: 'Escribe el motivo para marcarla como perdida.' });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await setRequestStatus(supabase, request.id, to, { note, lostReason: reason });
      await onChanged();
      setTarget(null);
      setReason('');
      setNote('');
      setNotice({ tone: 'ok', text: `Ahora está ${quoteStatusLabels[to].toLowerCase()}.` });
    } catch (error) {
      const message = (error as { message?: string }).message;
      setNotice({
        tone: 'error',
        text:
          (error as { code?: string }).code === '23514' && message
            ? message
            : 'No pudimos cambiar el estado. Inténtalo de nuevo.',
      });
    } finally {
      setBusy(false);
    }
  }

  const who = (id: string | null) =>
    !id ? 'el sitio' : id === staff.userId ? 'ti' : (names.get(id) ?? 'otra persona del equipo');

  return (
    <Card className="gap-4">
      <CardTitle>Estado</CardTitle>
      <p className="flex flex-wrap items-center gap-2">
        <RequestStatusBadge status={request.status} />
        {request.status === 'lost' && request.lostReason && (
          <span className="type-small text-grafito">Motivo: {request.lostReason}</span>
        )}
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Cambiar estado">
        {next.map((status) => (
          <Button
            key={status}
            variant={status === 'lost' ? 'outline' : 'default'}
            size="sm"
            disabled={busy}
            aria-pressed={target === status}
            onClick={() => (status === 'lost' ? setTarget('lost') : void change(status))}
          >
            {status === 'lost' ? 'Marcar como perdida' : `Pasar a ${ACTION[status].toLowerCase()}`}
          </Button>
        ))}
      </div>
      {target === 'lost' && (
        <div className="border-linea flex flex-col gap-2 rounded-sm border p-3">
          <label htmlFor="motivo-perdida" className="type-small text-noche font-semibold">
            Motivo *
          </label>
          <input
            id="motivo-perdida"
            value={reason}
            maxLength={200}
            placeholder="Precio, tiempo de entrega, ya compró en otro lado…"
            onChange={(event) => setReason(event.target.value)}
            className="type-body text-noche border-borde-control focus:border-noche focus:outline-lima h-12 w-full rounded-sm border bg-blanco px-3 focus:outline-3 focus:outline-offset-0"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              loading={busy}
              loadingText="Guardando…"
              onClick={() => void change('lost')}
            >
              Marcar como perdida
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setTarget(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
      <label className="type-small text-noche flex flex-col gap-1 font-semibold">
        Nota del cambio (opcional)
        <input
          value={note}
          maxLength={300}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Por ejemplo: le mandamos la cotización por WhatsApp"
          className="type-body text-noche border-borde-control focus:border-noche focus:outline-lima h-12 w-full rounded-sm border bg-blanco px-3 font-normal focus:outline-3 focus:outline-offset-0"
        />
      </label>
      {notice && <NoticeLine notice={notice} />}
      <div className="flex flex-col gap-2">
        <h3 className="type-small text-noche font-semibold">Historial</h3>
        <ol className="flex flex-col gap-2">
          {request.history.map((entry) => (
            <li key={entry.id} className="type-small text-grafito border-linea border-l-2 pl-3">
              <span className="text-noche font-semibold">
                {entry.fromStatus
                  ? `${quoteStatusLabels[entry.fromStatus]} → ${quoteStatusLabels[entry.toStatus]}`
                  : `Llegó como ${quoteStatusLabels[entry.toStatus].toLowerCase()}`}
              </span>{' '}
              · {formatDateTime(entry.createdAt)} · por {who(entry.changedBy)}
              {entry.note && <span className="block">“{entry.note}”</span>}
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}

function NoteCard({ request, onSaved }: { request: RequestDetail; onSaved: () => Promise<void> }) {
  const [value, setValue] = useState(request.internalNote);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  async function save() {
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setNotice(null);
    try {
      await setRequestNote(supabase, request.id, value);
      await onSaved();
      setNotice({ tone: 'ok', text: 'Nota guardada.' });
    } catch {
      setNotice({ tone: 'error', text: 'No pudimos guardar la nota. Inténtalo de nuevo.' });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="gap-3">
      <CardTitle>
        <label htmlFor="nota-interna">Nota interna</label>
      </CardTitle>
      <p className="type-small text-grafito">Solo la ve el equipo; el cliente nunca la recibe.</p>
      <textarea
        id="nota-interna"
        value={value}
        maxLength={2000}
        onChange={(event) => {
          setValue(event.target.value);
          setNotice(null);
        }}
        className={TEXTAREA}
      />
      {notice && <NoticeLine notice={notice} />}
      <Button
        variant="outline"
        className="self-start"
        disabled={value.trim() === request.internalNote}
        loading={busy}
        loadingText="Guardando…"
        onClick={() => void save()}
      >
        Guardar nota
      </Button>
    </Card>
  );
}

type PageState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'missing' }
  | { status: 'ready'; request: RequestDetail; names: Map<string, string> };

/** /admin/solicitudes/detalle?id=… (UI/UX §9, APP-FLOW §8.4). */
export function RequestDetailPage() {
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  const [state, setState] = useState<PageState>({ status: 'loading' });

  const load = useCallback(async () => {
    const supabase = getSupabase();
    try {
      if (!supabase) throw new Error('Sin Supabase');
      const [request, names] = await Promise.all([
        fetchRequest(supabase, id),
        staffNames(supabase),
      ]);
      setState(request ? { status: 'ready', request, names } : { status: 'missing' });
    } catch {
      setState({ status: 'error' });
    }
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const back = (
    <Link
      href={REQUESTS_ROUTES.list}
      className="type-small text-noche inline-flex items-center gap-1 self-start font-semibold underline-offset-4 hover:underline"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Solicitudes
    </Link>
  );

  if (state.status === 'loading') {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="sr-only">
          Cargando solicitud…
        </p>
        {back}
        <Skeleton tone="linea" className="h-10 w-1/2 rounded-sm" />
        <Skeleton tone="linea" className="h-64 rounded-sm" />
      </div>
    );
  }
  if (state.status === 'missing') {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <Card className="items-start">
          <h1 className="type-h3 text-noche">No encontramos esta solicitud</h1>
          <p className="type-body text-grafito">Quizá el enlace está incompleto.</p>
        </Card>
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <Card role="alert" className="items-start">
          <p className="type-body-strong text-rojo-profundo flex items-start gap-2">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            No pudimos cargar la solicitud. Revisa tu conexión e inténtalo de nuevo.
          </p>
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw aria-hidden="true" />
            Reintentar
          </Button>
        </Card>
      </div>
    );
  }

  const { request, names } = state;
  const chat = whatsappUrl(
    request.customerPhone,
    requestChatMessage(request.customerName, request.folio),
  );

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        {back}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <h1 className="type-h2 text-noche">{request.folio}</h1>
            <p className="flex flex-wrap items-center gap-2">
              <RequestStatusBadge status={request.status} />
              <span className="type-small text-grafito">
                Llegó el {formatDateTime(request.createdAt)}
              </span>
            </p>
          </div>
          <a
            href={chat}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants(), 'bg-whatsapp text-noche hover:bg-whatsapp')}
          >
            <WhatsAppGlyph size={20} />
            Abrir chat
            <span className="sr-only">(WhatsApp, se abre en otra pestaña)</span>
          </a>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <Card className="gap-4">
            <CardTitle>Cliente</CardTitle>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label="Nombre">{request.customerName}</Field>
              <Field label="Teléfono">
                <a
                  href={telUrl(request.customerPhone)}
                  className="inline-flex items-center gap-1 underline underline-offset-4"
                >
                  <Phone aria-hidden="true" className="size-4" />
                  {formatPhone(request.customerPhone)}
                </a>
              </Field>
              <Field label="Tipo">{customerTypeLabels[request.customerType]}</Field>
              {request.organization && <Field label="Organización">{request.organization}</Field>}
              <Field label="Para cuándo">{formatCalendarDate(request.neededBy)}</Field>
              <Field label="Entrega">
                {deliveryMethodLabels[request.deliveryMethod]}
                {request.storeName && request.deliveryMethod === 'pickup'
                  ? ` (${request.storeName})`
                  : ''}
              </Field>
              <Field label="Factura">{request.requiresInvoice ? 'Sí la necesita' : 'No'}</Field>
            </dl>
            {request.note && (
              <div className="bg-gis rounded-sm p-3">
                <p className="type-caption text-grafito-suave">Nota del cliente</p>
                <p className="type-body text-noche whitespace-pre-line">{request.note}</p>
              </div>
            )}
          </Card>

          <Card className="gap-3">
            <CardTitle>
              Productos · {request.totalPieces.toLocaleString('es-MX')}{' '}
              {request.totalPieces === 1 ? 'pieza' : 'piezas'}
            </CardTitle>
            <ul className="divide-linea flex flex-col divide-y">
              {request.lines.map((line) => (
                <li key={line.lineNo} className="flex items-start gap-3 py-3">
                  <span className="type-small text-grafito-suave w-5 shrink-0 text-right tabular-nums">
                    {line.lineNo}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {line.productId ? (
                      <Link
                        href={PRODUCTS_ROUTES.edit(line.productId)}
                        className="type-body text-noche font-semibold underline-offset-4 hover:underline"
                      >
                        {line.productName}
                      </Link>
                    ) : (
                      <span className="type-body text-noche font-semibold">{line.productName}</span>
                    )}
                    <span className="type-caption text-grafito-suave">
                      {line.sku}
                      {line.variantLabel ? ` · ${line.variantLabel}` : ''}
                      {line.personalize ? ' · Personalizar' : ''}
                    </span>
                    {line.notes && <span className="type-small text-grafito">“{line.notes}”</span>}
                  </div>
                  <span className="type-body text-noche shrink-0 font-semibold tabular-nums">
                    {line.quantity.toLocaleString('es-MX')}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <StatusCard request={request} onChanged={load} names={names} />
          <NoteCard request={request} onSaved={load} />
        </div>
      </div>
    </div>
  );
}
