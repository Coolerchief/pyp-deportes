-- T4.3 · admin_save_product, admin_duplicate_product and admin_save_commerce.
begin;
create extension if not exists pgtap with schema extensions;

truncate table public.products, public.brands, public.categories, public.sports, public.stores,
  public.customers, public.quote_requests, public.gallery_items, public.site_media,
  public.site_texts, public.settings, public.publish_runs, public.system_heartbeats,
  public.folio_counters, public.staff_members cascade;

select plan(29);

-- Fixtures (invented) --------------------------------------------------------------------------
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000f1', 'editor-070@tests.pyp.test', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000f2', 'nadie-070@tests.pyp.test', 'authenticated', 'authenticated');
insert into public.staff_members (user_id, role, full_name)
values ('00000000-0000-0000-0000-0000000000f1', 'editor', 'Editora');

insert into public.brands (id, slug, name) values
  ('00000000-0000-4000-8000-00000000b001', 'marca-070', 'Marca 070');
insert into public.categories (id, parent_id, slug, name, size_label) values
  ('00000000-0000-4000-8000-00000000c001', null, 'balones-070', 'Balones', 'Tamaño'),
  ('00000000-0000-4000-8000-00000000c002', '00000000-0000-4000-8000-00000000c001', 'balones-futbol-070', 'Fútbol', 'Talla'),
  ('00000000-0000-4000-8000-00000000c003', null, 'uniformes-070', 'Uniformes', 'Talla'),
  ('00000000-0000-4000-8000-00000000c004', '00000000-0000-4000-8000-00000000c003', 'uniformes-futbol-070', 'Uniformes fútbol', 'Talla');
insert into public.sports (id, slug, name) values
  ('00000000-0000-4000-8000-00000000d001', 'futbol-070', 'Fútbol'),
  ('00000000-0000-4000-8000-00000000d002', 'basquet-070', 'Básquetbol');
insert into public.stores (id, slug, name, street, neighborhood, borough, postal_code) values
  ('00000000-0000-4000-8000-00000000e001', 'tienda-070', 'Tienda', 'Calle 1', 'Colonia', 'Coyoacán', '04000');

select ok(not has_function_privilege('anon', 'public.admin_save_product(jsonb)', 'execute')
      and not has_function_privilege('anon', 'public.admin_duplicate_product(uuid)', 'execute')
      and not has_function_privilege('anon', 'public.admin_save_commerce(uuid, jsonb)', 'execute'),
  'anon cannot run the product functions');

create temporary table draft_input as
select jsonb_build_object(
  'sku', 'bal-070', 'slug', 'balon-070', 'name', ' Balón 070 ',
  'brandId', '00000000-0000-4000-8000-00000000b001',
  'categoryId', '00000000-0000-4000-8000-00000000c001',
  'subcategoryId', '00000000-0000-4000-8000-00000000c002',
  'audience', 'infantil', 'shortDescription', 'Para escuelas',
  'specs', '[{"label": "Material", "value": "Cuero sintético"}]'::jsonb,
  'tags', '["cosido", " cosido ", ""]'::jsonb,
  'sportIds', '["00000000-0000-4000-8000-00000000d001", "00000000-0000-4000-8000-00000000d002"]'::jsonb,
  'isCustomizable', true, 'techniques', '["bordado"]'::jsonb, 'minSuggestedQty', '12'
) as value;
grant select, update on draft_input to authenticated;

-- Someone who is not staff --------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000f2", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.admin_save_product((select value from draft_input))$$,
  '42501', null, 'a user who is not staff cannot save products');
reset role;

-- Staff ----------------------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}', true);
set local role authenticated;

create temporary table created as
select public.admin_save_product((select value from draft_input)) as id;

select results_eq(
  $$select sku, name, status::text, option1_name, audience::text, tags, min_suggested_qty,
           created_by::text
      from public.products where id = (select id from created)$$,
  $$values ('BAL-070'::text, 'Balón 070'::text, 'draft'::text, 'Tamaño'::text, 'infantil'::text,
            array['cosido']::text[], 12, '00000000-0000-0000-0000-0000000000f1'::text)$$,
  'a new product is a draft with an uppercase SKU, the size label of its category and clean tags');
