-- T1.2 · Customers, quotes, gallery, site content, settings and operations
-- (docs/05-BACKEND-SCHEMA.md §4.5–4.8).
begin;
create extension if not exists pgtap with schema extensions;

-- Start from empty tables so fixtures never collide with pyp-dev's data; the rollback at the end
-- puts everything back.
truncate table public.products, public.brands, public.categories, public.sports, public.stores,
  public.customers, public.quote_requests, public.gallery_items, public.site_media,
  public.site_texts, public.settings, public.publish_runs, public.system_heartbeats,
  public.folio_counters, public.staff_members cascade;

select plan(14);

select tables_are(
  'public',
  array[
    'staff_members', 'sports', 'categories', 'brands', 'products', 'product_sports',
    'product_variants', 'product_images', 'variant_prices', 'stores', 'inventory_levels',
    'customers', 'folio_counters', 'quote_requests', 'quote_request_items',
    'quote_status_history', 'gallery_items', 'gallery_item_products', 'site_media',
    'site_texts', 'settings', 'publish_runs', 'system_heartbeats'
  ],
  'the schema has the 23 tables of §4'
);

set constraints all immediate;

-- Fixtures ------------------------------------------------------------------------------------

insert into public.brands (id, slug, name)
values ('00000000-0000-0000-0000-0000000000b1', 'voit', 'Voit');
insert into public.categories (id, slug, name)
values ('00000000-0000-0000-0000-0000000000c1', 'balones', 'Balones');
insert into public.products (id, sku, slug, name, brand_id, category_id)
values ('00000000-0000-0000-0000-0000000000a1', 'BAL-001', 'balon', 'Balón',
        '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1');
insert into public.customers (id, phone, name, customer_type)
values ('00000000-0000-0000-0000-0000000000d1', '5512345678', 'Liga Coapa', 'league_team');

-- Quote requests --------------------------------------------------------------------------------

prepare new_quote(text, public.quote_status, text) as
  insert into public.quote_requests (
    folio, client_request_id, customer_id, status, customer_name, customer_phone, customer_type,
    needed_by, delivery_method, total_pieces, privacy_accepted_at, privacy_version, lost_reason
  ) values (
    $1, gen_random_uuid(), '00000000-0000-0000-0000-0000000000d1', $2, 'Liga Coapa',
    '5512345678', 'league_team', '2026-11-01', 'pickup', 12, now(), '2026-10', $3
  ) returning id;

select lives_ok($$execute new_quote('PYP-2026-000001', 'new', null)$$,
  'a quote request with a well-formed folio is accepted');

select throws_ok($$execute new_quote('PYP-26-1', 'new', null)$$, '23514', null,
  'the folio must look like PYP-2026-000123');

select throws_ok($$execute new_quote('PYP-2026-000002', 'lost', '  ')$$, '23514', null,
  'a lost quote needs a reason');

select lives_ok($$execute new_quote('PYP-2026-000003', 'lost', 'Compró en otra tienda')$$,
  'a lost quote with a reason is accepted');

insert into public.quote_request_items (quote_request_id, line_no, product_id, variant_id,
                                        product_name, sku, variant_label, quantity)
select q.id, 1, v.product_id, v.id, 'Balón', 'BAL-001', null, 12
  from public.quote_requests q, public.product_variants v
 where q.folio = 'PYP-2026-000001' and v.sku = 'BAL-001';

select throws_ok(
  $$insert into public.quote_request_items (quote_request_id, line_no, product_name, sku, quantity)
    select id, 2, 'Balón', 'BAL-001', 10000 from public.quote_requests
     where folio = 'PYP-2026-000001'$$,
  '23514', null,
  'a line takes at most 9,999 pieces'
);

delete from public.products where sku = 'BAL-001';
select results_eq(
  $$select product_id, variant_id, product_name, sku from public.quote_request_items$$,
  $$values (null::uuid, null::uuid, 'Balón'::text, 'BAL-001'::text)$$,
  'deleting a product keeps the quoted line with its copied name and SKU'
);

-- Gallery consent -------------------------------------------------------------------------------

prepare new_photo(text, boolean, boolean, boolean) as
  insert into public.gallery_items (team_name, key_base, width, height, status,
                                    includes_minors, has_written_consent, has_guardian_consent)
  values ('Pumitas', $1, 1200, 1500, 'published', $2, $3, $4);

select throws_ok($$execute new_photo('g/1/a', false, false, false)$$, '23514', null,
  'a team photo is not published without written consent');

select throws_ok($$execute new_photo('g/1/b', true, true, false)$$, '23514', null,
  'a photo with minors needs guardian consent to be published');

select lives_ok($$execute new_photo('g/1/c', true, true, true)$$,
  'a photo with every consent can be published');

-- Site media, settings and operations ------------------------------------------------------------

select throws_ok(
  $$insert into public.site_media (slot) values ('banner_extra')$$,
  '23514', null,
  'site_media only accepts the eight known slots'
);

select throws_ok(
  $$insert into public.site_media (slot, key_base) values ('home_hero', 's/home_hero/x')$$,
  '23514', null,
  'a site photo needs its width and height'
);

select throws_ok(
  $$insert into public.publish_runs (reason) values ('deploy')$$,
  '23514', null,
  'publish_runs.reason is manual, nightly or push'
);

select results_eq(
  $$insert into public.folio_counters (year, last_value) values (2026, 1)
    on conflict (year) do update set last_value = folio_counters.last_value + 1
    returning last_value$$,
  $$values (1)$$,
  'folio_counters supports the insert … on conflict counter of next_folio'
);

select * from finish();
rollback;
