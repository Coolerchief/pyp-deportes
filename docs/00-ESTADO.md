# 00 · Estado del proyecto y pendientes

> Índice de la documentación y lista de lo que falta. Se actualiza cada vez que cambia un documento o el diseño.
> **Última actualización:** 12-oct-2026.

## 1. Qué es

Catálogo web de P&P Deportes Coapa: sin precios, el cliente arma una lista con cantidades por talla y la envía a un solo WhatsApp. Preparado para convertirse en e-commerce sin rehacerse. Stack: Next.js estático + Supabase + Cloudflare (Workers y R2), costo fijo ≈ $0.

## 2. Documentos

| # | Documento | Versión | Estado | Contenido |
|---|---|---|---|---|
| 01 | `01-PRD.md` | 0.3 | ✅ Al día | Qué se construye, requisitos por módulo, decisiones D1–D14, preguntas abiertas |
| 02 | `02-TRD.md` | 0.3 | ✅ Al día | Arquitectura, stack, límites de planes, repositorio, reglas técnicas, ruta a e-commerce |
| 03 | `03-UI-UX.md` | 0.2 | ✅ Al día | Tokens, componentes, estados, inventario de 46 pantallas, microcopy |
| 04 | `04-APP-FLOW.md` | 0.1 | ✅ | Mapa del sitio, flujos del visitante, envío con y sin folio, casos de error, panel, publicación, analítica por paso |
| 05 | `05-BACKEND-SCHEMA.md` | 0.1 | ✅ | 23 tablas, vistas públicas, seguridad por fila, funciones, contratos de las 4 Edge Functions, datos semilla |
| 06 | `06-IMPLEMENTATION-PLAN.md` | 0.1 | ✅ | 8 fases, 54 tareas con qué leer y cómo saber que terminaron, checklist de salida a producción |
| — | `CLAUDE.md` (raíz del repo) | — | ✅ | Reglas del repositorio para Claude Code |
| — | `data/catalogo-inicial.csv` | — | ✅ | 56 productos (48 del sitio actual, 8 inventados); tallas y colores supuestos |
| — | `data/sitio-actual.md` | — | ✅ Al día | Sitio WordPress actual, datos del negocio, taxonomía, formato del importador |
| — | `data/referencias-y-fotos.md` | — | ✅ Al día | Sitios de referencia, fotos recibidas, fotos que faltan |
| — | `brand/logos/` | — | ⚠️ Reconstruidos | 12 SVG; sustituir por los archivos maestros del diseñador |

## 3. Diseño (Claude Design)

| Entregable | Estado |
|---|---|
| Sistema de diseño "P&P Deportes Coapa": reglas, tokens, fuentes, logos, 12 componentes | ✅ |
| 24 pantallas móviles (390 px) | ✅ |
| 22 pantallas de escritorio (1440 px) | ✅ |
| Paquete exportado para VS Code (`design/`): HTML, PNG, tokens, fuentes, logos | ✅ |
| Pantallas del panel de administración | ⬜ Falta |
| Imágenes genéricas de las 10 categorías como archivos | ✅ `apps/web/public/img/placeholder/` (T0.5) |
| Página de marca, confirmación sin folio, header compacto, ficha con color y talla | ⬜ Opcional (se resuelven con los componentes existentes) |

## 4. Qué falta, en orden

### A. Documentación
Completa. Los seis documentos y `CLAUDE.md` están escritos. Se actualizan cuando la implementación se desvíe de ellos.

### B. Diseño
- Pantallas del admin (Inicio, Productos, Editor, Importar, Solicitudes, Fotos del sitio). Se puede construir con shadcn/ui desde `03-UI-UX.md` §9 si no se diseñan.

### C. Datos y contenido que debe dar el negocio
| Dato | Dónde aparece | Bloquea salir a producción |
|---|---|---|
| Número de WhatsApp de ventas | Todo el sitio | **Sí** (el build de producción falla sin él) |
| Horario real | Footer, Visítanos, estado "Abierto ahora" | Sí |
| Teléfono y correo vigentes | Footer, Visítanos, aviso de privacidad | Sí |
| Aviso de privacidad: razón social, otros usos, transferencias, medio para derechos ARCO, correo, fecha | `/aviso-de-privacidad` | **Sí** (obligación legal al pedir nombre y teléfono) |
| Pedido mínimo, tiempo de entrega, condiciones de reposición | Uniformes → Preguntas frecuentes | Sí |
| Tallas, colores, telas y materiales reales | Fichas | No (se corrigen en el admin) |
| ¿Se ofrece serigrafía? | Uniformes muestra 3 técnicas; 2 productos la mencionan | No |
| Nombre y foto de la asesora de uniformes | Inicio, Uniformes | No (hoy "[Ana Martínez]") |
| Historia de la tienda y referencias para llegar | Visítanos | No |
| Fotos: productos, portada, uniformes, 3 muestras, tienda, taller, equipos con autorización | Todo el sitio | No (hay marcadores e imagen genérica) |
| Datos del producto GASER (hay un video) | Catálogo | No |
| Archivos maestros del logotipo | Todo | No |
| Coordenadas exactas de la tienda | Mapa | No |

