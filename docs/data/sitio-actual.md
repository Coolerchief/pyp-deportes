# Sitio actual y datos semilla

> Referencia para la carga inicial, las redirecciones y la taxonomía del catálogo.
> **Regla para Claude Code:** todo dato marcado ⚠️ PLACEHOLDER es inventado y debe vivir en la base de datos o en configuración editable, **nunca fijo en el código**.

## 1. Sitio actual (pypdeportescoapa.com)

- **Plataforma:** WordPress + WooCommerce (inferido por el patrón `/producto/<slug>/`). El sitio bloquea lectores automatizados, así que el inventario se armó con resultados de búsqueda (sep-2026). Puede haber más productos de los listados.
- **Patrones de URL conocidos:**

| Patrón | Ejemplo | Destino en el sitio nuevo |
|---|---|---|
| `/` (título "Todas las categorías") | — | `/` |
| `/producto/<slug>/` | `/producto/balon-soccer-cruzeiro/` | `/producto/<slug>` (**mismo slug**) |
| `/pp-deportes/` ("Quiénes somos") | — | `/visitanos#nosotros` (Nosotros es una sección de Visítanos) |
| `/categoria-producto/<slug>/` (probable, estándar de WooCommerce) | — | `/catalogo/<categoria>` según mapa |
| Cualquier otra URL | — | `/catalogo` (301) |

- **Decisión:** los productos nuevos **conservan el slug** de WooCommerce. Así, la redirección es solo quitar la barra final y no se pierde posicionamiento.
- **Contenido encontrado:** 48 productos (ver `catalogo-inicial.csv`, columna `origen = sitio_actual`), página "Quiénes somos" con historia y marcas.
- **Hueco detectado:** el sitio actual **no muestra uniformes**, aunque es el producto estrella (Instagram @pyp_coapa sí publica uniformes de fútbol con nombre y número). Se agregaron 5 productos base de uniforme marcados como `inventado`.

## 2. Datos del negocio

| Dato | Valor | Estado |
|---|---|---|
| Nombre comercial | P&P Deportes Coapa | ✅ Real |
| Razón de ser | Empresa familiar fundada en 1969 en el Centro de la CDMX; tienda deportiva consolidada en 1990 | ✅ Real (sitio actual) |
| Sucursal | **Coapa** (única abierta en 2026; Centro cerró) | ✅ Confirmado por el cliente |
| Dirección | Calz. del Hueso 921, local 42, Col. Granjas Coapa, Alc. Tlalpan, C.P. 14330, CDMX | ✅ Real |
| Coordenadas aprox. | 19.3005, -99.1270 | ⚠️ PLACEHOLDER (verificar en Google Maps) |
| Teléfono fijo | 55 6582 2426 | ⚠️ Real en 2020, validar |
| WhatsApp de ventas | 55 0000 0000 → `wa.me/525500000000` | ⚠️ PLACEHOLDER |
| Correo | pyp_coapa@hotmail.com | ⚠️ Real en 2020, validar |
| Horario | Lun–Vie 10:00–19:00 · Sáb 10:00–17:00 · Dom cerrado | ⚠️ PLACEHOLDER |
| Instagram | @pyp_coapa | ✅ Real |
| Facebook | facebook.com/pypcoapa | ✅ Real |
| Dominio | pypdeportescoapa.com (se conserva) | ✅ Confirmado |
| Servicios extra | Punto de recolección de paquetería 99 Minutos (según directorios) | ⚠️ Validar; no se muestra en v1 |

## 3. Taxonomía inicial

### 3.1 Deportes (`sports`)

| slug | Nombre | Orden |
|---|---|---|
| futbol | Fútbol | 1 |
| basquetbol | Básquetbol | 2 |
| voleibol | Voleibol | 3 |
| box | Box | 4 |
| fitness | Fitness y gimnasio | 5 |
| natacion | Natación | 6 |
| atletismo | Atletismo | 7 |

> Béisbol aparece en la historia de la marca, pero no se encontraron productos; se agrega cuando existan (los deportes sin productos publicados no se muestran).

### 3.2 Categorías (`categories`) y subcategorías

| Orden | slug | Nombre | Subcategorías (slug) |
|---|---|---|---|
| 1 | uniformes | Uniformes | uniformes-futbol · uniformes-basquetbol · uniformes-voleibol · jerseys |
| 2 | balones | Balones | balones-futbol · balones-basquetbol · balones-voleibol |
| 3 | ropa-deportiva | Ropa deportiva | shorts · medias · pantalones · batas |
| 4 | material-entrenamiento | Material de entrenamiento | conos · platos · casacas · porterias |
| 5 | protecciones | Protecciones | espinilleras · guantes-portero · caretas |
| 6 | box-y-combate | Box y combate | guantes-box · manoplas · kits |
| 7 | fitness-y-gimnasio | Fitness y gimnasio | pesas · bandas · tapetes · pelotas · cardio |
| 8 | natacion | Natación | goggles · gorras |
| 9 | accesorios | Accesorios y arbitraje | silbatos · bombas · gafetes |
| 10 | primeros-auxilios | Primeros auxilios | pomadas · aerosoles · botiquines |

Los nombres visibles de subcategoría se derivan del slug (p. ej. `guantes-portero` → "Guantes de portero"); el importador los crea si no existen.

### 3.3 Marcas (`brands`)

ADX · Adidas · Cruzeiro · Escualo · Manríquez · Molten · **P&P (marca propia)** · Palomares · Rinat · Seyer · Spalding · Wilson.
Por validar si son marca o solo modelo: **Futre**, **Figo**, **Maravillosa**. Mencionadas en "Quiénes somos" sin productos encontrados: Nike, Garcis, Asiana.

## 4. Formato de `catalogo-inicial.csv`

Es también la **plantilla oficial del importador** (FR-M5-3). Una fila = un producto; las variantes se generan del producto cartesiano `tallas × colores`.

| Columna | Tipo | Regla |
|---|---|---|
| sku | texto | Único. Prefijo por categoría (`BAL`, `BOX`, `UNI`, `ROP`, `PRO`, `ENT`, `FIT`, `NAT`, `AUX`) + consecutivo. SKU de variante = `sku-TALLA-COLOR` normalizado |
| slug | texto | Único, minúsculas y guiones. Si existe `url_anterior`, **debe** coincidir con su slug |
| nombre | texto | Tal como se muestra |
| marca | texto | Debe existir en `brands` o se crea |
| categoria / subcategoria | slug | Deben existir o se crean |
| deportes | lista `\|` | Slugs de §3.1 |
| publico | enum | `adulto` · `infantil` · `unisex` |
| descripcion_corta | texto | Sin comas (CSV simple) |
| personalizable | `si`/`no` | |
| tecnicas | lista `\|` | `sublimacion` · `vinil` · `bordado` · `serigrafia` |
| tallas | lista `\|` | `unitalla` si no aplica |
| colores | lista `\|` | Vacío si no aplica; "A elegir" en uniformes |
| destacado | `si`/`no` | |
| estado | enum | `borrador` · `publicado` · `archivado` |
| origen | enum | `sitio_actual` · `inventado` (solo para seguimiento de la carga inicial) |
| url_anterior | URL | Para generar redirecciones 301 |

**Resumen de la carga inicial:** 56 productos (48 del sitio actual y 8 inventados). Faltan fotos; se publican con imagen genérica de categoría hasta cargar las reales desde el admin (las fotos no viven en el repositorio; TRD ADR-10).
