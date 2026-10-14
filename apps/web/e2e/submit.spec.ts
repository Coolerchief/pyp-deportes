import { expect, type Page, test } from '@playwright/test';

// T3.8: sending the quote. Turnstile, submit-quote and wa.me are intercepted: the happy path
// with a folio and the fallback without folio when the function is down (rule 5).

const FAKE_TURNSTILE = `window.turnstile = {
  render(el, o) { setTimeout(() => o.callback('e2e-token'), 50); this.o = o; return 'w1'; },
  reset() { const o = this.o; setTimeout(() => o.callback('e2e-token-2'), 50); },
  remove() {},
};`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

async function stubOutside(page: Page, fn: Parameters<Page['route']>[1]) {
  await page.route('https://challenges.cloudflare.com/turnstile/**', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: FAKE_TURNSTILE }),
  );
  await page.route('**/functions/v1/submit-quote', fn);
  await page.route('https://wa.me/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>WhatsApp</title>WhatsApp' }),
  );
}

async function fillQuote(page: Page) {
  await page.goto('/catalogo/balones/balones-futbol', { waitUntil: 'networkidle' });
  await page
    .getByRole('button', { name: /^Cotizar / })
    .first()
    .click();
  await page.getByRole('dialog').getByRole('link', { name: 'Ver mi cotización' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Ana López');
  await page.getByRole('textbox', { name: /WhatsApp/ }).fill('5512345678');
  await page.getByRole('button', { name: '1 mes' }).click();
  await page.getByRole('checkbox', { name: /aviso de privacidad/ }).check();
  return page
    .getByRole('button', { name: 'Enviar cotización por WhatsApp' })
    .locator('visible=true');
}

const sentText = (page: Page) => new URL(page.url()).searchParams.get('text') ?? '';

test('sends with a folio, opens WhatsApp and keeps the confirmation in the history', async ({
  page,
}) => {
  let body: Record<string, unknown> = {};
  await stubOutside(page, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS });
    }
    body = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 201, headers: CORS, json: { folio: 'PYP-2026-000123' } });
  });
  const send = await fillQuote(page);
  await send.click();

  await page.waitForURL(/^https:\/\/wa\.me\/52\d{10}\?text=/);
  expect(sentText(page)).toContain('Folio *PYP-2026-000123*');
  expect(sentText(page)).toContain('*Cliente:* Ana López');
  expect(body).toMatchObject({
    turnstileToken: 'e2e-token',
    customer: { name: 'Ana López', phone: '5512345678' },
    privacyAccepted: true,
  });
  expect(body.clientRequestId).toMatch(/^[0-9a-f-]{36}$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/cotizacion\?enviada=PYP-2026-000123$/);
  await expect(page.getByRole('heading', { level: 1, name: '¡Listo!' })).toBeVisible();
  await expect(page.getByText('PYP-2026-000123')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Abrir WhatsApp' })).toHaveAttribute(
    'href',
    /Folio%20\*PYP-2026-000123\*/,
  );
  // The list is still there until the visitor empties it.
  await page.getByRole('button', { name: 'Vaciar mi lista' }).click();
  await expect(page.getByText('Vaciamos tu lista.')).toBeVisible();
});

test('with the function down, WhatsApp still opens with the whole list and no folio', async ({
  page,
}) => {
  await stubOutside(page, (route) => route.abort('failed'));
  const send = await fillQuote(page);
  await send.click();

  await page.waitForURL(/^https:\/\/wa\.me\//);
  expect(sentText(page)).not.toContain('Folio');
  expect(sentText(page)).toMatch(/^¡Hola! Quiero cotizar\.\n/);
  expect(sentText(page)).toContain('*Productos (1 · 1 pieza)*');

  await page.goBack();
  await expect(page).toHaveURL(/\/cotizacion\?enviada=1$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Tu lista está lista para enviarse' }),
  ).toBeVisible();
  await expect(page.getByText('Tu folio')).toBeHidden();
});