### D. Cuentas y accesos (para la fase 0 del plan)
- Repositorio de GitHub (público por ahora; secretos como secretos del repositorio, sin *environments*). ✅
- Proyectos de Supabase (plan Free): pyp-dev y producción. ✅
- Cuenta de Cloudflare: Workers, R2, Turnstile. ✅ Cuenta y token de Workers en los secretos de GitHub (11-oct-2026); R2 y Turnstile se configuran más adelante.
- ☐ Pendiente: "Crear environment production con Required reviewers y mover ahí los secretos de Supabase".
- ☐ Pendiente para la fase 7: cargar el catálogo real a producción. Se hará con el importador del panel de administración (T4.6) cuando el negocio entregue los productos reales. Mientras tanto el desarrollo sigue contra pyp-dev con los 56 productos de prueba, que nunca se cargan en producción (decisión del usuario, 12-oct-2026).
- Acceso al DNS de `pypdeportescoapa.com` (hoy en el hosting de WordPress) y copia de sus registros, sobre todo los de correo.
- Google Analytics 4 y Search Console.

### E. Construcción
En curso. El detalle está en `06-IMPLEMENTATION-PLAN.md`.

**Hecho:** T0.1 (monorepo pnpm: `apps/web`, `packages/shared`, `supabase/`, `workers/cron`; `pnpm build` genera `apps/web/out/`). Pendiente de T0.1: `test:db` no se probó en local por falta de Docker; `db:import` llega con T1.5.

**Hecho:** T0.2 (Tailwind v4 con los tokens en `@theme`, fuentes Barlow con `next/font/local`, 13 estilos `type-*`, estilos base; hoja de muestra en `/dev/tokens`).


| Fase | Objetivo | Tareas |
|---|---|---|
| 0 · Preparación | Repositorio que compila, prueba y despliega una página con la marca | 7 |
| 1 · Datos | Base de datos segura con el catálogo inicial cargado | 8 |
| 2 · Catálogo público | Encontrar y ver cualquier producto | 8 |
| 3 · Cotización | Armar la lista y enviarla por WhatsApp con folio | 9 |
| 4 · Panel de administración | El personal mantiene el catálogo y atiende solicitudes | 10 |
| 5 · Contenido, SEO y migración | Páginas de contenido, redirecciones del sitio actual | 7 |
| 6 · Calidad | Pruebas de punta a punta, accesibilidad, rendimiento, respaldos | 5 |
| 7 · Salida a producción | Datos reales, cambio de dominio (13 pasos) | — |

**Hecho:** modo sin Docker (scripts `db:*` contra pyp-dev con candado, `.env.local`, trabajo `db` de CI con pgTAP). pyp-dev enlazado (10-oct-2026); `pnpm db:types` y `pnpm test:db` probados contra pyp-dev. El proyecto de producción existe desde el 11-oct-2026 y nunca se enlaza: se actualiza con `db-production.yml` (T1.8).

**Hecho:** T0.3 (componentes de marca en `apps/web/components/brand`: `Logo`, `Placa`, `DobleDiagonal`, `PatronCancha`, `CorteA13`, `ImagenGenerica`; hoja `/dev/marca`; pruebas de render). CorteA13 en móvil va a ≈7° como el diseño (decidido el 10-oct-2026).

**Hecho:** T0.4 (componentes base en `apps/web/components/ui`: `Button`, `Badge`, `Chip`, `FormField`, `Sheet`, `EmptyState`, `Skeleton`, `SectionHeader`; hoja `/dev/componentes`; pruebas de teclado de `Sheet`). Badge `custom` en `noche` por contraste.