select results_eq(
  $$select sku, is_default, is_active from public.product_variants
     where product_id = (select id from created)$$,
  $$values ('BAL-070'::text, true, true)$$,
  'a new product gets its default variant right away');
select is((select count(*)::int from public.product_sports where product_id = (select id from created)),
  2, 'its sports are saved');

select throws_ok(
  $$select public.admin_save_product((select value || jsonb_build_object('sku', 'BAL-071', 'slug', 'otro-071',
      'subcategoryId', '00000000-0000-4000-8000-00000000c004') from draft_input))$$,
  '22023', 'La subcategoría no pertenece a la categoría elegida.',
  'the subcategory must belong to the category');
select throws_ok(
  $$select public.admin_save_product((select value || jsonb_build_object('sku', 'BAL-071', 'slug', 'otro-071',
      'categoryId', '00000000-0000-4000-8000-00000000c002', 'subcategoryId', null) from draft_input))$$,
  '22023', 'Elige una categoría principal.', 'a subcategory is not a main category');
select throws_ok(
  $$select public.admin_save_product((select value || jsonb_build_object('sku', 'BAL-071', 'slug', 'Otro Slug')
      from draft_input))$$,
  '22023', 'El slug solo puede tener minúsculas, números y guiones.', 'the slug is checked');
select throws_ok(
  $$select public.admin_save_product((select value || jsonb_build_object('sku', 'BAL 071', 'slug', 'otro-071')
      from draft_input))$$,
  '22023', 'El SKU solo puede tener letras, números y guiones.', 'the SKU is checked');
select throws_ok(
  $$select public.admin_save_product((select value || jsonb_build_object('sku', 'BAL-071', 'slug', 'otro-071',
      'brandId', null) from draft_input))$$,
  '22023', 'Elige una marca.', 'a brand is required');
select throws_ok(
  $$select public.admin_save_product((select value || jsonb_build_object('slug', 'otro-071') from draft_input))$$,
  '23505', null, 'a SKU that already exists is rejected');

-- Update ---------------------------------------------------------------------------------------
select lives_ok(
  $$select public.admin_save_product((select value || jsonb_build_object('id', (select id from created),
      'name', 'Balón 070 Pro', 'sportIds', '["00000000-0000-4000-8000-00000000d002"]'::jsonb) from draft_input))$$,
  'a draft can be edited');
select results_eq(
  $$select p.name, array_agg(s.slug) from public.products p
      join public.product_sports ps on ps.product_id = p.id join public.sports s on s.id = ps.sport_id
     where p.id = (select id from created) group by p.name$$,
  $$values ('Balón 070 Pro'::text, array['basquet-070']::text[])$$,
  'editing replaces the sports');
select lives_ok(
  $$select public.admin_save_product((select value || jsonb_build_object('id', (select id from created),
      'sku', 'bal-069') from draft_input))$$,
  'a product never published can change its SKU');
select results_eq(
  $$select p.sku, v.sku from public.products p join public.product_variants v on v.product_id = p.id
     where p.id = (select id from created)$$,
  $$values ('BAL-069'::text, 'BAL-069'::text)$$,
  'its variants follow the new SKU');
update draft_input set value = value || '{"sku": "BAL-069"}';

-- Publish --------------------------------------------------------------------------------------
select lives_ok(
  $$select public.admin_save_product((select value || jsonb_build_object('id', (select id from created),
      'status', 'published') from draft_input))$$,
  'a product with its default variant can be published');
select ok((select published_at is not null from public.products where id = (select id from created)),
  'publishing sets published_at');
select throws_ok(
  $$select public.admin_save_product((select value || jsonb_build_object('id', (select id from created),
      'status', 'published', 'sku', 'BAL-098') from draft_input))$$,
  '22023', 'El SKU de un producto que ya se publicó no cambia.', 'a published product keeps its SKU');
select throws_ok(
  $$select public.admin_save_product((select value || jsonb_build_object('id', (select id from created),
      'status', 'published', 'slug', 'balon-nuevo-070') from draft_input))$$,
  '22023', 'Un producto que ya se publicó conserva su dirección (slug).',
  'a published product keeps its slug');
