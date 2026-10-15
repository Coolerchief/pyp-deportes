-- T4.5 · admin_add_product_image and admin_reorder_product_images.
begin;
create extension if not exists pgtap with schema extensions;

truncate table public.products, public.brands, public.categories, public.sports, public.stores,
  public.customers, public.quote_requests, public.gallery_items, public.site_media,
  public.site_texts, public.settings, public.publish_runs, public.system_heartbeats,
  public.folio_counters, public.staff_members cascade;

select plan(12);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-000000000901', 'editor-090@tests.pyp.test', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000902', 'nadie-090@tests.pyp.test', 'authenticated', 'authenticated');
insert into public.staff_members (user_id, role, full_name)
values ('00000000-0000-0000-0000-000000000901', 'editor', 'Editora');
insert into public.brands (id, slug, name) values ('00000000-0000-4000-8000-000000009b01', 'marca-090', 'Marca');
insert into public.categories (id, slug, name) values ('00000000-0000-4000-8000-000000009c01', 'balones-090', 'Balones');
insert into public.products (id, sku, slug, name, brand_id, category_id) values
  ('00000000-0000-4000-8000-000000009d01', 'BAL-090', 'balon-090', 'Balón',
   '00000000-0000-4000-8000-000000009b01', '00000000-0000-4000-8000-000000009c01');

select ok(not has_function_privilege('anon',
    'public.admin_add_product_image(uuid, uuid, int, int, text)', 'execute')
      and not has_function_privilege('anon',
    'public.admin_reorder_product_images(uuid, uuid[])', 'execute'),
  'anon cannot add or reorder photos');

select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-000000000902", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.admin_add_product_image('00000000-0000-4000-8000-000000009d01',
      '00000000-0000-4000-8000-0000000009a1', 1600, 2000)$$,
  '42501', null, 'a user who is not staff cannot add photos');
reset role;

select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-000000000901", "role": "authenticated"}', true);
set local role authenticated;

select is(
  public.admin_add_product_image('00000000-0000-4000-8000-000000009d01',
    '00000000-0000-4000-8000-0000000009a1', 1600, 2000, ' Balón blanco con costuras negras '),
  '00000000-0000-4000-8000-0000000009a1'::uuid, 'a photo is added with its own id');
select results_eq(
  $$select key_base, alt, width, height, sort_order from public.product_images
     where id = '00000000-0000-4000-8000-0000000009a1'$$,
  $$values ('p/00000000-0000-4000-8000-000000009d01/00000000-0000-4000-8000-0000000009a1'::text,
            'Balón blanco con costuras negras'::text, 1600, 2000, 0)$$,
  'the database builds the key; the alt text is trimmed');

select public.admin_add_product_image('00000000-0000-4000-8000-000000009d01',
  '00000000-0000-4000-8000-0000000009a2', 1024, 1280);
select public.admin_add_product_image('00000000-0000-4000-8000-000000009d01',
  '00000000-0000-4000-8000-0000000009a3', 1023, 1279);
select results_eq(
  $$select sort_order from public.product_images
     where product_id = '00000000-0000-4000-8000-000000009d01' order by sort_order$$,
  $$values (0), (1), (2)$$, 'each new photo goes last (a pixel of rounding is fine)');

select throws_ok(
  $$select public.admin_add_product_image('00000000-0000-4000-8000-000000009d01',
      gen_random_uuid(), 1600, 1600)$$,
  '22023', 'La foto debe estar recortada en proporción 4:5.', 'only 4:5 photos');
select throws_ok(
  $$select public.admin_add_product_image('00000000-0000-4000-8000-000000009d01',
      gen_random_uuid(), 160, 200)$$,
  '22023', 'La foto debe medir al menos 320 × 400 px.', 'photos too small are rejected');
select throws_ok(
  $$select public.admin_add_product_image(gen_random_uuid(), gen_random_uuid(), 1600, 2000)$$,
  'P0002', null, 'the product must exist');

select lives_ok(
  $$select public.admin_reorder_product_images('00000000-0000-4000-8000-000000009d01',
      array['00000000-0000-4000-8000-0000000009a3', '00000000-0000-4000-8000-0000000009a1',
            '00000000-0000-4000-8000-0000000009a2']::uuid[])$$,
  'photos can be reordered');
select results_eq(
  $$select id::text from public.product_images
     where product_id = '00000000-0000-4000-8000-000000009d01' order by sort_order$$,
  $$values ('00000000-0000-4000-8000-0000000009a3'::text), ('00000000-0000-4000-8000-0000000009a1'),
           ('00000000-0000-4000-8000-0000000009a2')$$,
  'the first one is the cover');
select throws_ok(
  $$select public.admin_reorder_product_images('00000000-0000-4000-8000-000000009d01',
      array['00000000-0000-4000-8000-0000000009a3', '00000000-0000-4000-8000-0000000009a3',
            '00000000-0000-4000-8000-0000000009a2']::uuid[])$$,
  '22023', 'La lista debe traer cada foto del producto una sola vez.',
  'a list with a missing or repeated photo is rejected');

insert into public.product_images (product_id, key_base, width, height, sort_order)
select '00000000-0000-4000-8000-000000009d01', 'p/extra/' || g, 1600, 2000, 10 + g
  from generate_series(1, 9) g;
select throws_ok(
  $$select public.admin_add_product_image('00000000-0000-4000-8000-000000009d01',
      gen_random_uuid(), 1600, 2000)$$,
  '22023', 'Cada producto puede tener hasta 12 fotos.', 'at most 12 photos per product');

reset role;

select * from finish();
rollback;
