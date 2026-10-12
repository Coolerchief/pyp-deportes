-- T1.4 · Functions (docs/05-BACKEND-SCHEMA.md §8; admin_import_products arrives in T1.5).
--
-- Every function fixes search_path = '' and is security definer (it runs as the owner, past
-- RLS), so each one checks who calls it. EXECUTE is revoked from public and granted only to the
-- roles in the §8 table: service_role, staff (authenticated + is_staff/is_admin) or anon (ping).

-- Shared helpers -------------------------------------------------------------------------------

create function public.require_staff()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Solo el personal puede hacer esto.' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

create function public.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede hacer esto.' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

-- Variant SKU: {sku}-{OPTION1}-{OPTION2}, uppercase, no accents, hyphen separated (§4.3).
create function public.variant_sku(product_sku text, option1 text, option2 text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(concat_ws('-',
    product_sku,
    nullif(btrim(regexp_replace(extensions.unaccent('extensions.unaccent'::regdictionary,
      coalesce(option1, '')), '[^A-Za-z0-9]+', '-', 'g'), '-'), ''),
    nullif(btrim(regexp_replace(extensions.unaccent('extensions.unaccent'::regdictionary,
      coalesce(option2, '')), '[^A-Za-z0-9]+', '-', 'g'), '-'), '')
  ));
$$;

-- 'M', '#5 · Blanco/Rojo' or null for the default variant.
create function public.variant_label(option1 text, option2 text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(concat_ws(' · ', option1, option2), '');
$$;

-- next_folio -----------------------------------------------------------------------------------

-- PYP-{year}-{000123}. The year is the one in America/Mexico_City and the counter restarts every
-- year. insert … on conflict do update locks the year's row until the caller's transaction ends,
-- so concurrent calls wait for each other and never repeat a number.
create function public.next_folio(issued_at timestamptz default now())
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  folio_year int := extract(year from issued_at at time zone 'America/Mexico_City')::int;
  folio_value int;
begin
  insert into public.folio_counters as fc (year, last_value)
  values (folio_year, 1)
  on conflict (year) do update set last_value = fc.last_value + 1
  returning fc.last_value into folio_value;

  if folio_value > 999999 then
    raise exception 'Se agotaron los folios de %.', folio_year;
  end if;

  return format('PYP-%s-%s', folio_year, lpad(folio_value::text, 6, '0'));
end;
$$;

-- create_quote_request (§8.1) ------------------------------------------------------------------

create function public.create_quote_request(payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  request_id uuid := (payload ->> 'clientRequestId')::uuid;
  existing record;
  invalid jsonb;
  customer_row_id uuid;
  new_quote_id uuid;
  new_folio text;
  pieces int;
  customer_phone_value text := payload #>> '{customer,phone}';
begin
  if request_id is null then
    raise exception 'Falta clientRequestId.' using errcode = 'invalid_parameter_value';
  end if;
  if jsonb_typeof(payload -> 'items') is distinct from 'array'
     or jsonb_array_length(payload -> 'items') = 0 then
    raise exception 'La solicitud no tiene productos.' using errcode = 'invalid_parameter_value';
  end if;

  -- 1. Retry with the same clientRequestId: same folio, nothing new.
  select q.id, q.folio into existing
    from public.quote_requests q where q.client_request_id = request_id;
  if found then
    return jsonb_build_object('folio', existing.folio, 'id', existing.id, 'duplicate', true);
  end if;

  -- 2. Every variant exists, is active and belongs to a published product.
  select jsonb_agg(item ->> 'variantId') into invalid
    from jsonb_array_elements(payload -> 'items') as item
   where not exists (
     select 1
       from public.product_variants v
       join public.products p on p.id = v.product_id
      where v.id::text = item ->> 'variantId' and v.is_active and p.status = 'published'
   );
  if invalid is not null then
    raise exception 'invalid_items'
      using errcode = 'check_violation', detail = jsonb_build_object('items', invalid)::text;
  end if;

  select sum((item ->> 'quantity')::int) into pieces
    from jsonb_array_elements(payload -> 'items') as item;

  begin
    -- 3. Customer by phone, with the latest name, type and organization.
    insert into public.customers as c (phone, name, customer_type, organization, quote_count)
    values (
      customer_phone_value,
      payload #>> '{customer,name}',
      (payload #>> '{customer,type}')::public.customer_type,
      nullif(payload #>> '{customer,organization}', ''),
      1
    )
    on conflict (phone) do update set
      name = excluded.name,
      customer_type = excluded.customer_type,
      organization = excluded.organization,
      quote_count = c.quote_count + 1,
      last_seen_at = now()
    returning c.id into customer_row_id;

    -- 4. Folio.
    new_folio := public.next_folio();

    -- 5. Request; pickup goes to the only active store.
    insert into public.quote_requests (
      folio, client_request_id, customer_id, customer_name, customer_phone, customer_type,
      organization, needed_by, delivery_method, store_id, requires_invoice, note, total_pieces,
      privacy_accepted_at, privacy_version, ip_hash, user_agent
    ) values (
      new_folio,
      request_id,
      customer_row_id,
      payload #>> '{customer,name}',
      customer_phone_value,
      (payload #>> '{customer,type}')::public.customer_type,
      nullif(payload #>> '{customer,organization}', ''),
      (payload ->> 'neededBy')::date,
      (payload ->> 'deliveryMethod')::public.delivery_method,
      case when payload ->> 'deliveryMethod' = 'pickup' then (
        select s.id from public.stores s where s.is_active order by s.sort_order, s.created_at limit 1
      ) end,
      coalesce((payload ->> 'requiresInvoice')::boolean, false),
      coalesce(payload ->> 'note', ''),
      pieces,
      now(),
      payload ->> 'privacyVersion',
      payload #>> '{meta,ipHash}',
      payload #>> '{meta,userAgent}'
    )
    returning id into new_quote_id;

    -- 6. Lines: name, SKU and label come from the catalog, never from the browser.
    insert into public.quote_request_items (
      quote_request_id, line_no, product_id, variant_id, product_name, sku, variant_label,
      quantity, personalize, notes
    )
    select new_quote_id, item.ord, p.id, v.id, p.name, v.sku,
           public.variant_label(v.option1_value, v.option2_value),
           (item.value ->> 'quantity')::int,
           coalesce((item.value ->> 'personalize')::boolean, false),
           coalesce(item.value ->> 'notes', '')
      from jsonb_array_elements(payload -> 'items') with ordinality as item (value, ord)
      join public.product_variants v on v.id = (item.value ->> 'variantId')::uuid
      join public.products p on p.id = v.product_id
     order by item.ord;

    -- 7. First history row.
    insert into public.quote_status_history (quote_request_id, from_status, to_status)
    values (new_quote_id, null, 'new');
  exception
    -- A concurrent retry with the same clientRequestId won the race: answer with its folio.
    when unique_violation then
      select q.id, q.folio into existing
        from public.quote_requests q where q.client_request_id = request_id;
      if not found then
        raise;
      end if;
      return jsonb_build_object('folio', existing.folio, 'id', existing.id, 'duplicate', true);
  end;

  -- 8.
  return jsonb_build_object('folio', new_folio, 'id', new_quote_id, 'duplicate', false);
end;
$$;

-- admin_set_quote_status / admin_set_quote_note ------------------------------------------------

create function public.admin_set_quote_status(
  id uuid,
  to_status public.quote_status,
  note text default '',
  lost_reason text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_status public.quote_status;
  allowed boolean;
begin
  perform public.require_staff();

  select q.status into current_status
    from public.quote_requests q where q.id = admin_set_quote_status.id for update;
  if not found then
    raise exception 'No existe la solicitud %.', admin_set_quote_status.id
      using errcode = 'no_data_found';
  end if;

  -- Transitions of §4.5.
  allowed := (current_status, to_status) in (
    ('new', 'in_progress'), ('new', 'quoted'), ('new', 'lost'),
    ('in_progress', 'quoted'), ('in_progress', 'lost'),
    ('quoted', 'won'), ('quoted', 'lost'),
    ('won', 'quoted'),
    ('lost', 'in_progress')
  );
  if not allowed then
    raise exception 'No se puede pasar de % a %.', current_status, to_status
      using errcode = 'check_violation';
  end if;
  if to_status = 'lost' and coalesce(btrim(lost_reason), '') = '' then
    raise exception 'Para marcarla como perdida escribe el motivo.' using errcode = 'check_violation';
  end if;

  update public.quote_requests q
     set status = to_status,
         lost_reason = case when to_status = 'lost' then btrim(admin_set_quote_status.lost_reason) end
   where q.id = admin_set_quote_status.id;

  insert into public.quote_status_history (quote_request_id, from_status, to_status, changed_by, note)
  values (admin_set_quote_status.id, current_status, to_status, auth.uid(), coalesce(note, ''));
end;
$$;

create function public.admin_set_quote_note(id uuid, internal_note text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.require_staff();

  update public.quote_requests q
     set internal_note = coalesce(admin_set_quote_note.internal_note, '')
   where q.id = admin_set_quote_note.id;
  if not found then
    raise exception 'No existe la solicitud %.', admin_set_quote_note.id
      using errcode = 'no_data_found';
  end if;
end;
$$;

-- admin_replace_variants -----------------------------------------------------------------------

-- Cartesian product option1 × option2. Existing combinations keep their id (reactivated and
-- reordered), new ones are created and the rest are deactivated. With no options at all, the
-- default variant (product SKU) is the only active one.
create function public.admin_replace_variants(product_id uuid, option1 text[], option2 text[])
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  product record;
  combo record;
  created int := 0;
  kept int := 0;
  deactivated int;
begin
  perform public.require_staff();

  select p.id, p.sku into product
    from public.products p where p.id = admin_replace_variants.product_id for update;
  if not found then
    raise exception 'No existe el producto %.', admin_replace_variants.product_id
      using errcode = 'no_data_found';
  end if;

  create temporary table wanted_variants (
    option1_value text, option2_value text, sort_order int
  ) on commit drop;

  -- Distinct, trimmed values in their original order.
  with o1 as (
    select btrim(value) as value, min(ord) as ord
      from unnest(coalesce(option1, '{}')) with ordinality as t (value, ord)
     where btrim(value) <> '' group by btrim(value)
  ), o2 as (
    select btrim(value) as value, min(ord) as ord
      from unnest(coalesce(option2, '{}')) with ordinality as t (value, ord)
     where btrim(value) <> '' group by btrim(value)
  ), a as (
    select value, ord from o1 union all select null, 0 where not exists (select 1 from o1)
  ), b as (
    select value, ord from o2 union all select null, 0 where not exists (select 1 from o2)
  )
  insert into wanted_variants
  select a.value, b.value, (row_number() over (order by a.ord, b.ord))::int - 1
    from a cross join b;

  for combo in select * from wanted_variants order by sort_order loop
    update public.product_variants v
       set is_active = true, sort_order = combo.sort_order
     where v.product_id = product.id
       and v.option1_value is not distinct from combo.option1_value
       and v.option2_value is not distinct from combo.option2_value;
    if found then
      kept := kept + 1;
    else
      insert into public.product_variants (product_id, sku, option1_value, option2_value,
                                           is_default, sort_order)
      values (
        product.id,
        public.variant_sku(product.sku, combo.option1_value, combo.option2_value),
        combo.option1_value,
        combo.option2_value,
        combo.option1_value is null and combo.option2_value is null,
        combo.sort_order
      );
      created := created + 1;
    end if;
  end loop;

  update public.product_variants v
     set is_active = false
   where v.product_id = product.id
     and v.is_active
     and not exists (
       select 1 from wanted_variants w
        where w.option1_value is not distinct from v.option1_value
          and w.option2_value is not distinct from v.option2_value
     );
  get diagnostics deactivated = row_count;

  drop table wanted_variants;

  return jsonb_build_object('created', created, 'kept', kept, 'deactivated', deactivated);
end;
$$;

-- has_unpublished_changes ----------------------------------------------------------------------

-- true when public content changed after the last successful publish (compared with the time the
-- run was queued, so nothing written while it built is missed). Deletions without updated_at in
-- the parent table are not detected; the nightly publish still covers them.
create function public.has_unpublished_changes()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  last_publish timestamptz;
begin
  if auth.role() is distinct from 'service_role' then
    perform public.require_staff();
  end if;

  select max(r.created_at) into last_publish
    from public.publish_runs r where r.status = 'success';
  if last_publish is null then
    return true;
  end if;

  return exists (select 1 from public.products where updated_at > last_publish)
      or exists (select 1 from public.product_variants where updated_at > last_publish)
      or exists (select 1 from public.product_images where updated_at > last_publish)
      or exists (select 1 from public.product_sports where created_at > last_publish)
      or exists (select 1 from public.sports where updated_at > last_publish)
      or exists (select 1 from public.categories where updated_at > last_publish)
      or exists (select 1 from public.brands where updated_at > last_publish)
      or exists (select 1 from public.stores where updated_at > last_publish)
      or exists (select 1 from public.gallery_items where updated_at > last_publish)
      or exists (select 1 from public.gallery_item_products where created_at > last_publish)
      or exists (select 1 from public.site_media where updated_at > last_publish)
      or exists (select 1 from public.site_texts where updated_at > last_publish)
      or exists (select 1 from public.settings where is_public and updated_at > last_publish)
      or exists (select 1 from public.variant_prices where updated_at > last_publish)
      or exists (select 1 from public.inventory_levels where updated_at > last_publish);
end;
$$;

-- admin_dashboard_stats ------------------------------------------------------------------------

create function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_staff();

  return jsonb_build_object(
    'newCount', (select count(*) from public.quote_requests where status = 'new'),
    'last7Days', (select count(*) from public.quote_requests
                   where created_at >= now() - interval '7 days'),
    'last30Days', (select count(*) from public.quote_requests
                    where created_at >= now() - interval '30 days'),
    'byStatus', (
      select jsonb_object_agg(s.status, coalesce(c.total, 0))
        from unnest(enum_range(null::public.quote_status)) as s (status)
        left join (
          select status, count(*) as total from public.quote_requests group by status
        ) c on c.status = s.status
    ),
    'productsWithoutPhoto', (
      select count(*) from public.products p
       where p.status <> 'archived'
         and not exists (select 1 from public.product_images i where i.product_id = p.id)
    ),
    -- Top 10 by pieces requested in the last 30 days.
    'topProducts', coalesce((
      select jsonb_agg(t order by t.pieces desc, t.name)
        from (
          select i.product_id as "productId", max(i.product_name) as name, max(i.sku) as sku,
                 sum(i.quantity)::int as pieces, count(distinct i.quote_request_id)::int as requests
            from public.quote_request_items i
            join public.quote_requests q on q.id = i.quote_request_id
           where q.created_at >= now() - interval '30 days' and i.product_id is not null
           group by i.product_id
           order by pieces desc, name
           limit 10
        ) t
    ), '[]'::jsonb)
  );
end;
$$;

-- admin_anonymize_customer (ARCO cancellation) -------------------------------------------------

create function public.admin_anonymize_customer(id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  anonymous_phone text;
  attempt int := 0;
begin
  perform public.require_admin();

  if not exists (select 1 from public.customers c where c.id = admin_anonymize_customer.id) then
    raise exception 'No existe el cliente %.', admin_anonymize_customer.id
      using errcode = 'no_data_found';
  end if;

  -- 10 digits starting with 0: no real Mexican number starts with 0, and phone stays unique.
  loop
    anonymous_phone := '0' || lpad(
      (abs(hashtextextended(admin_anonymize_customer.id::text, attempt)) % 1000000000)::text, 9, '0'
    );
    exit when not exists (
      select 1 from public.customers c
       where c.phone = anonymous_phone and c.id <> admin_anonymize_customer.id
    );
    attempt := attempt + 1;
  end loop;

  update public.customers c
     set name = 'Cliente anónimo', phone = anonymous_phone, organization = null
   where c.id = admin_anonymize_customer.id;

  update public.quote_requests q
     set customer_name = 'Cliente anónimo', customer_phone = anonymous_phone,
         organization = null, ip_hash = null, user_agent = null
   where q.customer_id = admin_anonymize_customer.id;
end;
$$;

-- mark_publish_run -----------------------------------------------------------------------------

create function public.mark_publish_run(
  id uuid,
  status public.publish_status,
  run_url text default null,
  error text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.publish_runs r
     set status = mark_publish_run.status,
         run_url = coalesce(mark_publish_run.run_url, r.run_url),
         error = mark_publish_run.error,
         finished_at = case when mark_publish_run.status in ('success', 'failed') then now() end
   where r.id = mark_publish_run.id;
  if not found then
    raise exception 'No existe la publicación %.', mark_publish_run.id
      using errcode = 'no_data_found';
  end if;
end;
$$;

-- ping -----------------------------------------------------------------------------------------

-- Keeps the project active. At most one heartbeat per minute, so an anonymous caller cannot
-- flood the table; heartbeats older than 90 days are deleted.
create function public.ping()
returns timestamptz
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.system_heartbeats where created_at > now() - interval '1 minute'
  ) then
    insert into public.system_heartbeats (source) values ('cron');
  end if;
  delete from public.system_heartbeats where created_at < now() - interval '90 days';
  return now();
end;
$$;

-- EXECUTE privileges (§8) ----------------------------------------------------------------------

revoke all on function
  public.require_staff(),
  public.require_admin(),
  public.variant_sku(text, text, text),
  public.variant_label(text, text),
  public.next_folio(timestamptz),
  public.create_quote_request(jsonb),
  public.admin_set_quote_status(uuid, public.quote_status, text, text),
  public.admin_set_quote_note(uuid, text),
  public.admin_replace_variants(uuid, text[], text[]),
  public.has_unpublished_changes(),
  public.admin_dashboard_stats(),
  public.admin_anonymize_customer(uuid),
  public.mark_publish_run(uuid, public.publish_status, text, text),
  public.ping()
from public, anon, authenticated;

grant execute on function
  public.next_folio(timestamptz),
  public.create_quote_request(jsonb),
  public.mark_publish_run(uuid, public.publish_status, text, text),
  public.has_unpublished_changes(),
  public.variant_sku(text, text, text),
  public.variant_label(text, text)
to service_role;

grant execute on function
  public.admin_set_quote_status(uuid, public.quote_status, text, text),
  public.admin_set_quote_note(uuid, text),
  public.admin_replace_variants(uuid, text[], text[]),
  public.has_unpublished_changes(),
  public.admin_dashboard_stats(),
  public.admin_anonymize_customer(uuid)
to authenticated;

grant execute on function public.ping() to anon, authenticated, service_role;
