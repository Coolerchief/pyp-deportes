'use client';

import { ChevronDown, ChevronRight, ClipboardList, Clock, Phone } from 'lucide-react';
import Link from 'next/link';
import { useId, useState } from 'react';
import { Button } from '@/components/ui';
import { type NavLink, ROUTES, type SiteNav } from '@/lib/navigation';
import { WhatsAppGlyph } from './WhatsAppGlyph';

const ROW =
  'font-display text-noche flex h-[52px] w-full items-center justify-between text-[24px] leading-none font-extrabold italic uppercase no-underline';
const SUBLINK = 'text-noche flex min-h-11 items-center py-1 leading-tight font-medium no-underline';

type Section = 'sports' | 'categories';

/**
 * Mobile menu (`menu`, `menu-categorias`): full screen under the header. Deportes and
 * Categorías are accordions, one open at a time; choosing a destination closes the menu.
 */
export function MobileMenu({
  id,
  nav,
  onNavigate,
}: {
  id: string;
  nav: SiteNav;
  onNavigate: () => void;
}) {
  const [openSection, setOpenSection] = useState<Section | null>(null);
  const baseId = useId();
  const { contact, pages } = nav;

  function accordion(section: Section, label: string, links: NavLink[]) {
    // No published products yet (production before phase 7): nothing to list.
    if (links.length === 0) return null;
    const open = openSection === section;
    const panelId = `${baseId}-${section}`;
    const Chevron = open ? ChevronDown : ChevronRight;
    return (
      <li className={open ? 'border-linea border-b pb-2' : 'border-linea border-b'}>
        <button
          type="button"
          className={ROW}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpenSection(open ? null : section)}
        >
          {label}
          <Chevron aria-hidden="true" className="size-[22px]" />
        </button>
        <ul id={panelId} hidden={!open} className="grid grid-cols-2 gap-x-4">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={SUBLINK} onClick={onNavigate}>
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={ROUTES.catalog}
              className={`${SUBLINK} text-rojo-profundo font-semibold`}
              onClick={onNavigate}
            >
              Ver todo
            </Link>
          </li>
        </ul>
      </li>
    );
  }

  return (
    <div
      id={id}
      className="bg-blanco fixed inset-x-0 top-16 bottom-0 z-40 flex flex-col overflow-y-auto lg:hidden"
    >
      <nav aria-label="Menú" className="px-4 pt-2">
        <ul>
          <li className="border-linea border-b">
            <Link href={ROUTES.home} className={ROW} onClick={onNavigate}>
              Inicio
            </Link>
          </li>
          {accordion('sports', 'Deportes', nav.sports)}
          {accordion('categories', 'Categorías', nav.categories)}
          {[pages.uniforms, pages.teams, pages.visit].map((link) => (
            <li key={link.href} className="border-linea border-b">
              <Link href={link.href} className={ROW} onClick={onNavigate}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="bg-noche cancha text-blanco mt-5 flex grow flex-col gap-3 px-4 pt-5 pb-6">
        <Button
          variant="whatsapp"
          size="lg"
          href={contact.whatsappUrl}
          external
          fullWidth
          icon={<WhatsAppGlyph size={22} />}
        >
          Cotiza por WhatsApp
        </Button>
        <Button
          variant="outline"
          tone="dark"
          href={ROUTES.quote}
          fullWidth
          onClick={onNavigate}
          icon={<ClipboardList aria-hidden="true" className="size-5" />}
        >
          Mi cotización
        </Button>
        <ul className="type-small flex flex-col gap-1.5 pt-1">
          {contact.hours && (
            <li className="flex gap-2">
              <Clock aria-hidden="true" className="text-lima size-[18px] shrink-0" />
              {contact.hours}
            </li>
          )}
          {contact.phone && contact.phoneHref && (
            <li className="flex gap-2">
              <Phone aria-hidden="true" className="text-lima size-[18px] shrink-0" />
              <a href={contact.phoneHref} className="text-blanco no-underline">
                {contact.phone}
              </a>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
