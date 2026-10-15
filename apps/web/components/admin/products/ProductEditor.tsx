'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AUDIENCES,
  audienceLabels,
  EMPTY_PRODUCT_FORM,
  type ProductForm,
  type ProductFormInput,
  ProductFormSchema,
  productPayload,
  type ProductStatus,
  proposeSlug,
  TECHNIQUES,
  techniqueLabels,
} from '@pyp/shared';
import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  Copy,
  ExternalLink,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, type Ref, useCallback, useEffect, useRef, useState } from 'react';
import { Controller, type FieldErrors, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { FormField } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  duplicateProduct,
  type EditorProduct,
  fetchProduct,
  fetchTaxonomy,
  PRODUCTS_ROUTES,
  productErrorMessage,
  saveProduct,
  type Taxonomy,
} from '@/lib/admin/products';
import { ROUTES } from '@/lib/navigation';
import { getSupabase } from '@/lib/supabase/browser';
import { Button } from '../ui/button';
import { Card, CardDescription, CardTitle } from '../ui/card';
import { cn } from '../ui/cn';
import { SelectField } from '../ui/select';
import { CommerceSection } from './CommerceSection';
import { VariantsSection } from './VariantsSection';
import { NoPhotoBadge, StatusBadge } from './StatusBadge';

type Notice = { tone: 'ok' | 'error'; text: string };

const AFTER_SAVE: Record<ProductStatus, string> = {
  draft: 'Guardado como borrador. No se ve en el sitio.',
  published: 'Guardado y publicado. Se verá en el sitio cuando publiques los cambios desde Inicio.',
  archived: 'Archivado. Saldrá del sitio cuando publiques los cambios desde Inicio.',
};

/** ?aviso= after a redirect: the product was just created or copied. */
const ARRIVAL: Record<string, string> = {
  creado: 'Producto creado como borrador. Puedes seguir editándolo o publicarlo.',
  publicado:
    'Producto creado y publicado. Se verá en el sitio cuando publiques los cambios desde Inicio.',
  copia:
    'Esta es una copia en borrador, con las mismas tallas, colores y precios, sin fotos ni existencias. Cambia el nombre, el SKU y la dirección antes de publicarla.',
};

function NoticeBox({ notice, ref }: { notice: Notice; ref?: Ref<HTMLDivElement> }) {
  const error = notice.tone === 'error';
  const Icon = error ? CircleAlert : CircleCheck;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={error ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-sm border-2 bg-blanco p-3 focus-visible:outline-none',
        error ? 'border-rojo-profundo text-rojo-profundo' : 'border-exito text-noche',
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn('mt-0.5 size-5 shrink-0', error ? undefined : 'text-exito')}
      />
      <p className="type-small font-medium">{notice.text}</p>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="gap-4">
      <div className="flex flex-col gap-1">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </div>
      {children}
    </Card>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="type-small text-rojo-profundo flex items-start gap-1 font-medium">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}

/** Ordered list of the fields with errors, for the summary and the focus. */
const FIELD_ORDER = [
  'name',
  'sku',
  'slug',
  'shortDescription',
  'description',
  'specs',
  'brandId',
  'categoryId',
  'subcategoryId',
  'techniques',
  'minSuggestedQty',
] as const;

/**
 * Product editor (UI/UX §9, APP-FLOW §8.2): Básico, Clasificación, Variantes, Fotos,
 * Personalización and the hidden Comercial section. "Guardar" keeps the status (a new product
 * is a draft), "Publicar", "Pasar a borrador", "Archivar" and "Duplicar" change it.
 */
