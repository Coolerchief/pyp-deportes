import {
  centsToPesos,
  type CommerceForm,
  type CommercePayload,
  type Database,
  EMPTY_PRODUCT_FORM,
  type ExistingVariant,
  type ProductFormInput,
  type ProductPayload,
  type ProductStatus,
  PRODUCT_STATUSES,
  type ReplaceResult,
  type Technique,
  TECHNIQUES,
  type variantsPayload,
} from '@pyp/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

// Products in the panel (T4.3): the list, the editor's data and its writes. Everything goes
// through RLS (staff only) and the admin_* functions; the browser never sees the service key.

type Client = SupabaseClient<Database>;

export const PRODUCTS_PAGE_SIZE = 50;

export const PRODUCTS_ROUTES = {
  list: '/admin/productos',
  create: '/admin/productos/nuevo',
  edit: (id: string) => `/admin/productos/editar?id=${encodeURIComponent(id)}`,
  import: '/admin/productos/importar',
} as const;

// List -----------------------------------------------------------------------------------------

/** ?q=&estado=&categoria=&foto=sin&pagina= of /admin/productos. */
export type ProductFilters = {
  q: string;
  status: ProductStatus | '';
  categoryId: string;
  withoutPhoto: boolean;
  page: number;
};

export function readProductFilters(params: URLSearchParams): ProductFilters {
  const status = params.get('estado') ?? '';
  const page = Number(params.get('pagina'));
  return {
    q: (params.get('q') ?? '').trim(),
    status: (PRODUCT_STATUSES as readonly string[]).includes(status)
      ? (status as ProductStatus)
      : '',
    categoryId: params.get('categoria') ?? '',
    withoutPhoto: params.get('foto') === 'sin',
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

export function productFiltersQuery(filters: Partial<ProductFilters>): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.status) params.set('estado', filters.status);
  if (filters.categoryId) params.set('categoria', filters.categoryId);
  if (filters.withoutPhoto) params.set('foto', 'sin');
  if (filters.page && filters.page > 1) params.set('pagina', String(filters.page));
  const query = params.toString();
  return query ? `?${query}` : '';
}

export type ProductRow = {
  id: string;
  sku: string;
  name: string;
  status: ProductStatus;
  categoryName: string | null;
  /** key_base of the first photo, or null ("SIN FOTO"). */
  photo: string | null;
  updatedAt: string;
};

/** Search words for products.search_text (lowercase, no accents), without LIKE wildcards. */
export function searchPattern(q: string): string | null {
  const clean = q
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[%_\\,()]/g, ' ')
    .trim()
    .replace(/\s+/g, '%');
  return clean ? `%${clean}%` : null;
}

export async function listProducts(
  supabase: Client,
  filters: ProductFilters,
): Promise<{ rows: ProductRow[]; total: number }> {
  // "!left" plus "is null" on the embedded table is PostgREST's anti-join: products without photos.
  const images = filters.withoutPhoto
    ? 'product_images!left(id)'
    : 'product_images(key_base, sort_order)';
  let query = supabase
    .from('products')
    .select(
      `id, sku, name, status, updated_at, category:categories!products_category_id_fkey(name), ${images}`,
      { count: 'exact' },
    )
    .order('name')
    .order('sku')
    .range((filters.page - 1) * PRODUCTS_PAGE_SIZE, filters.page * PRODUCTS_PAGE_SIZE - 1);
  const pattern = searchPattern(filters.q);
  if (pattern) query = query.ilike('search_text', pattern);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.withoutPhoto) query = query.is('product_images', null);

  const { data, error, count } = await query;
  if (error) throw error;
  type Raw = {
    id: string;
    sku: string;
    name: string;
    status: ProductStatus;
    updated_at: string;
    category: { name: string } | null;
    product_images: { key_base?: string; sort_order?: number }[] | null;
  };
  const rows = ((data ?? []) as unknown as Raw[]).map((row) => {
    const first = [...(row.product_images ?? [])]
      .filter((image) => image.key_base)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];
    return {
      id: row.id,
      sku: row.sku,
      name: row.name,
      status: row.status,
      categoryName: row.category?.name ?? null,
      photo: first?.key_base ?? null,
      updatedAt: row.updated_at,
    };
  });
  return { rows, total: count ?? rows.length };
}

// Taxonomy for the selects -----------------------------------------------------------------------

