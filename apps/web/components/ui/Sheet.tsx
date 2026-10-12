'use client';

import { X } from 'lucide-react';
import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@/lib/cx';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type SheetProps = {
  open: boolean;
  onClose: () => void;
  /** Visible title; also names the dialog. */
  title: string;
  children: ReactNode;
  /** Sticky actions at the bottom, e.g. "Limpiar" and "Ver 6 productos". */
  footer?: ReactNode;
  /** Desktop presentation: side panel (filters) or centered window (personalization). */
  desktop?: 'side' | 'center';
  /** Label of the close button. */
  closeLabel?: string;
};

/**
 * Modal sheet (UI/UX §7.8): bottom sheet on mobile over a noche veil at 60 %, side panel or
 * centered window from lg. Traps focus, closes with Escape or the veil, and returns focus to
 * the element that opened it.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  desktop = 'side',
  closeLabel = 'Cerrar',
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const container = panel?.closest<HTMLElement>('[data-sheet-root]');

    // Make the rest of the page inert and stop it from scrolling while the sheet is open.
    const background = [...document.body.children].filter(
      (element): element is HTMLElement => element instanceof HTMLElement && element !== container,
    );
    const wasInert = background.map((element) => element.inert);
    background.forEach((element) => (element.inert = true));
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    return () => {
      background.forEach((element, index) => (element.inert = wasInert[index] ?? false));
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, [open]);

  if (!open) return null;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !panelRef.current) return;
    const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div data-sheet-root="" className="fixed inset-0 z-50">
      <div aria-hidden="true" className="bg-noche/60 absolute inset-0" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        className={cx(
          'bg-blanco shadow-float absolute flex flex-col',
          'animate-sheet-up inset-x-0 bottom-0 max-h-[90dvh]',
          desktop === 'side'
            ? 'lg:animate-sheet-side lg:inset-y-0 lg:right-auto lg:left-0 lg:max-h-none lg:w-[400px]'
            : 'lg:animate-fade-in lg:inset-auto lg:top-1/2 lg:left-1/2 lg:max-h-[85dvh] lg:w-[560px] lg:-translate-x-1/2 lg:-translate-y-1/2',
        )}
      >
        <div className="border-linea flex items-center justify-between gap-4 border-b py-2 pr-2 pl-4">
          <h2 id={titleId} className="type-h3">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="text-noche inline-flex size-11 items-center justify-center"
          >
            <X aria-hidden="true" className="size-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && <div className="border-linea border-t px-4 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
