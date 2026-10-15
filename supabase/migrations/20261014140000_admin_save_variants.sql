-- T4.4 · Variant generator of the panel (docs/05-BACKEND-SCHEMA.md §4.3 and §8).
--
-- Saves the option names (option1_name, option2_name, color_note) and regenerates sizes × colors
-- with admin_replace_variants in one transaction: existing combinations keep their id (quote
-- lines, prices and stock point to it), new ones are created and the rest are deactivated.

create function public.admin_save_variants(
  product_id uuid,
  option1_name text,
  option2_name text,
  color_note text,
  option1 text[],
  option2 text[]
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  values1 text[];
  values2 text[];
  name1 text := btrim(coalesce(admin_save_variants.option1_name, ''));
  name2 text := nullif(btrim(coalesce(admin_save_variants.option2_name, '')), '');
  note text := nullif(btrim(coalesce(admin_save_variants.color_note, '')), '');
  result jsonb;
begin
  perform public.require_staff();

  if not exists (select 1 from public.products p where p.id = admin_save_variants.product_id) then
    raise exception 'No existe el producto %.', admin_save_variants.product_id
      using errcode = 'no_data_found';
  end if;

  -- Distinct trimmed values, as admin_replace_variants reads them.
  select coalesce(array_agg(v order by ord), '{}') into values1
    from (select btrim(v) as v, min(ord) as ord
            from unnest(coalesce(option1, '{}')) with ordinality as t (v, ord)
           where btrim(v) <> '' group by btrim(v)) s;
  select coalesce(array_agg(v order by ord), '{}') into values2
    from (select btrim(v) as v, min(ord) as ord
            from unnest(coalesce(option2, '{}')) with ordinality as t (v, ord)
           where btrim(v) <> '' group by btrim(v)) s;

  if name1 = '' or length(name1) > 30 then
    raise exception 'Escribe el nombre de la opción (por ejemplo Talla), de hasta 30 caracteres.'
      using errcode = 'invalid_parameter_value';
  end if;
  if cardinality(values2) > 0 and (name2 is null or length(name2) > 30) then
    raise exception 'Escribe el nombre de la segunda opción (por ejemplo Color), de hasta 30 caracteres.'
      using errcode = 'invalid_parameter_value';
  end if;
  if exists (select 1 from unnest(values1 || values2) v where length(v) > 40) then
    raise exception 'Cada valor puede tener hasta 40 caracteres.'
      using errcode = 'invalid_parameter_value';
  end if;
  if greatest(cardinality(values1), 1) * greatest(cardinality(values2), 1) > 200 then
    raise exception 'Son demasiadas combinaciones: el máximo es 200 variantes.'
      using errcode = 'invalid_parameter_value';
  end if;
  if note is not null and length(note) > 60 then
    raise exception 'La nota de color puede tener hasta 60 caracteres.'
      using errcode = 'invalid_parameter_value';
  end if;

  update public.products p
     set option1_name = name1,
         -- Without values the second option does not exist; the note is for that case only.
         option2_name = case when cardinality(values2) > 0 then name2 end,
         color_note = case when cardinality(values2) > 0 then null else note end
   where p.id = admin_save_variants.product_id;

  result := public.admin_replace_variants(admin_save_variants.product_id, values1, values2);

  -- A published product needs an active variant: checked here, not at the commit.
  set constraints public.ensure_default_variant, public.validate_product_publish immediate;

  return result;
end;
$$;

revoke all on function public.admin_save_variants(uuid, text, text, text, text[], text[])
  from public, anon, authenticated;
grant execute on function public.admin_save_variants(uuid, text, text, text, text[], text[])
  to authenticated;
