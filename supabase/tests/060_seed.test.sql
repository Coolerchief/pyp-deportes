-- T1.6 · Seed data (docs/05-BACKEND-SCHEMA.md §11). Runs against the seeded database, so unlike
-- the other files it does not truncate the tables.
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

select results_eq(
  'select key, is_public from public.settings order by key',
  $$values ('flags'::text, true), ('ga_measurement_id', true), ('quote_rate_limit', false),
           ('site_name', true), ('social', true), ('whatsapp_sales_number', true)$$,
  'settings has the six keys of §4.7 and only quote_rate_limit is private');
select is(
  (select value from public.settings where key = 'flags'),
  '{"show_prices": false, "enable_checkout": false, "enable_shipping": false, "enable_stock": false}'::jsonb,
  'the site starts in catalog mode');
select is((select value #>> '{}' from public.settings where key = 'whatsapp_sales_number'),
  '5500000000', 'the WhatsApp number is the placeholder until production');

select results_eq('select key from public.site_texts order by key',
  $$values ('advisor'::text), ('privacy_notice'), ('store_history'), ('uniforms_faq')$$,
  'site_texts has the four keys of §4.7');
select is(jsonb_array_length((select value -> 'sections' from public.site_texts where key = 'privacy_notice')),
  7, 'the privacy notice has its seven sections');
select is(jsonb_array_length((select value from public.site_texts where key = 'uniforms_faq')),
  4, 'the uniforms FAQ has four questions');

select is((select count(*)::int from public.site_media where key_base is null), 8,
  'the eight site photo slots exist without a photo');

select results_eq(
  'select slug, borough, postal_code, jsonb_array_length(hours) from public.stores where is_active',
  $$values ('coapa'::text, 'Tlalpan'::text, '14330'::text, 2)$$,
  'the Coapa store is the only active one, with its hours');

select is((select count(*)::int from public.sports where is_active), 7, 'seven sports');
select is((select count(*)::int from public.categories where parent_id is null), 10, 'ten categories');
select is((select count(*)::int from public.categories where parent_id is not null), 34,
  'thirty-four subcategories');
select results_eq(
  $$select slug, size_label from public.categories
     where slug in ('balones', 'box-y-combate', 'material-entrenamiento', 'uniformes') order by slug$$,
  $$values ('balones'::text, 'Tamaño'::text), ('box-y-combate', 'Peso'),
           ('material-entrenamiento', 'Tamaño'), ('uniformes', 'Talla')$$,
  'categories carry the size label of §4.2');
select results_eq('select slug from public.brands where is_own_brand', $$values ('pyp'::text)$$,
  'P&P is the own brand among the brands');

select results_eq(
  $$select u.email::text, s.role::text from public.staff_members s
      join auth.users u on u.id = s.user_id where s.is_active$$,
  $$values ('admin@pyp.test'::text, 'admin'::text)$$,
  'the development admin is staff with the admin role');

select * from finish();
rollback;
