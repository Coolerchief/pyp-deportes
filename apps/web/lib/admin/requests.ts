import {
  type CustomerType,
  type Database,
  type DateRange,
  type DeliveryMethod,
  isIsoDate,
  periodRange,
  QUOTE_STATUSES,
  type QuoteStatus,
  rangeBounds,
  REQUEST_PERIODS,
  type RequestCsvRow,
  type RequestPeriod,
} from '@pyp/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

// Requests inbox (T4.7, APP-FLOW §8.4). Staff read quote_requests, their lines and history
// through RLS; status and the internal note change only through admin_set_quote_status and
// admin_set_quote_note.

type Client = SupabaseClient<Database>;

export const REQUESTS_PAGE_SIZE = 50;

export const REQUESTS_ROUTES = {
  list: '/admin/solicitudes',
  detail: (id: string) => `/admin/solicitudes/detalle?id=${encodeURIComponent(id)}`,
} as const;

// Filters in the URL -------------------------------------------------------------------------

/** ?estado=&periodo=&desde=&hasta=&q=&pagina= of /admin/solicitudes. */
export type RequestFilters = {
  status: QuoteStatus | '';
  /** A named period, or 'rango' with `from`/`to`. */
  period: RequestPeriod | 'rango';
  from: string;
  to: string;
  q: string;
  page: number;
};

