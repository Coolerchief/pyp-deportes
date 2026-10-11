-- T1.5 · admin_import_products (docs/05-BACKEND-SCHEMA.md §8.2, data/sitio-actual.md §4).
begin;
create extension if not exists pgtap with schema extensions;

-- Start from empty tables so fixtures never collide with pyp-dev's data; the rollback at the end
-- puts everything back.
truncate table public.products, public.brands, public.categories, public.sports, public.stores,
  public.customers, public.quote_requests, public.gallery_items, public.site_media,
  public.site_texts, public.settings, public.publish_runs, public.system_heartbeats,
  public.folio_counters, public.staff_members cascade;

select plan(17);

insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-0000000000e1', 'editor-050@tests.pyp.test', 'authenticated', 'authenticated');
insert into public.staff_members (user_id, role, full_name)
values ('00000000-0000-0000-0000-0000000000e1', 'editor', 'Editora');

select ok(not has_function_privilege('anon', 'public.admin_import_products(jsonb)', 'execute'),
  'anon cannot import');

select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated"}', true);
set local role authenticated;

create temporary table batch as
select jsonb_build_array(
  jsonb_build_object('_row', 2, 'sku', 'TST-001', 'slug', 'balon-prueba', 'nombre', 'Balón Prueba',
    'marca', 'Marca Ñandú', 'categoria', 'tst-balones', 'subcategoria', 'tst-balones-futbol',
    'deportes', 'tst-futbol|tst-fut-rapido', 'publico', 'infantil',
    'descripcion_corta', 'Para escuelas', 'personalizable', 'no', 'tecnicas', '',
    'tallas', '4|5', 'colores', 'Blanco/Negro|Amarillo', 'destacado', 'si', 'estado', 'publicado',
    'url_anterior', 'https://www.pypdeportescoapa.com/producto/balon-prueba/'),
  jsonb_build_object('_row', 3, 'sku', 'TST-002', 'slug', 'jersey-prueba', 'nombre', 'Jersey Prueba',
    'marca', 'Marca Ñandú', 'categoria', 'tst-uniformes', 'subcategoria', '',
    'deportes', 'tst-futbol', 'publico', 'unisex', 'personalizable', 'si',
    'tecnicas', 'sublimacion|bordado', 'tallas', 'CH|M', 'colores', 'A elegir',
    'destacado', 'no', 'estado', 'borrador'),
  jsonb_build_object('_row', 4, 'sku', 'TST-003', 'slug', 'silbato-prueba', 'nombre', 'Silbato',
    'marca', 'marca ñandú', 'categoria', 'tst-uniformes', 'deportes', '', 'publico', 'unisex',
    'tallas', 'unitalla', 'colores', '', 'estado', 'publicado'),
  jsonb_build_object('_row', 5, 'sku', 'TST-004', 'slug', 'mal-url', 'nombre', 'Mal',
    'marca', 'X', 'categoria', 'tst-uniformes', 'tallas', 'unitalla',
    'url_anterior', 'https://www.pypdeportescoapa.com/producto/otro-slug/'),
  jsonb_build_object('_row', 6, 'sku', 'TST-005', 'slug', 'mal-publico', 'nombre', 'Mal',
    'marca', 'X', 'categoria', 'tst-uniformes', 'publico', 'niños', 'tallas', 'unitalla'),
  jsonb_build_object('_row', 7, 'sku', '', 'slug', 'sin-sku', 'nombre', 'Sin SKU',
    'marca', 'X', 'categoria', 'tst-uniformes')
) as rows;

create temporary table first_run as
select public.admin_import_products(rows) as result from batch;

select is((select (result ->> 'created')::int from first_run), 3, 'valid rows are created');
select is(
  (select jsonb_agg(e -> 'row' order by (e ->> 'row')::int) from first_run,
          jsonb_array_elements(result -> 'errors') e),
  '[5, 6, 7]'::jsonb,
  'invalid rows are reported with their line number and do not stop the batch');
