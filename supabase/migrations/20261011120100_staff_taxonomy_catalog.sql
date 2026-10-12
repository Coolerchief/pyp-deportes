-- T1.1 · Staff, taxonomy, catalog and hidden commerce tables (docs/05-BACKEND-SCHEMA.md §4.1–4.4).
-- RLS is enabled on every table from the start; with no policies yet, anon and authenticated
-- read nothing. Policies and public_* views arrive in T1.3.

-- §4.1 Staff ---------------------------------------------------------------------------------

create table public.staff_members (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       public.staff_role not null default 'editor',
  full_name  text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- §4.2 Taxonomy ------------------------------------------------------------------------------

create table public.sports (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name        text not null,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  -- null = category; set = subcategory (one level only, see categories_one_level)
  parent_id   uuid references public.categories (id) on delete restrict,
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name        text not null,
  -- Default name of option 1 for its products: 'Talla' | 'Tamaño' | 'Peso'
  size_label  text not null default 'Talla',
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index categories_parent_id_idx on public.categories (parent_id);

create table public.brands (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name          text not null,
  logo_key      text,  -- R2 base key, optional
  is_own_brand  boolean not null default false,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- §4.3 Catalog -------------------------------------------------------------------------------

create table public.products (
  id                 uuid primary key default gen_random_uuid(),
  sku                text not null unique,
  slug               text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name               text not null,
  brand_id           uuid not null references public.brands (id),
  category_id        uuid not null references public.categories (id),
  subcategory_id     uuid references public.categories (id),
  audience           public.audience not null default 'unisex',
  short_description  text not null default '',
  description        text not null default '',
  specs              jsonb not null default '[]',  -- [{ "label": "Tela", "value": "…" }]
  tags               text[] not null default '{}',
  option1_name       text not null default 'Talla',  -- initialized from categories.size_label
  option2_name       text,                           -- 'Color' or null
  color_note         text,                           -- e.g. 'A elegir' when color is not a variant
  is_customizable    boolean not null default false,
  techniques         text[] not null default '{}'
                     check (techniques <@ array['sublimacion', 'vinil', 'bordado', 'serigrafia']),
  min_suggested_qty  int check (min_suggested_qty > 0),
  is_featured        boolean not null default false,
  sort_order         int not null default 0,
  status             public.product_status not null default 'draft',
  published_at       timestamptz,       -- set the first time status becomes 'published'
  legacy_url         text,              -- WordPress URL, for redirects
  search_text        text not null default '',  -- maintained by products_search_text
  created_by         uuid references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index products_listing_idx on public.products (status, is_featured desc, sort_order);
create index products_category_id_idx on public.products (category_id);
create index products_subcategory_id_idx on public.products (subcategory_id);
create index products_brand_id_idx on public.products (brand_id);
create index products_search_text_idx on public.products
  using gin (search_text extensions.gin_trgm_ops);

create table public.product_sports (
  product_id  uuid not null references public.products (id) on delete cascade,
  sport_id    uuid not null references public.sports (id) on delete restrict,
  created_at  timestamptz not null default now(),
  primary key (product_id, sport_id)
);
create index product_sports_sport_id_idx on public.product_sports (sport_id);

create table public.product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete cascade,
  sku            text not null unique,
  option1_value  text,  -- 'CH', '#5', '16oz'… null on the default variant
  option2_value  text,  -- 'Rojo'… or null
  is_default     boolean not null default false,
  is_active      boolean not null default true,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique nulls not distinct (product_id, option1_value, option2_value)
);
create unique index one_default_variant on public.product_variants (product_id) where is_default;

create table public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  variant_id  uuid references public.product_variants (id) on delete set null,
  key_base    text not null unique,  -- 'p/{productId}/{imageId}' → '{key_base}-{320|640|1024|1600}.webp'
  alt         text not null default '',
  width       int not null,          -- of the cropped 4:5 original
  height      int not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index product_images_product_id_idx on public.product_images (product_id, sort_order);
create index product_images_variant_id_idx on public.product_images (variant_id);

-- §4.4 Hidden commerce (catalog mode) and store ----------------------------------------------

create table public.variant_prices (
  variant_id        uuid not null references public.product_variants (id) on delete cascade,
  min_qty           int not null default 1 check (min_qty >= 1),  -- volume tier
  unit_price_cents  int not null check (unit_price_cents >= 0),
  currency          char(3) not null default 'MXN',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (variant_id, min_qty)
);

create table public.stores (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  street        text not null,
  neighborhood  text not null,
  borough       text not null,
  postal_code   text not null,
  city          text not null default 'Ciudad de México',
  lat           numeric(9, 6),
  lng           numeric(9, 6),
  phone         text,
  email         text,
  -- [{ "days": [1,2,3,4,5], "open": "10:00", "close": "19:00" }] (1 = Monday)
  hours         jsonb not null default '[]',
  directions    text not null default '',  -- how to get there and parking
  is_active     boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.inventory_levels (
  variant_id  uuid not null references public.product_variants (id) on delete cascade,
  store_id    uuid not null references public.stores (id) on delete cascade,
  quantity    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (variant_id, store_id)
);
create index inventory_levels_store_id_idx on public.inventory_levels (store_id);

-- RLS on every table (§1.4) -------------------------------------------------------------------

alter table public.staff_members    enable row level security;
alter table public.sports           enable row level security;
alter table public.categories       enable row level security;
alter table public.brands           enable row level security;
alter table public.products         enable row level security;
alter table public.product_sports   enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images   enable row level security;
alter table public.variant_prices   enable row level security;
alter table public.stores           enable row level security;
alter table public.inventory_levels enable row level security;
