import { mexicoCityYear } from '@pyp/shared';
import { Clock, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import { DobleDiagonal, Logo } from '@/components/brand';
import { type NavLink, ROUTES, type SiteNav } from '@/lib/navigation';

const COLUMN_TITLE = 'type-eyebrow text-lima text-[14px]';
const LINK = 'text-blanco text-[15px] no-underline hover:underline';

function ExternalLink({ link }: { link: NavLink }) {
  return (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className={LINK}>
      {link.label}
    </a>
  );
}

/**
 * Footer (UI/UX §7.3): PatronCancha on noche. Address, hours and phone come from `stores`, the
 * social accounts from `settings.social`. Mobile stacks it; desktop uses 4 columns.
 */
export function SiteFooter({ nav, year = mexicoCityYear() }: { nav: SiteNav; year?: number }) {
  const { contact, pages } = nav;
  const social = [contact.instagram, contact.facebook].filter((link) => link !== null);

  return (
    <footer className="bg-noche cancha text-blanco">
      <div className="container-page flex flex-col gap-6 pt-12 pb-8 lg:gap-12 lg:pt-16 lg:pb-10">
        {/* Mobile */}
        <div className="flex flex-col gap-6 lg:hidden">
          <Logo variant="vertical" tone="negativo" width={150} />
          <ul className="flex flex-col gap-2 text-[15px] leading-[1.45]">
            <li className="flex gap-2">
              <MapPin aria-hidden="true" className="text-lima mt-0.5 size-[18px] shrink-0" />
              {contact.addressLine}
            </li>
            {contact.hours && (
              <li className="flex gap-2">
                <Clock aria-hidden="true" className="text-lima mt-0.5 size-[18px] shrink-0" />
                {contact.hours}
              </li>
            )}
            {contact.phone && contact.phoneHref && (
              <li className="flex gap-2">
                <Phone aria-hidden="true" className="text-lima mt-0.5 size-[18px] shrink-0" />
                <a href={contact.phoneHref} className={LINK}>
                  {contact.phone}
                </a>
              </li>
            )}
          </ul>
          <nav aria-label="Pie de página">
            <ul className="grid grid-cols-2 gap-3">
              <li>
                <Link href={ROUTES.catalog} className={LINK}>
                  Catálogo
                </Link>
              </li>
              <li>
                <Link href={pages.uniforms.href} className={LINK}>
                  Uniformes
                </Link>
              </li>
              <li>
                <Link href={pages.teams.href} className={LINK}>
                  {pages.teams.label}
                </Link>
              </li>
              <li>
                <Link href={pages.visit.href} className={LINK}>
                  {pages.visit.label}
                </Link>
              </li>
              {contact.instagram && (
                <li>
                  <ExternalLink
                    link={{ ...contact.instagram, label: `Instagram ${contact.instagram.label}` }}
                  />
                </li>
              )}
              {contact.facebook && (
                <li>
                  <ExternalLink
                    link={{ ...contact.facebook, label: `Facebook ${contact.facebook.label}` }}
                  />
                </li>
              )}
              <li>
                <Link href={ROUTES.privacy} className={LINK}>
                  Aviso de privacidad
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Desktop */}
        <div className="hidden grid-cols-4 gap-8 lg:grid">
          <div>
            <Logo variant="vertical" tone="negativo" width={170} />
          </div>
          <nav aria-label="Catálogo" className="flex flex-col gap-3">
            <p className={COLUMN_TITLE}>Catálogo</p>
            {nav.sports.map((link) => (
              <Link key={link.href} href={link.href} className={LINK}>
                {link.label}
              </Link>
            ))}
            {nav.sports.length === 0 && (
              <Link href={ROUTES.catalog} className={LINK}>
                Ver catálogo
              </Link>
            )}
          </nav>
          <nav aria-label="P&P" className="flex flex-col gap-3">
            <p className={COLUMN_TITLE}>P&amp;P</p>
            <Link href={pages.uniforms.href} className={LINK}>
              Uniformes personalizados
            </Link>
            <Link href={pages.teams.href} className={LINK}>
              {pages.teams.label}
            </Link>
            <Link href={ROUTES.about} className={LINK}>
              Nosotros
            </Link>
            <Link href={ROUTES.privacy} className={LINK}>
              Aviso de privacidad
            </Link>
          </nav>
          <div className="flex flex-col gap-3 text-[15px] leading-[1.45]">
            <p className={COLUMN_TITLE}>Visítanos</p>
            <p>
              {contact.addressLines[0]}
              <br />
              {contact.addressLines[1]}
            </p>
            {contact.hoursLines.length > 0 && (
              <p>
                {contact.hoursLines.map((line, index) => (
                  <span key={line}>
                    {index > 0 && <br />}
                    {line}
                  </span>
                ))}
              </p>
            )}
            {contact.phone && contact.phoneHref && (
              <a href={contact.phoneHref} className={LINK}>
                {contact.phone}
              </a>
            )}
            {social.length > 0 && (
              <p className="flex flex-wrap gap-x-1">
                {social.map((link, index) => (
                  <span key={link.href}>
                    {index > 0 && <span aria-hidden="true">· </span>}
                    <ExternalLink link={link} />
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>

        <div className="border-grafito flex items-center justify-between border-t pt-4 lg:pt-5">
          <span className="text-[13px] lg:text-[14px]">
            © {year} {nav.siteName}
          </span>
          <DobleDiagonal height={24} className="text-lima" />
        </div>
      </div>
    </footer>
  );
}
