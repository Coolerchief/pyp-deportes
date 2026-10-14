'use client';

import { useEffect } from 'react';

export const UNDO_MS = 5000;

/**
 * "Quitaste {producto}" with "Deshacer" for 5 s (APP-FLOW §4.2). A new removal replaces the
 * previous notice (its own 5 s start again).
 */
export function UndoNotice({
  message,
  onUndo,
  onDismiss,
}: {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, UNDO_MS);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div
      role="status"
      className="bg-noche text-blanco shadow-float fixed inset-x-4 bottom-4 z-30 flex items-center justify-between gap-3 px-4 py-2 lg:inset-x-auto lg:left-1/2 lg:w-[420px] lg:-translate-x-1/2"
    >
      <span className="type-small">{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="text-lima type-body-strong min-h-11 shrink-0 px-2"
      >
        Deshacer
      </button>
    </div>
  );
}
