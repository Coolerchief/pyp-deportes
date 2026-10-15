-- T4.3 · A product that was never published can change its SKU (a copy starts as "…-COPIA"
-- and gets its own); its variants are renamed with it. Once published, the SKU stays.

create or replace function public.admin_save_product(product jsonb)
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
    -- Once published, requests and imports find the product by its SKU. Before that (a new
    -- product or a copy) it can still change, and its variants follow it.
    if existing.sku <> value_sku and existing.published_at is not null then
      raise exception 'El SKU de un producto que ya se publicó no cambia.'
        using errcode = 'invalid_parameter_value';
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
      status = value_status,
      sku = value_sku
    where p.id = target_id;
    if existing.sku <> value_sku then
      update public.product_variants v
         set sku = public.variant_sku(value_sku, v.option1_value, v.option2_value)
       where v.product_id = target_id;
    end if;
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
