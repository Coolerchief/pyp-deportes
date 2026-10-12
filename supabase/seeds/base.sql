-- Base seed data, shared by every database: docs/05-BACKEND-SCHEMA.md §11.
-- Development (pyp-dev and the CI database) loads it with dev-admin.sql through config.toml;
-- production loads only this file, once, from .github/workflows/db-production.yml (T1.8).
-- Values come from §4.7 and docs/data/sitio-actual.md §2–3. Bracketed texts ([HORARIO], [PEDIDO
-- MÍNIMO]…) and values marked ⚠️ there are pending data: they stay as they are until the business
-- confirms them in the admin. Products are not seeded: `pnpm db:import` loads them (or
-- `pnpm db:setup`, which resets and imports in one go).

-- 1. Settings and site texts (§4.7) -------------------------------------------------------------

insert into public.settings (key, value, is_public) values
  ('whatsapp_sales_number', '"5500000000"', true),  -- ⚠️ placeholder: the production build fails with it
  ('site_name', '"P&P Deportes Coapa"', true),
  ('social', '{"instagram": "pyp_coapa", "facebook": "pypcoapa"}', true),
  ('flags', '{"show_prices": false, "enable_checkout": false, "enable_shipping": false, "enable_stock": false}', true),
  ('ga_measurement_id', 'null', true),
  ('quote_rate_limit', '{"per_ip_hour": 5, "per_phone_hour": 5}', false);

insert into public.site_texts (key, value) values
  ('advisor', jsonb_build_object(
    'name', '[Ana Martínez]',
    'role', 'Asesora de uniformes',
    'quote', 'Cuéntame qué deporte juegan, cuántos son y para cuándo lo necesitan. Te armo la cotización.'
  )),
  ('uniforms_faq', jsonb_build_array(
    jsonb_build_object('question', '¿Cuál es el pedido mínimo?', 'answer', '[PEDIDO MÍNIMO]'),
    jsonb_build_object('question', '¿Cuánto tarda la entrega?', 'answer', '[TIEMPO DE ENTREGA]'),
    jsonb_build_object('question', '¿Puedo pedir reposiciones después?',
                       'answer', 'Sí, en tallas infantiles y de adulto. [CONDICIONES DE REPOSICIÓN]'),
    jsonb_build_object('question', '¿Dan factura?', 'answer', 'Sí. Indícalo al enviar tu cotización.')
  )),
  ('store_history', jsonb_build_object('text', '[HISTORIA DE LA TIENDA]')),
  ('privacy_notice', jsonb_build_object(
    'version', '2026-10',
    'updatedAt', '[FECHA]',
    'sections', jsonb_build_array(
      jsonb_build_object('title', 'Quién es responsable', 'body',
        E'P&P Deportes Coapa, Calz. del Hueso 921, local 42, Granjas Coapa, Tlalpan, 14330, CDMX.\n\n[RAZÓN SOCIAL]'),
      jsonb_build_object('title', 'Qué datos pedimos', 'body',
        E'Solo los que escribes al enviar una cotización:\n\n- Nombre\n- Número de WhatsApp\n- Tipo de cliente y nombre del equipo o institución\n- Fecha en que necesitas tu pedido\n- Forma de entrega y si requieres factura\n- Notas que escribas en tu cotización'),
      jsonb_build_object('title', 'Para qué los usamos', 'body',
        E'Para responder tu cotización por WhatsApp y dar seguimiento a tu pedido.\n\n[OTROS USOS]'),
      jsonb_build_object('title', 'Con quién los compartimos', 'body', '[TRANSFERENCIAS DE DATOS]'),
      jsonb_build_object('title', 'Tus derechos (ARCO)', 'body',
        E'Puedes pedir acceso, rectificación, cancelación u oposición al uso de tus datos (derechos ARCO).\n\n[MEDIO PARA EJERCERLOS]'),
      jsonb_build_object('title', 'Cambios a este aviso', 'body', '[CÓMO SE AVISAN LOS CAMBIOS]'),
      jsonb_build_object('title', 'Contacto', 'body', '55 6582 2426 · [CORREO DE CONTACTO]')
    )
  ));

-- 2. Site photo slots, all without a photo (the site shows their markers) -----------------------

insert into public.site_media (slot) values
  ('home_hero'), ('uniforms_hero'), ('technique_sublimacion'), ('technique_vinil'),
  ('technique_bordado'), ('store_front'), ('store_workshop'), ('advisor');

-- 3. Store (sitio-actual §2; coordinates, hours, phone and email are ⚠️ to confirm) --------------

insert into public.stores (slug, name, street, neighborhood, borough, postal_code, city, lat, lng,
                           phone, email, hours, directions, sort_order)
values (
  'coapa', 'P&P Deportes Coapa', 'Calz. del Hueso 921, local 42', 'Granjas Coapa', 'Tlalpan',
  '14330', 'Ciudad de México', 19.300500, -99.127000, '5565822426', 'pyp_coapa@hotmail.com',
  '[{"days": [1, 2, 3, 4, 5], "open": "10:00", "close": "19:00"}, {"days": [6], "open": "10:00", "close": "17:00"}]',
  '[REFERENCIAS PARA LLEGAR Y ESTACIONAMIENTO]',
  1
);

