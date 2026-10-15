'use client';

import { PRODUCT_STATUSES, productStatusLabels } from '@pyp/shared';
import { CircleAlert, ImageOff, Plus, RefreshCw, Search, Upload } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDateTime } from '@/lib/admin/dashboard';
import {
  fetchTaxonomy,
  listProducts,
  type Option,
  PRODUCTS_PAGE_SIZE,
  PRODUCTS_ROUTES,
  type ProductFilters,
  productFiltersQuery,
  type ProductRow,
  readProductFilters,
} from '@/lib/admin/products';
import { mediaUrl } from '@/lib/images/loader';
import { getSupabase } from '@/lib/supabase/browser';
import { Button, buttonVariants } from '../ui/button';
import { Card } from '../ui/card';
import { SelectField } from '../ui/select';
import { NoPhotoBadge, StatusBadge } from './StatusBadge';

type ListState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; rows: ProductRow[]; total: number };

function Thumb({ photo, name }: { photo: string | null; name: string }) {
  return (
    <span className="bg-gis border-linea flex aspect-[4/5] w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm border">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- R2 WebP of 320 px, no optimizer in the export
        <img src={`${mediaUrl(photo)}-320.webp`} alt={name} className="size-full object-cover" />
      ) : (
        <ImageOff aria-hidden="true" className="text-concreto size-5" />
      )}
    </span>
  );
}

function hasFilters(filters: ProductFilters) {
  return !!(filters.q || filters.status || filters.categoryId || filters.withoutPhoto);
}

/**
 * /admin/productos (UI/UX §9): search, filters by status, category and "sin foto", a list on
 * mobile and a table from lg. The filters live in the URL, so the back button keeps them.
 */
