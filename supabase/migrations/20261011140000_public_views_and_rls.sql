-- T1.3 · Public views, is_staff/is_admin and RLS policies (docs/05-BACKEND-SCHEMA.md §6, §7).
--
-- Privileges, on top of RLS:
--   · anon has no privilege on any base table; it only selects the public_* views.
--   · authenticated keeps table privileges and RLS decides, except on the quote, customer and
--     internal tables, where it can only select (writes go through functions in T1.4).
--   · the views run with their owner's rights (no security_invoker, on purpose) and are
--     select-only for anon and authenticated, so an auto-updatable view cannot be written.

-- Helpers ------------------------------------------------------------------------------------

create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_members
     where user_id = (select auth.uid()) and is_active
  );
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_members
     where user_id = (select auth.uid()) and is_active and role = 'admin'
  );
$$;

revoke all on function public.is_staff() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_staff() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;

-- Reads a boolean flag from settings.flags (false when missing).
create function public.setting_flag(flag text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (s.value ->> flag)::boolean from public.settings s where s.key = 'flags'), false);
$$;

-- Whoever queries a view needs EXECUTE on the functions it calls; flags are public anyway.
revoke all on function public.setting_flag(text) from public;
grant execute on function public.setting_flag(text) to anon, authenticated, service_role;

-- Table privileges ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
-- Future tables created by migrations start without anon privileges too.
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;

revoke insert, update, delete, truncate on
  public.customers, public.quote_requests, public.quote_request_items,
  public.quote_status_history, public.folio_counters, public.system_heartbeats,
  public.publish_runs
from authenticated;

-- RLS policies (all for authenticated; anon has none) ----------------------------------------

-- Catalog, taxonomy, gallery and site content: staff read and write.
do $$
declare
  t text;
begin
  foreach t in array array[
    'products', 'product_variants', 'product_images', 'product_sports', 'variant_prices',
    'inventory_levels', 'sports', 'categories', 'brands', 'gallery_items',
    'gallery_item_products', 'site_media', 'site_texts'
  ] loop
    execute format(
      'create policy staff_all on public.%I for all to authenticated
         using ((select public.is_staff())) with check ((select public.is_staff()))',
      t
    );
  end loop;
end;
$$;

-- Quotes and customers: staff read; changes only through admin_* functions (T1.4).
create policy staff_select on public.customers
  for select to authenticated using ((select public.is_staff()));
create policy staff_select on public.quote_requests
  for select to authenticated using ((select public.is_staff()));
create policy staff_select on public.quote_request_items
  for select to authenticated using ((select public.is_staff()));
create policy staff_select on public.quote_status_history
  for select to authenticated using ((select public.is_staff()));

-- Stores and settings: staff read, admin writes.
create policy staff_select on public.stores
  for select to authenticated using ((select public.is_staff()));
create policy admin_insert on public.stores
  for insert to authenticated with check ((select public.is_admin()));
create policy admin_update on public.stores
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_delete on public.stores
  for delete to authenticated using ((select public.is_admin()));

create policy staff_select on public.settings
  for select to authenticated using ((select public.is_staff()));
create policy admin_insert on public.settings
  for insert to authenticated with check ((select public.is_admin()));
create policy admin_update on public.settings
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_delete on public.settings
  for delete to authenticated using ((select public.is_admin()));

-- Staff members: each person reads their own row; admin reads and writes all.
create policy own_or_admin_select on public.staff_members
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy admin_insert on public.staff_members
  for insert to authenticated with check ((select public.is_admin()));
create policy admin_update on public.staff_members
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_delete on public.staff_members
  for delete to authenticated using ((select public.is_admin()));

-- Operations.
create policy staff_select on public.publish_runs
  for select to authenticated using ((select public.is_staff()));
create policy admin_select on public.folio_counters
  for select to authenticated using ((select public.is_admin()));
create policy admin_select on public.system_heartbeats
  for select to authenticated using ((select public.is_admin()));

-- §6 Public views ----------------------------------------------------------------------------

create view public.public_products as
  select p.id, p.sku, p.slug, p.name, p.brand_id, p.category_id, p.subcategory_id, p.audience,
         p.short_description, p.description, p.specs, p.tags, p.option1_name, p.option2_name,
         p.color_note, p.is_customizable, p.techniques, p.min_suggested_qty, p.is_featured,
         p.sort_order, p.status, p.published_at, p.legacy_url, p.created_at, p.updated_at
    from public.products p
   where p.status = 'published';

