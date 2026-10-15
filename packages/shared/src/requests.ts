// Requests inbox of the panel (T4.7, APP-FLOW §8.4): periods in Mexico City time, the chat
// message to the customer and the CSV export.

import { firstName } from './contact.ts';
import { addDays, mexicoCityDate } from './dates.ts';
import {
  customerTypeLabels,
  deliveryMethodLabels,
  quoteStatusLabels,
  type CustomerType,
  type DeliveryMethod,
  type QuoteStatus,
} from './labels.ts';
import { toCsv } from './import-file.ts';

export const REQUEST_PERIODS = ['hoy', 'semana', 'mes', 'mes-pasado', 'todo'] as const;
export type RequestPeriod = (typeof REQUEST_PERIODS)[number];

export const requestPeriodLabels: Record<RequestPeriod, string> = {
  hoy: 'Hoy',
  semana: 'Últimos 7 días',
  mes: 'Este mes',
  'mes-pasado': 'Mes pasado',
  todo: 'Todo',
};

/** Inclusive calendar dates ('YYYY-MM-DD', Mexico City) of a period; null = open end. */
export type DateRange = { from: string | null; to: string | null };

export function periodRange(period: RequestPeriod, now: Date = new Date()): DateRange {
  const today = mexicoCityDate(now);
  const monthStart = `${today.slice(0, 8)}01`;
  switch (period) {
    case 'hoy':
      return { from: today, to: today };
    case 'semana':
      return { from: addDays(today, -6), to: today };
    case 'mes':
      return { from: monthStart, to: today };
    case 'mes-pasado': {
      const lastMonthEnd = addDays(monthStart, -1);
      return { from: `${lastMonthEnd.slice(0, 8)}01`, to: lastMonthEnd };
    }
    default:
      return { from: null, to: null };
  }
}

/**
 * Start of a Mexico City day as an instant. Mexico City has kept UTC−6 all year since daylight
 * saving time ended in 2022.
 */
export function mexicoCityDayStart(isoDate: string): string {
  return `${isoDate}T00:00:00-06:00`;
}

/** created_at bounds of a range: from the start of `from` to before the next day of `to`. */
export function rangeBounds(range: DateRange): { gte: string | null; lt: string | null } {
  return {
    gte: range.from ? mexicoCityDayStart(range.from) : null,
    lt: range.to ? mexicoCityDayStart(addDays(range.to, 1)) : null,
  };
}

/** First message of "Abrir chat" to the customer. */
export function requestChatMessage(name: string, folio: string): string {
  return `Hola ${firstName(name)}, te escribo por tu solicitud ${folio}.`;
}

export type RequestCsvRow = {
  folio: string;
  created_at: string;
  status: QuoteStatus;
  customer_name: string;
  customer_phone: string;
  customer_type: CustomerType;
  organization: string | null;
  total_pieces: number;
  needed_by: string;
  delivery_method: DeliveryMethod;
  requires_invoice: boolean;
  note: string;
  lost_reason: string | null;
  internal_note: string;
};

/** "2026-10-14 10:32" in Mexico City. */
export function mexicoCityDateTime(iso: string): string {
  const at = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour').replace('24', '00')}:${get('minute')}`;
}

/** "Exportar CSV": one row per request with the filters applied, in Spanish. */
export function requestsCsv(rows: readonly RequestCsvRow[]): string {
  return toCsv([
    [
      'folio',
      'fecha',
      'estado',
      'cliente',
      'telefono',
      'tipo',
      'organizacion',
      'piezas',
      'para_cuando',
      'entrega',
      'factura',
      'nota_del_cliente',
      'motivo_perdida',
      'nota_interna',
    ],
    ...rows.map((row) => [
      row.folio,
      mexicoCityDateTime(row.created_at),
      quoteStatusLabels[row.status],
      row.customer_name,
      row.customer_phone,
      customerTypeLabels[row.customer_type],
      row.organization ?? '',
      row.total_pieces,
      row.needed_by,
      deliveryMethodLabels[row.delivery_method],
      row.requires_invoice ? 'sí' : 'no',
      row.note,
      row.lost_reason ?? '',
      row.internal_note,
    ]),
  ]);
}