export type Option = { id: string; name: string };
export type CategoryOption = Option & { parentId: string | null; sizeLabel: string };
export type Taxonomy = {
  categories: CategoryOption[];
  brands: Option[];
  sports: Option[];
  stores: Option[];
};

export async function fetchTaxonomy(supabase: Client): Promise<Taxonomy> {
  const [categories, brands, sports, stores] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, parent_id, size_label')
      .eq('is_active', true)
      .order('sort_order')
      .order('name'),
    supabase.from('brands').select('id, name').order('sort_order').order('name'),
    supabase
      .from('sports')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order')
      .order('name'),
    supabase.from('stores').select('id, name').eq('is_active', true).order('sort_order'),
  ]);
  const error = categories.error ?? brands.error ?? sports.error ?? stores.error;
  if (error) throw error;
  return {
    categories: (categories.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      parentId: c.parent_id,
      sizeLabel: c.size_label,
    })),
    brands: brands.data ?? [],
    sports: sports.data ?? [],
    stores: stores.data ?? [],
  };
}

// One product ------------------------------------------------------------------------------------

export type EditorVariant = {
  id: string;
  sku: string;
  option1: string | null;
  option2: string | null;
  isDefault: boolean;
  prices: { minQty: number; unitPriceCents: number }[];
  stock: { storeId: string; quantity: number }[];
};

export type EditorImage = {
  id: string;
  keyBase: string;
  alt: string;
  width: number;
  height: number;
};

export type EditorProduct = {
  id: string;
  status: ProductStatus;
  publishedAt: string | null;
  updatedAt: string;
  option1Name: string;
  option2Name: string | null;
  colorNote: string | null;
  photoCount: number;
  /** Photos in their order; the first one is the cover. */
  images: EditorImage[];
  /** Active variants, in their order. */
  variants: EditorVariant[];
  /** Every variant, active or not: regenerating reactivates the ones that come back. */
  allVariants: ExistingVariant[];
  form: ProductFormInput;
};

const PRODUCT_SELECT = `id, sku, slug, name, brand_id, category_id, subcategory_id, audience,
  short_description, description, specs, tags, option1_name, option2_name, color_note,
  is_customizable, techniques, min_suggested_qty, is_featured, status, published_at, updated_at,
  product_sports(sport_id),
  product_images(id, key_base, alt, width, height, sort_order),
  product_variants(id, sku, option1_value, option2_value, is_default, is_active, sort_order,
    variant_prices(min_qty, unit_price_cents), inventory_levels(store_id, quantity))`;

/** null when the product does not exist (or the link is wrong). */
export async function fetchProduct(supabase: Client, id: string): Promise<EditorProduct | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as {
    id: string;
    sku: string;
    slug: string;
    name: string;
    brand_id: string;
    category_id: string;
    subcategory_id: string | null;
    audience: ProductFormInput['audience'];
    short_description: string;
    description: string;
    specs: unknown;
    tags: string[];
    option1_name: string;
    option2_name: string | null;
    color_note: string | null;
    is_customizable: boolean;
    techniques: string[];
    min_suggested_qty: number | null;
    is_featured: boolean;
    status: ProductStatus;
    published_at: string | null;
    updated_at: string;
    product_sports: { sport_id: string }[];
    product_images: {
      id: string;
      key_base: string;
      alt: string;
      width: number;
      height: number;
      sort_order: number;
    }[];
    product_variants: {
      id: string;
      sku: string;
      option1_value: string | null;
      option2_value: string | null;
      is_default: boolean;
      is_active: boolean;
      sort_order: number;
      variant_prices: { min_qty: number; unit_price_cents: number }[];
      inventory_levels: { store_id: string; quantity: number }[];
    }[];
  };
  const specs = Array.isArray(row.specs)
    ? (row.specs as unknown[])
        .filter(
          (s): s is { label: string; value: string } =>
            !!s &&
            typeof (s as { label?: unknown }).label === 'string' &&
            typeof (s as { value?: unknown }).value === 'string',
        )
        .map(({ label, value }) => ({ label, value }))
    : [];
  return {
    id: row.id,
    status: row.status,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    option1Name: row.option1_name,
    option2Name: row.option2_name,
    colorNote: row.color_note,
    photoCount: row.product_images.length,
    images: row.product_images
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
      .map((image) => ({
        id: image.id,
        keyBase: image.key_base,
        alt: image.alt,
        width: image.width,
        height: image.height,
      })),
    allVariants: row.product_variants
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((v) => ({
        id: v.id,
        option1: v.option1_value,
        option2: v.option2_value,
        isActive: v.is_active,
      })),
    variants: row.product_variants
      .filter((v) => v.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((v) => ({
        id: v.id,
        sku: v.sku,
        option1: v.option1_value,
        option2: v.option2_value,
        isDefault: v.is_default,
        prices: v.variant_prices
          .map((p) => ({ minQty: p.min_qty, unitPriceCents: p.unit_price_cents }))
          .sort((a, b) => a.minQty - b.minQty),
        stock: v.inventory_levels.map((s) => ({ storeId: s.store_id, quantity: s.quantity })),
      })),
    form: {
      ...EMPTY_PRODUCT_FORM,
      name: row.name,
      sku: row.sku,
      slug: row.slug,
      brandId: row.brand_id,
      categoryId: row.category_id,
      subcategoryId: row.subcategory_id ?? '',
      sportIds: row.product_sports.map((s) => s.sport_id),
      audience: row.audience,
      shortDescription: row.short_description,
      description: row.description,
      tags: row.tags.join(', '),
      specs,
      isCustomizable: row.is_customizable,
      techniques: row.techniques.filter((t): t is Technique =>
        (TECHNIQUES as readonly string[]).includes(t),
      ),
      minSuggestedQty: row.min_suggested_qty ? String(row.min_suggested_qty) : '',
      isFeatured: row.is_featured,
    },
  };
}

