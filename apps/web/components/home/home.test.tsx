import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SitePhoto } from '@/components/content/SitePhoto';
import { MEDIA_URL } from '@/lib/images/loader';
import { AdvisorCard } from './AdvisorCard';
import { HowItWorks } from './HowItWorks';
import { StoreStatus } from './StoreStatus';

afterEach(() => vi.useRealTimers());

describe('SitePhoto', () => {
  it('shows the placeholder with its marker while the slot has no photo', () => {
    const { container } = render(
      <SitePhoto media={null} marker="[FOTO DE PORTADA]" sizes="100vw" />,
    );
    expect(screen.getByText('[FOTO DE PORTADA]')).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows the photo from R2 with its alt text', () => {
    render(
      <SitePhoto
        media={{ keyBase: 's/home_hero/x', alt: 'Equipo en la cancha', width: 2400, height: 1800 }}
        marker="[FOTO DE PORTADA]"
        sizes="100vw"
      />,
    );
    const img = screen.getByRole('img', { name: 'Equipo en la cancha' });
    expect(decodeURIComponent(img.getAttribute('src') ?? '')).toContain(
      `${MEDIA_URL}/s/home_hero/x`,
    );
  });
});

describe('AdvisorCard', () => {
  it('shows initials without a photo and writes to the advisor by first name', () => {
    render(
      <AdvisorCard
        advisor={{ name: '[Ana Martínez]', role: 'Asesora de uniformes', quote: 'Cuéntame.' }}
        photo={null}
        whatsappUrl="https://wa.me/525500000000"
      />,
    );
    expect(screen.getByText('AM')).toBeInTheDocument();
    expect(screen.getByText('[Ana Martínez]')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Escríbele a Ana' })).toHaveAttribute(
      'href',
      'https://wa.me/525500000000',
    );
  });
});

describe('HowItWorks', () => {
  it('lists the four steps in order', () => {
    render(<HowItWorks />);
    expect(screen.getAllByRole('heading').map((h) => h.textContent)).toEqual([
      'Paso 1: Elige',
      'Paso 2: Cotiza',
      'Paso 3: Aprueba',
      'Paso 4: Recibe',
    ]);
  });
});

describe('StoreStatus', () => {
  it('says whether the store is open, in Mexico City time, once the page runs', () => {
    vi.useFakeTimers();
    // Wednesday 12:30 in Mexico City.
    vi.setSystemTime(new Date('2026-10-14T12:30:00-06:00'));
    render(<StoreStatus hours={[{ days: [1, 2, 3, 4, 5], open: '10:00', close: '19:00' }]} />);
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText('Abierto ahora · cierra 19:00')).toBeVisible();
  });
});
