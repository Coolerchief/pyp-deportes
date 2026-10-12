-- T1.3 · Security tests 1–6 of docs/05-BACKEND-SCHEMA.md §7, plus the view and policy rules.
begin;
create extension if not exists pgtap with schema extensions;

-- Start from empty tables so fixtures never collide with pyp-dev's data; the rollback at the end
-- puts everything back.
truncate table public.products, public.brands, public.categories, public.sports, public.stores,
  public.customers, public.quote_requests, public.gallery_items, public.site_media,
  public.site_texts, public.settings, public.publish_runs, public.system_heartbeats,
  public.folio_counters, public.staff_members cascade;

select plan(22);

set constraints all immediate;

-- Fixtures (as the migration owner) -------------------------------------------------------------

insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-0000000000e1', 'editor-030@tests.pyp.test', 'authenticated', 'authenticated'),
       ('00000000-0000-0000-0000-0000000000e2', 'admin-030@tests.pyp.test', 'authenticated', 'authenticated'),
       ('00000000-0000-0000-0000-0000000000e3', 'nadie-030@tests.pyp.test', 'authenticated', 'authenticated');
insert into public.staff_members (user_id, role, full_name)
values ('00000000-0000-0000-0000-0000000000e1', 'editor', 'Editora'),
       ('00000000-0000-0000-0000-0000000000e2', 'admin', 'Admin');

insert into public.settings (key, value, is_public)
values ('flags', '{"show_prices": false, "enable_stock": false}', true),
       ('quote_rate_limit', '{"per_ip_hour": 5}', false);
insert into public.stores (id, slug, name, street, neighborhood, borough, postal_code)
values ('00000000-0000-0000-0000-0000000000f1', 'coapa', 'Coapa', 'Calle', 'Col', 'Coyoacán', '04000');
insert into public.brands (id, slug, name)
values ('00000000-0000-0000-0000-0000000000b1', 'voit', 'Voit'),
       ('00000000-0000-0000-0000-0000000000b2', 'sin-productos', 'Sin productos');
insert into public.categories (id, slug, name)
values ('00000000-0000-0000-0000-0000000000c1', 'balones', 'Balones'),
       ('00000000-0000-0000-0000-0000000000c2', 'natacion', 'Natación');
insert into public.products (id, sku, slug, name, brand_id, category_id, status)
values ('00000000-0000-0000-0000-0000000000a1', 'BAL-001', 'publicado', 'Publicado',
        '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'published'),
       ('00000000-0000-0000-0000-0000000000a2', 'BAL-002', 'borrador', 'Borrador',
        '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c2', 'draft');
insert into public.variant_prices (variant_id, unit_price_cents)
select id, 15000 from public.product_variants where sku in ('BAL-001', 'BAL-002');
insert into public.customers (id, phone, name, customer_type)
values ('00000000-0000-0000-0000-0000000000d1', '5512345678', 'Liga', 'league_team');
insert into public.quote_requests (id, folio, client_request_id, customer_id, customer_name,
  customer_phone, customer_type, needed_by, delivery_method, total_pieces, privacy_accepted_at,
  privacy_version)
values ('00000000-0000-0000-0000-00000000aa01', 'PYP-2026-000001', gen_random_uuid(),
        '00000000-0000-0000-0000-0000000000d1', 'Liga', '5512345678', 'league_team',
        '2026-11-01', 'pickup', 10, now(), '2026-10');

-- 1. anon cannot read any base table ------------------------------------------------------------

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and has_table_privilege('anon', c.oid, 'select,insert,update,delete')),
  0,
  '1. anon has no privilege on any base table'
);

set local role anon;
select throws_ok('select * from public.products', '42501', null,
  '1. anon reading products is denied');
select throws_ok('select * from public.customers', '42501', null,
  '1. anon reading customers is denied');
select throws_ok($$insert into public.public_site_texts (key, value) values ('x', '1')$$,
  '42501', null,
  'anon cannot write through a public view');

-- 2. public_products only shows published products ----------------------------------------------

select results_eq('select slug from public.public_products', $$values ('publicado'::text)$$,
  '2. anon sees only published products');
select results_eq('select sku from public.public_product_variants',
  $$values ('BAL-001'::text)$$, 'only variants of published products are public');
select results_eq('select slug from public.public_categories', $$values ('balones'::text)$$,
  'only categories with published products are public');
select results_eq('select slug from public.public_brands', $$values ('voit'::text)$$,
  'only brands with published products are public');
select results_eq('select key from public.public_settings', $$values ('flags'::text)$$,
  'only public settings are visible');
select is((select count(*)::int from public.public_stores), 1, 'active stores are public');

-- 3. public_variant_prices follows flags.show_prices ---------------------------------------------

select is((select count(*)::int from public.public_variant_prices), 0,
  '3. no prices while show_prices = false');
reset role;
update public.settings set value = '{"show_prices": true, "enable_stock": false}' where key = 'flags';
set local role anon;
select results_eq('select unit_price_cents from public.public_variant_prices',
  $$values (15000)$$, '3. prices of published variants appear with show_prices = true');
reset role;

-- 4. An editor cannot modify settings, stores or staff_members ------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated"}', true);
set local role authenticated;

select ok(public.is_staff() and not public.is_admin(), 'the editor is staff but not admin');
select is_empty($$update public.settings set value = '{}' where key = 'flags' returning key$$,
  '4. an editor cannot update settings');
select is_empty($$update public.stores set name = 'Otra' returning id$$,
  '4. an editor cannot update stores');
select throws_ok(
  $$insert into public.staff_members (user_id, role, full_name)
    values ('00000000-0000-0000-0000-0000000000e3', 'admin', 'Intruso')$$,
  '42501', null,
  '4. an editor cannot add staff members'
);
select results_eq('select full_name from public.staff_members', $$values ('Editora'::text)$$,
  'an editor only reads their own staff row');

-- 5. An editor cannot update quote_requests.status directly ------------------------------------

select throws_ok($$update public.quote_requests set status = 'won'$$, '42501', null,
  '5. an editor cannot update a quote request directly');
select is((select count(*)::int from public.quote_requests), 1, 'an editor reads quote requests');

-- 6. A gallery item cannot be published without consent ----------------------------------------

select throws_ok(
  $$insert into public.gallery_items (team_name, key_base, width, height, status)
    values ('Pumitas', 'g/1/a', 1200, 1500, 'published')$$,
  '23514', null,
  '6. an editor cannot publish a gallery item without consent'
);

select lives_ok($$update public.products set name = 'Publicado editado' where sku = 'BAL-001'$$,
  'an editor writes the catalog');
reset role;

-- A signed-in user who is not staff reads nothing -----------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000e3", "role": "authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.products) + (select count(*)::int from public.settings),
  0, 'an authenticated user who is not staff reads no base rows');
reset role;

select * from finish();
rollback;
