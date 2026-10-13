'use client';

import { ChevronDown, ChevronLeft, ClipboardList, Menu, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Logo } from '@/components/brand';
import { cx } from '@/lib/cx';
import { activeSection, ROUTES, type SiteNav } from '@/lib/navigation';
import { HeaderSearch } from './HeaderSearch';
import { MegaMenu } from './MegaMenu';
import { MobileMenu } from './MobileMenu';
import { useOverlay } from './useOverlay';

const ICON_BUTTON = 'text-blanco inline-flex h-11 w-11 items-center justify-center';
const DESKTOP_ITEM =
  'text-blanco type-body-strong inline-flex h-[72px] items-center gap-1 px-1 whitespace-nowrap no-underline';
const UNDERLINE_ACTIVE = 'shadow-[inset_0_-4px_0_var(--color-rojo)]';
const UNDERLINE_OPEN = 'shadow-[inset_0_-4px_0_var(--color-lima)]';

/** Pieces in the quote: "Mi cotización, 42 piezas"; without pieces, the icon goes alone. */
function quoteLabel(pieces: number): string {
  if (pieces <= 0) return 'Mi cotización';
  return `Mi cotización, ${pieces} ${pieces === 1 ? 'pieza' : 'piezas'}`;
}

function QuoteCount({ pieces }: { pieces: number }) {
  if (pieces <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className="placa bg-lima text-noche font-display inline-flex h-6 min-w-[30px] items-center justify-center px-2 text-base leading-none font-black italic [--placa-o:5px]"
    >
      {pieces}
    </span>
  );
}

/**
 * Site header (UI/UX §7.3), fixed on noche. Mobile (64 px): menu · logo · search · quote; it
 * compacts to 56 px with the monogram after scrolling. Desktop (72 px): logo · Deportes ▾ ·
 * Categorías ▾ · pages · search field · "Mi cotización". `pieces` comes from the quote store
 * in T3.1.
 */
