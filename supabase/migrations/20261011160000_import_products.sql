-- T1.5 · admin_import_products (docs/05-BACKEND-SCHEMA.md §8.2, data/sitio-actual.md §4).
--
-- Rows arrive with the CSV column names as keys and text values (the admin uploads them as
-- parsed by Papa Parse; scripts/import-catalog.mjs sends the same shape), so the CSV rules live
-- here, in one place.

-- Staff checks also let service_role through: it is the server (Edge Functions, CI and the
-- db:import script) and already bypasses RLS. Admin-only functions keep requiring an admin.
create or replace function public.require_staff()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.role() is not distinct from 'service_role' then
    return;
  end if;
  if not public.is_staff() then
    raise exception 'Solo el personal puede hacer esto.' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

-- 'Ropa Deportiva', 'P&P' → 'ropa-deportiva', 'p-p'.
create function public.slugify(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(regexp_replace(
    lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(value, ''))),
    '[^a-z0-9]+', '-', 'g'
  ), '-');
$$;

-- Display name for taxonomy created by the importer: 'guantes-portero' → 'Guantes portero'.
-- The seed (T1.6) carries the proper names; this is only the fallback for new slugs.
create function public.name_from_slug(slug text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(left(slug, 1)) || replace(substr(slug, 2), '-', ' ');
$$;

-- Splits 'a|b|c' into trimmed, non-empty values.
create function public.split_list(value text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(btrim(item) order by ord), '{}')
    from unnest(string_to_array(coalesce(value, ''), '|')) with ordinality as t (item, ord)
   where btrim(item) <> '';
$$;

create function public.admin_import_products(rows jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  item record;
  r jsonb;
  row_no int;
  row_sku text;
  row_slug text;
  row_name text;
  category_slug text;
  subcategory_slug text;
  legacy_slug text;
  audience_value public.audience;
  status_value public.product_status;
  sizes text[];
  colors text[];
  color_note_value text;
  techniques_value text[];
  sport_slugs text[];
  brand_row_id uuid;
  category_row record;
  subcategory_row_id uuid;
  subcategory_parent_id uuid;
  existing record;
  product_row_id uuid;
  created_count int := 0;
  updated_count int := 0;
  errors jsonb := '[]';
  warnings jsonb := '[]';
begin
  perform public.require_staff();

  if jsonb_typeof(rows) is distinct from 'array' then
    raise exception 'Se esperaba un arreglo de filas.' using errcode = 'invalid_parameter_value';
  end if;
  if jsonb_array_length(rows) > 50 then
    raise exception 'Se aceptan hasta 50 filas por lote.' using errcode = 'invalid_parameter_value';
  end if;

  for item in select value, ord from jsonb_array_elements(rows) with ordinality as t (value, ord) loop
    r := item.value;
    -- Rows may carry their spreadsheet line number in "_row"; otherwise their position.
    row_no := coalesce((r ->> '_row')::int, item.ord::int);
    row_sku := btrim(coalesce(r ->> 'sku', ''));

    begin
      -- Every rule of the row runs inside this block: a failing row is rolled back alone.
      set constraints all deferred;

      row_slug := btrim(coalesce(r ->> 'slug', ''));
      row_name := btrim(coalesce(r ->> 'nombre', ''));
      category_slug := btrim(coalesce(r ->> 'categoria', ''));
      subcategory_slug := nullif(btrim(coalesce(r ->> 'subcategoria', '')), '');

      if row_sku = '' then
        raise exception 'Falta el SKU.';
      end if;
      if row_name = '' then
        raise exception 'Falta el nombre.';
      end if;
      if row_slug !~ '^[a-z0-9-]+$' then
        raise exception 'El slug "%" solo puede tener minúsculas, números y guiones.', row_slug;
      end if;
      if category_slug !~ '^[a-z0-9-]+$' then
        raise exception 'La categoría "%" no es un slug válido.', category_slug;
      end if;
      if subcategory_slug is not null and subcategory_slug !~ '^[a-z0-9-]+$' then
        raise exception 'La subcategoría "%" no es un slug válido.', subcategory_slug;
      end if;
      if btrim(coalesce(r ->> 'marca', '')) = '' then
        raise exception 'Falta la marca.';
      end if;

      -- url_anterior must end in the same slug (it feeds the 301 redirects).
      if nullif(btrim(coalesce(r ->> 'url_anterior', '')), '') is not null then
        legacy_slug := substring(btrim(r ->> 'url_anterior') from '/([^/]+)/?$');
        if legacy_slug is distinct from row_slug then
          raise exception 'El slug "%" no coincide con el de url_anterior ("%").', row_slug, legacy_slug;
        end if;
      end if;

      audience_value := case lower(btrim(coalesce(r ->> 'publico', '')))
        when '' then 'unisex' when 'adulto' then 'adulto' when 'infantil' then 'infantil'
        when 'unisex' then 'unisex' end;
      if audience_value is null then
        raise exception 'publico debe ser adulto, infantil o unisex (llegó "%").', r ->> 'publico';
      end if;

      status_value := case lower(btrim(coalesce(r ->> 'estado', '')))
        when '' then 'draft' when 'borrador' then 'draft' when 'publicado' then 'published'
        when 'archivado' then 'archived' end;
      if status_value is null then
        raise exception 'estado debe ser borrador, publicado o archivado (llegó "%").', r ->> 'estado';
      end if;

      if lower(btrim(coalesce(r ->> 'personalizable', 'no'))) not in ('si', 'sí', 'no', '') then
        raise exception 'personalizable debe ser si o no.';
      end if;
      if lower(btrim(coalesce(r ->> 'destacado', 'no'))) not in ('si', 'sí', 'no', '') then
        raise exception 'destacado debe ser si o no.';
      end if;

      techniques_value := public.split_list(lower(r ->> 'tecnicas'));
      if not techniques_value <@ array['sublimacion', 'vinil', 'bordado', 'serigrafia'] then
        raise exception 'tecnicas solo acepta sublimacion, vinil, bordado y serigrafia.';
      end if;

      sizes := public.split_list(r ->> 'tallas');
      if sizes = array['unitalla'] or lower(array_to_string(sizes, '|')) = 'unitalla' then
        sizes := '{}';
      end if;
      colors := public.split_list(r ->> 'colores');
      color_note_value := null;
      if lower(array_to_string(colors, '|')) = 'a elegir' then
        color_note_value := 'A elegir';
        colors := '{}';
      end if;
      sport_slugs := public.split_list(lower(r ->> 'deportes'));

      -- Brand by name or slug; created when missing.
      select b.id into brand_row_id
        from public.brands b
       where lower(b.name) = lower(btrim(r ->> 'marca')) or b.slug = public.slugify(r ->> 'marca')
       order by (lower(b.name) = lower(btrim(r ->> 'marca'))) desc
       limit 1;
      if brand_row_id is null then
        insert into public.brands (slug, name)
        values (public.slugify(r ->> 'marca'), btrim(r ->> 'marca'))
        returning id into brand_row_id;
      end if;

      -- Category and subcategory by slug; created when missing.
      select c.id, c.parent_id, c.size_label into category_row
        from public.categories c where c.slug = category_slug;
      if not found then
        insert into public.categories (slug, name)
        values (category_slug, public.name_from_slug(category_slug))
        returning id, parent_id, size_label into category_row;
      elsif category_row.parent_id is not null then
        raise exception '"%" es una subcategoría; en categoria va la categoría principal.', category_slug;
      end if;

      subcategory_row_id := null;
      if subcategory_slug is not null then
        select c.id, c.parent_id into subcategory_row_id, subcategory_parent_id
          from public.categories c where c.slug = subcategory_slug;
        if not found then
          insert into public.categories (parent_id, slug, name)
          values (category_row.id, subcategory_slug, public.name_from_slug(subcategory_slug))
          returning id into subcategory_row_id;
        elsif subcategory_parent_id is distinct from category_row.id then
          raise exception 'La subcategoría "%" no pertenece a la categoría "%".',
            subcategory_slug, category_slug;
        end if;
      end if;

      -- Upsert by SKU; an existing product keeps its slug (changing it would break links).
      select p.id, p.slug into existing from public.products p where p.sku = row_sku;

      if existing.id is null then
        insert into public.products (
          sku, slug, name, brand_id, category_id, subcategory_id, audience, short_description,
          option1_name, option2_name, color_note, is_customizable, techniques, is_featured,
          status, legacy_url
        ) values (
          row_sku, row_slug, row_name, brand_row_id, category_row.id, subcategory_row_id, audience_value,
          coalesce(btrim(r ->> 'descripcion_corta'), ''),
          category_row.size_label,
          case when cardinality(colors) > 0 then 'Color' end,
          color_note_value,
          lower(btrim(coalesce(r ->> 'personalizable', ''))) in ('si', 'sí'),
          techniques_value,
          lower(btrim(coalesce(r ->> 'destacado', ''))) in ('si', 'sí'),
          status_value,
          nullif(btrim(coalesce(r ->> 'url_anterior', '')), '')
        )
        returning id into product_row_id;
        created_count := created_count + 1;
      else
        product_row_id := existing.id;
        if existing.slug <> row_slug then
          warnings := warnings || jsonb_build_object('row', row_no, 'sku', row_sku,
            'message', format('El producto conserva su slug "%s"; el CSV trae "%s".', existing.slug, row_slug));
        end if;
        update public.products p set
          name = row_name,
          brand_id = brand_row_id,
          category_id = category_row.id,
          subcategory_id = subcategory_row_id,
          audience = audience_value,
          short_description = coalesce(btrim(r ->> 'descripcion_corta'), ''),
          option2_name = case when cardinality(colors) > 0 then coalesce(p.option2_name, 'Color') end,
          color_note = color_note_value,
          is_customizable = lower(btrim(coalesce(r ->> 'personalizable', ''))) in ('si', 'sí'),
          techniques = techniques_value,
          is_featured = lower(btrim(coalesce(r ->> 'destacado', ''))) in ('si', 'sí'),
          status = status_value,
          legacy_url = nullif(btrim(coalesce(r ->> 'url_anterior', '')), '')
        where p.id = product_row_id;
        updated_count := updated_count + 1;
      end if;

      -- Sports are replaced; unknown slugs are created (the seed brings the proper names).
      delete from public.product_sports ps where ps.product_id = product_row_id;
      insert into public.sports (slug, name)
      select s, public.name_from_slug(s) from unnest(sport_slugs) as s
       where s ~ '^[a-z0-9-]+$'
      on conflict on constraint sports_slug_key do nothing;
      if exists (select 1 from unnest(sport_slugs) as s where s !~ '^[a-z0-9-]+$') then
        raise exception 'deportes debe traer slugs separados por |.';
      end if;
      insert into public.product_sports (product_id, sport_id)
      select product_row_id, sp.id from public.sports sp where sp.slug = any (sport_slugs);

      -- Variants: sizes × colors, keeping existing ids.
      perform public.admin_replace_variants(product_row_id, sizes, colors);

      -- Publish and default-variant rules are checked now, so their errors stay in this row.
      set constraints all immediate;
    exception when others then
      errors := errors || jsonb_build_object('row', row_no, 'sku', nullif(row_sku, ''), 'message', sqlerrm);
    end;
  end loop;

  return jsonb_build_object(
    'created', created_count, 'updated', updated_count, 'errors', errors, 'warnings', warnings
  );
end;
$$;

revoke all on function
  public.slugify(text),
  public.name_from_slug(text),
  public.split_list(text),
  public.admin_import_products(jsonb)
from public, anon, authenticated;
grant execute on function public.admin_import_products(jsonb) to authenticated, service_role;
