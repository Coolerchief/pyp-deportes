'use client';

import { SORT_LABELS, SORT_OPTIONS, type SortOption } from '@pyp/shared';
import { Check, ChevronDown } from 'lucide-react';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { Sheet } from '@/components/ui';
import { cx } from '@/lib/cx';

type SortProps = { value: SortOption; onChange: (sort: SortOption) => void };

/** Mobile (`catalogo-ordenar`): "Destacados ▾" opens a bottom sheet with radio buttons. */
export function SortSheet({ value, onChange }: SortProps) {
  const [open, setOpen] = useState(false);
  const name = useId();
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="text-noche inline-flex h-10 items-center gap-1 text-[15px] font-semibold"
      >
        <span className="sr-only">Ordenar por: </span>
        {SORT_LABELS[value]}
        <ChevronDown aria-hidden="true" className="size-5" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Ordenar por">
        <fieldset>
          <legend className="sr-only">Ordenar por</legend>
          {SORT_OPTIONS.map((option) => (
            <label
              key={option}
              className="border-linea flex min-h-12 cursor-pointer items-center gap-3 border-b text-base last:border-b-0"
            >
              <input
                type="radio"
                name={name}
                checked={value === option}
                onChange={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className="accent-noche size-5"
              />
              {SORT_LABELS[option]}
            </label>
          ))}
        </fieldset>
      </Sheet>
    </>
  );
}

/**
 * Desktop: "Ordenar por [Destacados ▾]" opens a listbox under the button. Arrow keys move,
 * Enter or Space choose, Escape or a click outside close and focus returns to the button.
 */
export function SortMenu({ value, onChange }: SortProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(SORT_OPTIONS.indexOf(value));
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  function openList() {
    setActive(SORT_OPTIONS.indexOf(value));
    setOpen(true);
  }

  function choose(option: SortOption) {
    onChange(option);
    setOpen(false);
    button.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const last = SORT_OPTIONS.length - 1;
    const keys: Record<string, () => void> = {
      ArrowDown: () => setActive((i) => Math.min(i + 1, last)),
      ArrowUp: () => setActive((i) => Math.max(i - 1, 0)),
      Home: () => setActive(0),
      End: () => setActive(last),
      Enter: () => choose(SORT_OPTIONS[active] ?? value),
      ' ': () => choose(SORT_OPTIONS[active] ?? value),
      Escape: () => {
        setOpen(false);
        button.current?.focus();
      },
      Tab: () => setOpen(false),
    };
    const action = keys[event.key];
    if (!action) return;
    if (event.key !== 'Tab') event.preventDefault();
    action();
  }

  return (
    <div ref={root} className="relative flex items-center gap-2 text-[15px]">
      <span id={`${id}-label`} className="text-grafito-suave">
        Ordenar por
      </span>
      <button
        ref={button}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => (open ? setOpen(false) : openList())}
        className="text-noche inline-flex h-10 items-center gap-1 font-semibold"
      >
        <span id={`${id}-value`}>{SORT_LABELS[value]}</span>
        <ChevronDown aria-hidden="true" className="size-5" />
      </button>
      {open && (
        <ul
          ref={list}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={`${id}-label`}
          aria-activedescendant={`${id}-${SORT_OPTIONS[active]}`}
          onKeyDown={onKeyDown}
          className="bg-blanco shadow-float absolute top-full right-0 z-20 mt-1 w-56 py-1 outline-none"
        >
          {SORT_OPTIONS.map((option, index) => (
            <li
              key={option}
              id={`${id}-${option}`}
              role="option"
              aria-selected={value === option}
              onClick={() => choose(option)}
              onPointerMove={() => setActive(index)}
              className={cx(
                'flex min-h-10 cursor-pointer items-center justify-between px-4',
                index === active && 'bg-gis',
                value === option && 'font-semibold',
              )}
            >
              {SORT_LABELS[option]}
              {value === option && <Check aria-hidden="true" className="size-4" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
