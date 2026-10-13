'use client';

import { type RefObject, useEffect } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type OverlayOptions = {
  open: boolean;
  onClose: () => void;
  /** Tab stays inside this element: the header row with its toggle plus the open panel. */
  scopeRef: RefObject<HTMLElement | null>;
  /** Gets the focus back when the overlay closes (the button that opened it). */
  returnFocusRef: RefObject<HTMLElement | null>;
};

/**
 * Keyboard behavior of the mobile menu and the mega menu (UI/UX §11): Escape closes, Tab and
 * Shift+Tab cycle inside the scope, the page behind does not scroll, and focus returns to the
 * toggle when the overlay closes.
 */
export function useOverlay({ open, onClose, scopeRef, returnFocusRef }: OverlayOptions) {
  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const returnTo = returnFocusRef.current;
    const scope = scopeRef.current;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !scope) return;
      const focusable = [...scope.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (!scope.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      // Back to the toggle unless the user already moved focus elsewhere (e.g. a new page).
      if (
        returnTo &&
        (!document.activeElement ||
          document.activeElement === document.body ||
          scope?.contains(document.activeElement))
      ) {
        returnTo.focus();
      }
    };
  }, [open, onClose, scopeRef, returnFocusRef]);
}