**Hecho:** T0.5 (10 imágenes genéricas WebP 800 × 1000 en `apps/web/public/img/placeholder/<slug>.webp`, generadas con `pnpm placeholders` desde `ImagenGenerica` vía la hoja `/dev/genericas`; la salida es idéntica byte a byte entre corridas; prueba que verifica los 10 archivos).

**Hecho:** T0.6. `ci.yml` con los trabajos `web` (lint, typecheck, pruebas, build, Playwright) y `db` (pgTAP); `deploy.yml` (push a `main` o manual → `wrangler deploy`); `apps/web/wrangler.jsonc` (Worker `pyp-deportes`, solo *static assets*); `_headers` con caché inmutable de `/_next/static/*`. Secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` cargados en GitHub (11-oct-2026). Primer push a `main` el 11-oct-2026 (PR #16): `Deploy` publicó en https://pyp-deportes.gael-marroquin2004.workers.dev con `noindex` (meta robots y `robots.txt` `Disallow: /`, comprobado en la URL). **Fase 0 cumplida.** `deploy.yml` usa solo secretos del repositorio.

**Hecho:** T0.7 (`CLAUDE.md` revisado contra el repositorio, 11-oct-2026: activación del `.venv`, `pnpm format`, hojas `/dev/*`, qué genera hoy `pnpm build`, despliegue y estructura real). Comandos probados: `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `placeholders`, `db:link`, `test:db`, `db:types` y `db:import` (avisa que el importador llega en T1.5). `db:reset` no se corrió porque borra pyp-dev y aún no hay migraciones.

**Hecho:** T1.1 (migraciones de extensiones, tipos, personal, taxonomía, catálogo, comercio oculto y triggers; RLS activado en las 11 tablas; 26 pruebas pgTAP de tablas y triggers). `pnpm db:reset` aplicado en pyp-dev (11-oct-2026) y `database.types.ts` regenerado. La salida de la fase 0 (sitio en `workers.dev`) sigue pendiente del primer push a `main`.

**Hecho:** T1.2 (12 tablas más: clientes, contadores de folio, solicitudes con sus líneas e historial, galería con consentimientos, `site_media`, `site_texts`, `settings`, `publish_runs`, `system_heartbeats`; RLS en todas; 14 pruebas pgTAP). El esquema tiene las 23 tablas de §4. `pnpm db:reset` aplicado en pyp-dev (11-oct-2026).

**Hecho:** T1.3 (15 vistas `public_*` de solo lectura, `is_staff`/`is_admin`, políticas RLS por rol y privilegios: `anon` no tiene acceso a ninguna tabla base; pruebas de seguridad 1–6 de §7 en verde, 22 pruebas pgTAP). `pnpm db:reset` aplicado en pyp-dev (11-oct-2026); comprobado también con la API REST y la llave `anon`.

**Hecho:** T1.4 (10 funciones de §8 más ayudantes `require_staff`, `require_admin`, `variant_sku` y `variant_label`; 51 pruebas pgTAP, entre ellas la 7; la 8, de folios simultáneos, con `scripts/folio-concurrency.mjs` dentro de `pnpm test:db` y en CI). Las 8 pruebas de seguridad de §7 pasan contra pyp-dev (11-oct-2026); `pnpm db:reset` aplicado y comprobado con la API REST y la llave `anon`.

**Hecho:** T1.5 (`admin_import_products` y `scripts/import-catalog.mjs`). En pyp-dev (11-oct-2026), `pnpm db:import docs/data/catalogo-inicial.csv` dejó 56 productos y 313 variantes (tallas × colores); la segunda corrida actualizó los 56 sin duplicar nada. 17 pruebas pgTAP del importador. Las pruebas pgTAP ahora vacían las tablas al empezar (`truncate … cascade` dentro de su transacción) para no chocar con los datos de pyp-dev. Hasta T1.6 las categorías creadas por el importador usan `Talla` como nombre de la opción 1.

**Hecho:** T1.6 (`supabase/seed.sql`, desde T1.8 `supabase/seeds/base.sql` + `dev-admin.sql`: 6 ajustes, 4 textos con los textos de las pantallas y sus corchetes pendientes, 8 espacios de foto, tienda Coapa, 7 deportes, 10 categorías y 34 subcategorías con su `size_label`, 15 marcas y el admin de desarrollo `admin@pyp.test` sin contraseña en el repo). `pnpm db:setup` deja pyp-dev listo con un comando; aplicado el 11-oct-2026: 56 productos importados sobre la taxonomía de la semilla, sin crear categorías ni marcas extra. 14 pruebas pgTAP de la semilla. **Pendiente del usuario:** definir `SUPABASE_DEV_ADMIN_PASSWORD` en `.env.local` y correr `pnpm db:reset` (o `db:setup`) para poder entrar como admin.

**Hecho:** T1.7 (`packages/shared`: esquemas Zod de la solicitud de cotización con los mensajes de UI/UX §10 y el resumen "Faltan n datos…", fila del importador con las mismas reglas que `admin_import_products`, `catalog.json`, resultado del importador; folio, fechas de CDMX, normalización de texto, SKU y etiqueta de variante, enums con etiquetas y transiciones de estado; tipos `Database`/`Json`). 33 pruebas, entre ellas: las 56 filas del CSV inicial validan y dan las 313 variantes que hay en pyp-dev. Zod 4.

**Hecho:** T1.8 (`.github/workflows/db-production.yml` y `scripts/supabase-prod.mjs`; semilla dividida en `supabase/seeds/base.sql` y `dev-admin.sql`). El flujo solo corre a mano desde `main` (escribiendo `PRODUCCION`) con secretos del repositorio. Corrido el 11-oct-2026: se aplicaron las 7 migraciones, la semilla base (44 categorías, 15 marcas, 7 deportes, 1 tienda), el registro público quedó apagado en Auth y se creó el primer admin; `verify` en verde (`anon` sin privilegios y con `permission denied` en tablas base, RLS en todas, ningún `admin@pyp.test`). Los registros no muestran secretos. Producción aún no tiene productos: el catálogo se carga ahí en la fase 7. Pendiente para después: *environment* `production` con aprobación (decisión del usuario, 11-oct-2026).

**Fase 1 cumplida:** las 8 pruebas de seguridad en verde (pyp-dev y CI) y el catálogo inicial consultable desde las vistas públicas en pyp-dev.

**Hecho:** T2.1 (capa de datos del build: `packages/shared/src/build-data.ts` y `apps/web/lib/data`; `out/data/catalog.json` y `out/data/settings.json`). Con pyp-dev: 56 productos, 313 variantes, 7 deportes, 44 categorías, 15 marcas; un registro inválido detiene el build con la vista y el `id`. CI compila con la copia `apps/web/fixtures/build-data.json`. Secretos del repositorio `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` de producción cargados (12-oct-2026). Riesgo anotado: `catalog.json` pasaría de 60 KB gzip con 500 productos (se revisa en T6.3). El build no falla con el catálogo vacío (producción hoy): publica el sitio y CI lo comprueba con `fixtures/build-data-empty.json`, que desde T2.4 también deja vacíos deportes, categorías y marcas, como producción; cada página de la fase 2 muestra el estado vacío del diseño cuando no hay productos.

**Hecho:** T2.2 (header fijo con menú móvil de acordeones, mega menú de escritorio, footer y botón flotante de WhatsApp en `apps/web/components/layout`, alrededor de todas las páginas públicas). Datos desde el build: deportes, categorías, tienda, redes y WhatsApp. Navegación completa con teclado; Escape cierra los menús y devuelve el foco (pruebas de componentes y E2E en móvil y escritorio). Diferencias con el diseño anotadas en UI/UX §7.3 (glifo oficial de WhatsApp, horario sin "[HORARIO]", footer sin frase fija).

**Hecho:** T2.3 (`ProductCard`, `ProductGrid`, `SportTile`, `CategoryTile`, `VolumeNote`, `PriceSlot` y esqueletos en `apps/web/components/catalog`; cargador de anchos de R2 en `lib/images/loader.ts`; reglas de la tarjeta en `packages/shared`). Tarjetas con y sin foto, sin conteo en los accesos; hoja `/dev/catalogo`. Regla de "NUEVO" decidida en UI/UX §7.4 (30 días, nadie si más de la mitad califica). Botones `sm` con área táctil de 44 px en `outline` y `ghost`.

**Hecho:** T2.4 (listados estáticos `/catalogo`, categoría, subcategoría, deporte y marca con `ListingPage`, `Breadcrumbs` y la lógica de `packages/shared/src/listing.ts`). Con pyp-dev se generan 1 + 10 + 34 + 7 + 15 rutas, cada una con sus primeros 24 productos en el HTML (pruebas unitarias y E2E). Con el catálogo vacío, `/catalogo` muestra "Pronto verás aquí nuestros productos" y las rutas dinámicas generan solo `/…/_` (404). Corregido: en producción las vistas de deportes, categorías y marcas también están vacías; la copia vacía de CI y los menús ya lo contemplan. Pendientes anotados:
- Textos por deporte o categoría: no existen en la base (UI/UX §8.2).
- Next 16 pide la precarga por segmento como `__next.….txt`, que el export escribe en carpetas: la petición da 404 y se desperdicia, aunque la navegación funciona. Se revisa en T6.3.

**Hecho:** T2.5 (filtros con panel lateral en escritorio y hoja en móvil, orden con menú y hoja, chips activos, "Cargar más", estados cargando, sin resultados y error de red, URL sincronizada). La lógica de filtros y orden está en `packages/shared` con pruebas; las pruebas de componentes y E2E cubren filtrar, ordenar con teclado, la hoja móvil, "Cargar más", "Limpiar filtros" y abrir una URL compartida, que reproduce la vista. Se corrigió un parpadeo de las casillas mientras Next actualiza `useSearchParams`.

**Hecho:** T2.6 (búsqueda con MiniSearch en `@pyp/shared/search`; campo con sugerencias en el header, que en móvil convierte el header en el campo; `/buscar` con resultados por relevancia, filtros y orden; "¿Quisiste decir…?"; pantalla sin resultados con accesos y WhatsApp). "futbol" encuentra "Fútbol" y "valon" sugiere "balón" (pruebas unitarias, de componentes y E2E). MiniSearch se carga solo al buscar. Diferencia con el diseño anotada en TRD §7: "valon" muestra resultados con la sugerencia, en vez de la pantalla sin resultados. Pendiente: el evento `search` de analítica (T3.9).

**Hecho:** T2.7 (ficha de producto `/producto/[slug]`: una página por producto publicado (56 con pyp-dev; con el catálogo vacío, solo `/producto/_`). Lleva galería, información, opciones disponibles, especificaciones, deportes, nota de volumen, relacionados y "Preguntar por este producto". JSON-LD `Product` sin `offers` (pruebas unitarias, de componentes y E2E). La matriz de cantidades y agregar a la cotización llegan en T3.2. `NEXT_PUBLIC_SITE_URL` se agrega a `deploy.yml` con el cambio de dominio (fase 7, paso 10b).

**Hecho:** T2.8 (Inicio con portada y corte a 13°, deportes, franja de uniformes, destacados, "¿Compras para tu liga o escuela?" con los 4 pasos y la asesora, equipos (marcadores), categorías y tienda con estado abierto/cerrado, "Cómo llegar" y "Llamar"). Fotos desde `site_media` o su marcador. Pruebas de componentes y E2E; revisado contra `inicio` en móvil y escritorio.

**Fase 2 construida.** Falta su criterio de salida: el catálogo navegable en `workers.dev` con Lighthouse ≥ 90 en Inicio, un listado y una ficha. Para medirlo hay que publicar `develop` en `main`, y esa decisión es del usuario.

**Hecho:** T3.1 (lista de cotización `useQuote` con Zustand, guardada en `pyp.quote.v1` con versión; reglas de §4.1 y §4.5 en `packages/shared/src/quote-list.ts` (13 pruebas): una línea por variante, suma con tope 9 999, nota nueva que sustituye a la anterior, 100 renglones, quitar con deshacer, editar la personalización de un producto, descartar tras 30 días y marcar "No disponible". Funciona en memoria si el navegador no deja guardar. `lib/commerce` con `CartService`, `PricingService`, `CheckoutProvider`, `useCommerceMode()` y `useQuoteTotals()`. Todavía nada en la página agrega a la lista: eso llega en T3.2 y T3.3.

**Hecho:** T3.2 (matriz de cantidades en la ficha: una o dos columnas, selector de color, atajos "Equipo de 12 / 18 / 24", teclado, personalización y barra de total fija en móvil; "Agregar a mi cotización" guarda una línea por variante). Capturar 20 piezas en 4 tallas solo con teclado toma menos de 30 s (E2E). Reparto de los atajos generalizado y documentado en UI/UX §7.5.

**Hecho:** T3.3 (aviso de agregado con "Ver mi cotización" y "Seguir viendo el catálogo", `QuoteBar` en móvil, contador de piezas en el header, "+ Cotizar" en las tarjetas sin variantes y "En tu cotización" en la tarjeta). E2E: agregar desde la ficha y desde un listado, volver al listado, la barra móvil sobrevive a recargar y el botón de WhatsApp sube.

**Hecho:** T3.4 (`/cotizacion` paso 1: lista agrupada por producto con desglose, "Editar cantidades", quitar con "Deshacer" de 5 s, editor de personalización, lista vacía con deportes, productos "No disponible" que bloquean "Continuar", aviso si el navegador no guarda, indicador de pasos y resumen). Pruebas de componentes y E2E del flujo hasta "Continuar". El paso 2 es un marcador hasta T3.5.

**Siguiente paso:** T3.5 (paso 2: formulario con validación, resumen de errores, atajos de fecha y datos recordados).

### F. Pendientes acumulados (13-oct-2026)

**Del negocio o del usuario**
- ☐ Datos reales: número de WhatsApp de ventas (hoy `5500000000`), horario, teléfono, correo, coordenadas, aviso de privacidad completo, respuestas de las preguntas frecuentes de uniformes, nombre y foto de la asesora, historia de la tienda y archivos maestros del logo (ver §4.C).
- ☐ Fotos: portada, uniformes, 3 muestras de técnicas, tienda, taller, equipos y productos.
- ☐ Catálogo real a producción en la fase 7 con el importador del panel (T4.6); nunca los 56 productos de prueba.
- ☐ Descripciones, especificaciones y etiquetas de productos: hoy solo existe la descripción corta.
- ☐ Decidir si se quieren textos por deporte o categoría bajo el título de los listados (requiere una columna nueva).
- ☐ Decidir el mapa de Visítanos e Inicio: embebido o imagen.
- ☐ Definir `SUPABASE_DEV_ADMIN_PASSWORD` en `.env.local` y correr `pnpm db:setup` para entrar como `admin@pyp.test`.
- ☐ *Environment* `production` con aprobación y los secretos de Supabase (pospuesto).
- ☐ Publicar `develop` en `main` cuando se quiera revisar la fase 2 en `workers.dev` y medir Lighthouse.
- ☐ Confirmar las decisiones tomadas sin diseño ni documento:
  - Glifo oficial de WhatsApp en lugar de la burbuja del diseño.
  - Regla de "NUEVO".
  - "valon" muestra resultados con la sugerencia.
  - Accesos grandes de los deportes.
  - Grupo "Deporte" en los filtros.
  - Reparto de los atajos "Equipo de 12 / 18 / 24" en productos sin tallas CH–XG.
  - "Editar cantidades" en el paso 1 (el diseño solo muestra pastillas).
  - Footer sin la frase "Desde 1969".

**Técnicos, con tarea asignada**
- T3.5–T3.8: el formulario del paso 2, el mensaje de WhatsApp y el envío con folio (el paso 1 de `/cotizacion` ya existe).
- T3.2: matriz de cantidades, personalización y "Agregar a mi cotización" en la ficha.
- T3.9: eventos de analítica (`search`, `view_item_list`, `whatsapp_click`…).
- Fase 5: galería de "Equipos estrenando", Visítanos, Uniformes, aviso de privacidad, 404, sitemap y JSON-LD de la tienda.
- T6.3:
  - `catalog.json` pasaría de 60 KB gzip con 500 productos.
  - Next 16 pide la precarga por segmento con un nombre que el export no genera (404 desperdiciado).
  - Medir Lighthouse.
- Fase 7, paso 10b: `SITE_INDEXABLE` y `NEXT_PUBLIC_SITE_URL` en `deploy.yml`.
- Fase 7, pasos 1 y 5: hacer que el build de producción falle con el WhatsApp de ejemplo y con textos entre corchetes; todavía no está implementado.

**Técnicos menores, sin tarea**
- `has_unpublished_changes` no detecta productos borrados.
- Los nombres de las imágenes genéricas van dentro de los archivos: si se renombra una categoría hay que regenerarlas (`pnpm placeholders`).
- `prettier --check` marca unos 49 archivos por finales de línea (CRLF en Windows); conviene un `.gitattributes` con `eol=lf`.
- "Deportes" y "Marcas" en la miga de pan no tienen página propia.

## 5. Reglas vigentes que cambian cómo se construye

- **Móvil manda.** Se implementa la pantalla de 390 px y la de escritorio es la misma acomodada a lo ancho.
- **Las fotos son contenido.** Ninguna foto en el repositorio; todas se administran desde el panel.
- **Si un HTML de `design/` y `03-UI-UX.md` difieren**, se avisa y se corrige el que esté mal antes de implementar.
- **Todo dato entre corchetes o marcado ⚠️ es placeholder** y vive en la base de datos o en ajustes, nunca fijo en el código.
