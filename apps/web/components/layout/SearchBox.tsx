'use client';

import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { cx } from '@/lib/cx';
import { ROUTES } from '@/lib/navigation';
import { MIN_QUERY_LENGTH, searchHref, useCatalogSearch } from '@/lib/search-client';

const DEBOUNCE_MS = 150;

type Option = { id: string; label: string; detail?: string; href: string };

type SearchBoxProps = {
  variant: 'desktop' | 'mobile';
  initialQuery?: string;
  autoFocus?: boolean;
  /** Mobile: Escape on an empty field leaves search mode. */
  onEscape?: () => void;
};

/**
 * Catalog search field (APP-FLOW §3.3, combobox pattern). From 2 characters and after 150 ms it
 * suggests up to 6 products and 3 categories; arrows move, Enter opens the highlighted
 * suggestion or the results at /buscar?q=…, Escape closes the list. catalog.json loads the
 * first time the field gets focus.
 */
export function SearchBox({ variant, initialQuery = '', autoFocus, onEscape }: SearchBoxProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [wanted, setWanted] = useState(Boolean(autoFocus));
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const { catalog, api, search } = useCatalogSearch(wanted);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);

  const options = useMemo<Option[]>(() => {
    const q = debounced.trim();
    if (!api || !search || !catalog || q.length < MIN_QUERY_LENGTH) return [];
    const { products, categories } = api.searchSuggestions(search, catalog, q);
    return [
      ...products.map((p) => ({
        id: `p-${p.id}`,
        label: p.name,
        detail: p.brand.name,
        href: ROUTES.product(p.slug),
      })),
      ...categories.map((c) => ({
        id: `c-${c.slug}`,
        label: c.name,
        detail: 'Categoría',
        href: c.parent ? ROUTES.subcategory(c.parent, c.slug) : ROUTES.category(c.slug),
      })),
    ];
  }, [api, search, catalog, debounced]);

  const expanded = listOpen && focused && options.length > 0;
  const productCount = options.filter((o) => o.id.startsWith('p-')).length;

  function go(href: string) {
    setListOpen(false);
    input.current?.blur();
    router.push(href);
  }

  function submit() {
    const q = value.trim();
    if (q.length === 0) return;
    go(searchHref(q));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && options.length) {
      event.preventDefault();
      setListOpen(true);
      setActive((i) => (i + 1) % options.length);
    } else if (event.key === 'ArrowUp' && options.length) {
      event.preventDefault();
      setListOpen(true);
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = expanded ? options[active] : undefined;
      if (option) go(option.href);
      else submit();
    } else if (event.key === 'Escape') {
      if (expanded) {
        event.preventDefault();
        event.stopPropagation();
        setListOpen(false);
        setActive(-1);
      } else if (onEscape) {
        event.preventDefault();
        onEscape();
      }
    }
  }

  const renderOption = (option: Option, index: number) => (
    <li
      key={option.id}
      id={`${listId}-${option.id}`}
      role="option"
      aria-selected={index === active}
      onPointerDown={(event) => event.preventDefault()}
      onClick={() => go(option.href)}
      onPointerMove={() => setActive(index)}
      className={cx(
        'text-noche flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 text-[15px]',
        index === active && 'bg-gis',
      )}
    >
      <span className="truncate">{option.label}</span>
      {option.detail && (
        <span className="type-caption text-grafito-suave shrink-0">{option.detail}</span>
      )}
    </li>
  );

  return (
    <form
      role="search"
      action={ROUTES.search}
      method="get"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className={cx(
        'relative flex min-w-0 grow items-center gap-2 px-3',
        'bg-blanco text-grafito-suave h-11 rounded-sm',
        // The focus ring goes around the whole field, not inside it around the text.
        'has-[input:focus-visible]:shadow-[0_0_0_5px_var(--color-noche)] has-[input:focus-visible]:outline-[3px] has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-lima has-[input:focus-visible]:outline-solid',
      )}
    >
      <button type="submit" aria-label="Buscar" className="flex h-11 shrink-0 items-center">
        <Search aria-hidden="true" className="size-5" />
      </button>
      <input
        ref={input}
        type="search"
        name="q"
        value={value}
        autoFocus={autoFocus}
        autoComplete="off"
        enterKeyHint="search"
        placeholder="Busca en el catálogo"
        aria-label="Busca en el catálogo"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={
          expanded && active >= 0 ? `${listId}-${options[active]?.id}` : undefined
        }
        onChange={(event) => {
          setValue(event.target.value);
          setListOpen(true);
          setActive(-1);
          setWanted(true);
        }}
        onFocus={() => {
          setFocused(true);
          setWanted(true);
          setListOpen(true);
        }}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        className="text-noche placeholder:text-grafito-suave min-w-0 grow border-0 bg-transparent text-[15px] outline-none focus-visible:shadow-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Borrar búsqueda"
          onClick={() => {
            setValue('');
            input.current?.focus();
          }}
          className="text-grafito-suave flex size-9 shrink-0 items-center justify-center"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      )}
      <div
        className={cx(
          'bg-blanco shadow-float absolute z-50 py-2',
          variant === 'desktop' ? 'top-full right-0 left-0 mt-1' : 'fixed inset-x-0 top-16',
          !expanded && 'hidden',
        )}
      >
        <ul id={listId} role="listbox" aria-label="Sugerencias">
          {productCount > 0 && (
            <li role="presentation" className="type-eyebrow text-grafito-suave px-4 py-1.5">
              Productos
            </li>
          )}
          {options.slice(0, productCount).map((option, index) => renderOption(option, index))}
          {options.length > productCount && (
            <li role="presentation" className="type-eyebrow text-grafito-suave px-4 pt-3 pb-1.5">
              Categorías
            </li>
          )}
          {options
            .slice(productCount)
            .map((option, index) => renderOption(option, productCount + index))}
        </ul>
      </div>
    </form>
  );
}
