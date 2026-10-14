'use client';

import { usePathname } from 'next/navigation';
import { ROUTES } from '@/lib/navigation';
import { WhatsAppGlyph } from './WhatsAppGlyph';

/**
 * Floating WhatsApp button (UI/UX §7.1): a 56 px circle on mobile, a pill with "¿Dudas?
 * Escríbenos" from lg. Hidden on /cotizacion, where the main action is already WhatsApp.
 * It rises 72 px over the QuoteBar once that exists (T3.3).
 */
export function WhatsAppFab({ href }: { href: string }) {
  const pathname = usePathname();
  if (pathname.startsWith(ROUTES.quote)) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      // Contains the visible text of the desktop pill (label in name).
      aria-label="¿Dudas? Escríbenos por WhatsApp"
      className="bg-whatsapp text-noche shadow-float fixed right-4 bottom-[calc(1rem+var(--bottom-bar,0px))] z-30 inline-flex size-14 items-center justify-center rounded-full no-underline lg:right-8 lg:bottom-8 lg:w-auto lg:gap-2.5 lg:pr-5 lg:pl-4"
    >
      <WhatsAppGlyph size={28} className="lg:size-6" />
      <span className="type-body-strong hidden lg:inline">¿Dudas? Escríbenos</span>
    </a>
  );
}
