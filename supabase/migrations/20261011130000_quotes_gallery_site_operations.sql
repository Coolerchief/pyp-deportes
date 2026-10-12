-- T1.2 · Customers, quote requests, folios, gallery, site media/texts, settings and operations
-- (docs/05-BACKEND-SCHEMA.md §4.5–4.8). RLS on every table; policies arrive in T1.3 and the
-- functions that write these tables (next_folio, create_quote_request, ping…) in T1.4.

-- §4.5 Customers and quote requests ------------------------------------------------------------

create table public.customers (
  id             uuid primary key default gen_random_uuid(),
  phone          text not null unique check (phone ~ '^[0-9]{10}$'),  -- 10 digits, no +52
  name           text not null,
  customer_type  public.customer_type not null,
  organization   text,
  quote_count    int not null default 0 check (quote_count >= 0),
  first_seen_at  timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- One row per year (America/Mexico_City); next_folio locks it with insert … on conflict.
create table public.folio_counters (
  year        int primary key check (year between 2000 and 2999),
  last_value  int not null default 0 check (last_value >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.quote_requests (
  id                   uuid primary key default gen_random_uuid(),
  folio                text not null unique check (folio ~ '^PYP-[0-9]{4}-[0-9]{6}$'),
  client_request_id    uuid not null unique,  -- idempotency
  customer_id          uuid not null references public.customers (id),
  status               public.quote_status not null default 'new',
  -- copy of the data as it was sent
  customer_name        text not null,
  customer_phone       text not null check (customer_phone ~ '^[0-9]{10}$'),
  customer_type        public.customer_type not null,
  organization         text,
  needed_by            date not null,
  delivery_method      public.delivery_method not null,
  store_id             uuid references public.stores (id),
  requires_invoice     boolean not null default false,
  note                 text not null default '',
  total_pieces         int not null check (total_pieces > 0),
  -- internal follow-up
  lost_reason          text,
  internal_note        text not null default '',
  -- privacy and abuse
  privacy_accepted_at  timestamptz not null,
  privacy_version      text not null,
  ip_hash              text,  -- salted hash, never the raw IP
  user_agent           text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- 'lost' requires a reason (§4.5); admin_set_quote_status validates transitions in T1.4.
  constraint lost_needs_reason check (
    status <> 'lost' or (lost_reason is not null and btrim(lost_reason) <> '')
  )
);
create index quote_requests_status_idx on public.quote_requests (status, created_at desc);
create index quote_requests_ip_hash_idx on public.quote_requests (ip_hash, created_at);
create index quote_requests_customer_id_idx on public.quote_requests (customer_id, created_at desc);
create index quote_requests_store_id_idx on public.quote_requests (store_id);

create table public.quote_request_items (
  id                uuid primary key default gen_random_uuid(),
  quote_request_id  uuid not null references public.quote_requests (id) on delete cascade,
  line_no           int not null check (line_no > 0),
  product_id        uuid references public.products (id) on delete set null,
  variant_id        uuid references public.product_variants (id) on delete set null,
  product_name      text not null,  -- copy: the product may change or be deleted later
  sku               text not null,
  variant_label     text,           -- 'M', '#5 · Blanco/Rojo'
  quantity          int not null check (quantity between 1 and 9999),
  personalize       boolean not null default false,
  notes             text not null default '' check (char_length(notes) <= 500),
  unit_price_cents  int check (unit_price_cents >= 0),  -- empty in catalog mode
  created_at        timestamptz not null default now(),
  unique (quote_request_id, line_no)
);
create index quote_request_items_product_id_idx on public.quote_request_items (product_id);
create index quote_request_items_variant_id_idx on public.quote_request_items (variant_id);

create table public.quote_status_history (
  id                bigint generated always as identity primary key,
  quote_request_id  uuid not null references public.quote_requests (id) on delete cascade,
  from_status       public.quote_status,
  to_status         public.quote_status not null,
  changed_by        uuid references auth.users (id) on delete set null,
  note              text not null default '',
  created_at        timestamptz not null default now()
);
create index quote_status_history_request_idx
  on public.quote_status_history (quote_request_id, created_at);

-- §4.6 Gallery ---------------------------------------------------------------------------------

create table public.gallery_items (
  id                    uuid primary key default gen_random_uuid(),
  team_name             text not null,
  sport_id              uuid references public.sports (id),
  year                  int check (year between 1900 and 2999),
  key_base              text not null unique,  -- 'g/{galleryId}/{imageId}'
  alt                   text not null default '',
  width                 int not null check (width > 0),
  height                int not null check (height > 0),
  includes_minors       boolean not null default false,
  has_written_consent   boolean not null default false,
  has_guardian_consent  boolean not null default false,
  status                public.content_status not null default 'draft',
  sort_order            int not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint consent_to_publish check (
    status = 'draft'
    or (has_written_consent and (not includes_minors or has_guardian_consent))
  )
);
create index gallery_items_listing_idx on public.gallery_items (status, sort_order);
create index gallery_items_sport_id_idx on public.gallery_items (sport_id);

create table public.gallery_item_products (
  gallery_item_id  uuid not null references public.gallery_items (id) on delete cascade,
  product_id       uuid not null references public.products (id) on delete cascade,
  created_at       timestamptz not null default now(),
  primary key (gallery_item_id, product_id)
);
create index gallery_item_products_product_id_idx on public.gallery_item_products (product_id);

-- §4.7 Site media, texts and settings ----------------------------------------------------------

create table public.site_media (
  slot        text primary key check (slot in (
                'home_hero', 'uniforms_hero',
                'technique_sublimacion', 'technique_vinil', 'technique_bordado',
                'store_front', 'store_workshop', 'advisor')),
  key_base    text,  -- 's/{slot}/{imageId}'; null = no photo (the site shows the marker)
  alt         text not null default '',
  width       int check (width > 0),
  height      int check (height > 0),
  updated_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint photo_has_size check (key_base is null or (width is not null and height is not null))
);

create table public.site_texts (
  key         text primary key check (key ~ '^[a-z0-9_]+$'),
  value       jsonb not null,
  updated_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.settings (
  key         text primary key check (key ~ '^[a-z0-9_]+$'),
  value       jsonb not null,
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- §4.8 Operations ------------------------------------------------------------------------------

create table public.publish_runs (
  id            uuid primary key default gen_random_uuid(),
  status        public.publish_status not null default 'queued',
  reason        text not null default 'manual' check (reason in ('manual', 'nightly', 'push')),
  requested_by  uuid references auth.users (id) on delete set null,
  run_url       text,
  error         text,
  finished_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index publish_runs_created_at_idx on public.publish_runs (created_at desc);

-- Keeps the last 90 days (cleaned by ping() in T1.4).
create table public.system_heartbeats (
  id          bigint generated always as identity primary key,
  source      text not null,  -- 'cron'
  created_at  timestamptz not null default now()
);
create index system_heartbeats_created_at_idx on public.system_heartbeats (created_at);

-- set_updated_at on the editable tables --------------------------------------------------------

create trigger set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.folio_counters
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.quote_requests
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.gallery_items
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.site_media
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.site_texts
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.settings
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.publish_runs
  for each row execute function public.set_updated_at();

-- RLS on every table (§1.4) --------------------------------------------------------------------

alter table public.customers             enable row level security;
alter table public.folio_counters        enable row level security;
alter table public.quote_requests        enable row level security;
alter table public.quote_request_items   enable row level security;
alter table public.quote_status_history  enable row level security;
alter table public.gallery_items         enable row level security;
alter table public.gallery_item_products enable row level security;
alter table public.site_media            enable row level security;
alter table public.site_texts            enable row level security;
alter table public.settings              enable row level security;
alter table public.publish_runs          enable row level security;
alter table public.system_heartbeats     enable row level security;