export function ProductsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // Keyed by the query text, so a new searchParams object with the same URL does not reload.
  const query = params.toString();
  const filters = useMemo(() => readProductFilters(new URLSearchParams(query)), [query]);
  const [state, setState] = useState<ListState>({ status: 'loading' });
  const [categories, setCategories] = useState<Option[]>([]);
  const [search, setSearch] = useState(filters.q);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    fetchTaxonomy(supabase)
      .then((taxonomy) => setCategories(taxonomy.categories.filter((c) => !c.parentId)))
      .catch(() => setCategories([]));
  }, []);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    try {
      if (!supabase) throw new Error('Sin Supabase');
      const result = await listProducts(supabase, filters);
      setState({ status: 'ready', ...result });
    } catch {
      setState({ status: 'error' });
    }
  }, [filters]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load, attempt]);

  function go(next: Partial<ProductFilters>) {
    const target = productFiltersQuery({ ...filters, page: 1, ...next });
    if (target === productFiltersQuery(filters)) return;
    setState({ status: 'loading' });
    router.replace(`${pathname}${target}`);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    if (search.trim() !== filters.q) go({ q: search.trim() });
  }

  const from = (filters.page - 1) * PRODUCTS_PAGE_SIZE;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="type-h2 text-noche">Productos</h1>
          {state.status === 'ready' && (
            <p className="type-small text-grafito" aria-live="polite">
              {state.total === 1
                ? '1 producto'
                : `${state.total.toLocaleString('es-MX')} productos`}
              {hasFilters(filters) ? ' con estos filtros' : ''}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={PRODUCTS_ROUTES.import}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <Upload aria-hidden="true" />
            Importar
          </Link>
          <Link href={PRODUCTS_ROUTES.create} className={buttonVariants({ size: 'sm' })}>
            <Plus aria-hidden="true" />
            Nuevo producto
          </Link>
        </div>
      </header>

      <Card className="gap-4">
        <form role="search" onSubmit={submitSearch} className="flex gap-2">
          <label htmlFor="buscar-producto" className="sr-only">
            Buscar por nombre, SKU, marca o etiqueta
          </label>
          <input
            id="buscar-producto"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre, SKU, marca o etiqueta"
            className="type-body text-noche border-borde-control placeholder:text-grafito-suave focus:border-noche focus:outline-lima h-12 min-w-0 flex-1 rounded-sm border bg-blanco px-3 focus:shadow-[0_0_0_4px_var(--color-noche)] focus:outline-3 focus:outline-offset-0"
          />
          <Button type="submit" aria-label="Buscar" className="px-4">
            <Search aria-hidden="true" />
            <span className="hidden sm:inline">Buscar</span>
          </Button>
        </form>
        <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
          <SelectField
            label="Estado"
            value={filters.status}
            placeholder="Todos"
            options={PRODUCT_STATUSES.map((s) => ({ value: s, label: productStatusLabels[s] }))}
            onChange={(event) => go({ status: event.target.value as ProductFilters['status'] })}
          />
          <SelectField
            label="Categoría"
            value={filters.categoryId}
            placeholder="Todas"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(event) => go({ categoryId: event.target.value })}
          />
          <label className="type-body text-noche flex h-12 cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={filters.withoutPhoto}
              onChange={(event) => go({ withoutPhoto: event.target.checked })}
              className="accent-noche size-5 shrink-0"
            />
            Solo sin foto
          </label>
        </div>
      </Card>

      {state.status === 'loading' && (
        <>
          <p role="status" className="sr-only">
            Cargando productos…
          </p>
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3, 4].map((key) => (
              <Skeleton key={key} tone="linea" className="h-20 rounded-sm" />
            ))}
          </div>
        </>
      )}

      {state.status === 'error' && (
        <Card role="alert" className="items-start">
          <p className="type-body-strong text-rojo-profundo flex items-start gap-2">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            No pudimos cargar los productos. Revisa tu conexión e inténtalo de nuevo.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setState({ status: 'loading' });
              setAttempt((n) => n + 1);
            }}
          >
            <RefreshCw aria-hidden="true" />
            Reintentar
          </Button>
        </Card>
      )}

      {state.status === 'ready' && state.rows.length === 0 && (
        <Card className="items-start">
          {hasFilters(filters) ? (
            <>
              <p className="type-body-strong text-noche">Ningún producto con estos filtros</p>
              <p className="type-body text-grafito">Quita alguno o límpialos para ver todos.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  go({ q: '', status: '', categoryId: '', withoutPhoto: false });
                }}
              >
                Limpiar filtros
              </Button>
            </>
          ) : (
            <>
              <p className="type-body-strong text-noche">Aún no hay productos</p>
              <p className="type-body text-grafito">
                Da de alta el primero o importa el catálogo desde un archivo.
              </p>
            </>
          )}
        </Card>
      )}

      {state.status === 'ready' && state.rows.length > 0 && (
        <>
          {/* Mobile: one card per product. */}
          <ul className="flex flex-col gap-2 lg:hidden">
            {state.rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={PRODUCTS_ROUTES.edit(row.id)}
                  className="border-linea shadow-card hover:border-borde-control flex items-center gap-3 rounded-sm border bg-blanco p-3"
                >
                  <Thumb photo={row.photo} name={row.name} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="type-body text-noche line-clamp-2 font-semibold">
                      {row.name}
                    </span>
                    <span className="type-caption text-grafito-suave truncate">
                      {row.sku}
                      {row.categoryName ? ` · ${row.categoryName}` : ''}
                    </span>
                    <span className="flex flex-wrap gap-1">
                      <StatusBadge status={row.status} />
                      {!row.photo && <NoPhotoBadge />}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop: a table. */}
          <div className="border-linea shadow-card hidden overflow-hidden rounded-sm border bg-blanco lg:block">
            <table className="w-full text-left">
              <thead className="bg-gis type-small text-grafito">
                <tr>
                  <th scope="col" className="w-20 px-4 py-3 font-semibold">
                    <span className="sr-only">Foto</span>
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Nombre
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    SKU
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Categoría
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Actualizado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-linea divide-y">
                {state.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gis">
                    <td className="px-4 py-2">
                      <Thumb photo={row.photo} name={row.name} />
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={PRODUCTS_ROUTES.edit(row.id)}
                        className="type-body text-noche font-semibold underline-offset-4 hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="type-small text-grafito px-4 py-2 whitespace-nowrap">
                      {row.sku}
                    </td>
                    <td className="type-small text-grafito px-4 py-2">{row.categoryName ?? '—'}</td>
                    <td className="px-4 py-2">
                      <span className="flex gap-1">
                        <StatusBadge status={row.status} />
                        {!row.photo && <NoPhotoBadge />}
                      </span>
                    </td>
                    <td className="type-small text-grafito px-4 py-2 whitespace-nowrap">
                      {formatDateTime(row.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {state.total > PRODUCTS_PAGE_SIZE && (
            <nav aria-label="Páginas" className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page <= 1}
                onClick={() => go({ page: filters.page - 1 })}
              >
                Anterior
              </Button>
              <p className="type-small text-grafito">
                {from + 1}–{from + state.rows.length} de {state.total.toLocaleString('es-MX')}
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={from + state.rows.length >= state.total}
                onClick={() => go({ page: filters.page + 1 })}
              >
                Siguiente
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
