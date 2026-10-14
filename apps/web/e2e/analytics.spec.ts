import { expect, type Page, test } from '@playwright/test';

// T3.9: the funnel events (APP-FLOW §6) reach track() and gtag, with the GA4 equivalents.
// A fake gtag records the calls; the real GA4 script is never loaded in the E2E build.

type Recorded = { kind: 'track' | 'gtag'; name: string; params: Record<string, unknown> };

async function record(page: Page) {
  const seen: Recorded[] = [];
  await page.exposeFunction('__pypRecord', (entry: Recorded) => seen.push(entry));
  await page.addInitScript(() => {
    const send = (window as unknown as { __pypRecord: (e: unknown) => void }).__pypRecord;
    window.addEventListener('pyp:track', (e) => {
      const { event, params } = (e as CustomEvent).detail;
      send({ kind: 'track', name: event, params });
    });
    (window as unknown as { gtag: unknown }).gtag = (_cmd: string, name: string, params: unknown) =>
      send({ kind: 'gtag', name, params });
  });
  return seen;
}

const names = (seen: Recorded[], kind: Recorded['kind']) =>
  seen.filter((e) => e.kind === kind).map((e) => e.name);
const find = (seen: Recorded[], name: string) =>
  seen.find((e) => e.kind === 'track' && e.name === name);

test('the quote funnel: list → product → add → list → form → sent → WhatsApp', async ({ page }) => {
  const seen = await record(page);
  await page.route('https://challenges.cloudflare.com/turnstile/**', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `window.turnstile={render(e,o){setTimeout(()=>o.callback('t'),20);this.o=o;return 'w'},reset(){},remove(){}};`,
    }),
  );
  await page.route('**/functions/v1/submit-quote', (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'content-type',
          },
        })
      : route.fulfill({
          status: 201,
          headers: { 'Access-Control-Allow-Origin': '*' },
          json: { folio: 'PYP-2026-000777' },
        }),
  );
  await page.route('https://wa.me/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>WhatsApp</title>' }),
  );

  await page.goto('/deporte/basquetbol', { waitUntil: 'networkidle' });
  await expect.poll(() => names(seen, 'track')).toContain('view_item_list');
  expect(find(seen, 'view_item_list')?.params).toMatchObject({
    item_list_id: '/deporte/basquetbol',
  });

  await page.goto('/producto/uniforme-basquetbol-completo', { waitUntil: 'networkidle' });
  await expect.poll(() => names(seen, 'track')).toContain('view_item');
  await page.getByRole('button', { name: 'Equipo de 12' }).click();
  await page.getByRole('button', { name: 'Agregar a mi cotización' }).click();
  await expect.poll(() => names(seen, 'track')).toContain('add_to_quote');
  expect(find(seen, 'add_to_quote')?.params).toMatchObject({ pieces: 12 });

  await page.getByRole('dialog').getByRole('link', { name: 'Ver mi cotización' }).click();
  await expect.poll(() => names(seen, 'track')).toContain('view_quote');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Ana López');
  await page.getByRole('textbox', { name: /WhatsApp/ }).fill('5512345678');
  await page.getByRole('button', { name: '1 mes' }).click();
  await page.getByRole('checkbox', { name: /aviso de privacidad/ }).check();
  await page
    .getByRole('button', { name: 'Enviar cotización por WhatsApp' })
    .locator('visible=true')
    .click();
  await page.waitForURL(/^https:\/\/wa\.me\//);

  const funnel = names(seen, 'track').filter((n) => n !== 'view_item_list');
  expect(funnel).toEqual([
    'view_item',
    'add_to_quote',
    'view_quote',
    'begin_quote_form',
    'submit_quote',
    'whatsapp_click',
  ]);
  expect(find(seen, 'submit_quote')?.params).toMatchObject({
    folio: 'PYP-2026-000777',
    pieces: 12,
    products: 1,
    customer_type: 'league_team',
  });
  expect(find(seen, 'whatsapp_click')?.params).toEqual({ origin: 'quote' });
  // The GA4 recommended events go along (TRD §12).
  expect(names(seen, 'gtag')).toEqual(
    expect.arrayContaining(['add_to_cart', 'begin_checkout', 'generate_lead']),
  );
});

test('a failed send is recorded with its reason', async ({ page }) => {
  const seen = await record(page);
  await page.route('https://challenges.cloudflare.com/turnstile/**', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `window.turnstile={render(e,o){setTimeout(()=>o.callback('t'),20);return 'w'},reset(){},remove(){}};`,
    }),
  );
  await page.route('**/functions/v1/submit-quote', (route) => route.abort('failed'));
  await page.route('https://wa.me/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>WhatsApp</title>' }),
  );
  await page.goto('/producto/uniforme-basquetbol-completo', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Equipo de 12' }).click();
  await page.getByRole('button', { name: 'Agregar a mi cotización' }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Ver mi cotización' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Ana López');
  await page.getByRole('textbox', { name: /WhatsApp/ }).fill('5512345678');
  await page.getByRole('button', { name: '1 mes' }).click();
  await page.getByRole('checkbox', { name: /aviso de privacidad/ }).check();
  await page
    .getByRole('button', { name: 'Enviar cotización por WhatsApp' })
    .locator('visible=true')
    .click();
  await page.waitForURL(/^https:\/\/wa\.me\//);
  expect(find(seen, 'quote_submit_error')?.params).toEqual({ reason: 'network' });
});

test('search and the floating WhatsApp button are recorded', async ({ page }) => {
  const seen = await record(page);
  await page.route('https://wa.me/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>WhatsApp</title>' }),
  );
  await page.goto('/buscar?q=valon', { waitUntil: 'networkidle' });
  await expect
    .poll(() => find(seen, 'search')?.params)
    .toEqual({
      search_term: 'valon',
      results: expect.any(Number),
    });

  const popup = page.waitForEvent('popup');
  await page.getByRole('link', { name: '¿Dudas? Escríbenos por WhatsApp' }).click();
  await (await popup).close();
  await expect.poll(() => find(seen, 'whatsapp_click')?.params).toEqual({ origin: 'floating' });
});
