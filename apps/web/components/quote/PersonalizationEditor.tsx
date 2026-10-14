'use client';

import { piecesText, QUOTE_LIMITS, type QuoteGroup } from '@pyp/shared';
import { Info, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Button, Sheet } from '@/components/ui';

type PersonalizationEditorProps = {
  group: QuoteGroup;
  onSave: (personalize: boolean, notes: string) => void;
  onClose: () => void;
};

/**
 * PersonalizationEditor (UI/UX §7.6, `cotizacion-editar-personalizacion`): bottom sheet on
 * mobile, centered window on desktop. Saving updates every line of the product; an empty text
 * or "Quitar personalización" removes it; "Cancelar", × or Escape discard the changes.
 */
export function PersonalizationEditor({ group, onSave, onClose }: PersonalizationEditorProps) {
  const [notes, setNotes] = useState(group.notes);
  const hintId = useId();
  const fieldId = useId();
  return (
    <Sheet
      open
      onClose={onClose}
      title="Personalización"
      desktop="center"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => onSave(notes.trim() !== '', notes)}>
            Guardar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col">
          <span className="type-body-strong">{group.snapshot.name}</span>
          <span className="type-caption text-grafito-suave text-[13px]">
            {group.snapshot.sku} · {piecesText(group.pieces)}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={fieldId} className="type-body-strong">
            ¿Cómo lo quieres?
          </label>
          <textarea
            id={fieldId}
            aria-describedby={hintId}
            value={notes}
            maxLength={QUOTE_LIMITS.itemNotesMax}
            rows={4}
            placeholder="Escudo, nombres, números, colores del club…"
            onChange={(event) => setNotes(event.target.value)}
            className="border-borde-control type-body rounded-sm border p-3"
          />
          <span id={hintId} className="type-caption text-grafito-suave flex justify-between">
            <span>Escudo, nombres, números y colores del club.</span>
            <span>
              {notes.length} / {QUOTE_LIMITS.itemNotesMax}
            </span>
          </span>
        </div>
        <p className="type-small text-grafito flex items-start gap-2">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Te enviamos una prueba digital antes de producir.
        </p>
        {group.personalize && (
          <button
            type="button"
            onClick={() => onSave(false, '')}
            className="text-rojo-profundo type-small flex min-h-11 items-center gap-1.5 self-start font-semibold"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Quitar personalización
          </button>
        )}
      </div>
    </Sheet>
  );
}
