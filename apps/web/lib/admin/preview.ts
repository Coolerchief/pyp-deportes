import {
  type BuildRows,
  buildCatalog,
  type Database,
  PublicBrandRowSchema,
  PublicCategoryRowSchema,
  PublicSportRowSchema,
  type SettingsJson,
} from '@pyp/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildProductPage, type ProductPageData } from '@/lib/product';
import type { EditorProduct } from './products';

// Product preview in the panel (TRD §8, T4.5): the public page (ProductPage) with the saved data
// of the product, drafts included. The rows are shaped like the public_* views and go through
// the same buildCatalog and buildProductPage as the build, so what the panel shows is what the
// site will show after "Publicar cambios".

type Client = SupabaseClient<Database>;

export type PreviewTaxonomy = Pick<
  BuildRows,
  'public_categories' | 'public_brands' | 'public_sports'
>;

/** Active categories, brands and sports from the public views (the same ones the build reads). */
export async function fetchPreviewTaxonomy(supabase: Client): Promise<PreviewTaxonomy> {
  const [categories, brands, sports] = await Promise.all([
    supabase.from('public_categories').select('id, parent_id, slug, name, size_label, sort_order'),
    supabase.from('public_brands').select('id, slug, name, logo_key, is_own_brand, sort_order'),
    supabase.from('public_sports').select('id, slug, name, sort_order'),
  ]);
  const error = categories.error ?? brands.error ?? sports.error;
  if (error) throw error;
  return {
    public_categories: PublicCategoryRowSchema.array().parse(categories.data),
    public_brands: PublicBrandRowSchema.array().parse(brands.data),
    public_sports: PublicSportRowSchema.array().parse(sports.data),
  };
}

/** Only buildProductPage's WhatsApp links read settings; in the preview they are not clickable. */
const PREVIEW_SETTINGS = { whatsappSalesNumber: '' } as SettingsJson;

export type PreviewResult =
  | { ok: true; data: ProductPageData }
  | { ok: false; reason: 'missing_brand' | 'missing_category' | 'invalid' };

/** The page data of a saved product, as if it were published now. */
export function buildPreview(
  product: EditorProduct,
  taxonomy: PreviewTaxonomy,
  now: Date = new Date(),
): PreviewResult {
  const { form } = product;
  if (!taxonomy.public_brands.some((b) => b.id === form.brandId)) {
    return { ok: false, reason: 'missing_brand' };
  }
  if (!taxonomy.public_categories.some((c) => c.id === form.categoryId)) {
    return { ok: false, reason: 'missing_category' };
  }
  const publishedAt = product.publishedAt ?? now.toISOString();
  const rows: BuildRows = {
    ...taxonomy,
    public_products: [
      {
        id: product.id,
        sku: form.sku,
        slug: form.slug,
        name: form.name,
        brand_id: form.brandId,
        category_id: form.categoryId,
        subcategory_id: form.subcategoryId || null,
        audience: form.audience,
        short_description: form.shortDescription,
        description: form.description,
        specs: form.specs.filter((s) => s.label.trim() && s.value.trim()),
        tags: [],
        option1_name: product.option1Name,
        option2_name: product.option2Name,
        color_note: product.colorNote,
        is_customizable: form.isCustomizable,
        techniques: form.isCustomizable ? form.techniques : [],
        min_suggested_qty: form.minSuggestedQty ? Number(form.minSuggestedQty) : null,
        is_featured: form.isFeatured,
        sort_order: 0,
        status: 'published',
        published_at: publishedAt,
        legacy_url: null,
      },
    ],
    public_product_variants: product.variants.map((variant, index) => ({
      id: variant.id,
      product_id: product.id,
      sku: variant.sku,
      option1_value: variant.option1,
      option2_value: variant.option2,
      is_default: variant.isDefault,
      sort_order: index,
    })),
    public_product_images: product.images.map((image, index) => ({
      id: image.id,
      product_id: product.id,
      variant_id: null,
      key_base: image.keyBase,
      alt: image.alt,
      width: image.width,
      height: image.height,
      sort_order: index,
    })),
    public_product_sports: form.sportIds.map((sport_id) => ({ product_id: product.id, sport_id })),
    public_stores: [],
    public_settings: [],
    public_site_texts: [],
    public_site_media: [],
  };
  try {
    const catalog = buildCatalog(rows, now.toISOString());
    const data = buildProductPage(rows, catalog, PREVIEW_SETTINGS, form.slug, null);
    return data ? { ok: true, data } : { ok: false, reason: 'invalid' };
  } catch {
    // The same data would stop the build: say so instead of breaking the editor.
    return { ok: false, reason: 'invalid' };
  }
}
