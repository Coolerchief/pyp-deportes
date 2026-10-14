'use client';

import {
  activeFilterCount,
  applyFilters,
  audienceLabels,
  type CatalogProduct,
  EMPTY_FILTERS,
  facetCounts,
  FILTER_KEYS,
  type FilterKey,
  LISTING_SORTS,
  LISTING_PAGE_SIZE,
  type ListingFilters,
  type ListingScope,
  type ListingState,
  listingProducts,
  parseListingParams,
  type ParamReader,
  type SortSettings,
  productCount,
  serializeListingParams,
  sortProducts,
  toggleFilter,
} from '@pyp/shared';
import { SlidersHorizontal } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { WhatsAppGlyph } from '@/components/layout/WhatsAppGlyph';
import { Button, Chip, EmptyState, Sheet } from '@/components/ui';
import { useCatalog } from '@/lib/catalog-client';
import { useRememberListing } from '@/lib/commerce/added-notice';
import {
  type FacetLabels,
  buildFacetGroups,
  fixedGroup,
  type SerializedCounts,
  serializeCounts,
} from '@/lib/facets';
import { CHIP_ROW, chipStyle } from './chip-style';
import { FilterPanel } from './FilterPanel';
import { ProductGrid, ProductGridSkeleton } from './ProductGrid';
import { SortMenu, SortSheet } from './SortControl';

/** A chip of the sport and brand pages: "Todo" or one category, applied as ?categoria=. */
export type ListingTab = { label: string; category: string | null };

export type ListingResultsProps = {
  scope: ListingScope;
  /** Path of the listing, where the query string is written. */
  basePath: string;
  title: string;
  total: number;
  /** First batch in the default order: what the static HTML shows. */
  initialProducts: CatalogProduct[];
  /** Option counts of the whole listing without filters (the panel before catalog.json). */
  scopeCounts: SerializedCounts;
  labels: FacetLabels;
  categoryNames: Record<string, string>;
  newIds: string[];
  tabs?: ListingTab[];
  whatsappUrl: string;
  /**
   * Search: every result, by relevance. The products come from here instead of `scope` and
   * catalog.json, and the option counts are computed from them.
   */
  sourceProducts?: CatalogProduct[];
  /** Orders offered and the default one (search adds "Relevancia"). */
  sorts?: SortSettings;
};

/** Interactive listing: reads the filters and order from the URL (APP-FLOW §3.2). */
export function ListingResults(props: ListingResultsProps) {
  const params = useSearchParams();
  useRememberListing();
  return <Results {...props} query={params} />;
}

/** What the static HTML carries: the first batch, before the URL is read in the browser. */
export function ListingResultsStatic(props: ListingResultsProps) {
  return <Results {...props} query={null} />;
}