/** The commerce form of the active variants: one empty first tier when there is none. */
export function commerceForm(product: EditorProduct, stores: Option[]): CommerceForm {
  return {
    variants: product.variants.map((variant) => ({
      variantId: variant.id,
      prices: variant.prices.length
        ? variant.prices.map((p) => ({
            minQty: String(p.minQty),
            price: centsToPesos(p.unitPriceCents),
          }))
        : [],
      stock: stores.map((store) => {
        const level = variant.stock.find((s) => s.storeId === store.id);
        return { storeId: store.id, quantity: level ? String(level.quantity) : '' };
      }),
    })),
  };
}

// Writes -----------------------------------------------------------------------------------------

export async function saveProduct(supabase: Client, payload: ProductPayload): Promise<string> {
  const { data, error } = await supabase.rpc('admin_save_product', { product: payload });
  if (error) throw error;
  return data;
}

export async function duplicateProduct(supabase: Client, id: string): Promise<string> {
  const { data, error } = await supabase.rpc('admin_duplicate_product', { id });
  if (error) throw error;
  return data;
}

export async function saveCommerce(
  supabase: Client,
  productId: string,
  variants: CommercePayload,
): Promise<void> {
  const { error } = await supabase.rpc('admin_save_commerce', {
    product_id: productId,
    variants,
  });
  if (error) throw error;
}

export async function saveVariants(
  supabase: Client,
  payload: ReturnType<typeof variantsPayload>,
): Promise<ReplaceResult> {
  const { data, error } = await supabase.rpc('admin_save_variants', payload);
  if (error) throw error;
  return data as ReplaceResult;
}

type DbError = { code?: string; message?: string; details?: string; name?: string };

/** Where a database error belongs in the form, and what it says in Spanish. */
export function productErrorMessage(error: DbError): { field?: 'sku' | 'slug'; message: string } {
  const text = `${error.message ?? ''} ${error.details ?? ''}`;
  if (error.code === '23505' && text.includes('products_sku_key')) {
    return { field: 'sku', message: 'Ya existe un producto con ese SKU.' };
  }
  if (error.code === '23505' && text.includes('product_variants_sku_key')) {
    return { field: 'sku', message: 'Ese SKU ya lo usa una variante de otro producto.' };
  }
  if (error.code === '23505' && text.includes('products_slug_key')) {
    return { field: 'slug', message: 'Ya existe un producto con esa dirección.' };
  }
  if (error.code === '42501') {
    return { message: 'Tu cuenta no puede hacer este cambio.' };
  }
  // The rules of admin_save_product and the publish triggers already speak Spanish.
  if ((error.code === '22023' || error.code === '23514') && error.message) {
    return { message: error.message.replace(/\s+:/, ':') };
  }
  if (error.name === 'TypeError' || !error.code) {
    return { message: 'No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.' };
  }
  return { message: 'No pudimos guardar. Inténtalo de nuevo.' };
}
