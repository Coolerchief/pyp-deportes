-- T1.4 · Functions of docs/05-BACKEND-SCHEMA.md §8 and security test 7 of §7.
-- Test 8 (concurrent next_folio) needs several connections: scripts/folio-concurrency.mjs.
begin;
create extension if not exists pgtap with schema extensions;

-- Start from empty tables so fixtures never collide with pyp-dev's data; the rollback at the end
-- puts everything back.
truncate table public.products, public.brands, public.categories, public.sports, public.stores,
  public.customers, public.quote_requests, public.gallery_items, public.site_media,
  public.site_texts, public.settings, public.publish_runs, public.system_heartbeats,
  public.folio_counters, public.staff_members cascade;

select plan(51);

set constraints all immediate;

-- Fixtures ------------------------------------------------------------------------------------

insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-0000000000e1', 'editor-040@tests.pyp.test', 'authenticated', 'authenticated'),
       ('00000000-0000-0000-0000-0000000000e2', 'admin-040@tests.pyp.test', 'authenticated', 'authenticated'),
       ('00000000-0000-0000-0000-0000000000e3', 'nadie-040@tests.pyp.test', 'authenticated', 'authenticated');
insert into public.staff_members (user_id, role, full_name)
values ('00000000-0000-0000-0000-0000000000e1', 'editor', 'Editora'),
       ('00000000-0000-0000-0000-0000000000e2', 'admin', 'Admin');

