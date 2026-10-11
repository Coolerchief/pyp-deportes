-- T1.1 · Triggers for staff, taxonomy and catalog (docs/05-BACKEND-SCHEMA.md §5).
--
-- ensure_default_variant and validate_product_publish are deferred constraint triggers: they run
-- at commit, so a product and its variants can be written in one transaction (importer, admin)
-- before the "at least one variant" and "publishable" rules are checked.

-- set_updated_at on every editable table ------------------------------------------------------

create trigger set_updated_at before update on public.staff_members
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.sports
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.brands
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.product_images
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.variant_prices
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.stores
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.inventory_levels
  for each row execute function public.set_updated_at();

-- categories_one_level: subcategories cannot have subcategories --------------------------------

create function public.categories_one_level()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is null then
    return new;
  end if;
  if new.parent_id = new.id then
    raise exception 'Una categoría no puede ser su propia subcategoría.'
      using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.categories where id = new.parent_id and parent_id is not null) then
    raise exception 'Solo hay un nivel de subcategorías: "%" ya es una subcategoría.', new.parent_id
      using errcode = 'check_violation';
  end if;
  if tg_op = 'UPDATE' and exists (select 1 from public.categories where parent_id = new.id) then
    raise exception 'La categoría "%" tiene subcategorías; no puede volverse subcategoría.', new.slug
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger categories_one_level
  before insert or update of parent_id on public.categories
  for each row execute function public.categories_one_level();

-- products_search_text: lower(unaccent(name ‖ sku ‖ tags ‖ brand)) -----------------------------

create function public.product_search_text(
  product_name text,
  product_sku text,
  product_tags text[],
  product_brand_id uuid
)
returns text
language sql
stable
set search_path = ''
as $$
  select public.normalize_search_text(concat_ws(
    ' ',
    product_name,
    product_sku,
    array_to_string(product_tags, ' '),
    (select b.name from public.brands b where b.id = product_brand_id)
  ));
$$;

create function public.products_search_text()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_text := public.product_search_text(new.name, new.sku, new.tags, new.brand_id);
  return new;
end;
$$;

create trigger products_search_text
  before insert or update of name, sku, tags, brand_id, search_text on public.products
  for each row execute function public.products_search_text();

-- A renamed brand refreshes the search text of its products.
create function public.brands_refresh_search_text()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.products p
     set search_text = public.product_search_text(p.name, p.sku, p.tags, p.brand_id)
   where p.brand_id = new.id;
  return null;
end;
$$;

create trigger brands_refresh_search_text
  after update of name on public.brands
  for each row when (old.name is distinct from new.name)
  execute function public.brands_refresh_search_text();

-- products_published_at: set the first time the product is published -------------------------

create function public.products_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger products_published_at
  before insert or update of status, published_at on public.products
  for each row execute function public.products_published_at();

-- ensure_default_variant: every product keeps at least one variant (§1.2) ---------------------

create function public.ensure_default_variant()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_id uuid;
begin
  -- Separate branches: plpgsql cannot read a field the other table's record lacks.
  if tg_table_name = 'products' then
    target_id := new.id;
  else
    target_id := old.product_id;
  end if;

  insert into public.product_variants (product_id, sku, is_default)
  select p.id, p.sku, true
    from public.products p
   where p.id = target_id
     and not exists (select 1 from public.product_variants v where v.product_id = p.id);
  return null;
end;
$$;

-- Product born without variants: create the default one (same SKU as the product).
create constraint trigger ensure_default_variant
  after insert on public.products
  deferrable initially deferred
  for each row execute function public.ensure_default_variant();

-- Last variant deleted while the product still exists: bring the default one back.
create constraint trigger ensure_default_variant
  after delete on public.product_variants
  deferrable initially deferred
  for each row execute function public.ensure_default_variant();

-- validate_product_publish: published products need a name and an active variant -------------

create function public.validate_product_publish()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_id uuid;
  product record;
begin
  if tg_table_name = 'products' then
    target_id := new.id;
  elsif tg_op = 'DELETE' then
    target_id := old.product_id;
  else
    target_id := new.product_id;
  end if;

  select p.id, p.name, p.sku, p.status, p.brand_id, p.category_id
    into product
    from public.products p
   where p.id = target_id;

  if not found or product.status <> 'published' then
    return null;
  end if;

  if btrim(product.name) = '' or product.brand_id is null or product.category_id is null then
    raise exception 'No se puede publicar % : le falta nombre, marca o categoría.', product.sku
      using errcode = 'check_violation';
  end if;

  if not exists (
    select 1 from public.product_variants v where v.product_id = product.id and v.is_active
  ) then
    raise exception 'No se puede publicar % : necesita al menos una variante activa.', product.sku
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

create constraint trigger validate_product_publish
  after insert or update on public.products
  deferrable initially deferred
  for each row execute function public.validate_product_publish();

-- Deactivating or deleting the last active variant of a published product is rejected too.
create constraint trigger validate_product_publish
  after update or delete on public.product_variants
  deferrable initially deferred
  for each row execute function public.validate_product_publish();
