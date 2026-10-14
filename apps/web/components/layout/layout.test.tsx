import { act, render, screen, within } from '@testing-library/react';
import { useQuote } from '@/lib/commerce';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SiteNav } from '@/lib/navigation';
import { SiteFooter, SiteHeader, WhatsAppFab } from '.';

const navigation = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const nav: SiteNav = {
  siteName: 'P&P Deportes Coapa',
  sports: [
    { href: '/deporte/futbol', label: 'Fútbol' },
    { href: '/deporte/box', label: 'Box' },
  ],
  categories: [
    { href: '/catalogo/uniformes', label: 'Uniformes' },
    { href: '/catalogo/balones', label: 'Balones' },
  ],
  pages: {
    uniforms: { href: '/uniformes-personalizados', label: 'Uniformes a tu medida' },
    teams: { href: '/equipos', label: 'Equipos estrenando' },
    visit: { href: '/visitanos', label: 'Visítanos' },
  },
  contact: {
    whatsappUrl: 'https://wa.me/525500000000',
    phone: '55 6582 2426',
    phoneHref: 'tel:+525565822426',
    hours: 'Lun–Vie 10:00–19:00 · Sáb 10:00–17:00',
    hoursLines: ['Lun–Vie 10:00–19:00', 'Sáb 10:00–17:00'],
    addressLine: 'Calz. del Hueso 921, local 42, Granjas Coapa, Tlalpan, CDMX',
    addressLines: ['Calz. del Hueso 921, local 42', 'Granjas Coapa, Tlalpan, CDMX'],
    instagram: { href: 'https://www.instagram.com/pyp_coapa', label: '@pyp_coapa' },
    facebook: null,
  },
};

beforeEach(() => {
  navigation.pathname = '/';
});

