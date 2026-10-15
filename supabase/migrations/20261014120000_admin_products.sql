-- T4.3 · Products in the panel (docs/05-BACKEND-SCHEMA.md §8, APP-FLOW §8.2).
--
-- Saving, duplicating and the hidden commerce data each run in one transaction, so a failure
-- never leaves a product without its sports or half of its prices. Staff could write these
-- tables through RLS too; the functions add the rules the panel needs (subcategory of its
-- category, SKU and published slug that do not change, valid prices and stock).

-- admin_save_product ---------------------------------------------------------------------------

-- Creates (without "id") or updates a product and replaces its sports. Keys in camelCase, as
-- the panel's form sends them. Returns the product id.
create function public.admin_save_product(product jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_id uuid := nullif(product ->> 'id', '')::uuid;
  existing record;
  category record;
  subcategory_parent uuid;
  value_sku text := upper(btrim(coalesce(product ->> 'sku', '')));
  value_slug text := btrim(coalesce(product ->> 'slug', ''));
  value_name text := btrim(coalesce(product ->> 'name', ''));
  value_subcategory uuid := nullif(product ->> 'subcategoryId', '')::uuid;
  value_status public.product_status := coalesce(nullif(product ->> 'status', ''), 'draft');
  value_tags text[];
  value_techniques text[];
  value_sports uuid[];
  value_specs jsonb := coalesce(product -> 'specs', '[]');
begin
  perform public.require_staff();

  if value_sku !~ '^[A-Z0-9][A-Z0-9-]*$' then
    raise exception 'El SKU solo puede tener letras, números y guiones.'
      using errcode = 'invalid_parameter_value';
  end if;
  if value_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'El slug solo puede tener minúsculas, números y guiones.'
      using errcode = 'invalid_parameter_value';
  end if;
  if value_name = '' then
    raise exception 'Falta el nombre.' using errcode = 'invalid_parameter_value';
  end if;
  if jsonb_typeof(value_specs) <> 'array' then
    raise exception 'Las especificaciones deben ser una lista.' using errcode = 'invalid_parameter_value';
  end if;
  if exists (
    select 1 from jsonb_array_elements(value_specs) s
     where jsonb_typeof(s -> 'label') is distinct from 'string'
        or jsonb_typeof(s -> 'value') is distinct from 'string'
  ) then
    raise exception 'Las especificaciones deben ser pares de nombre y valor.'
      using errcode = 'invalid_parameter_value';
  end if;
  if not exists (select 1 from public.brands b where b.id = nullif(product ->> 'brandId', '')::uuid) then
    raise exception 'Elige una marca.' using errcode = 'invalid_parameter_value';
  end if;

  select c.id, c.parent_id, c.size_label into category
    from public.categories c where c.id = nullif(product ->> 'categoryId', '')::uuid;
  if not found or category.parent_id is not null then
    raise exception 'Elige una categoría principal.' using errcode = 'invalid_parameter_value';
  end if;
  if value_subcategory is not null then
    select c.parent_id into subcategory_parent from public.categories c where c.id = value_subcategory;
    if subcategory_parent is distinct from category.id then
      raise exception 'La subcategoría no pertenece a la categoría elegida.'
        using errcode = 'invalid_parameter_value';
    end if;
  end if;

  select coalesce(array_agg(distinct btrim(t)) filter (where btrim(t) <> ''), '{}')
    into value_tags from jsonb_array_elements_text(coalesce(product -> 'tags', '[]')) t;
  select coalesce(array_agg(distinct t), '{}')
    into value_techniques from jsonb_array_elements_text(coalesce(product -> 'techniques', '[]')) t;
  select coalesce(array_agg(distinct t::uuid), '{}')
    into value_sports from jsonb_array_elements_text(coalesce(product -> 'sportIds', '[]')) t;

  if target_id is null then
    insert into public.products (
      sku, slug, name, brand_id, category_id, subcategory_id, audience, short_description,
      description, specs, tags, option1_name, is_customizable, techniques, min_suggested_qty,
      is_featured, status, created_by
    ) values (
      value_sku, value_slug, value_name, nullif(product ->> 'brandId', '')::uuid, category.id,
      value_subcategory, coalesce(nullif(product ->> 'audience', ''), 'unisex')::public.audience,
      btrim(coalesce(product ->> 'shortDescription', '')),
      btrim(coalesce(product ->> 'description', '')), value_specs, value_tags,
      category.size_label, coalesce((product ->> 'isCustomizable')::boolean, false),
      value_techniques, nullif(product ->> 'minSuggestedQty', '')::int,
      coalesce((product ->> 'isFeatured')::boolean, false), value_status, auth.uid()
    )
    returning id into target_id;
  else
    select p.sku, p.slug, p.published_at into existing
      from public.products p where p.id = target_id for update;
    if not found then
      raise exception 'No existe el producto %.', target_id using errcode = 'no_data_found';
    end if;
    -- Variants, requests and imports find the product by its SKU.
    if existing.sku <> value_sku then
      raise exception 'El SKU de un producto no cambia.' using errcode = 'invalid_parameter_value';
    end if;
    -- Once published, its address is in search engines and shared links.
    if existing.published_at is not null and existing.slug <> value_slug then
      raise exception 'Un producto que ya se publicó conserva su dirección (slug).'
        using errcode = 'invalid_parameter_value';
    end if;
    update public.products p set
      slug = value_slug,
      name = value_name,
      brand_id = nullif(product ->> 'brandId', '')::uuid,
      category_id = category.id,
      subcategory_id = value_subcategory,
      audience = coalesce(nullif(product ->> 'audience', ''), 'unisex')::public.audience,
      short_description = btrim(coalesce(product ->> 'shortDescription', '')),
      description = btrim(coalesce(product ->> 'description', '')),
      specs = value_specs,
      tags = value_tags,
      is_customizable = coalesce((product ->> 'isCustomizable')::boolean, false),
      techniques = value_techniques,
      min_suggested_qty = nullif(product ->> 'minSuggestedQty', '')::int,
      is_featured = coalesce((product ->> 'isFeatured')::boolean, false),
      status = value_status
    where p.id = target_id;
  end if;

  delete from public.product_sports ps
   where ps.product_id = target_id and ps.sport_id <> all (value_sports);
  insert into public.product_sports (product_id, sport_id)
  select target_id, s from unnest(value_sports) as s
  on conflict do nothing;

  -- The default variant and the publish rules are deferred to the commit; running them here
  -- keeps a "cannot publish" error in this call (the default variant goes first, by name).
  set constraints public.ensure_default_variant, public.validate_product_publish immediate;

  return target_id;
end;
$$;

-- admin_duplicate_product ----------------------------------------------------------------------

-- Copy as a draft: "(copia)" in the name, free SKU and slug ending in -COPIA / -copia, the same
-- sports, the same active variants with new SKUs, and their prices. Photos and stock are not
-- copied: photos belong to the product in R2 and stock is what is on the shelf.
create function public.admin_duplicate_product(id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  source record;
  new_id uuid;
  new_sku text;
  new_slug text;
  attempt int := 1;
  sizes text[];
  colors text[];
begin
  perform public.require_staff();

  select p.* into source from public.products p where p.id = admin_duplicate_product.id;
  if not found then
    raise exception 'No existe el producto %.', admin_duplicate_product.id
      using errcode = 'no_data_found';
  end if;

  loop
    new_sku := source.sku || '-COPIA' || case when attempt > 1 then '-' || attempt else '' end;
    new_slug := source.slug || '-copia' || case when attempt > 1 then '-' || attempt else '' end;
    exit when not exists (select 1 from public.products p where p.sku = new_sku or p.slug = new_slug)
          and not exists (select 1 from public.product_variants v where v.sku like new_sku || '%');
    attempt := attempt + 1;
  end loop;

  insert into public.products (
    sku, slug, name, brand_id, category_id, subcategory_id, audience, short_description,
    description, specs, tags, option1_name, option2_name, color_note, is_customizable,
    techniques, min_suggested_qty, is_featured, sort_order, status, created_by
  ) values (
    new_sku, new_slug, source.name || ' (copia)', source.brand_id, source.category_id,
    source.subcategory_id, source.audience, source.short_description, source.description,
    source.specs, source.tags, source.option1_name, source.option2_name, source.color_note,
    source.is_customizable, source.techniques, source.min_suggested_qty, false,
    source.sort_order, 'draft', auth.uid()
  )
  returning products.id into new_id;

  insert into public.product_sports (product_id, sport_id)
  select new_id, ps.sport_id from public.product_sports ps where ps.product_id = source.id;

  select coalesce(array_agg(o1 order by first_order), '{}') into sizes
    from (
      select v.option1_value as o1, min(v.sort_order) as first_order
        from public.product_variants v
       where v.product_id = source.id and v.is_active and v.option1_value is not null
       group by v.option1_value
    ) t;
  select coalesce(array_agg(o2 order by first_order), '{}') into colors
    from (
      select v.option2_value as o2, min(v.sort_order) as first_order
        from public.product_variants v
       where v.product_id = source.id and v.is_active and v.option2_value is not null
       group by v.option2_value
    ) t;
  perform public.admin_replace_variants(new_id, sizes, colors);

  insert into public.variant_prices (variant_id, min_qty, unit_price_cents, currency)
  select nv.id, vp.min_qty, vp.unit_price_cents, vp.currency
    from public.variant_prices vp
    join public.product_variants ov on ov.id = vp.variant_id and ov.product_id = source.id
    join public.product_variants nv on nv.product_id = new_id
     and nv.option1_value is not distinct from ov.option1_value
     and nv.option2_value is not distinct from ov.option2_value;

  return new_id;
end;
$$;

-- admin_save_commerce --------------------------------------------------------------------------

-- Hidden commerce data of a product (catalog mode: never on the site). For each variant sent,
-- its volume prices and its stock per store are replaced:
-- [{ "variantId", "prices": [{ "minQty", "unitPriceCents" }], "stock": [{ "storeId", "quantity" }] }]
create function public.admin_save_commerce(product_id uuid, variants jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  item jsonb;
  target_variant uuid;
begin
  perform public.require_staff();

  if jsonb_typeof(variants) is distinct from 'array' then
    raise exception 'Se esperaba una lista de variantes.' using errcode = 'invalid_parameter_value';
  end if;

  for item in select value from jsonb_array_elements(variants) loop
    target_variant := nullif(item ->> 'variantId', '')::uuid;
    if not exists (
      select 1 from public.product_variants v
       where v.id = target_variant and v.product_id = admin_save_commerce.product_id
    ) then
      raise exception 'La variante % no es de este producto.', target_variant
        using errcode = 'invalid_parameter_value';
    end if;
    if exists (
      select 1 from jsonb_array_elements(coalesce(item -> 'prices', '[]')) p
       where coalesce((p ->> 'minQty')::int, 0) < 1 or coalesce((p ->> 'unitPriceCents')::int, -1) < 0
    ) then
      raise exception 'Cada precio necesita una cantidad mínima de 1 o más y un importe de 0 o más.'
        using errcode = 'invalid_parameter_value';
    end if;
    if exists (
      select 1 from jsonb_array_elements(coalesce(item -> 'prices', '[]')) p
       group by (p ->> 'minQty')::int having count(*) > 1
    ) then
      raise exception 'Hay dos precios para la misma cantidad mínima.'
        using errcode = 'invalid_parameter_value';
    end if;
    if exists (
      select 1 from jsonb_array_elements(coalesce(item -> 'stock', '[]')) s
       where coalesce((s ->> 'quantity')::int, -1) < 0
          or not exists (select 1 from public.stores st where st.id = (s ->> 'storeId')::uuid)
    ) then
      raise exception 'Las existencias deben ser 0 o más y de una tienda registrada.'
        using errcode = 'invalid_parameter_value';
    end if;

    delete from public.variant_prices vp where vp.variant_id = target_variant;
    insert into public.variant_prices (variant_id, min_qty, unit_price_cents)
    select target_variant, (p ->> 'minQty')::int, (p ->> 'unitPriceCents')::int
      from jsonb_array_elements(coalesce(item -> 'prices', '[]')) p;

    delete from public.inventory_levels il where il.variant_id = target_variant;
    insert into public.inventory_levels (variant_id, store_id, quantity)
    select target_variant, (s ->> 'storeId')::uuid, (s ->> 'quantity')::int
      from jsonb_array_elements(coalesce(item -> 'stock', '[]')) s;
  end loop;
end;
$$;

revoke all on function
  public.admin_save_product(jsonb),
  public.admin_duplicate_product(uuid),
  public.admin_save_commerce(uuid, jsonb)
from public, anon, authenticated;
grant execute on function
  public.admin_save_product(jsonb),
  public.admin_duplicate_product(uuid),
  public.admin_save_commerce(uuid, jsonb)
to authenticated;
