-- T1.1 · Catalog tables and triggers (docs/05-BACKEND-SCHEMA.md §4.1–4.4, §5).
begin;
create extension if not exists pgtap with schema extensions;

select plan(26);

-- Tables and RLS ------------------------------------------------------------------------------

select tables_are(
  'public',
  array[
    'staff_members', 'sports', 'categories', 'brands', 'products', 'product_sports',
    'product_variants', 'product_images', 'variant_prices', 'stores', 'inventory_levels'
  ],
  'T1.1 creates the staff, taxonomy, catalog and commerce tables'
);

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0,
  'RLS is enabled on every public table'
);

select has_extension('extensions', 'unaccent', 'unaccent is installed');
select has_extension('extensions', 'pg_trgm', 'pg_trgm is installed');
select enum_has_labels('public', 'product_status', array['draft', 'published', 'archived'],
  'product_status has its three states');

-- Deferred rules run at the end of each statement inside this test.
set constraints all immediate;

-- Fixtures ------------------------------------------------------------------------------------

insert into public.brands (id, slug, name)
values ('00000000-0000-0000-0000-0000000000b1', 'voit', 'Voit');

insert into public.categories (id, slug, name, size_label)
values ('00000000-0000-0000-0000-0000000000c1', 'balones', 'Balones', 'Tamaño');

insert into public.categories (id, parent_id, slug, name)
values ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c1',
        'balones-futbol', 'Balones de fútbol');

-- categories_one_level --------------------------------------------------------------------------

select throws_ok(
  $$insert into public.categories (parent_id, slug, name)
    values ('00000000-0000-0000-0000-0000000000c2', 'nivel-tres', 'Nivel tres')$$,
  '23514', null,
  'a subcategory cannot have subcategories'
);

select throws_ok(
  $$update public.categories set parent_id = '00000000-0000-0000-0000-0000000000c2'
     where id = '00000000-0000-0000-0000-0000000000c1'$$,
  '23514', null,
  'a category with subcategories cannot become a subcategory'
);

-- ensure_default_variant ------------------------------------------------------------------------

insert into public.products (id, sku, slug, name, brand_id, category_id, subcategory_id, tags)
values ('00000000-0000-0000-0000-0000000000a1', 'BAL-001', 'balon-futbol-voit',
        'Balón Fútbol Ñandú', '00000000-0000-0000-0000-0000000000b1',
        '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2',
        array['Cancha', 'Pasto']);

select results_eq(
  $$select sku, is_default, option1_value from public.product_variants
     where product_id = '00000000-0000-0000-0000-0000000000a1'$$,
  $$values ('BAL-001'::text, true, null::text)$$,
  'a product born without variants gets one default variant with its SKU'
);

-- Variants written after the product (same transaction in real use) keep the default too;
-- replacing them: delete the default and add real ones.
insert into public.product_variants (product_id, sku, option1_value)
values ('00000000-0000-0000-0000-0000000000a1', 'BAL-001-4', '#4'),
       ('00000000-0000-0000-0000-0000000000a1', 'BAL-001-5', '#5');
delete from public.product_variants where sku = 'BAL-001';

select is(
  (select count(*)::int from public.product_variants
    where product_id = '00000000-0000-0000-0000-0000000000a1'),
  2,
  'deleting the default variant keeps the real ones'
);

delete from public.product_variants where product_id = '00000000-0000-0000-0000-0000000000a1';

select results_eq(
  $$select sku, is_default from public.product_variants
     where product_id = '00000000-0000-0000-0000-0000000000a1'$$,
  $$values ('BAL-001'::text, true)$$,
  'deleting every variant brings the default one back'
);

select throws_ok(
  $$insert into public.product_variants (product_id, sku, is_default)
    values ('00000000-0000-0000-0000-0000000000a1', 'BAL-001-X', true)$$,
  '23505', null,
  'a product has at most one default variant'
);

select throws_ok(
  $$insert into public.product_variants (product_id, sku)
    values ('00000000-0000-0000-0000-0000000000a1', 'BAL-001-Y')$$,
  '23505', null,
  'option values are unique per product, nulls included'
);