-- 4. Sports, categories with subcategories, and brands (sitio-actual §3) ------------------------

insert into public.sports (slug, name, sort_order) values
  ('futbol', 'Fútbol', 1),
  ('basquetbol', 'Básquetbol', 2),
  ('voleibol', 'Voleibol', 3),
  ('box', 'Box', 4),
  ('fitness', 'Fitness y gimnasio', 5),
  ('natacion', 'Natación', 6),
  ('atletismo', 'Atletismo', 7);

-- size_label (§4.2): balones and material-entrenamiento → Tamaño, box-y-combate → Peso.
insert into public.categories (slug, name, size_label, sort_order) values
  ('uniformes', 'Uniformes', 'Talla', 1),
  ('balones', 'Balones', 'Tamaño', 2),
  ('ropa-deportiva', 'Ropa deportiva', 'Talla', 3),
  ('material-entrenamiento', 'Material de entrenamiento', 'Tamaño', 4),
  ('protecciones', 'Protecciones', 'Talla', 5),
  ('box-y-combate', 'Box y combate', 'Peso', 6),
  ('fitness-y-gimnasio', 'Fitness y gimnasio', 'Talla', 7),
  ('natacion', 'Natación', 'Talla', 8),
  ('accesorios', 'Accesorios y arbitraje', 'Talla', 9),
  ('primeros-auxilios', 'Primeros auxilios', 'Talla', 10);

insert into public.categories (parent_id, slug, name, size_label, sort_order)
select parent.id, sub.slug, sub.name, parent.size_label, sub.sort_order
  from (values
    ('uniformes', 'uniformes-futbol', 'Uniformes de fútbol', 1),
    ('uniformes', 'uniformes-basquetbol', 'Uniformes de básquetbol', 2),
    ('uniformes', 'uniformes-voleibol', 'Uniformes de voleibol', 3),
    ('uniformes', 'jerseys', 'Jerseys', 4),
    ('balones', 'balones-futbol', 'Balones de fútbol', 1),
    ('balones', 'balones-basquetbol', 'Balones de básquetbol', 2),
    ('balones', 'balones-voleibol', 'Balones de voleibol', 3),
    ('ropa-deportiva', 'shorts', 'Shorts', 1),
    ('ropa-deportiva', 'medias', 'Medias', 2),
    ('ropa-deportiva', 'pantalones', 'Pantalones', 3),
    ('ropa-deportiva', 'batas', 'Batas', 4),
    ('material-entrenamiento', 'conos', 'Conos', 1),
    ('material-entrenamiento', 'platos', 'Platos', 2),
    ('material-entrenamiento', 'casacas', 'Casacas', 3),
    ('material-entrenamiento', 'porterias', 'Porterías', 4),
    ('protecciones', 'espinilleras', 'Espinilleras', 1),
    ('protecciones', 'guantes-portero', 'Guantes de portero', 2),
    ('protecciones', 'caretas', 'Caretas', 3),
    ('box-y-combate', 'guantes-box', 'Guantes de box', 1),
    ('box-y-combate', 'manoplas', 'Manoplas', 2),
    ('box-y-combate', 'kits', 'Kits', 3),
    ('fitness-y-gimnasio', 'pesas', 'Pesas', 1),
    ('fitness-y-gimnasio', 'bandas', 'Bandas', 2),
    ('fitness-y-gimnasio', 'tapetes', 'Tapetes', 3),
    ('fitness-y-gimnasio', 'pelotas', 'Pelotas', 4),
    ('fitness-y-gimnasio', 'cardio', 'Cardio', 5),
    ('natacion', 'goggles', 'Goggles', 1),
    ('natacion', 'gorras', 'Gorras', 2),
    ('accesorios', 'silbatos', 'Silbatos', 1),
    ('accesorios', 'bombas', 'Bombas', 2),
    ('accesorios', 'gafetes', 'Gafetes', 3),
    ('primeros-auxilios', 'pomadas', 'Pomadas', 1),
    ('primeros-auxilios', 'aerosoles', 'Aerosoles', 2),
    ('primeros-auxilios', 'botiquines', 'Botiquines', 3)
  ) as sub (parent_slug, slug, name, sort_order)
  join public.categories parent on parent.slug = sub.parent_slug;

-- Futre, Figo and Maravillosa: still to confirm whether they are brands or model names.
insert into public.brands (slug, name, is_own_brand, sort_order) values
  ('pyp', 'P&P', true, 1),
  ('adx', 'ADX', false, 2),
  ('adidas', 'Adidas', false, 3),
  ('cruzeiro', 'Cruzeiro', false, 4),
  ('escualo', 'Escualo', false, 5),
  ('manriquez', 'Manríquez', false, 6),
  ('molten', 'Molten', false, 7),
  ('palomares', 'Palomares', false, 8),
  ('rinat', 'Rinat', false, 9),
  ('seyer', 'Seyer', false, 10),
  ('spalding', 'Spalding', false, 11),
  ('wilson', 'Wilson', false, 12),
  ('futre', 'Futre', false, 13),
  ('figo', 'Figo', false, 14),
  ('maravillosa', 'Maravillosa', false, 15);