describe('SiteHeader · mobile menu', () => {
  it('opens under the header and closes with Escape, giving focus back to the toggle', async () => {
    const user = userEvent.setup();
    render(<SiteHeader nav={nav} />);
    const toggle = screen.getByRole('button', { name: 'Menú' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('Cerrar menú');
    const menu = screen.getByRole('navigation', { name: 'Menú' });
    expect(within(menu).getByRole('link', { name: 'Uniformes a tu medida' })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('navigation', { name: 'Menú' })).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('keeps one accordion open at a time', async () => {
    const user = userEvent.setup();
    render(<SiteHeader nav={nav} />);
    await user.click(screen.getByRole('button', { name: 'Menú' }));
    const menu = screen.getByRole('navigation', { name: 'Menú' });
    const sports = within(menu).getByRole('button', { name: 'Deportes' });
    const categories = within(menu).getByRole('button', { name: 'Categorías' });

    await user.click(sports);
    expect(sports).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Fútbol' })).toBeVisible();

    await user.click(categories);
    expect(categories).toHaveAttribute('aria-expanded', 'true');
    expect(sports).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Fútbol' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Balones' })).toHaveAttribute(
      'href',
      '/catalogo/balones',
    );
  });

  it('traps Tab inside the header row and the menu', async () => {
    const user = userEvent.setup();
    render(<SiteHeader nav={nav} />);
    const toggle = screen.getByRole('button', { name: 'Menú' });
    await user.click(toggle);
    const phone = screen.getByRole('link', { name: '55 6582 2426' });
    phone.focus();
    await user.tab();
    expect(toggle).toHaveFocus();
    await user.tab({ shift: true });
    expect(phone).toHaveFocus();
  });

  it('closes when a destination is chosen', async () => {
    const user = userEvent.setup();
    render(<SiteHeader nav={nav} />);
    await user.click(screen.getByRole('button', { name: 'Menú' }));
    await user.click(
      within(screen.getByRole('navigation', { name: 'Menú' })).getByRole('link', {
        name: 'Equipos estrenando',
      }),
    );
    expect(screen.queryByRole('navigation', { name: 'Menú' })).not.toBeInTheDocument();
  });
});

describe('SiteHeader · mega menu', () => {
  it('opens from either trigger and closes with Escape on the trigger that opened it', async () => {
    const user = userEvent.setup();
    render(<SiteHeader nav={nav} />);
    const desktop = screen.getByRole('navigation', { name: 'Principal' });
    const categories = within(desktop).getByRole('button', { name: 'Categorías' });

    await user.click(categories);
    const panel = screen.getByRole('region', { name: 'Menú del catálogo' });
    expect(within(panel).getByRole('link', { name: 'Box' })).toHaveAttribute(
      'href',
      '/deporte/box',
    );
    expect(within(panel).getByRole('link', { name: 'Ver todo el catálogo →' })).toHaveAttribute(
      'href',
      '/catalogo',
    );
    expect(within(desktop).getByRole('button', { name: 'Deportes' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Menú del catálogo' })).not.toBeInTheDocument();
    expect(categories).toHaveFocus();
  });

  it('underlines the current section', () => {
    navigation.pathname = '/equipos';
    render(<SiteHeader nav={nav} />);
    const desktop = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(desktop).getByRole('link', { name: 'Equipos' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(desktop).getByRole('link', { name: 'Uniformes' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('searches the catalog with a GET form to /buscar', () => {
    render(<SiteHeader nav={nav} />);
    const form = screen.getByRole('search');
    expect(form).toHaveAttribute('action', '/buscar');
    expect(within(form).getByRole('combobox', { name: 'Busca en el catálogo' })).toHaveAttribute(
      'name',
      'q',
    );
  });

  it('turns the mobile header into the search field and back', async () => {
    const user = userEvent.setup();
    render(<SiteHeader nav={nav} />);
    // The first "Buscar" is the mobile magnifier; the second submits the desktop field.
    await user.click(screen.getAllByRole('button', { name: 'Buscar' })[0]!);
    expect(screen.getAllByRole('combobox', { name: 'Busca en el catálogo' })).toHaveLength(2);
    expect(screen.getAllByRole('combobox')[0]).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Cerrar búsqueda' }));
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Menú' })).toBeVisible();
  });
});

describe('QuoteButton', () => {
  it('names the pieces in the quote, or goes alone without them', () => {
    const { rerender } = render(<SiteHeader nav={nav} />);
    expect(screen.getAllByRole('link', { name: 'Mi cotización' })[0]).toHaveAttribute(
      'href',
      '/cotizacion',
    );
    act(() =>
      useQuote.setState({
        hydrated: true,
        lines: [
          {
            lineId: 'l1',
            productId: '00000000-0000-4000-8000-000000000001',
            variantId: '00000000-0000-4000-8000-000000000002',
            quantity: 42,
            personalize: false,
            notes: '',
            snapshot: { name: 'Jersey', sku: 'J', slug: 'jersey', variantLabel: 'M', image: null },
            addedAt: '2026-10-13T00:00:00.000Z',
          },
        ],
      }),
    );
    rerender(<SiteHeader nav={nav} />);
    expect(screen.getAllByRole('link', { name: 'Mi cotización, 42 piezas' })).toHaveLength(2);
  });
});

describe('SiteFooter', () => {
  it('shows the store data and the links of the design', () => {
    render(<SiteFooter nav={nav} year={2026} />);
    expect(screen.getByText(nav.contact.addressLine)).toBeInTheDocument();
    expect(screen.getByText(nav.contact.hours)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '55 6582 2426' })[0]).toHaveAttribute(
      'href',
      'tel:+525565822426',
    );
    expect(screen.getByRole('link', { name: 'Nosotros' })).toHaveAttribute(
      'href',
      '/visitanos#nosotros',
    );
    expect(screen.getByRole('link', { name: 'Instagram @pyp_coapa' })).toHaveAttribute(
      'target',
      '_blank',
    );
    expect(screen.queryByText(/Facebook/)).not.toBeInTheDocument();
    expect(screen.getByText('© 2026 P&P Deportes Coapa')).toBeInTheDocument();
  });
});

describe('WhatsAppFab', () => {
  it('opens WhatsApp with a name that includes its visible text', () => {
    render(<WhatsAppFab href={nav.contact.whatsappUrl} />);
    const fab = screen.getByRole('link', { name: '¿Dudas? Escríbenos por WhatsApp' });
    expect(fab).toHaveAttribute('href', 'https://wa.me/525500000000');
    expect(fab).toHaveClass('bg-whatsapp', 'text-noche');
  });

  it('hides on /cotizacion, where the action is already WhatsApp', () => {
    navigation.pathname = '/cotizacion';
    render(<WhatsAppFab href={nav.contact.whatsappUrl} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
