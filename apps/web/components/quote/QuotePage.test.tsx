import { EMPTY_QUOTE, REQUESTER_STORAGE_KEY } from '@pyp/shared';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuote } from '@/lib/commerce';
import { saveLastQuote, useSubmission, whatsappOpener } from '@/lib/commerce/submission';
import { OFFLINE_MESSAGE, QuotePage } from './QuotePage';

const nav = vi.hoisted(() => ({ search: '', replace: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => '/cotizacion',
}));

const turnstile = vi.hoisted(() => ({ takeToken: vi.fn() }));
vi.mock('@/lib/commerce/turnstile', () => ({
  useTurnstile: () => ({ container: { current: null }, takeToken: turnstile.takeToken }),
}));

const LINE = {
  lineId: 'l1',
  productId: '00000000-0000-4000-8000-000000000001',
  variantId: '00000000-0000-4000-8000-000000000002',
  quantity: 2,
  personalize: false,
  notes: '',
  snapshot: { name: 'Balón', sku: 'B', slug: 'balon', variantLabel: null, image: null },
  addedAt: '2026-10-13T00:00:00.000Z',
};
const WA = 'https://wa.me/525500000000?text=hola';

const page = () => <QuotePage sports={[]} privacyVersion="2026-10" whatsappNumber="5500000000" />;

beforeEach(() => {
  vi.restoreAllMocks();
  nav.search = '';
  nav.replace.mockReset();
  nav.push.mockReset();
  window.sessionStorage.clear();
  window.localStorage.clear();
  useSubmission.setState({
    last: null,
    pendingOpen: null,
    rejectedVariantIds: [],
    clientRequestId: null,
  });
  turnstile.takeToken.mockReset().mockResolvedValue('token-1');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://pyp-dev.supabase.co');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}', { status: 404 })),
  );
});

describe('QuotePage', () => {
  it('marks the current step', () => {
    useQuote.setState({ ...EMPTY_QUOTE, hydrated: true, lines: [LINE] });
    render(page());
    const steps = screen.getByRole('navigation', { name: 'Pasos' });
    expect(steps.querySelector('[aria-current="step"]')).toHaveTextContent('1 · Tu lista');
  });

  it('sends ?paso=2 with an empty list back to step 1', async () => {
    nav.search = '?paso=2';
    useQuote.setState({ ...EMPTY_QUOTE, hydrated: true });
    render(page());
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/cotizacion'));
  });

  it('marks the products the server rejected (409) on step 1', async () => {
    useQuote.setState({ ...EMPTY_QUOTE, hydrated: true, lines: [LINE] });
    useSubmission.setState({ rejectedVariantIds: [LINE.variantId] });
    render(page());
    expect(await screen.findByText(/No disponible/)).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Continuar' })[0]).toBeDisabled();
  });
});

