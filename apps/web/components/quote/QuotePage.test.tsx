import { EMPTY_QUOTE } from '@pyp/shared';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuote } from '@/lib/commerce';
import { QuotePage } from './QuotePage';

const nav = vi.hoisted(() => ({ search: '', replace: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => '/cotizacion',
}));

beforeEach(() => {
  nav.search = '';
  nav.replace.mockReset();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}', { status: 404 })),
  );
});

describe('QuotePage', () => {
  it('marks the current step', () => {
    useQuote.setState({
      ...EMPTY_QUOTE,
      hydrated: true,
      lines: [
        {
          lineId: 'l1',
          productId: '00000000-0000-4000-8000-000000000001',
          variantId: '00000000-0000-4000-8000-000000000002',
          quantity: 2,
          personalize: false,
          notes: '',
          snapshot: { name: 'Balón', sku: 'B', slug: 'balon', variantLabel: null, image: null },
          addedAt: '2026-10-13T00:00:00.000Z',
        },
      ],
    });
    render(<QuotePage sports={[]} privacyVersion="2026-10" />);
    const steps = screen.getByRole('navigation', { name: 'Pasos' });
    expect(steps.querySelector('[aria-current="step"]')).toHaveTextContent('1 · Tu lista');
  });

  it('sends ?paso=2 with an empty list back to step 1', async () => {
    nav.search = '?paso=2';
    useQuote.setState({ ...EMPTY_QUOTE, hydrated: true });
    render(<QuotePage sports={[]} privacyVersion="2026-10" />);
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/cotizacion'));
  });
});
