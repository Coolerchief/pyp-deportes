import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Badge, Button, Chip, EmptyState, FormField, SectionHeader, Skeleton } from '.';

describe('Button', () => {
  it('renders plate variants with the slant offset of their size', () => {
    render(
      <Button variant="primary" size="lg">
        Agregar a mi cotización
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Agregar a mi cotización' });
    expect(button).toHaveClass('placa', 'bg-rojo', 'text-blanco', 'type-button');
    expect(button.style.height).toBe('56px');
    expect(button.style.getPropertyValue('--placa-o')).toBe('13px');
    expect(button.parentElement).toHaveClass('focus-placa');
  });

  it('opens outside links in a new tab and inverts outline on dark backgrounds', () => {
    render(
      <>
        <Button variant="whatsapp" href="https://wa.me/525500000000" external>
          Cotiza por WhatsApp
        </Button>
        <Button variant="outline" tone="dark" href="/cotizacion">
          Mi cotización
        </Button>
      </>,
    );
    const whatsapp = screen.getByRole('link', { name: 'Cotiza por WhatsApp' });
    expect(whatsapp).toHaveAttribute('target', '_blank');
    expect(whatsapp).toHaveAttribute('rel', 'noopener noreferrer');
    const quote = screen.getByRole('link', { name: 'Mi cotización' });
    expect(quote).toHaveClass('text-blanco');
    expect(quote).not.toHaveAttribute('target');
  });

  it('keeps outline and ghost rectangular', () => {
    render(
      <>
        <Button variant="outline">Ver tallas</Button>
        <Button variant="ghost" size="sm">
          Limpiar
        </Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Ver tallas' })).not.toHaveClass('placa');
    const ghost = screen.getByRole('button', { name: 'Limpiar' });
    expect(ghost).not.toHaveClass('placa');
    expect(ghost.style.height).toBe('40px');
  });

  it('uses noche text on the WhatsApp button', () => {
    render(<Button variant="whatsapp">Enviar por WhatsApp</Button>);
    expect(screen.getByRole('button', { name: 'Enviar por WhatsApp' })).toHaveClass(
      'bg-whatsapp',
      'text-noche',
    );
  });

  it('shows "Enviando…" and blocks clicks while loading', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Enviar
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Enviando…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders a link when given href', () => {
    render(<Button href="/catalogo">Ver catálogo</Button>);
    expect(screen.getByRole('link', { name: 'Ver catálogo' })).toHaveAttribute('href', '/catalogo');
  });
});

describe('Badge', () => {
  it('maps variants to brand surfaces, with custom on noche', () => {
    render(
      <>
        <Badge variant="new">Nuevo</Badge>
        <Badge variant="custom">Personalizable</Badge>
      </>,
    );
    expect(screen.getByText('Nuevo')).toHaveClass('bg-lima', 'text-noche', 'type-badge');
    expect(screen.getByText('Personalizable')).toHaveClass('bg-noche', 'text-blanco');
    expect(screen.getByText('Nuevo').style.height).toBe('24px');
  });
});

describe('Chip', () => {
  it('toggles with aria-pressed and turns into a noche plate when selected', async () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <Chip label="Balones" count={6} selected={false} onToggle={onToggle} />,
    );
    const chip = screen.getByRole('button', { name: 'Balones (6)' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(chip).not.toHaveClass('placa');
    await userEvent.click(chip);
    expect(onToggle).toHaveBeenCalledOnce();

    rerender(<Chip label="Balones" count={6} selected onToggle={onToggle} />);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(chip).toHaveClass('placa', 'bg-noche', 'text-blanco');
  });
});

describe('FormField', () => {
  it('links label, help and required state to the input', () => {
    render(<FormField label="Nombre" name="name" help="Como te llamamos" required />);
    const input = screen.getByRole('textbox', { name: 'Nombre' });
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription('Como te llamamos');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('replaces the help with the error and marks the field invalid', () => {
    render(<FormField label="Nombre" name="name" help="Ayuda" error="Escribe tu nombre." />);
    const input = screen.getByRole('textbox', { name: 'Nombre' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Escribe tu nombre.');
    expect(input).toHaveClass('border-rojo-profundo', 'border-2');
    expect(screen.queryByText('Ayuda')).not.toBeInTheDocument();
  });

  it('supports a fixed prefix and a multiline variant', () => {
    render(
      <>
        <FormField label="WhatsApp" name="phone" prefix="+52" inputMode="numeric" />
        <FormField label="Nota general" name="note" multiline />
      </>,
    );
    expect(screen.getByText('+52')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'WhatsApp' })).toHaveAttribute(
      'inputmode',
      'numeric',
    );
    expect(screen.getByRole('textbox', { name: 'Nota general' }).tagName).toBe('TEXTAREA');
  });
});

describe('EmptyState', () => {
  it('shows the title, the line of text and a single action', () => {
    render(
      <EmptyState
        title="Tu lista está vacía"
        description="Agrega productos con sus cantidades por talla."
        action={<Button href="/catalogo">Ver catálogo</Button>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Tu lista está vacía' })).toHaveClass('type-h4');
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });
});

describe('Skeleton', () => {
  it('is hidden from assistive tech and only pulses without reduced motion', () => {
    const { container } = render(<Skeleton tone="linea" className="h-3" />);
    const skeleton = container.firstElementChild;
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    expect(skeleton).toHaveClass('bg-linea', 'motion-safe:animate-pulse');
  });
});

describe('SectionHeader', () => {
  it('renders eyebrow, title and a descriptive "Ver todo" link', () => {
    render(<SectionHeader eyebrow="Lo más pedido" title="Destacados" href="/catalogo" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Destacados' })).toBeInTheDocument();
    expect(screen.getByText('Lo más pedido')).toHaveClass('text-rojo-profundo');
    expect(screen.getByRole('link', { name: 'Ver todo: Destacados' })).toHaveAttribute(
      'href',
      '/catalogo',
    );
  });

  it('switches to lima accents on noche', () => {
    render(<SectionHeader eyebrow="Taller" title="Uniformes" tone="noche" />);
    expect(screen.getByText('Taller')).toHaveClass('text-lima');
    expect(screen.getByRole('heading', { name: 'Uniformes' })).toHaveClass('text-blanco');
  });
});