export function readRequestFilters(params: URLSearchParams): RequestFilters {
  const status = params.get('estado') ?? '';
  const period = params.get('periodo') ?? '';
  const from = params.get('desde') ?? '';
  const to = params.get('hasta') ?? '';
  const page = Number(params.get('pagina'));
  const custom = isIsoDate(from) || isIsoDate(to);
  return {
    status: (QUOTE_STATUSES as readonly string[]).includes(status) ? (status as QuoteStatus) : '',
    period: custom
      ? 'rango'
      : (REQUEST_PERIODS as readonly string[]).includes(period)
        ? (period as RequestPeriod)
        : 'todo',
    from: isIsoDate(from) ? from : '',
    to: isIsoDate(to) ? to : '',
    q: (params.get('q') ?? '').trim(),
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

export function requestFiltersQuery(filters: Partial<RequestFilters>): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('estado', filters.status);
  if (filters.period === 'rango') {
    if (filters.from) params.set('desde', filters.from);
    if (filters.to) params.set('hasta', filters.to);
  } else if (filters.period && filters.period !== 'todo') params.set('periodo', filters.period);
  if (filters.q) params.set('q', filters.q);
  if (filters.page && filters.page > 1) params.set('pagina', String(filters.page));
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function filtersRange(filters: RequestFilters, now: Date = new Date()): DateRange {
  return filters.period === 'rango'
    ? { from: filters.from || null, to: filters.to || null }
    : periodRange(filters.period, now);
}

/** PostgREST or() for folio, name or phone; null when there is nothing to search. */
export function searchFilter(q: string): string | null {
  const clean = q.replace(/[%*,()"\\]/g, ' ').trim();
  if (!clean) return null;
  const digits = clean.replace(/\D/g, '');
  const parts = [`folio.ilike.*${clean}*`, `customer_name.ilike.*${clean}*`];
  if (digits.length >= 3) parts.push(`customer_phone.like.*${digits}*`);
  return parts.join(',');
}

// List -----------------------------------------------------------------------------------------

export type RequestRow = {
  id: string;
  folio: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerType: CustomerType;
  organization: string | null;
  totalPieces: number;
  status: QuoteStatus;
  neededBy: string;
};

type Filterable<Q> = {
  eq(column: string, value: string): Q;
  gte(column: string, value: string): Q;
  lt(column: string, value: string): Q;
  or(filter: string): Q;
};

/** The date range and search of the filters (status apart, so the counts can leave it out). */
function applyCommon<Q extends Filterable<Q>>(query: Q, filters: RequestFilters, now: Date): Q {
  const { gte, lt } = rangeBounds(filtersRange(filters, now));
  let q = query;
  if (gte) q = q.gte('created_at', gte);
  if (lt) q = q.lt('created_at', lt);
  const search = searchFilter(filters.q);
  if (search) q = q.or(search);
  return q;
}

export async function listRequests(
  supabase: Client,
  filters: RequestFilters,
  now: Date = new Date(),
): Promise<{ rows: RequestRow[]; total: number }> {
  let query = supabase
    .from('quote_requests')
    .select(
      'id, folio, created_at, customer_name, customer_phone, customer_type, organization, total_pieces, status, needed_by',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range((filters.page - 1) * REQUESTS_PAGE_SIZE, filters.page * REQUESTS_PAGE_SIZE - 1);
  query = applyCommon(query, filters, now);
  if (filters.status) query = query.eq('status', filters.status);
  const { data, error, count } = await query;
  if (error) throw error;
  return {
    total: count ?? 0,
    rows: (data ?? []).map((row) => ({
      id: row.id,
      folio: row.folio,
      createdAt: row.created_at,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      customerType: row.customer_type,
      organization: row.organization,
      totalPieces: row.total_pieces,
      status: row.status,
      neededBy: row.needed_by,
    })),
  };
}

/**
 * Requests of the period and search by status (without the status filter): "¿cuántas
 * solicitudes tuvimos este mes y cuántas ganamos?".
 */
export async function countByStatus(
  supabase: Client,
  filters: RequestFilters,
  now: Date = new Date(),
): Promise<Record<QuoteStatus, number>> {
  const counts = await Promise.all(
    QUOTE_STATUSES.map(async (status) => {
      const query = applyCommon(
        supabase.from('quote_requests').select('id', { count: 'exact', head: true }),
        filters,
        now,
      ).eq('status', status);
      const { count, error } = await query;
      if (error) throw error;
      return [status, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(counts) as Record<QuoteStatus, number>;
}

/** Every request of the filters, for "Exportar CSV" (read 1000 at a time). */
export async function exportRequests(
  supabase: Client,
  filters: RequestFilters,
  now: Date = new Date(),
): Promise<RequestCsvRow[]> {
  const rows: RequestCsvRow[] = [];
  for (let from = 0; ; from += 1000) {
    let query = supabase
      .from('quote_requests')
      .select(
        'folio, created_at, status, customer_name, customer_phone, customer_type, organization, total_pieces, needed_by, delivery_method, requires_invoice, note, lost_reason, internal_note',
      )
      .order('created_at', { ascending: false })
      .range(from, from + 999);
    query = applyCommon(query, filters, now);
    if (filters.status) query = query.eq('status', filters.status);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...((data ?? []) as RequestCsvRow[]));
    if (!data || data.length < 1000) return rows;
  }
}

// One request ----------------------------------------------------------------------------------

export type RequestLine = {
  lineNo: number;
  productId: string | null;
  productName: string;
  sku: string;
  variantLabel: string | null;
  quantity: number;
  personalize: boolean;
  notes: string;
};

export type RequestHistory = {
  id: number;
  fromStatus: QuoteStatus | null;
  toStatus: QuoteStatus;
  changedBy: string | null;
  note: string;
  createdAt: string;
};

export type RequestDetail = RequestRow & {
  deliveryMethod: DeliveryMethod;
  storeName: string | null;
  requiresInvoice: boolean;
  note: string;
  lostReason: string | null;
  internalNote: string;
  lines: RequestLine[];
  history: RequestHistory[];
};

export async function fetchRequest(supabase: Client, id: string): Promise<RequestDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await supabase
    .from('quote_requests')
    .select(
      `id, folio, created_at, customer_name, customer_phone, customer_type, organization,
       total_pieces, status, needed_by, delivery_method, requires_invoice, note, lost_reason,
       internal_note, store:stores(name),
       quote_request_items(line_no, product_id, product_name, sku, variant_label, quantity, personalize, notes),
       quote_status_history(id, from_status, to_status, changed_by, note, created_at)`,
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as {
    id: string;
    folio: string;
    created_at: string;
    customer_name: string;
    customer_phone: string;
    customer_type: CustomerType;
    organization: string | null;
    total_pieces: number;
    status: QuoteStatus;
    needed_by: string;
    delivery_method: DeliveryMethod;
    requires_invoice: boolean;
    note: string;
    lost_reason: string | null;
    internal_note: string;
    store: { name: string } | null;
    quote_request_items: {
      line_no: number;
      product_id: string | null;
      product_name: string;
      sku: string;
      variant_label: string | null;
      quantity: number;
      personalize: boolean;
      notes: string;
    }[];
    quote_status_history: {
      id: number;
      from_status: QuoteStatus | null;
      to_status: QuoteStatus;
      changed_by: string | null;
      note: string;
      created_at: string;
    }[];
  };
  return {
    id: row.id,
    folio: row.folio,
    createdAt: row.created_at,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerType: row.customer_type,
    organization: row.organization,
    totalPieces: row.total_pieces,
    status: row.status,
    neededBy: row.needed_by,
    deliveryMethod: row.delivery_method,
    storeName: row.store?.name ?? null,
    requiresInvoice: row.requires_invoice,
    note: row.note,
    lostReason: row.lost_reason,
    internalNote: row.internal_note,
    lines: row.quote_request_items
      .slice()
      .sort((a, b) => a.line_no - b.line_no)
      .map((line) => ({
        lineNo: line.line_no,
        productId: line.product_id,
        productName: line.product_name,
        sku: line.sku,
        variantLabel: line.variant_label,
        quantity: line.quantity,
        personalize: line.personalize,
        notes: line.notes,
      })),
    history: row.quote_status_history
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
      .map((entry) => ({
        id: entry.id,
        fromStatus: entry.from_status,
        toStatus: entry.to_status,
        changedBy: entry.changed_by,
        note: entry.note,
        createdAt: entry.created_at,
      })),
  };
}

export async function setRequestStatus(
  supabase: Client,
  id: string,
  toStatus: QuoteStatus,
  options: { note?: string; lostReason?: string } = {},
) {
  const { error } = await supabase.rpc('admin_set_quote_status', {
    id,
    to_status: toStatus,
    note: options.note?.trim() ?? '',
    lost_reason: toStatus === 'lost' ? (options.lostReason?.trim() ?? '') : undefined,
  });
  if (error) throw error;
}

export async function setRequestNote(supabase: Client, id: string, note: string) {
  const { error } = await supabase.rpc('admin_set_quote_note', { id, internal_note: note.trim() });
  if (error) throw error;
}

/** Names of the staff, when the role may read them (admins); editors see only their own row. */
export async function staffNames(supabase: Client): Promise<Map<string, string>> {
  const { data } = await supabase.from('staff_members').select('user_id, full_name');
  return new Map((data ?? []).map((row) => [row.user_id, row.full_name]));
}