function Results({
  scope,
  basePath,
  title,
  total,
  initialProducts,
  scopeCounts,
  labels,
  categoryNames,
  newIds,
  tabs = [],
  whatsappUrl,
  sourceProducts,
  sorts = LISTING_SORTS,
  query,
}: ListingResultsProps & { query: ParamReader | null }) {
  // The URL is the source of truth, but Next updates useSearchParams a moment after
  // replaceState: a local copy changes at once (no checkbox flicker) and follows the URL when it
  // changes from outside (back button, a link with ?categoria=).
  const queryString = query?.toString() ?? '';
  const [state, setState] = useState<ListingState>(() => parseListingParams(query ?? '', sorts));
  const [shownQuery, setShownQuery] = useState(queryString);
  // "Cargar más" grows the page; a new filter or order starts over at 24.
  const [visible, setVisible] = useState(LISTING_PAGE_SIZE);
  if (shownQuery !== queryString) {
    setShownQuery(queryString);
    const fromUrl = parseListingParams(query ?? '', sorts);
    if (
      serializeListingParams(fromUrl, sorts.default) !==
      serializeListingParams(state, sorts.default)
    ) {
      setState(fromUrl);
      setVisible(LISTING_PAGE_SIZE);
    }
  }
  const { filters, sort } = state;
  const stateKey = serializeListingParams(state, sorts.default);
  const filterCount = activeFilterCount(filters);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<ListingFilters>(EMPTY_FILTERS);

  const needsCatalog =
    query !== null &&
    !sourceProducts &&
    (filterCount > 0 || sort !== sorts.default || visible > LISTING_PAGE_SIZE || sheetOpen);
  const { catalog, status, retry } = useCatalog(needsCatalog);

  const scopeProducts = useMemo(
    () => sourceProducts ?? (catalog ? listingProducts(catalog, scope) : null),
    [sourceProducts, catalog, scope],
  );
  const baseCounts = useMemo(
    () =>
      sourceProducts ? serializeCounts(facetCounts(sourceProducts, EMPTY_FILTERS)) : scopeCounts,
    [sourceProducts, scopeCounts],
  );
  const results = useMemo(
    () => (scopeProducts ? sortProducts(applyFilters(scopeProducts, filters), sort) : null),
    // filters and sort are summed up by stateKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scopeProducts, stateKey],
  );
  const newIdSet = useMemo(() => new Set(newIds), [newIds]);

  const loading = needsCatalog && status !== 'ready' && status !== 'error';
  const failed = needsCatalog && status === 'error';
  const products = results ? results.slice(0, visible) : initialProducts;
  const matching = results?.length ?? total;

  function update(next: ListingState) {
    setState(next);
    setVisible(LISTING_PAGE_SIZE);
    // Next keeps useSearchParams in sync with the History API; no reload, no new entry.
    const query = serializeListingParams(next, sorts.default);
    // basePath may carry its own query (/buscar?q=…): append to it.
    const url =
      basePath.includes('?') && query ? `${basePath}&${query.slice(1)}` : `${basePath}${query}`;
    window.history.replaceState(null, '', url);
  }
  const setFilters = (next: ListingFilters) => update({ filters: next, sort });

  const panelProps = (current: ListingFilters, onChange: (f: ListingFilters) => void) => {
    const counts = scopeProducts
      ? serializeCounts(facetCounts(scopeProducts, current))
      : baseCounts;
    return {
      groups: buildFacetGroups(counts, baseCounts, current, labels, fixedGroup(scope.kind)),
      personalizableCount: counts.personalizable,
      showPersonalizable: baseCounts.personalizable > 0,
      filters: current,
      onToggle: (key: FilterKey, value: string) => onChange(toggleFilter(current, key, value)),
      onTogglePersonalizable: () =>
        onChange({ ...current, personalizable: !current.personalizable }),
    };
  };

  const labelOf = (key: FilterKey, value: string) =>
    key === 'para'
      ? (audienceLabels[value as keyof typeof audienceLabels] ?? value)
      : (labels[key][value] ?? value);
  const activeChips = [
    ...(filters.personalizable
      ? [
          {
            id: 'personalizable',
            label: 'Personalizable',
            remove: () => setFilters({ ...filters, personalizable: false }),
          },
        ]
      : []),
    ...FILTER_KEYS.flatMap((key) =>
      (filters[key] as string[]).map((value) => ({
        id: `${key}-${value}`,
        label: labelOf(key, value),
        remove: () => setFilters(toggleFilter(filters, key, value)),
      })),
    ),
  ];

  const draftCount = scopeProducts ? applyFilters(scopeProducts, draft).length : null;
  const emptyDescription = sourceProducts
    ? 'Quita alguno o límpialos para ver todos los resultados.'
    : scope.kind === 'all'
      ? 'Quita alguno o límpialos para ver todo el catálogo.'
      : `Quita alguno o límpialos para ver todo lo de ${title}.`;

  return (
    <div className="flex flex-col gap-4 lg:gap-7">
      {tabs.length > 1 && (
        <nav aria-label="Categorías del listado">
          <ul className={CHIP_ROW}>
            {tabs.map((tab) => {
              const active =
                tab.category === null
                  ? filters.categoria.length === 0
                  : filters.categoria.length === 1 && filters.categoria[0] === tab.category;
              const { className, style } = chipStyle(active);
              return (
                <li
                  key={tab.category ?? 'todo'}
                  className={active ? 'focus-placa inline-flex shrink-0' : 'inline-flex shrink-0'}
                >
                  <button
                    type="button"
                    aria-pressed={active}
                    style={style}
                    className={className}
                    onClick={() =>
                      setFilters({ ...filters, categoria: tab.category ? [tab.category] : [] })
                    }
                  >
                    {tab.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-10">
        <aside aria-label="Filtros" className="hidden w-[264px] shrink-0 lg:block">
          <div className="border-noche flex items-baseline justify-between border-b-2 pb-3">
            <h2 className="type-h3 text-[24px] lg:text-[24px]">Filtrar</h2>
            {filterCount > 0 && (
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="text-rojo-profundo text-sm font-semibold"
              >
                Limpiar
              </button>
            )}
          </div>
          <FilterPanel {...panelProps(filters, setFilters)} brandLimit={4} />
        </aside>

        <div className="flex min-w-0 grow flex-col gap-4">
          {/* Mobile bar: Filtrar (n) · count · order */}
          <div className="border-linea -mx-4 flex items-center justify-between gap-2 border-b px-4 pb-4 sm:-mx-6 sm:px-6 lg:hidden">
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => {
                setDraft(filters);
                setSheetOpen(true);
              }}
              className="type-button text-noche inline-flex h-10 items-center gap-2 px-3.5 text-[17px] shadow-[inset_0_0_0_2px_var(--color-noche)]"
            >
              <SlidersHorizontal aria-hidden="true" className="size-5" />
              Filtrar{filterCount > 0 ? ` (${filterCount})` : ''}
            </button>
            <span aria-live="polite" className="type-small text-grafito-suave">
              {loading ? 'Cargando…' : productCount(matching)}
            </span>
            <SortSheet
              options={sorts.options}
              value={sort}
              onChange={(next) => update({ filters, sort: next })}
            />
          </div>

          {/* Desktop bar: Mostrando x de n · Ordenar por */}
          <div className="hidden items-center justify-between lg:flex">
            <span aria-live="polite" className="type-small text-grafito-suave">
              {loading ? 'Cargando…' : `Mostrando ${products.length} de ${productCount(matching)}`}
            </span>
            <SortMenu
              options={sorts.options}
              value={sort}
              onChange={(next) => update({ filters, sort: next })}
            />
          </div>

          {activeChips.length > 0 && (
            <ul aria-label="Filtros activos" className="flex flex-wrap gap-2">
              {activeChips.map((chip) => (
                <li key={chip.id}>
                  <Chip label={chip.label} selected onToggle={chip.remove} />
                </li>
              ))}
            </ul>
          )}

          {failed && (
            <div
              role="alert"
              className="bg-gis flex flex-col gap-3 p-4 lg:flex-row lg:items-center"
            >
              <p className="type-body grow">
                No pudimos cargar todos los productos. Revisa tu conexión e inténtalo de nuevo.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={retry}>
                  Reintentar
                </Button>
                <Button
                  variant="whatsapp"
                  size="sm"
                  href={whatsappUrl}
                  external
                  icon={<WhatsAppGlyph size={18} />}
                >
                  Pregunta por WhatsApp
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div aria-busy="true">
              <ProductGridSkeleton count={6} columns={3} />
              <p role="status" className="type-small text-grafito-suave mt-6 text-center">
                Cargando productos…
              </p>
            </div>
          ) : (
            <ProductGrid
              products={products}
              categoryNames={categoryNames}
              newIds={newIdSet}
              columns={3}
              volumeNoteUrl={whatsappUrl}
              empty={
                <EmptyState
                  title="Ningún producto con estos filtros"
                  description={emptyDescription}
                  action={
                    <Button variant="primary" onClick={() => setFilters(EMPTY_FILTERS)}>
                      Limpiar filtros
                    </Button>
                  }
                />
              }
            />
          )}

          {!loading && products.length < matching && (
            <div className="flex flex-col items-center gap-3 pt-4">
              <p className="type-small text-grafito-suave">
                Mostrando {products.length} de {matching}
              </p>
              <Button variant="outline" onClick={() => setVisible((n) => n + LISTING_PAGE_SIZE)}>
                Cargar más
              </Button>
            </div>
          )}
        </div>
      </div>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filtrar"
        footer={
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setDraft(EMPTY_FILTERS)}>
              Limpiar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setFilters(draft);
                setSheetOpen(false);
              }}
            >
              {draftCount === null ? 'Ver productos' : `Ver ${productCount(draftCount)}`}
            </Button>
          </div>
        }
      >
        <FilterPanel {...panelProps(draft, setDraft)} brandLimit={3} />
      </Sheet>
    </div>
  );
}
