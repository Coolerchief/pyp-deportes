import { describe, expect, it } from 'vitest';
import { activeSection, canOpen, sectionsFor } from './navigation';

describe('panel navigation', () => {
  it('shows Ajustes only to admins', () => {
    const labels = (role: 'admin' | 'editor') => sectionsFor(role).map((section) => section.label);
    expect(labels('admin')).toEqual([
      'Inicio',
      'Solicitudes',
      'Productos',
      'Galería',
      'Fotos del sitio',
      'Textos',
      'Catálogos',
      'Ajustes',
    ]);
    expect(labels('editor')).not.toContain('Ajustes');
    expect(canOpen('editor', 'ajustes')).toBe(false);
    expect(canOpen('editor', 'productos')).toBe(true);
  });

  it('keeps Inicio, Solicitudes and Productos in the mobile bar', () => {
    expect(
      sectionsFor('editor')
        .filter((section) => section.primary)
        .map((section) => section.id),
    ).toEqual(['inicio', 'solicitudes', 'productos']);
  });

  it('marks the section of the current page', () => {
    expect(activeSection('/admin')).toBe('inicio');
    expect(activeSection('/admin/')).toBe('inicio');
    expect(activeSection('/admin/productos')).toBe('productos');
    expect(activeSection('/admin/productos/editar')).toBe('productos');
    expect(activeSection('/admin/solicitudes/')).toBe('solicitudes');
    expect(activeSection('/admin/productosx')).toBeNull();
    expect(activeSection('/admin/login')).toBeNull();
  });
});
