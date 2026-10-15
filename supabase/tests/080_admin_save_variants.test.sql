-- T4.4 · admin_save_variants: option names plus sizes × colors, keeping the ids.
begin;
create extension if not exists pgtap with schema extensions;

truncate table public.products, public.brands, public.categories, public.sports, public.stores,
  public.customers, public.quote_requests, public.gallery_items, public.site_media,
  public.site_texts, public.settings, public.publish_runs, public.system_heartbeats,
  public.folio_counters, public.staff_members cascade;

select plan(13);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-000000000801', 'editor-080@tests.pyp.test', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000802', 'nadie-080@tests.pyp.test', 'authenticated', 'authenticated');
insert into public.staff_members (user_id, role, full_name)
values ('00000000-0000-0000-0000-000000000801', 'editor', 'Editora');
insert into public.brands (id, slug, name) values ('00000000-0000-4000-8000-000000008b01', 'marca-080', 'Marca');
insert into public.categories (id, slug, name) values ('00000000-0000-4000-8000-000000008c01', 'uniformes-080', 'Uniformes');
insert into public.products (id, sku, slug, name, brand_id, category_id, color_note, status)
values ('00000000-0000-4000-8000-000000008d01', 'UNI-080', 'uniforme-080', 'Uniforme',
        '00000000-0000-4000-8000-000000008b01', '00000000-0000-4000-8000-000000008c01', 'A elegir', 'published');
set constraints all immediate;

select ok(not has_function_privilege('anon',
    'public.admin_save_variants(uuid, text, text, text, text[], text[])', 'execute'),
  'anon cannot generate variants');

select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-000000000802", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.admin_save_variants('00000000-0000-4000-8000-000000008d01', 'Talla', null, null, array['M'], '{}')$$,
  '42501', null, 'a user who is not staff cannot generate variants');
reset role;

select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-000000000801", "role": "authenticated"}', true);
set local role authenticated;

select is(
  public.admin_save_variants('00000000-0000-4000-8000-000000008d01', ' Talla ', 'Color', 'A elegir',
    array['CH', 'M', ' M ', ''], array['Rojo', 'Azul']),
  '{"created": 4, "kept": 0, "deactivated": 1}'::jsonb,
  'sizes × colors are created and the default variant is deactivated');
select results_eq(
  $$select option1_name, option2_name, color_note from public.products
     where id = '00000000-0000-4000-8000-000000008d01'$$,
  $$values ('Talla'::text, 'Color'::text, null::text)$$,
  'the option names are saved and the color note goes away with real colors');
select results_eq(
  $$select sku from public.product_variants
     where product_id = '00000000-0000-4000-8000-000000008d01' and is_active order by sort_order$$,
  $$values ('UNI-080-CH-ROJO'::text), ('UNI-080-CH-AZUL'), ('UNI-080-M-ROJO'), ('UNI-080-M-AZUL')$$,
  'each combination gets its SKU, in order');

create temporary table before_ids as
select id, option1_value, option2_value from public.product_variants
 where product_id = '00000000-0000-4000-8000-000000008d01' and option1_value = 'M';

select is(
  public.admin_save_variants('00000000-0000-4000-8000-000000008d01', 'Talla', 'Color', null,
    array['M', 'G'], array['Rojo', 'Azul']),
  '{"created": 2, "kept": 2, "deactivated": 2}'::jsonb,
  'regenerating keeps what exists, adds the new and deactivates the rest');
select is(
  (select count(*)::int from public.product_variants v join before_ids b on b.id = v.id
    where v.is_active and v.option1_value = b.option1_value and v.option2_value = b.option2_value),
  2, 'the variants that stay keep their ids');

select is(
  public.admin_save_variants('00000000-0000-4000-8000-000000008d01', 'Talla', 'Color', 'Surtido',
    array['M', 'G'], '{}'),
  '{"created": 2, "kept": 0, "deactivated": 4}'::jsonb,
  'removing the colors leaves one variant per size');
select results_eq(
  $$select option2_name, color_note from public.products where id = '00000000-0000-4000-8000-000000008d01'$$,
  $$values (null::text, 'Surtido'::text)$$,
  'without colors the second option disappears and the note stays');

select is(
  public.admin_save_variants('00000000-0000-4000-8000-000000008d01', 'Talla', null, null, '{}', '{}'),
  '{"created": 0, "kept": 1, "deactivated": 2}'::jsonb,
  'with no options the default variant comes back with its id');

select throws_ok(
  $$select public.admin_save_variants('00000000-0000-4000-8000-000000008d01', '', null, null, array['M'], '{}')$$,
  '22023', 'Escribe el nombre de la opción (por ejemplo Talla), de hasta 30 caracteres.',
  'the first option needs a name');
select throws_ok(
  $$select public.admin_save_variants('00000000-0000-4000-8000-000000008d01', 'Talla', '', null,
      array['M'], array['Rojo'])$$,
  '22023', 'Escribe el nombre de la segunda opción (por ejemplo Color), de hasta 30 caracteres.',
  'colors need the name of the second option');
select throws_ok(
  $$select public.admin_save_variants('00000000-0000-4000-8000-000000008d01', 'Talla', 'Color', null,
      (select array_agg(g::text) from generate_series(1, 21) g),
      (select array_agg('C' || g) from generate_series(1, 10) g))$$,
  '22023', 'Son demasiadas combinaciones: el máximo es 200 variantes.', 'at most 200 variants');

reset role;

select * from finish();
rollback;
