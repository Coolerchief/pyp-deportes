'use client';

import {
  FileText,
  House,
  Images,
  Inbox,
  type LucideIcon,
  Menu,
  Package,
  Settings,
  Tags,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { roleLabels } from '@/lib/admin/access';
import { activeSection, type AdminSectionId, sectionsFor } from '@/lib/admin/navigation';
import { useAdminSession } from './AdminGate';
import { cn } from './ui/cn';

const icons: Record<AdminSectionId, LucideIcon> = {
  inicio: House,
  solicitudes: Inbox,
  productos: Package,
  galeria: Trophy,
  fotos: Images,
  textos: FileText,
  catalogos: Tags,
  ajustes: Settings,
};

const NAV_LABEL = 'Secciones del panel';

/** From lg: every section in a column at the left, the current one in noche. */
export function AdminSidebar() {
  const { staff } = useAdminSession();
  const current = activeSection(usePathname());
  return (
    <nav
      aria-label={NAV_LABEL}
      className="border-linea sticky top-16 hidden h-[calc(100svh-4rem)] w-60 shrink-0 overflow-y-auto border-r bg-blanco p-3 lg:block"
    >
      <ul className="flex flex-col gap-1">
        {sectionsFor(staff.role).map((section) => {
          const Icon = icons[section.id];
          const active = section.id === current;
          return (
            <li key={section.id}>
              <Link
                href={section.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'type-body flex h-11 items-center gap-3 rounded-sm px-3 font-medium transition-colors',
                  active ? 'bg-noche text-blanco' : 'text-grafito hover:bg-gis hover:text-noche',
                )}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const tabClass = (active: boolean) =>
  cn(
    'type-caption relative flex h-16 flex-col items-center justify-center gap-1 font-semibold',
    active
      ? 'text-noche before:bg-rojo before:absolute before:inset-x-3 before:top-0 before:h-[3px]'
      : 'text-grafito-suave',
  );

/**
 * Below lg: a bar at the bottom with Inicio, Solicitudes and Productos within thumb reach, and
 * "Más" with the other sections in a sheet.
 */
export function AdminBottomNav() {
  const { staff } = useAdminSession();
  const current = activeSection(usePathname());
  const [open, setOpen] = useState(false);
  const sections = sectionsFor(staff.role);
  const primary = sections.filter((section) => section.primary);
  const more = sections.filter((section) => !section.primary);
  const moreActive = more.some((section) => section.id === current);

  return (
    <>
      <nav
        aria-label={NAV_LABEL}
        className="border-linea fixed inset-x-0 bottom-0 z-40 border-t bg-blanco pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="grid grid-cols-4">
          {primary.map((section) => {
            const Icon = icons[section.id];
            const active = section.id === current;
            return (
              <li key={section.id}>
                <Link
                  href={section.href}
                  aria-current={active ? 'page' : undefined}
                  className={tabClass(active)}
                >
                  <Icon aria-hidden="true" className="size-6" />
                  {section.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={open}
              onClick={() => setOpen(true)}
              className={cn(tabClass(moreActive), 'w-full')}
            >
              <Menu aria-hidden="true" className="size-6" />
              Más
            </button>
          </li>
        </ul>
      </nav>
      <Sheet open={open} onClose={() => setOpen(false)} title="Más secciones">
        <p className="type-small text-grafito mb-3">
          {staff.fullName} · {roleLabels[staff.role]}
        </p>
        <ul className="flex flex-col gap-1">
          {more.map((section) => {
            const Icon = icons[section.id];
            const active = section.id === current;
            return (
              <li key={section.id}>
                <Link
                  href={section.href}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'type-body flex h-12 items-center gap-3 rounded-sm px-3 font-medium',
                    active ? 'bg-noche text-blanco' : 'text-noche hover:bg-gis',
                  )}
                >
                  <Icon aria-hidden="true" className="size-5 shrink-0" />
                  {section.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
}
