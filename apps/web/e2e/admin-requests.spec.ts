import { readFileSync } from 'node:fs';
import { expect, type Route, test } from '@playwright/test';
import { logIn, stubSupabase } from './admin-helpers';

// T4.7: the owner answers "¿cuántas solicitudes tuvimos este mes y cuántas ganamos?", opens a
// request and moves it to won. PostgREST is stubbed; the people are invented.

const ID = '0b6f0b6f-0000-4000-8000-0000000000c1';
const COUNTS: Record<string, number> = { new: 5, in_progress: 2, quoted: 3, won: 2, lost: 1 };

const request = (status: string) => ({
  id: ID,
  folio: 'PYP-2026-000123',
  created_at: '2026-10-14T16:32:00Z',
  customer_name: 'Laura Prueba',
  customer_phone: '5500000101',
  customer_type: 'league_team',
  organization: 'Liga de Prueba',
  total_pieces: 40,
  status,
  needed_by: '2026-11-20',
  delivery_method: 'pickup',
  requires_invoice: false,
  note: '',
  lost_reason: null,
  internal_note: '',
  store: { name: 'Coapa' },
  quote_request_items: [
    {
      line_no: 1,
      product_id: null,
      product_name: 'Uniforme de Fútbol',
      sku: 'UNI-001-M',
      variant_label: 'M',
      quantity: 40,
      personalize: false,
      notes: '',
    },
  ],
  quote_status_history: [
    {
      id: 1,
      from_status: null,
      to_status: 'new',
      changed_by: null,
      note: '',
      created_at: '2026-10-14T16:32:00Z',
    },
  ],
});

test('the inbox answers the month question, a request moves to won and exports', async ({
  page,
}) => {
  await stubSupabase(page, { role: 'admin', full_name: 'Ana López', is_active: true });
  let status = 'quoted';
  const statusCalls: unknown[] = [];
  const queries: string[] = [];
  await page.route('**/rest/v1/staff_members?select=user_id**', (r) => r.fulfill({ json: [] }));
  await page.route('**/rest/v1/quote_requests?**', (route: Route) => {
    const url = new URL(route.request().url());
    queries.push(decodeURIComponent(url.search));
    if (route.request().method() === 'HEAD') {
      const count = COUNTS[url.searchParams.get('status')?.replace('eq.', '') ?? ''] ?? 0;
      return route.fulfill({
        status: 200,
        headers: {
          'content-range': `*/${count}`,
          'access-control-expose-headers': 'content-range',
        },
      });
    }
    if (url.searchParams.get('id')) {
      const single = (route.request().headers()['accept'] ?? '').includes('vnd.pgrst.object');
      const row = request(status);
      return route.fulfill({ json: single ? row : [row] });
    }
    return route.fulfill({
      json: [request(status)],
      headers: { 'content-range': '0-0/1', 'access-control-expose-headers': 'content-range' },
    });
  });
  await page.route('**/rest/v1/rpc/admin_set_quote_status', (route) => {
    const body = route.request().postDataJSON() as { to_status: string };
    statusCalls.push(body);
    status = body.to_status;
    return route.fulfill({ status: 204 });
  });

  await page.goto('/admin/login?next=%2Fadmin%2Fsolicitudes');
  await logIn(page);
  await page.goto('/admin/solicitudes?periodo=mes');
  await expect(page.getByText(/13 solicitudes · 2 ganadas \(15 %\)/)).toBeVisible();
  // The period goes to the database in Mexico City time.
  expect(
    queries.some((q) => q.includes('created_at=gte.') && q.includes('-01T00:00:00-06:00')),
  ).toBe(true);

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV' }).click();
  const csv = readFileSync((await (await download).path())!, 'utf8');
  expect(csv).toContain('PYP-2026-000123');
  expect(csv).toContain('Cotizada');

  await page.getByRole('link', { name: 'PYP-2026-000123' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'PYP-2026-000123' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Abrir chat/ })).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\/525500000101\?text=Hola%20Laura/,
  );
  await page.getByRole('button', { name: 'Pasar a ganada' }).click();
  await expect(page.getByText('Ahora está ganada.')).toBeVisible();
  expect(statusCalls).toEqual([{ id: ID, to_status: 'won', note: '' }]);
});