insert into public.stores (id, slug, name, street, neighborhood, borough, postal_code)
values ('00000000-0000-0000-0000-0000000000f1', 'coapa', 'Coapa', 'Calle', 'Col', 'Coyoacán', '04000');
insert into public.brands (id, slug, name)
values ('00000000-0000-0000-0000-0000000000b1', 'voit', 'Voit');
insert into public.categories (id, slug, name)
values ('00000000-0000-0000-0000-0000000000c1', 'uniformes', 'Uniformes');
insert into public.products (id, sku, slug, name, brand_id, category_id, status)
values ('00000000-0000-0000-0000-0000000000a1', 'UNI-001', 'jersey', 'Jersey Pro',
        '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'published'),
       ('00000000-0000-0000-0000-0000000000a2', 'UNI-002', 'borrador', 'Borrador',
        '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'draft');
insert into public.product_variants (id, product_id, sku, option1_value, option2_value)
values ('00000000-0000-0000-0000-00000000ab01', '00000000-0000-0000-0000-0000000000a1',
        'UNI-001-M-ROJO', 'M', 'Rojo');

-- Helper roles ----------------------------------------------------------------------------------

create function pg_temp.act_as(user_id uuid, role text) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', user_id, 'role', role)::text, true);
$$;

-- Privileges ------------------------------------------------------------------------------------

select ok(not has_function_privilege('anon', 'public.create_quote_request(jsonb)', 'execute')
      and not has_function_privilege('authenticated', 'public.create_quote_request(jsonb)', 'execute'),
  'only service_role runs create_quote_request');
select ok(not has_function_privilege('anon', 'public.next_folio(timestamptz)', 'execute')
      and not has_function_privilege('authenticated', 'public.next_folio(timestamptz)', 'execute'),
  'next_folio is internal');
select ok(not has_function_privilege('authenticated',
          'public.mark_publish_run(uuid, public.publish_status, text, text)', 'execute'),
  'only service_role runs mark_publish_run');
select ok(not has_function_privilege('anon', 'public.admin_dashboard_stats()', 'execute'),
  'anon cannot run admin functions');
select ok(has_function_privilege('anon', 'public.ping()', 'execute'), 'anon runs ping');

-- next_folio ------------------------------------------------------------------------------------

select is(public.next_folio('2998-03-01T12:00:00Z'), 'PYP-2998-000001', 'the first folio of a year');
select is(public.next_folio('2998-07-01T12:00:00Z'), 'PYP-2998-000002', 'folios are consecutive');
select is(public.next_folio('2998-01-01T05:30:00Z'), 'PYP-2997-000001',
  'the year is the one in Mexico City (05:30 UTC on Jan 1 is still Dec 31)');

-- create_quote_request and test 7 ---------------------------------------------------------------

select pg_temp.act_as(null, 'service_role');
set local role service_role;

create temporary table quote_payload as
select jsonb_build_object(
  'clientRequestId', '11111111-1111-1111-1111-111111111111',
  'customer', jsonb_build_object('name', 'Juan Pérez', 'phone', '5512345678',
                                 'type', 'league_team', 'organization', 'Liga Coapa Sub-12'),
  'neededBy', '2026-12-01',
  'deliveryMethod', 'pickup',
  'requiresInvoice', true,
  'note', 'Verde y blanco',
  'privacyVersion', '2026-10',
  'items', jsonb_build_array(
    jsonb_build_object('variantId', '00000000-0000-0000-0000-00000000ab01', 'quantity', 4,
                       'personalize', true, 'notes', 'Escudo al pecho'),
    jsonb_build_object('variantId', (select id from public.product_variants where sku = 'UNI-001'),
                       'quantity', 6)
  ),
  'meta', jsonb_build_object('ipHash', 'abc', 'userAgent', 'test')
) as payload;

create temporary table first_result as
select public.create_quote_request(payload) as result from quote_payload;

select ok((select (result ->> 'duplicate')::boolean = false and result ->> 'folio' ~ '^PYP-[0-9]{4}-[0-9]{6}$'
             from first_result),
  'create_quote_request returns a new folio');

select results_eq(
  $$select total_pieces, store_id, customer_name, requires_invoice, status::text
      from public.quote_requests where client_request_id = '11111111-1111-1111-1111-111111111111'$$,
  $$values (10, '00000000-0000-0000-0000-0000000000f1'::uuid, 'Juan Pérez'::text, true, 'new'::text)$$,
  'the request stores the totals, the pickup store and the customer copy'
);

select results_eq(
  $$select line_no, product_name, sku, variant_label, quantity, personalize
      from public.quote_request_items order by line_no$$,
  $$values (1, 'Jersey Pro'::text, 'UNI-001-M-ROJO'::text, 'M · Rojo'::text, 4, true),
           (2, 'Jersey Pro'::text, 'UNI-001'::text, null::text, 6, false)$$,
  'lines copy name, SKU and label from the catalog'
);

select results_eq(
  $$select from_status::text, to_status::text from public.quote_status_history$$,
  $$values (null::text, 'new'::text)$$,
  'the first history row is null → new'
);

select is(
  (select public.create_quote_request(payload) ->> 'folio' from quote_payload),
  (select result ->> 'folio' from first_result),
  '7. the same clientRequestId returns the same folio'
);
select is((select count(*)::int from public.quote_requests), 1,
  '7. a retry does not create another request');
select is((select quote_count from public.customers where phone = '5512345678'), 1,
  '7. a retry does not count the customer twice');

select is(
  (select public.create_quote_request(jsonb_set(jsonb_set(payload,
     '{clientRequestId}', '"22222222-2222-2222-2222-222222222222"'),
     '{customer,name}', '"Juan P."')) ->> 'duplicate'
     from quote_payload),
  'false',
  'a new clientRequestId creates another request'
);
select results_eq(
  $$select name, quote_count from public.customers where phone = '5512345678'$$,
  $$values ('Juan P.'::text, 2)$$,
  'the customer keeps the latest name and counts both requests'
);

select throws_ok(
  $$select public.create_quote_request(jsonb_set(payload, '{items}', jsonb_build_array(
      jsonb_build_object('variantId', (select id from public.product_variants where sku = 'UNI-002'),
                         'quantity', 1))) || '{"clientRequestId": "33333333-3333-3333-3333-333333333333"}')
      from quote_payload$$,
  '23514', 'invalid_items',
  'a variant of an unpublished product is rejected with invalid_items'
);

select throws_ok(
  $$select public.create_quote_request(jsonb_set(payload, '{items}', '[]')
      || '{"clientRequestId": "44444444-4444-4444-4444-444444444444"}') from quote_payload$$,
  '22023', null,
  'a request without items is rejected'
);

-- mark_publish_run --------------------------------------------------------------------------------

insert into public.publish_runs (id) values ('00000000-0000-0000-0000-0000000000c9');
select lives_ok(
  $$select public.mark_publish_run('00000000-0000-0000-0000-0000000000c9', 'running', 'https://github.com/run/1')$$,
  'service_role marks a publish run as running');
select lives_ok(
  $$select public.mark_publish_run('00000000-0000-0000-0000-0000000000c9', 'failed', null, 'build roto')$$,
  'service_role marks it as failed');
select results_eq(
  $$select status::text, run_url, error, finished_at is not null
      from public.publish_runs where id = '00000000-0000-0000-0000-0000000000c9'$$,
  $$values ('failed'::text, 'https://github.com/run/1'::text, 'build roto'::text, true)$$,
  'mark_publish_run keeps the run URL and sets the error and finish time'
);
select throws_ok(
  $$select public.mark_publish_run(gen_random_uuid(), 'success')$$, 'P0002', null,
  'an unknown publish run is reported');

reset role;

-- admin_set_quote_status / admin_set_quote_note ---------------------------------------------------

create temporary table quote_ids as
select id, folio from public.quote_requests;
grant select on quote_ids to authenticated;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000e3', 'authenticated');
set local role authenticated;
select throws_ok(
  $$select public.admin_set_quote_status((select min(id::text)::uuid from quote_ids), 'in_progress')$$,
  '42501', null,
  'a signed-in user who is not staff cannot change a status');
reset role;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1', 'authenticated');
set local role authenticated;

create temporary table target as select min(id::text)::uuid as id from quote_ids;

select lives_ok($$select public.admin_set_quote_status((select id from target), 'in_progress', 'Llamé al cliente')$$,
  'an editor moves a request from new to in_progress');
select throws_ok($$select public.admin_set_quote_status((select id from target), 'won')$$,
  '23514', null, 'in_progress cannot jump to won');
select throws_ok($$select public.admin_set_quote_status((select id from target), 'lost')$$,
  '23514', null, 'lost needs a reason');
select lives_ok($$select public.admin_set_quote_status((select id from target), 'lost', '', 'Precio')$$,
  'lost with a reason is accepted');
select is((select lost_reason from public.quote_requests where id = (select id from target)), 'Precio',
  'the lost reason is stored');
select lives_ok($$select public.admin_set_quote_status((select id from target), 'in_progress', 'Se reabre')$$,
  'a lost request can be reopened');
select results_eq(
  $$select lost_reason, status::text from public.quote_requests where id = (select id from target)$$,
  $$values (null::text, 'in_progress'::text)$$,
  'reopening clears the lost reason');
select results_eq(
  $$select from_status::text, to_status::text, changed_by, note from public.quote_status_history
     where quote_request_id = (select id from target) and from_status is not null order by id$$,
  $$values ('new'::text, 'in_progress'::text, '00000000-0000-0000-0000-0000000000e1'::uuid, 'Llamé al cliente'::text),
           ('in_progress', 'lost', '00000000-0000-0000-0000-0000000000e1'::uuid, ''),
           ('lost', 'in_progress', '00000000-0000-0000-0000-0000000000e1'::uuid, 'Se reabre')$$,
  'every change is written to the history with who made it');

select lives_ok($$select public.admin_set_quote_note((select id from target), 'Quiere factura')$$,
  'an editor sets the internal note');
select is((select internal_note from public.quote_requests where id = (select id from target)),
  'Quiere factura', 'the internal note is stored');

-- admin_replace_variants --------------------------------------------------------------------------

select is(
  public.admin_replace_variants('00000000-0000-0000-0000-0000000000a2', array['CH', 'M', 'M '], null),
  '{"created": 2, "kept": 0, "deactivated": 1}'::jsonb,
  'sizes create one variant each (duplicates ignored) and deactivate the default one');
select results_eq(
  $$select sku, is_active from public.product_variants
     where product_id = '00000000-0000-0000-0000-0000000000a2' order by is_active desc, sort_order$$,
  $$values ('UNI-002-CH'::text, true), ('UNI-002-M'::text, true), ('UNI-002'::text, false)$$,
  'variant SKUs follow {sku}-{OPTION1}');

create temporary table m_variant as
select id from public.product_variants where sku = 'UNI-002-M';

select is(
  public.admin_replace_variants('00000000-0000-0000-0000-0000000000a2', array['M', 'G'],
                                array['Azul marino', 'Rojo/Blanco']),
  '{"created": 4, "kept": 0, "deactivated": 2}'::jsonb,
  'sizes × colors build the cartesian product');
select is(
  (select sku from public.product_variants
    where product_id = '00000000-0000-0000-0000-0000000000a2' and option1_value = 'G'
      and option2_value = 'Rojo/Blanco'),
  'UNI-002-G-ROJO-BLANCO',
  'the color goes into the SKU without accents or symbols');

select is(
  public.admin_replace_variants('00000000-0000-0000-0000-0000000000a2', array['M'], null),
  '{"created": 0, "kept": 1, "deactivated": 4}'::jsonb,
  'going back to an earlier combination reactivates it');
select is(
  (select id from public.product_variants
    where product_id = '00000000-0000-0000-0000-0000000000a2' and is_active),
  (select id from m_variant),
  'a reactivated variant keeps its id');

select is(
  public.admin_replace_variants('00000000-0000-0000-0000-0000000000a2', '{}', '{}'),
  '{"created": 0, "kept": 1, "deactivated": 1}'::jsonb,
  'no options leaves only the default variant');

-- has_unpublished_changes and admin_dashboard_stats ----------------------------------------------

select is(public.has_unpublished_changes(), true, 'with no successful publish there are changes');
reset role;
insert into public.publish_runs (status, created_at) values ('success', now() + interval '1 hour');
set local role authenticated;
select is(public.has_unpublished_changes(), false, 'nothing changed after the last publish');

select is(
  (select public.admin_dashboard_stats() -> 'byStatus'),
  '{"new": 1, "in_progress": 1, "quoted": 0, "won": 0, "lost": 0}'::jsonb,
  'the dashboard counts requests by status');
select is(
  (select public.admin_dashboard_stats() -> 'topProducts' -> 0 ->> 'pieces'),
  '20',
  'the dashboard ranks products by pieces requested');

-- admin_anonymize_customer --------------------------------------------------------------------------

select throws_ok(
  $$select public.admin_anonymize_customer((select id from public.customers limit 1))$$,
  '42501', null, 'an editor cannot anonymize a customer');
reset role;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000e2', 'authenticated');
set local role authenticated;
select lives_ok($$select public.admin_anonymize_customer((select id from public.customers limit 1))$$,
  'an admin anonymizes a customer');
select is(
  (select count(*)::int from public.quote_requests
    where customer_name = 'Cliente anónimo' and customer_phone ~ '^0[0-9]{9}$'
      and ip_hash is null and organization is null),
  2,
  'the customer data is replaced in every request');
reset role;

-- ping --------------------------------------------------------------------------------------------

set local role anon;
select lives_ok('select public.ping()', 'anon calls ping');
select lives_ok('select public.ping()', 'a second ping within a minute is accepted');
reset role;
select is((select count(*)::int from public.system_heartbeats where created_at >= now() - interval '1 minute'),
  1, 'ping writes at most one heartbeat per minute');

select * from finish();
rollback;
