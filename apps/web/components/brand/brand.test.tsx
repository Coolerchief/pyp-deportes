import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CorteA13, DobleDiagonal, ImagenGenerica, Logo, PatronCancha, Placa, placaOffset } from '.';

describe('placaOffset', () => {
  it('derives the 13° offset from the height, as in the design', () => {
    expect([24, 36, 40, 48, 56].map(placaOffset)).toEqual([6, 8, 9, 11, 13]);
  });
});

describe('Logo', () => {
  it('renders the requested file with the brand name as alt text', () => {
    render(<Logo variant="horizontal" tone="negativo" width={160} />);
    const img = screen.getByRole('img', { name: 'P&P Deportes Coapa' });
    expect(img.getAttribute('src')).toContain('/brand/logo-horizontal-negativo.svg');
    expect(img).toHaveAttribute('width', '160');
    expect(img).toHaveAttribute('height', '29');
  });

  it('never goes below the minimum width of each variant', () => {
    render(
      <>
        <Logo variant="horizontal" width={60} alt="h" />
        <Logo variant="vertical" width={10} alt="v" />
        <Logo variant="monograma" tone="mono-blanco" width={8} alt="m" />
      </>,
    );
    expect(screen.getByAltText('h')).toHaveAttribute('width', '120');
    expect(screen.getByAltText('v')).toHaveAttribute('width', '80');
    expect(screen.getByAltText('m')).toHaveAttribute('width', '32');
    expect(screen.getByAltText('m').getAttribute('src')).toContain(
      '/brand/monograma-mono-blanco.svg',
    );
  });
});

describe('Placa', () => {
  it('sets its height and the matching slant offset', () => {
    render(<Placa height={48}>Nuevo</Placa>);
    const placa = screen.getByText('Nuevo');
    expect(placa).toHaveClass('placa');
    expect(placa.style.height).toBe('48px');
    expect(placa.style.getPropertyValue('--placa-o')).toBe('11px');
  });
});

describe('DobleDiagonal', () => {
  it('is a decorative two-bar SVG sized from its height', () => {
    const { container } = render(<DobleDiagonal height={40} className="text-rojo" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('height', '40');
    expect(svg).toHaveAttribute('width', '18.24');
    expect(svg?.querySelectorAll('polygon')).toHaveLength(2);
  });
});

describe('PatronCancha', () => {
  it('uses noche by default and rojo on request', () => {
    render(
      <>
        <PatronCancha>a</PatronCancha>
        <PatronCancha tone="rojo">b</PatronCancha>
      </>,
    );
    expect(screen.getByText('a')).toHaveClass('cancha', 'bg-noche');
    expect(screen.getByText('b')).toHaveClass('cancha', 'bg-rojo');
  });
});

describe('ImagenGenerica', () => {
  it('shows the category over the pattern and stays hidden from screen readers', () => {
    const { container } = render(<ImagenGenerica category="Balones" />);
    const root = container.firstElementChild;
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root).toHaveClass('cancha', 'bg-noche', 'aspect-[4/5]');
    expect(screen.getByText('Balones')).toHaveClass('text-lima');
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      '/brand/monograma-mono-blanco.svg',
    );
  });
});

describe('CorteA13', () => {
  it('wraps its content and adds one decorative rojo diagonal', () => {
    const { container } = render(
      <CorteA13 className="h-52">
        <p>Foto</p>
      </CorteA13>,
    );
    expect(screen.getByText('Foto')).toBeInTheDocument();
    expect(container.querySelectorAll('[aria-hidden="true"].bg-rojo')).toHaveLength(1);
  });
});