create view public.public_product_variants as
  select v.id, v.product_id, v.sku, v.option1_value, v.option2_value, v.is_default,
         v.is_active, v.sort_order, v.created_at, v.updated_at
    from public.product_variants v
    join public.products p on p.id = v.product_id
   where v.is_active and p.status = 'published';

create view public.public_product_images as
  select i.id, i.product_id, i.variant_id, i.key_base, i.alt, i.width, i.height, i.sort_order,
         i.created_at, i.updated_at
    from public.product_images i
    join public.products p on p.id = i.product_id
   where p.status = 'published';

create view public.public_product_sports as
  select ps.product_id, ps.sport_id
    from public.product_sports ps
    join public.products p on p.id = ps.product_id
    join public.sports s on s.id = ps.sport_id
   where p.status = 'published' and s.is_active;

create view public.public_sports as
  select s.id, s.slug, s.name, s.sort_order, s.is_active, s.created_at, s.updated_at
    from public.sports s
   where s.is_active
     and exists (
       select 1 from public.product_sports ps
         join public.products p on p.id = ps.product_id
        where ps.sport_id = s.id and p.status = 'published'
     );

-- A subcategory's products also carry the parent in category_id, so this covers both levels.
create view public.public_categories as
  select c.id, c.parent_id, c.slug, c.name, c.size_label, c.sort_order, c.is_active,
         c.created_at, c.updated_at
    from public.categories c
   where c.is_active
     and exists (
       select 1 from public.products p
        where p.status = 'published' and (p.category_id = c.id or p.subcategory_id = c.id)
     );

create view public.public_brands as
  select b.id, b.slug, b.name, b.logo_key, b.is_own_brand, b.sort_order, b.created_at,
         b.updated_at
    from public.brands b
   where exists (
     select 1 from public.products p where p.brand_id = b.id and p.status = 'published'
   );

create view public.public_stores as
  select st.id, st.slug, st.name, st.street, st.neighborhood, st.borough, st.postal_code,
         st.city, st.lat, st.lng, st.phone, st.email, st.hours, st.directions, st.is_active,
         st.sort_order, st.created_at, st.updated_at
    from public.stores st
   where st.is_active;

create view public.public_gallery_items as
  select g.id, g.team_name, g.sport_id, g.year, g.key_base, g.alt, g.width, g.height,
         g.status, g.sort_order, g.created_at, g.updated_at
    from public.gallery_items g
   where g.status = 'published';

create view public.public_gallery_item_products as
  select gp.gallery_item_id, gp.product_id
    from public.gallery_item_products gp
    join public.gallery_items g on g.id = gp.gallery_item_id
    join public.products p on p.id = gp.product_id
   where g.status = 'published' and p.status = 'published';

create view public.public_site_media as
  select m.slot, m.key_base, m.alt, m.width, m.height, m.created_at, m.updated_at
    from public.site_media m;

create view public.public_site_texts as
  select t.key, t.value, t.created_at, t.updated_at
    from public.site_texts t;

create view public.public_settings as
  select s.key, s.value, s.is_public, s.created_at, s.updated_at
    from public.settings s
   where s.is_public;

-- Commerce views: rows only when the store mode flag is on (no migration needed to switch).
create view public.public_variant_prices as
  select vp.variant_id, vp.min_qty, vp.unit_price_cents, vp.currency, vp.created_at,
         vp.updated_at
    from public.variant_prices vp
    join public.product_variants v on v.id = vp.variant_id
    join public.products p on p.id = v.product_id
   where public.setting_flag('show_prices') and v.is_active and p.status = 'published';

create view public.public_inventory as
  select il.variant_id, il.store_id, il.quantity, il.created_at, il.updated_at
    from public.inventory_levels il
    join public.product_variants v on v.id = il.variant_id
    join public.products p on p.id = v.product_id
    join public.stores st on st.id = il.store_id
   where public.setting_flag('enable_stock') and v.is_active and p.status = 'published'
     and st.is_active;

-- Views: select only.
do $$
declare
  v text;
begin
  foreach v in array array[
    'public_products', 'public_product_variants', 'public_product_images',
    'public_product_sports', 'public_sports', 'public_categories', 'public_brands',
    'public_stores', 'public_gallery_items', 'public_gallery_item_products',
    'public_site_media', 'public_site_texts', 'public_settings', 'public_variant_prices',
    'public_inventory'
  ] loop
    execute format('revoke all on public.%I from anon, authenticated', v);
    execute format('grant select on public.%I to anon, authenticated', v);
  end loop;
end;
$$;
