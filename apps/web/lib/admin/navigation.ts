import type { StaffRole } from './access';

// Sections of the panel (UI/UX §9). The first three are the bottom bar on mobile, where the
// staff answer requests and upload photos from the store; the rest live under "Más". From lg
// every section is in the side bar.

export type AdminSectionId =
  'inicio' | 'solicitudes' | 'productos' | 'galeria' | 'fotos' | 'textos' | 'catalogos' | 'ajustes';

export type AdminSection = {
  id: AdminSectionId;
  label: string;
  href: string;
  /** Shown in the mobile bottom bar; the others go under "Más". */
  primary?: boolean;
  /** Only these roles see it (all staff when absent). */
  roles?: readonly StaffRole[];
};

export const ADMIN_SECTIONS: readonly AdminSection[] = [
  { id: 'inicio', label: 'Inicio', href: '/admin', primary: true },
  { id: 'solicitudes', label: 'Solicitudes', href: '/admin/solicitudes', primary: true },
  { id: 'productos', label: 'Productos', href: '/admin/productos', primary: true },
  { id: 'galeria', label: 'Galería', href: '/admin/galeria' },
  { id: 'fotos', label: 'Fotos del sitio', href: '/admin/fotos' },
  { id: 'textos', label: 'Textos', href: '/admin/textos' },
  { id: 'catalogos', label: 'Catálogos', href: '/admin/catalogos' },
  { id: 'ajustes', label: 'Ajustes', href: '/admin/ajustes', roles: ['admin'] },
];

/** The sections a role can open, in menu order. */
export function sectionsFor(role: StaffRole): AdminSection[] {
  return ADMIN_SECTIONS.filter((section) => !section.roles || section.roles.includes(role));
}

export function canOpen(role: StaffRole, id: AdminSectionId): boolean {
  return sectionsFor(role).some((section) => section.id === id);
}

/** The section a path belongs to: "/admin" only by itself, the others with their subpages. */
export function activeSection(pathname: string): AdminSectionId | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/admin') return 'inicio';
  const match = ADMIN_SECTIONS.find(
    (section) =>
      section.id !== 'inicio' && (path === section.href || path.startsWith(`${section.href}/`)),
  );
  return match?.id ?? null;
}
