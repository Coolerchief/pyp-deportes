-- T1.1 · Extensions and enum types (docs/05-BACKEND-SCHEMA.md §3).
-- Supabase keeps extensions in their own schema; code calls them qualified (extensions.unaccent).

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create type public.staff_role as enum ('admin', 'editor');
create type public.product_status as enum ('draft', 'published', 'archived');
create type public.audience as enum ('adulto', 'infantil', 'unisex');
create type public.customer_type as enum (
  'league_team', 'school_academy', 'company_institution', 'individual'
);
create type public.delivery_method as enum ('pickup', 'shipping');
create type public.quote_status as enum ('new', 'in_progress', 'quoted', 'won', 'lost');
create type public.content_status as enum ('draft', 'published');
create type public.publish_status as enum ('queued', 'running', 'success', 'failed');

-- Keeps updated_at current on every update of an editable table (§5).
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Lowercase, accent-free text used for search (same rule as packages/shared normalization).
create function public.normalize_search_text(value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(value, '')));
$$;