select lives_ok(
  $$select public.admin_save_product((select value || jsonb_build_object('id', (select id from created),
      'status', 'archived') from draft_input))$$,
  'a product can be archived');
select lives_ok(
  $$select public.admin_save_product((select value || jsonb_build_object('sku', 'BAL-072', 'slug', 'balon-072',
      'status', 'published') from draft_input))$$,
  'a new product can be published at once');

-- Commerce -------------------------------------------------------------------------------------
create temporary table default_variant as
select v.id from public.product_variants v where v.product_id = (select id from created);

select lives_ok(
  $$select public.admin_save_commerce((select id from created), jsonb_build_array(jsonb_build_object(
      'variantId', (select id from default_variant),
      'prices', '[{"minQty": 1, "unitPriceCents": 45000}, {"minQty": 12, "unitPriceCents": 39900}]'::jsonb,
      'stock', '[{"storeId": "00000000-0000-4000-8000-00000000e001", "quantity": 7}]'::jsonb)))$$,
  'prices by volume and stock are saved');
select lives_ok(
  $$select public.admin_save_commerce((select id from created), jsonb_build_array(jsonb_build_object(
      'variantId', (select id from default_variant),
      'prices', '[{"minQty": 1, "unitPriceCents": 42000}]'::jsonb,
      'stock', '[{"storeId": "00000000-0000-4000-8000-00000000e001", "quantity": 3}]'::jsonb)))$$,
  'saving again replaces them');
select results_eq(
  $$select (select array_agg(unit_price_cents) from public.variant_prices where variant_id = (select id from default_variant)),
           (select array_agg(quantity) from public.inventory_levels where variant_id = (select id from default_variant))$$,
  $$values (array[42000], array[3])$$,
  'only the last prices and stock remain');
select throws_ok(
  $$select public.admin_save_commerce((select id from created), jsonb_build_array(jsonb_build_object(
      'variantId', (select id from default_variant),
      'prices', '[{"minQty": 1, "unitPriceCents": 1}, {"minQty": 1, "unitPriceCents": 2}]'::jsonb)))$$,
  '22023', 'Hay dos precios para la misma cantidad mínima.', 'two prices for the same quantity are rejected');
select throws_ok(
  $$select public.admin_save_commerce((select id from created), jsonb_build_array(jsonb_build_object(
      'variantId', (select v.id from public.product_variants v join public.products p on p.id = v.product_id
                     where p.sku = 'BAL-072'))))$$,
  '22023', null, 'a variant of another product is rejected');

-- Duplicate ------------------------------------------------------------------------------------
select public.admin_replace_variants((select id from created), array['4', '5'], array['Blanco']);
select public.admin_save_commerce((select id from created), (
  select jsonb_agg(jsonb_build_object('variantId', v.id,
           'prices', jsonb_build_array(jsonb_build_object('minQty', 1, 'unitPriceCents', 50000))))
    from public.product_variants v where v.product_id = (select id from created) and v.is_active));

create temporary table dup as
select public.admin_duplicate_product((select id from created)) as id;

select results_eq(
  $$select sku, slug, name, status::text, is_featured
      from public.products where id = (select id from dup)$$,
  $$values ('BAL-069-COPIA'::text, 'balon-070-copia'::text, 'Balón 070 (copia)'::text, 'draft'::text, false)$$,
  'the copy is a draft with a free SKU and slug');
select results_eq(
  $$select v.sku, (select count(*)::int from public.variant_prices vp where vp.variant_id = v.id)
      from public.product_variants v where v.product_id = (select id from dup) and v.is_active
     order by v.sort_order$$,
  $$values ('BAL-069-COPIA-4-BLANCO'::text, 1), ('BAL-069-COPIA-5-BLANCO'::text, 1)$$,
  'the copy has the same variants with new SKUs, and their prices');
create temporary table dup2 as
select public.admin_duplicate_product((select id from created)) as id;
select results_eq(
  $$select sku, slug from public.products where id = (select id from dup2)$$,
  $$values ('BAL-069-COPIA-2'::text, 'balon-070-copia-2'::text)$$,
  'a second copy takes the next free SKU and slug');

reset role;

select * from finish();
rollback;