function ProductEditorForm({
  taxonomy,
  product,
  arrival,
  onSaved,
}: {
  taxonomy: Taxonomy;
  product: EditorProduct | null;
  arrival: string | null;
  onSaved: (product: EditorProduct) => void;
}) {
  const router = useRouter();
  const isNew = !product;
  const status = product?.status ?? 'draft';
  const wasPublished = !!product?.publishedAt;
  const [notice, setNotice] = useState<Notice | null>(
    arrival && ARRIVAL[arrival] ? { tone: 'ok', text: ARRIVAL[arrival] } : null,
  );
  const [pending, setPending] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const noticeRef = useRef<HTMLDivElement>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    setFocus,
    reset,
    getValues,
    formState: { errors, isDirty },
  } = useForm<ProductFormInput, unknown, ProductForm>({
    resolver: zodResolver(ProductFormSchema),
    defaultValues: product?.form ?? EMPTY_PRODUCT_FORM,
  });
  const specs = useFieldArray({ control, name: 'specs' });
  const categoryId = useWatch({ control, name: 'categoryId' });
  const isCustomizable = useWatch({ control, name: 'isCustomizable' });

  const mainCategories = taxonomy.categories.filter((c) => !c.parentId);
  const subcategories = taxonomy.categories.filter((c) => c.parentId && c.parentId === categoryId);

  // Leaving with unsaved changes asks first (the browser's own dialog).
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  function onInvalid(fieldErrors: FieldErrors<ProductFormInput>) {
    const first = FIELD_ORDER.find((name) => fieldErrors[name]);
    const count = Object.keys(fieldErrors).length;
    setNotice({
      tone: 'error',
      text:
        count === 1
          ? 'Falta corregir 1 dato antes de guardar.'
          : `Falta corregir ${count} datos antes de guardar.`,
    });
    if (first && first !== 'specs' && first !== 'techniques') {
      // The summary takes the focus first; the field right after, so it is the one announced.
      setTimeout(() => setFocus(first), 0);
    }
  }

  async function save(values: ProductForm, next: ProductStatus, action: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    setPending(action);
    setNotice(null);
    try {
      const id = await saveProduct(
        supabase,
        productPayload(values, { id: product?.id, status: next }),
      );
      if (isNew) {
        reset(getValues()); // not dirty any more: no "leave the page?" on the redirect
        router.replace(
          `${PRODUCTS_ROUTES.edit(id)}&aviso=${next === 'published' ? 'publicado' : 'creado'}`,
        );
        return;
      }
      const fresh = await fetchProduct(supabase, id);
      if (fresh) {
        reset(fresh.form);
        onSaved(fresh);
      }
      setNotice({ tone: 'ok', text: AFTER_SAVE[next] });
    } catch (error) {
      const problem = productErrorMessage(error as never);
      if (problem.field) {
        setError(problem.field, { message: problem.message }, { shouldFocus: true });
        setNotice({ tone: 'error', text: 'Falta corregir 1 dato antes de guardar.' });
      } else {
        setNotice({ tone: 'error', text: problem.message });
      }
    } finally {
      setPending(null);
    }
  }

  const submit = (next: ProductStatus, action: string) =>
    handleSubmit((values) => save(values, next, action), onInvalid);

  async function duplicate() {
    const supabase = getSupabase();
    if (!supabase || !product) return;
    if (isDirty) {
      setNotice({ tone: 'error', text: 'Guarda tus cambios antes de duplicar el producto.' });
      return;
    }
    setPending('duplicate');
    setNotice(null);
    try {
      const id = await duplicateProduct(supabase, product.id);
      router.push(`${PRODUCTS_ROUTES.edit(id)}&aviso=copia`);
    } catch (error) {
      setNotice({ tone: 'error', text: productErrorMessage(error as never).message });
      setPending(null);
    }
  }

  const busy = pending !== null;
  const err = (name: string) => `campo-${name}-error`;
  const slug = useWatch({ control, name: 'slug' });

  return (
    <form noValidate onSubmit={submit(status, 'save')} className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <Link
          href={PRODUCTS_ROUTES.list}
          className="type-small text-noche inline-flex items-center gap-1 self-start font-semibold underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Productos
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="type-h2 text-noche break-words">
              {isNew ? 'Nuevo producto' : product.form.name}
            </h1>
            <p className="flex flex-wrap items-center gap-2">
              <StatusBadge status={status} />
              {!isNew && product.photoCount === 0 && <NoPhotoBadge />}
              {!isNew && <span className="type-small text-grafito">SKU {product.form.sku}</span>}
            </p>
          </div>
          {!isNew && (
            <div className="flex flex-wrap gap-2">
              {status === 'published' && (
                <a
                  href={ROUTES.product(product.form.slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="type-small text-noche inline-flex h-10 items-center gap-1 px-1 font-semibold underline-offset-4 hover:underline"
                >
                  Ver en el sitio
                  <ExternalLink aria-hidden="true" className="size-4" />
                  <span className="sr-only">(se abre en otra pestaña)</span>
                </a>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={duplicate}
                disabled={busy}
                loading={pending === 'duplicate'}
                loadingText="Duplicando…"
              >
                <Copy aria-hidden="true" />
                Duplicar
              </Button>
              {status !== 'archived' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={submit('archived', 'archive')}
                  disabled={busy}
                  loading={pending === 'archive'}
                  loadingText="Archivando…"
                >
                  Archivar
                </Button>
              )}
            </div>
          )}
        </div>
      </header>

      {notice && <NoticeBox ref={noticeRef} notice={notice} />}

      <Section title="Básico">
        <FormField
          label="Nombre"
          required
          error={errors.name?.message}
          {...register('name', {
            onChange: (event) => {
              if (!slugTouched) {
                setValue('slug', proposeSlug(event.target.value), { shouldDirty: true });
              }
            },
          })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="SKU"
            required
            readOnly={wasPublished}
            className="[&_input[readonly]]:bg-gis [&_input[readonly]]:text-grafito"
            autoCapitalize="characters"
            spellCheck={false}
            help={
              wasPublished
                ? 'Ya se publicó: el SKU no cambia.'
                : 'Letras, números y guiones. Las variantes toman este SKU.'
            }
            error={errors.sku?.message}
            {...register('sku', {
              onBlur: (event) =>
                setValue('sku', event.target.value.trim().toUpperCase(), { shouldDirty: true }),
            })}
          />
          <FormField
            label="Dirección (slug)"
            required
            readOnly={wasPublished}
            className="[&_input[readonly]]:bg-gis [&_input[readonly]]:text-grafito"
            spellCheck={false}
            help={
              wasPublished
                ? `Ya se publicó: su dirección no cambia (/producto/${slug}).`
                : `Se verá en /producto/${slug || '…'}`
            }
            error={errors.slug?.message}
            {...register('slug', { onChange: () => setSlugTouched(true) })}
          />
        </div>
        <FormField
          label="Descripción corta"
          multiline
          help="Una o dos frases; aparece en la ficha bajo el nombre."
          error={errors.shortDescription?.message}
          {...register('shortDescription')}
        />
        <FormField
          label="Descripción"
          multiline
          error={errors.description?.message}
          {...register('description')}
        />
        <FormField
          label="Etiquetas"
          help="Separadas por comas. Ayudan a encontrarlo en la búsqueda (por ejemplo: cosido, escolar)."
          {...register('tags')}
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="type-small text-noche mb-1 font-semibold">Especificaciones</legend>
          {specs.fields.length === 0 && (
            <p className="type-small text-grafito">Por ejemplo: Material · Cuero sintético.</p>
          )}
          {specs.fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2">
              <FormField
                label={`Nombre ${index + 1}`}
                className="flex-1"
                error={errors.specs?.[index]?.label?.message}
                {...register(`specs.${index}.label`)}
              />
              <FormField
                label={`Valor ${index + 1}`}
                className="flex-[2]"
                error={errors.specs?.[index]?.value?.message}
                {...register(`specs.${index}.value`)}
              />
              <Button
                variant="ghost"
                size="icon"
                className="mt-6 shrink-0"
                aria-label={`Quitar especificación ${index + 1}`}
                onClick={() => specs.remove(index)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => specs.append({ label: '', value: '' })}
          >
            <Plus aria-hidden="true" />
            Agregar especificación
          </Button>
        </fieldset>
        <label className="type-body text-noche flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="accent-noche mt-0.5 size-5 shrink-0"
            {...register('isFeatured')}
          />
          <span>
            Destacado
            <span className="type-small text-grafito block">Aparece primero en su categoría.</span>
          </span>
        </label>
      </Section>

      <Section title="Clasificación">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Categoría"
            required
            placeholder="Elige una categoría"
            options={mainCategories.map((c) => ({ value: c.id, label: c.name }))}
            error={errors.categoryId?.message}
            {...register('categoryId', {
              onChange: (event) => {
                const keep = taxonomy.categories.some(
                  (c) => c.id === getValues('subcategoryId') && c.parentId === event.target.value,
                );
                if (!keep) setValue('subcategoryId', '', { shouldDirty: true });
              },
            })}
          />
          <SelectField
            label="Subcategoría"
            placeholder={subcategories.length ? 'Ninguna' : 'Esta categoría no tiene'}
            disabled={subcategories.length === 0}
            options={subcategories.map((c) => ({ value: c.id, label: c.name }))}
            error={errors.subcategoryId?.message}
            {...register('subcategoryId')}
          />
          <SelectField
            label="Marca"
            required
            placeholder="Elige una marca"
            options={taxonomy.brands.map((b) => ({ value: b.id, label: b.name }))}
            error={errors.brandId?.message}
            {...register('brandId')}
          />
          <SelectField
            label="Público"
            options={AUDIENCES.map((a) => ({ value: a, label: audienceLabels[a] }))}
            {...register('audience')}
          />
        </div>
        <Controller
          control={control}
          name="sportIds"
          render={({ field }) => (
            <fieldset className="flex flex-col gap-2">
              <legend className="type-small text-noche mb-1 font-semibold">Deportes</legend>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                {taxonomy.sports.map((sport) => (
                  <label
                    key={sport.id}
                    className="type-body text-noche flex min-h-11 cursor-pointer items-center gap-3"
                  >
                    <input
                      type="checkbox"
                      className="accent-noche size-5 shrink-0"
                      checked={field.value.includes(sport.id)}
                      onChange={(event) =>
                        field.onChange(
                          event.target.checked
                            ? [...field.value, sport.id]
                            : field.value.filter((id) => id !== sport.id),
                        )
                      }
                    />
                    {sport.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        />
      </Section>

      <Section
        title="Fotos"
        description={
          product && product.photoCount > 0
            ? `${product.photoCount === 1 ? '1 foto' : `${product.photoCount} fotos`}. Subir y ordenar fotos estará disponible pronto.`
            : 'Sin foto: en el sitio se ve la imagen genérica de su categoría. Subir fotos estará disponible pronto.'
        }
      >
        {null}
      </Section>

      <Section title="Personalización">
        <label className="type-body text-noche flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="accent-noche size-5 shrink-0"
            {...register('isCustomizable')}
          />
          Se puede personalizar (nombre, número o escudo)
        </label>
        {isCustomizable && (
          <Controller
            control={control}
            name="techniques"
            render={({ field }) => (
              <fieldset
                className="flex flex-col gap-2"
                aria-describedby={errors.techniques ? err('techniques') : undefined}
              >
                <legend className="type-small text-noche mb-1 font-semibold">Técnicas *</legend>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {TECHNIQUES.map((technique) => (
                    <label
                      key={technique}
                      className="type-body text-noche flex min-h-11 cursor-pointer items-center gap-3"
                    >
                      <input
                        type="checkbox"
                        className="accent-noche size-5 shrink-0"
                        aria-invalid={errors.techniques ? true : undefined}
                        checked={field.value.includes(technique)}
                        onChange={(event) =>
                          field.onChange(
                            event.target.checked
                              ? [...field.value, technique]
                              : field.value.filter((t) => t !== technique),
                          )
                        }
                      />
                      {techniqueLabels[technique]}
                    </label>
                  ))}
                </div>
                <FieldError id={err('techniques')} message={errors.techniques?.message} />
              </fieldset>
            )}
          />
        )}
        <FormField
          label="Pedido mínimo sugerido (piezas)"
          inputMode="numeric"
          help="Opcional. Se muestra como sugerencia en la ficha."
          error={errors.minSuggestedQty?.message}
          className="sm:max-w-xs"
          {...register('minSuggestedQty')}
        />
      </Section>

      {/* Actions stay in reach above the mobile bottom bar. */}
      <div className="border-linea shadow-float sticky bottom-16 z-20 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t bg-blanco px-4 py-3 lg:bottom-0 lg:mx-0 lg:rounded-sm lg:border">
        {isDirty && (
          <p className="type-small text-grafito mr-auto" aria-live="polite">
            Cambios sin guardar
          </p>
        )}
        {status === 'published' && (
          <Button
            variant="ghost"
            onClick={submit('draft', 'unpublish')}
            disabled={busy}
            loading={pending === 'unpublish'}
            loadingText="Guardando…"
          >
            Pasar a borrador
          </Button>
        )}
        {status === 'draft' && (
          <>
            <Button
              type="submit"
              variant="outline"
              disabled={busy}
              loading={pending === 'save'}
              loadingText="Guardando…"
            >
              Guardar borrador
            </Button>
            <Button
              onClick={submit('published', 'publish')}
              disabled={busy}
              loading={pending === 'publish'}
              loadingText="Publicando…"
            >
              Publicar
            </Button>
          </>
        )}
        {status === 'published' && (
          <Button
            type="submit"
            disabled={busy}
            loading={pending === 'save'}
            loadingText="Guardando…"
          >
            Guardar cambios
          </Button>
        )}
        {status === 'archived' && (
          <>
            <Button
              type="submit"
              variant="outline"
              disabled={busy}
              loading={pending === 'save'}
              loadingText="Guardando…"
            >
              Guardar
            </Button>
            <Button
              onClick={submit('draft', 'restore')}
              disabled={busy}
              loading={pending === 'restore'}
              loadingText="Guardando…"
            >
              Restaurar como borrador
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

type PageState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'missing' }
  | { status: 'ready'; taxonomy: Taxonomy; product: EditorProduct | null };

/** /admin/productos/nuevo and /admin/productos/editar?id=…&aviso=… */
export function ProductEditorPage({ mode }: { mode: 'new' | 'edit' }) {
  const params = useSearchParams();
  const id = mode === 'edit' ? (params.get('id') ?? '') : null;
  const arrival = params.get('aviso');
  const [state, setState] = useState<PageState>({ status: 'loading' });

  const load = useCallback(async () => {
    const supabase = getSupabase();
    try {
      if (!supabase) throw new Error('Sin Supabase');
      const [taxonomy, product] = await Promise.all([
        fetchTaxonomy(supabase),
        id === null ? Promise.resolve(null) : fetchProduct(supabase, id),
      ]);
      if (id !== null && !product) {
        setState({ status: 'missing' });
        return;
      }
      setState({ status: 'ready', taxonomy, product });
    } catch {
      setState({ status: 'error' });
    }
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  if (state.status === 'loading') {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="sr-only">
          Cargando producto…
        </p>
        <Skeleton tone="linea" className="h-10 w-2/3 rounded-sm" />
        <Skeleton tone="linea" className="h-72 rounded-sm" />
        <Skeleton tone="linea" className="h-48 rounded-sm" />
      </div>
    );
  }
  if (state.status === 'missing') {
    return (
      <Card className="items-start">
        <h1 className="type-h3 text-noche">No encontramos este producto</h1>
        <p className="type-body text-grafito">Quizá lo borraron o el enlace está incompleto.</p>
        <Link href={PRODUCTS_ROUTES.list} className="type-body text-noche font-semibold underline">
          Ver todos los productos
        </Link>
      </Card>
    );
  }
  if (state.status === 'error') {
    return (
      <Card role="alert" className="items-start">
        <p className="type-body-strong text-rojo-profundo flex items-start gap-2">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          No pudimos cargar el producto. Revisa tu conexión e inténtalo de nuevo.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            setState({ status: 'loading' });
            void load();
          }}
        >
          <RefreshCw aria-hidden="true" />
          Reintentar
        </Button>
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <ProductEditorForm
        key={state.product?.id ?? 'nuevo'}
        taxonomy={state.taxonomy}
        product={state.product}
        arrival={arrival}
        onSaved={(product) => setState({ ...state, product })}
      />
      {state.product ? (
        <>
          <VariantsSection
            product={state.product}
            onSaved={(product) => setState({ ...state, product })}
          />
          {/* Remounted when the variants change, so its rows follow them. */}
          <CommerceSection
            key={state.product.variants.map((variant) => variant.id).join()}
            product={state.product}
            stores={state.taxonomy.stores}
          />
        </>
      ) : (
        <Card>
          <CardTitle>Variantes y datos comerciales</CardTitle>
          <CardDescription>
            Guarda el producto para generar sus tallas y colores y capturar precios y existencias.
            Mientras, tiene una variante única con su SKU.
          </CardDescription>
        </Card>
      )}
    </div>
  );
}