describe('confirmation (step 3)', () => {
  it('shows the folio, copy, "Abrir WhatsApp" and "Vaciar mi lista"', async () => {
    nav.search = '?enviada=PYP-2026-000123';
    saveLastQuote({ folio: 'PYP-2026-000123', waUrl: WA });
    useQuote.setState({ ...EMPTY_QUOTE, hydrated: true, lines: [LINE] });
    render(page());
    const title = await screen.findByRole('heading', { level: 1, name: '¡Listo!' });
    await waitFor(() => expect(title).toHaveFocus());
    expect(screen.getByText('PYP-2026-000123')).toBeVisible();
    expect(screen.getByText('Solicitud enviada')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Abrir WhatsApp' })).toHaveAttribute('href', WA);
    expect(screen.getByRole('button', { name: 'Copiar folio' })).toBeVisible();
    // Reopening the confirmation (a reload) does not open WhatsApp by itself.
    expect(useSubmission.getState().pendingOpen).toBeNull();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Vaciar mi lista' }));
    expect(useQuote.getState().lines).toEqual([]);
    expect(screen.getByText('Vaciamos tu lista.')).toBeVisible();
  });

  it('has a variant without folio', async () => {
    nav.search = '?enviada=1';
    saveLastQuote({ folio: null, waUrl: WA });
    render(page());
    expect(
      await screen.findByRole('heading', { name: 'Tu lista está lista para enviarse' }),
    ).toBeVisible();
    expect(screen.queryByText('Tu folio')).toBeNull();
    expect(screen.getByRole('link', { name: 'Abrir WhatsApp' })).toHaveAttribute('href', WA);
  });

  it('sends ?enviada= from another session back to step 1', async () => {
    nav.search = '?enviada=PYP-2026-000123';
    render(page());
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/cotizacion'));
  });
});

describe('sending (step 2)', () => {
  async function fillAndSend() {
    nav.search = '?paso=2';
    useQuote.setState({ ...EMPTY_QUOTE, hydrated: true, lines: [LINE] });
    window.localStorage.setItem(
      REQUESTER_STORAGE_KEY,
      JSON.stringify({
        savedAt: new Date().toISOString(),
        draft: { name: 'Ana López', phone: '5512345678', type: 'individual' },
      }),
    );
    const user = userEvent.setup();
    const view = render(page());
    // Like the router: the new URL renders the page again.
    nav.push.mockImplementation((url: string) => {
      nav.search = url.includes('?') ? url.slice(url.indexOf('?')) : '';
      queueMicrotask(() => view.rerender(page()));
    });
    await user.click(await screen.findByRole('button', { name: '1 mes' }));
    await user.click(screen.getByRole('checkbox', { name: /aviso de privacidad/ }));
    const [send] = screen.getAllByRole('button', { name: 'Enviar cotización por WhatsApp' });
    await user.click(send!);
  }

  function stubFunction(status: number, body: unknown) {
    const fetch = vi.fn(async (url: string) =>
      String(url).endsWith('/functions/v1/submit-quote')
        ? new Response(JSON.stringify(body), { status })
        : new Response('{}', { status: 404 }),
    );
    vi.stubGlobal('fetch', fetch);
    return fetch;
  }

  it('saves the request, then shows the folio and opens WhatsApp with it', async () => {
    const open = vi.spyOn(whatsappOpener, 'open').mockImplementation(() => {});
    const fetch = stubFunction(201, { folio: 'PYP-2026-000123' });
    const id = useSubmission.getState().ensureRequestId();
    await fillAndSend();
    // WhatsApp opens from the confirmation, once it is on screen.
    expect(await screen.findByRole('heading', { name: '¡Listo!' })).toBeVisible();
    expect(nav.push).toHaveBeenCalledWith('/cotizacion?enviada=PYP-2026-000123');
    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    const url = open.mock.calls[0]![0];
    expect(decodeURIComponent(url)).toContain('Folio *PYP-2026-000123*');
    expect(screen.getByRole('link', { name: 'Abrir WhatsApp' })).toHaveAttribute('href', url);
    expect(useSubmission.getState().last).toEqual({ folio: 'PYP-2026-000123', waUrl: url });
    // Saved: the next send gets a new idempotency key.
    expect(useSubmission.getState().clientRequestId).not.toBe(id);

    const call = fetch.mock.calls.find(([u]) => String(u).includes('submit-quote'));
    const body = JSON.parse(String((call as unknown as [string, RequestInit])[1].body));
    expect(body).toMatchObject({
      clientRequestId: id,
      turnstileToken: 'token-1',
      customer: { name: 'Ana López', phone: '5512345678', type: 'individual' },
      items: [{ variantId: LINE.variantId, quantity: 2, personalize: false, notes: '' }],
    });
  });

  it('opens WhatsApp without folio when the function fails', async () => {
    const open = vi.spyOn(whatsappOpener, 'open').mockImplementation(() => {});
    stubFunction(500, { error: 'internal_error' });
    const id = useSubmission.getState().ensureRequestId();
    await fillAndSend();
    expect(
      await screen.findByRole('heading', { name: 'Tu lista está lista para enviarse' }),
    ).toBeVisible();
    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    expect(decodeURIComponent(open.mock.calls[0]![0])).not.toContain('Folio');
    expect(nav.push).toHaveBeenCalledWith('/cotizacion?enviada=1');
    // Not saved: a retry keeps the same idempotency key.
    expect(useSubmission.getState().clientRequestId).toBe(id);
  });

  it('opens WhatsApp without folio when Turnstile fails', async () => {
    const open = vi.spyOn(whatsappOpener, 'open').mockImplementation(() => {});
    const fetch = stubFunction(201, { folio: 'PYP-2026-000123' });
    turnstile.takeToken.mockRejectedValue(new Error('Turnstile falló.'));
    await fillAndSend();
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/cotizacion?enviada=1'));
    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    expect(fetch.mock.calls.some(([u]) => String(u).includes('submit-quote'))).toBe(false);
  });

  it('goes back to the list with the product marked on 409', async () => {
    const open = vi.spyOn(whatsappOpener, 'open').mockImplementation(() => {});
    stubFunction(409, { error: 'invalid_items', fields: { items: [LINE.variantId] } });
    await fillAndSend();
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/cotizacion'));
    expect(useSubmission.getState().rejectedVariantIds).toEqual([LINE.variantId]);
    expect(await screen.findByText(/No disponible/)).toBeVisible();
    expect(open).not.toHaveBeenCalled();
  });

  it('says so without connection and sends nothing', async () => {
    const open = vi.spyOn(whatsappOpener, 'open').mockImplementation(() => {});
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    await fillAndSend();
    expect((await screen.findAllByText(OFFLINE_MESSAGE)).length).toBeGreaterThan(0);
    expect(open).not.toHaveBeenCalled();
    expect(turnstile.takeToken).not.toHaveBeenCalled();
  });
});