export function SiteHeader({ nav, pieces = 0 }: { nav: SiteNav; pieces?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  // Mobile: the magnifier turns the header into the search field; /buscar opens with it.
  const [searchOpen, setSearchOpen] = useState(pathname === ROUTES.search);
  const [megaOpen, setMegaOpen] = useState(false);
  const [compact, setCompact] = useState(false);

  const mobileScope = useRef<HTMLDivElement>(null);
  const desktopScope = useRef<HTMLDivElement>(null);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const megaToggle = useRef<HTMLButtonElement | null>(null);
  const menuId = useId();
  const megaId = useId();

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const closeMega = useCallback(() => setMegaOpen(false), []);
  useOverlay({
    open: menuOpen,
    onClose: closeMenu,
    scopeRef: mobileScope,
    returnFocusRef: menuToggle,
  });
  useOverlay({
    open: megaOpen,
    onClose: closeMega,
    scopeRef: desktopScope,
    returnFocusRef: megaToggle,
  });

  // A new page closes whatever menu was open (state adjusted during render, not in an effect).
  const [shownPath, setShownPath] = useState(pathname);
  if (pathname !== shownPath) {
    setShownPath(pathname);
    setMenuOpen(false);
    setMegaOpen(false);
    setSearchOpen(pathname === ROUTES.search);
  }

  function closeSearch() {
    if (pathname === ROUTES.search) router.back();
    else setSearchOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 64);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const section = activeSection(pathname);
  const isCompact = compact && !menuOpen;

  function megaTrigger(label: string) {
    return (
      <button
        type="button"
        aria-expanded={megaOpen}
        aria-controls={megaId}
        onClick={(event) => {
          // Focus returns to whichever of the two triggers opened the panel.
          megaToggle.current = event.currentTarget;
          setMegaOpen((open) => !open);
        }}
        className={cx(DESKTOP_ITEM, megaOpen && UNDERLINE_OPEN)}
      >
        {label}
        <ChevronDown
          aria-hidden="true"
          className={cx('size-[18px] transition-transform', megaOpen && 'rotate-180')}
        />
      </button>
    );
  }

  return (
    <header className="bg-noche fixed inset-x-0 top-0 z-40">
      {/* Mobile */}
      <div ref={mobileScope} className="lg:hidden">
        {searchOpen ? (
          <div className="flex h-16 items-center gap-1 px-1.5">
            <button
              type="button"
              aria-label="Cerrar búsqueda"
              onClick={closeSearch}
              className={ICON_BUTTON}
            >
              <ChevronLeft aria-hidden="true" className="size-6" />
            </button>
            <HeaderSearch
              variant="mobile"
              autoFocus={pathname !== ROUTES.search}
              onEscape={closeSearch}
            />
            <Link
              href={ROUTES.quote}
              aria-label={quoteLabel(pieces)}
              className={cx(ICON_BUTTON, 'relative w-12 shrink-0')}
            >
              <ClipboardList aria-hidden="true" className="size-6" />
            </Link>
          </div>
        ) : (
          <div
            className={cx(
              'flex items-center justify-between px-1.5 transition-[height] duration-150',
              isCompact ? 'h-14' : 'h-16',
            )}
          >
            <button
              ref={menuToggle}
              type="button"
              className={ICON_BUTTON}
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label={menuOpen ? 'Cerrar menú' : 'Menú'}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <X aria-hidden="true" className="size-6" />
              ) : (
                <Menu aria-hidden="true" className="size-6" />
              )}
            </button>
            <Link href={ROUTES.home} aria-label="P&P Deportes Coapa, inicio" className="flex">
              {isCompact ? (
                // Separate keys: reusing one <img> would stretch the old file while the new loads.
                <Logo key="monograma" variant="monograma" tone="negativo" width={64} alt="" />
              ) : (
                <Logo
                  key="horizontal"
                  variant="horizontal"
                  tone="negativo"
                  width={158}
                  alt=""
                  priority
                />
              )}
            </Link>
            <div className="flex items-center">
              <button
                type="button"
                aria-label="Buscar"
                onClick={() => {
                  setMenuOpen(false);
                  setSearchOpen(true);
                }}
                className={ICON_BUTTON}
              >
                <Search aria-hidden="true" className="size-6" />
              </button>
              <Link
                href={ROUTES.quote}
                aria-label={quoteLabel(pieces)}
                className={cx(ICON_BUTTON, 'relative w-12')}
              >
                <ClipboardList aria-hidden="true" className="size-6" />
                {pieces > 0 && (
                  <span className="absolute top-0 right-0">
                    <QuoteCount pieces={pieces} />
                  </span>
                )}
              </Link>
            </div>
          </div>
        )}
        {menuOpen && <MobileMenu id={menuId} nav={nav} onNavigate={closeMenu} />}
      </div>

      {/* Desktop */}
      <div ref={desktopScope} className="relative hidden lg:block">
        <div className="container-page flex h-[72px] items-center gap-8">
          <Link
            href={ROUTES.home}
            aria-label="P&P Deportes Coapa, inicio"
            className="flex shrink-0"
          >
            <Logo variant="horizontal" tone="negativo" width={196} alt="" priority />
          </Link>
          <nav aria-label="Principal" className="flex shrink-0 gap-5">
            {megaTrigger('Deportes')}
            {megaTrigger('Categorías')}
            <Link
              href={nav.pages.uniforms.href}
              className={cx(DESKTOP_ITEM, section === 'uniforms' && UNDERLINE_ACTIVE)}
              aria-current={section === 'uniforms' ? 'page' : undefined}
            >
              Uniformes
            </Link>
            <Link
              href={nav.pages.teams.href}
              className={cx(DESKTOP_ITEM, section === 'teams' && UNDERLINE_ACTIVE)}
              aria-current={section === 'teams' ? 'page' : undefined}
            >
              Equipos
            </Link>
            <Link
              href={nav.pages.visit.href}
              className={cx(DESKTOP_ITEM, section === 'visit' && UNDERLINE_ACTIVE)}
              aria-current={section === 'visit' ? 'page' : undefined}
            >
              Visítanos
            </Link>
          </nav>
          <HeaderSearch variant="desktop" />
          <Link
            href={ROUTES.quote}
            aria-label={pieces > 0 ? quoteLabel(pieces) : undefined}
            className="text-blanco type-body-strong inline-flex h-11 shrink-0 items-center gap-2.5 whitespace-nowrap no-underline"
          >
            <ClipboardList aria-hidden="true" className="size-6" />
            Mi cotización
            <QuoteCount pieces={pieces} />
          </Link>
        </div>
        {megaOpen && (
          <>
            <MegaMenu id={megaId} nav={nav} onNavigate={closeMega} />
            <div
              aria-hidden="true"
              className="bg-noche/60 fixed inset-x-0 top-[72px] bottom-0 -z-10"
              onClick={closeMega}
            />
          </>
        )}
      </div>
    </header>
  );
}
