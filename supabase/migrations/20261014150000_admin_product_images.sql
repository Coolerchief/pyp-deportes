-- T4.5 · Product photos from the panel (TRD §6.2, Schema §4.3).
--
-- The browser uploads the four WebP widths to R2 with the URLs of sign-upload and then records
-- the photo here. The key is built by the database (never taken from the browser), the photo
-- must be 4:5 and goes last; reordering writes every position in one transaction. The alt text
-- is updated and photos are removed directly through RLS (staff_all on product_images).

create function public.admin_add_product_image(
  product_id uuid,
  image_id uuid,
  width int,
  height int,
  alt text default ''
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  next_order int;
begin
  perform public.require_staff();

  perform 1 from public.products p where p.id = admin_add_product_image.product_id for update;
  if not found then
    raise exception 'No existe el producto %.', admin_add_product_image.product_id
      using errcode = 'no_data_found';
  end if;
  if width is null or height is null or width < 320 or height < 400 then
    raise exception 'La foto debe medir al menos 320 × 400 px.' using errcode = 'invalid_parameter_value';
  end if;
  -- 4:5 with a margin of one pixel per side for rounding.
  if abs(width * 5 - height * 4) > 9 then
    raise exception 'La foto debe estar recortada en proporción 4:5.'
      using errcode = 'invalid_parameter_value';
  end if;
  if length(coalesce(alt, '')) > 200 then
    raise exception 'El texto alternativo puede tener hasta 200 caracteres.'
      using errcode = 'invalid_parameter_value';
  end if;

  if (select count(*) from public.product_images i
       where i.product_id = admin_add_product_image.product_id) >= 12 then
    raise exception 'Cada producto puede tener hasta 12 fotos.' using errcode = 'invalid_parameter_value';
  end if;

  select coalesce(max(i.sort_order) + 1, 0) into next_order
    from public.product_images i where i.product_id = admin_add_product_image.product_id;

  insert into public.product_images (id, product_id, key_base, alt, width, height, sort_order)
  values (
    image_id,
    admin_add_product_image.product_id,
    'p/' || admin_add_product_image.product_id || '/' || image_id,
    btrim(coalesce(alt, '')),
    width,
    height,
    next_order
  );
  return image_id;
end;
$$;

-- The photos of a product in the given order (all of them, each once).
create function public.admin_reorder_product_images(product_id uuid, image_ids uuid[])
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.require_staff();

  if (select array_agg(i.id order by i.id) from public.product_images i
       where i.product_id = admin_reorder_product_images.product_id)
     is distinct from (select array_agg(x order by x) from unnest(image_ids) x) then
    raise exception 'La lista debe traer cada foto del producto una sola vez.'
      using errcode = 'invalid_parameter_value';
  end if;

  update public.product_images i
     set sort_order = t.ord - 1
    from unnest(image_ids) with ordinality as t (id, ord)
   where i.id = t.id and i.sort_order is distinct from t.ord - 1;
end;
$$;

revoke all on function
  public.admin_add_product_image(uuid, uuid, int, int, text),
  public.admin_reorder_product_images(uuid, uuid[])
from public, anon, authenticated;
grant execute on function
  public.admin_add_product_image(uuid, uuid, int, int, text),
  public.admin_reorder_product_images(uuid, uuid[])
to authenticated;