select ok(
  (select result -> 'errors' -> 0 ->> 'message' like '%url_anterior%' from first_run),
  'a slug that does not match url_anterior is an error');
select is((select count(*)::int from public.products where sku in ('TST-004', 'TST-005')), 0,
  'rows with errors leave nothing behind');

select results_eq(
  $$select v.sku from public.product_variants v join public.products p on p.id = v.product_id
     where p.sku = 'TST-001' and v.is_active order by v.sort_order$$,
  $$values ('TST-001-4-BLANCO-NEGRO'::text), ('TST-001-4-AMARILLO'), ('TST-001-5-BLANCO-NEGRO'),
           ('TST-001-5-AMARILLO')$$,
  'variants are sizes × colors');
select results_eq(
  $$select status::text, audience::text, is_featured, option2_name, published_at is not null,
           legacy_url is not null
      from public.products where sku = 'TST-001'$$,
  $$values ('published'::text, 'infantil'::text, true, 'Color'::text, true, true)$$,
  'product fields are mapped from the CSV');
select results_eq(
  $$select color_note, option2_name, is_customizable, techniques, status::text
      from public.products where sku = 'TST-002'$$,
  $$values ('A elegir'::text, null::text, true, array['sublimacion', 'bordado'], 'draft'::text)$$,
  '"A elegir" is a color note, not a variant dimension');
select results_eq(
  $$select v.sku, v.is_default from public.product_variants v
      join public.products p on p.id = v.product_id where p.sku = 'TST-003'$$,
  $$values ('TST-003'::text, true)$$,
  'unitalla without colors keeps only the default variant');
select is(
  (select count(distinct brand_id)::int from public.products where sku like 'TST-%'),
  1, 'brands match by name regardless of case');
select results_eq(
  $$select c.slug, parent.slug from public.categories c
      join public.categories parent on parent.id = c.parent_id where c.slug = 'tst-balones-futbol'$$,
  $$values ('tst-balones-futbol'::text, 'tst-balones'::text)$$,
  'missing categories and subcategories are created under their parent');
select results_eq(
  $$select s.slug from public.product_sports ps join public.sports s on s.id = ps.sport_id
      join public.products p on p.id = ps.product_id where p.sku = 'TST-001' order by s.slug$$,
  $$values ('tst-fut-rapido'::text), ('tst-futbol')$$,
  'sports are linked and created when missing');

-- Second run: nothing is duplicated; the slug is kept and reported.
create temporary table second_run as
select public.admin_import_products(jsonb_set(jsonb_set(jsonb_set(rows,
         '{0,slug}', '"slug-nuevo"'), '{0,url_anterior}', '""'), '{0,tallas}', '"5|6"')) as result
  from batch;

select results_eq(
  $$select (result ->> 'created')::int, (result ->> 'updated')::int from second_run$$,
  $$values (0, 3)$$,
  'importing again updates instead of creating');
select is(
  (select slug from public.products where sku = 'TST-001'),
  'balon-prueba',
  'an existing product keeps its slug');
select ok(
  (select result -> 'warnings' -> 0 ->> 'message' like '%conserva su slug%' from second_run),
  'a different slug in the CSV is reported as a warning');
select results_eq(
  $$select v.sku, v.is_active from public.product_variants v join public.products p on p.id = v.product_id
     where p.sku = 'TST-001' order by v.is_active desc, v.sku$$,
  $$values ('TST-001-5-AMARILLO'::text, true), ('TST-001-5-BLANCO-NEGRO', true),
           ('TST-001-6-AMARILLO', true), ('TST-001-6-BLANCO-NEGRO', true),
           ('TST-001-4-AMARILLO', false), ('TST-001-4-BLANCO-NEGRO', false)$$,
  'changed sizes keep existing variants, add new ones and deactivate the rest');

select throws_ok(
  $$select public.admin_import_products(
      (select jsonb_agg(jsonb_build_object('sku', 'X' || g)) from generate_series(1, 51) g))$$,
  '22023', null,
  'a batch takes at most 50 rows');

reset role;

select * from finish();
rollback;