-- products_search_text --------------------------------------------------------------------------

select is(
  (select search_text from public.products where sku = 'BAL-001'),
  'balon futbol nandu bal-001 cancha pasto voit',
  'search_text is name, sku, tags and brand in lowercase without accents'
);

update public.products set search_text = 'manual' where sku = 'BAL-001';
select is(
  (select search_text from public.products where sku = 'BAL-001'),
  'balon futbol nandu bal-001 cancha pasto voit',
  'search_text cannot be overwritten by hand'
);

update public.brands set name = 'Vóit Pro' where slug = 'voit';
select is(
  (select search_text from public.products where sku = 'BAL-001'),
  'balon futbol nandu bal-001 cancha pasto voit pro',
  'renaming the brand refreshes search_text'
);

-- products_published_at and validate_product_publish -------------------------------------------

select is(
  (select published_at from public.products where sku = 'BAL-001'),
  null,
  'a draft has no published_at'
);

update public.products set status = 'published' where sku = 'BAL-001';
select isnt(
  (select published_at from public.products where sku = 'BAL-001'),
  null,
  'published_at is set the first time the product is published'
);

update public.products set published_at = '2026-01-01T00:00:00Z' where sku = 'BAL-001';
update public.products set status = 'draft' where sku = 'BAL-001';
update public.products set status = 'published' where sku = 'BAL-001';
select is(
  (select published_at from public.products where sku = 'BAL-001'),
  '2026-01-01T00:00:00Z'::timestamptz,
  'publishing again keeps the first published_at'
);

select throws_ok(
  $$update public.product_variants set is_active = false where sku = 'BAL-001'$$,
  '23514', null,
  'the last active variant of a published product cannot be deactivated'
);

select throws_ok(
  $$update public.products set name = '  ' where sku = 'BAL-001'$$,
  '23514', null,
  'a published product needs a name'
);

update public.products set status = 'draft' where sku = 'BAL-001';
select lives_ok(
  $$update public.product_variants set is_active = false where sku = 'BAL-001'$$,
  'a draft may have no active variants'
);

select throws_ok(
  $$update public.products set status = 'published' where sku = 'BAL-001'$$,
  '23514', null,
  'a product without active variants cannot be published'
);

-- updated_at ------------------------------------------------------------------------------------

update public.brands set updated_at = '2000-01-01T00:00:00Z' where slug = 'voit';
select isnt(
  (select updated_at from public.brands where slug = 'voit'),
  '2000-01-01T00:00:00Z'::timestamptz,
  'set_updated_at refreshes updated_at on update'
);

-- Deferred mode (as in a real transaction): product and variants written together, published
-- in the same transaction; the rules run when the constraints are checked.
set constraints all deferred;
insert into public.products (id, sku, slug, name, brand_id, category_id, status)
values ('00000000-0000-0000-0000-0000000000a2', 'BAL-003', 'balon-voleibol', 'Balón Voleibol',
        '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1',
        'published');
insert into public.product_variants (product_id, sku, option1_value)
values ('00000000-0000-0000-0000-0000000000a2', 'BAL-003-4', '#4'),
       ('00000000-0000-0000-0000-0000000000a2', 'BAL-003-5', '#5');

select lives_ok(
  'set constraints all immediate',
  'a product published together with its variants passes the deferred checks'
);

select is(
  (select count(*)::int from public.product_variants
    where product_id = '00000000-0000-0000-0000-0000000000a2' and is_default),
  0,
  'no default variant is added when variants arrive in the same transaction'
);

select throws_ok(
  $$insert into public.products (sku, slug, name, brand_id, category_id, techniques)
    values ('BAL-002', 'otro', 'Otro', '00000000-0000-0000-0000-0000000000b1',
            '00000000-0000-0000-0000-0000000000c1', array['estampado'])$$,
  '23514', null,
  'techniques only accept the four known values'
);

select * from finish();
rollback;
