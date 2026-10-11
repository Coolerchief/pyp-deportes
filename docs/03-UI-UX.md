# 03 · UI/UX — Sistema visual, componentes y pantallas

> **Documento para construir.** Traduce el manual de marca a reglas de interfaz que Claude Code implementa y Claude Design dibuja.
>
> | Campo | Valor |
> |---|---|
> | Versión | 0.2 |
> | Fecha | 1-oct-2026 |
> | Fuentes | Manual de marca v1.0 (págs. citadas como *M-nn*) · `data/referencias-y-fotos.md` · `01-PRD.md` |
> | Sistema de diseño | Claude Design → "P&P Deportes Coapa": https://claude.ai/artifact/4ifFuFDAVzfqz3jxcsm1M4 (tokens, fuentes, logos y 12 componentes base) |
> | Pantallas | Claude Design → "P&P Deportes — Pantallas": https://claude.ai/artifact/RNABM6fyRY7FecT3C38Sij (46 pantallas: 24 móvil + 22 escritorio). Copia exportada en `design/` (ver §12) |
> | Logos | `docs/brand/logos/*.svg` y grupo "Logos" del sistema de diseño (12 archivos, ver §3) |
>
> **Cambios 0.1 → 0.2:** móvil manda (§1) · las fotos son contenido, no parte del front (§6) · accesos por deporte y categoría sin conteo · aviso "Agregado a tu cotización" en lugar de toast · sin drawer de cotización en escritorio · ficha sencilla para productos sin personalización · estados diseñados (vacío, cargando, sin resultados, errores, 404) · Nosotros vive dentro de Visítanos · inventario completo de pantallas (§8).

---

## 1. Principios

1. **Deporte primero.** Se entra por deporte; la categoría es el segundo nivel (referencia: BSN, Decathlon).
2. **Volumen sin fricción.** Todo está pensado para pedir 20 piezas en 4 tallas, no 1 pieza. La tabla de talla × cantidad y el total de piezas son protagonistas.
3. **WhatsApp siempre a un toque.** Botón flotante en todo el sitio público; en la ficha y la cotización es la acción final.
4. **Marca con energía, interfaz con calma.** Los elementos de marca (13°, placas, doble diagonal, patrón cancha) enmarcan; no compiten con el producto ni con los formularios.
5. **Móvil manda.** Cada pantalla se diseña primero a 390 px; la de escritorio (1440 px) es la misma pantalla acomodada a lo ancho. Un cambio en una se replica en la otra. El cliente llega desde WhatsApp e Instagram.
6. **Se ve bien sin fotos.** Las fotos son contenido que se carga desde el admin, no parte del front. La imagen genérica de categoría y los espacios `[FOTO DE …]` son estados de primera clase, no errores.
7. **Ningún callejón sin salida.** Todo estado vacío, sin resultados o de error ofrece una sola acción clara y, cuando aplica, WhatsApp.
8. **Listo para precio.** Tarjetas y ficha reservan el espacio del precio (`PriceSlot`) aunque hoy no se muestre (TRD §19).

## 2. Tokens

### 2.1 Color

Colores de marca (*M-14*) + variantes funcionales derivadas **solo** para cumplir contraste AA en texto pequeño. Contrastes calculados con la fórmula WCAG 2.1.

| Token | Valor | Uso | Contraste clave |
|---|---|---|---|
| `rojo` | `#E63323` | Rojo Arranque. CTA principal, placas, acentos, diagonales. | Blanco sobre rojo **4.32:1** → solo texto ≥ 19 px bold o ≥ 24 px (AA grande) |
| `rojo-profundo` | `#CF2C1E` | *Derivado.* Texto rojo pequeño (eyebrows, enlaces), hover/pressed del CTA. | 5.21:1 sobre blanco · 4.70:1 sobre gis |
| `noche` | `#0F1C2E` | Azul Noche. Texto principal, fondos oscuros, header, footer, CTA secundario. | 17.13:1 sobre blanco · 15.45:1 sobre gis |
| `lima` | `#D4F53C` | Lima Casaca. **Solo acento**: placa "NUEVO", diagonales sobre noche, contador de cotización, foco. Nunca fondo dominante ni texto sobre claro. | Noche sobre lima 13.81:1 · lima sobre blanco 1.24:1 ❌ |
| `gis` | `#F5F3EE` | Fondo claro principal de secciones y marcos de foto. | — |
| `blanco` | `#FFFFFF` | Fondo de página, tarjetas, texto calado. | — |
| `grafito` | `#3B4454` | Texto secundario. | 9.81:1 sobre blanco · 8.85:1 sobre gis |
| `grafito-suave` | `#5F6673` | *Derivado.* Texto terciario, ayudas de formulario, metadatos. | 5.78:1 sobre blanco · 5.21:1 sobre gis |
| `concreto` | `#9AA1AC` | Líneas decorativas y divisores. **No** para texto ni bordes de controles. | 2.60:1 sobre blanco |
| `borde-control` | `#7E8592` | *Derivado.* Borde de inputs, casillas, stepper (requiere 3:1). | 3.71:1 sobre blanco · 3.35:1 sobre gis |
| `linea` | `#E4E1D8` | Divisores suaves entre filas y tarjetas. | Decorativo |
| `exito` | `#1F7A45` | Confirmaciones ("Agregado a tu cotización"). Verde del manual (*M-19*, "Así sí"). | 5.35:1 sobre blanco |
| `whatsapp` | `#25D366` | Solo el botón de WhatsApp, con glifo y texto en `noche` (blanco sobre este verde da 1.98:1 ❌). | Noche sobre whatsapp 8.64:1 |

**Proporción por pantalla (*M-15*):** ~45 % blanco/gis · ~30 % noche · ~17 % rojo · ~8 % lima.

**Combinaciones prohibidas:** lima como texto sobre blanco o gis · rojo sobre noche en texto (3.97:1, solo titulares ≥ 24 px) · lima + rojo lado a lado en superficies grandes ("vibra y cansa la vista", *M-15*) · concreto como texto.

### 2.2 Tipografía

Familias (*M-16*): **Barlow Condensed** (titulares, precios, números, etiquetas, botones) y **Barlow** (texto). Autoalojadas con `next/font/local` desde `apps/web/app/fonts/` (`app/fonts.ts`). Pesos a cargar: Barlow Condensed 600, 700 (normal) y 600, 800, 900 (itálica); Barlow 400, 500, 600.

| Estilo | Familia · peso | Móvil | ≥ 1024 px | Interlineado | Mayúsculas / tracking | Uso |
|---|---|---|---|---|---|---|
| `display` | Condensed 900 itálica | 48 px | 80 px | 0.9 | Sí · 0 | Hero, frase de marca |
| `h1` | Condensed 900 itálica | 40 px | 56 px | 0.95 | Sí · 0 | Título de página |
| `h2` | Condensed 800 itálica | 30 px | 40 px | 1.0 | Sí · 0 | Secciones |
| `h3` | Condensed 800 itálica | 22 px | 26 px | 1.05 | Sí · 0 | Tarjetas destacadas, bloques |
| `h4` | Condensed 700 | 18 px | 20 px | 1.1 | Sí · 0.02em | Subtítulos, nombre en tarjetas grandes |
| `eyebrow` | Condensed 700 | 13 px | 13 px | 1.2 | Sí · 0.15em | Etiqueta sobre títulos (en `rojo-profundo`) |
| `button` | Condensed 700 | 19 px | 19 px | 1 | Sí · 0.04em | Botones (≥ 19 px para cumplir AA grande sobre rojo) |
| `number` | Condensed 900 itálica | 28 px | 36 px | 1 | Sí · 0 | Totales de piezas, folio, futuros precios |
| `body-lg` | Barlow 400 | 18 px | 18 px | 1.45 | No | Introducciones |
| `body` | Barlow 400 | 16 px | 16 px | 1.45 | No | Texto general, formularios |
| `body-strong` | Barlow 600 | 16 px | 16 px | 1.45 | No | Nombres de producto en tarjetas |
| `small` | Barlow 400 | 14 px | 14 px | 1.4 | No | Metadatos, ayudas |
| `caption` | Barlow 500 | 12 px | 12 px | 1.35 | No | Leyendas, legales (mínimo absoluto) |

Reglas: titulares siempre en mayúsculas e itálica (*M-17*, regla 05); texto siempre en tipo oración; nunca párrafos en mayúsculas (*M-21*).

### 2.3 Espaciado, radios, sombras y movimiento

| Familia | Tokens |
|---|---|
| Espaciado (base 4) | `space-1` 4 · `space-2` 8 · `space-3` 12 · `space-4` 16 · `space-6` 24 · `space-8` 32 · `space-12` 48 · `space-16` 64 · `space-24` 96 (px) |
| Radios | `radius-0` 0 (por defecto: placas, botones, tarjetas, imágenes) · `radius-sm` 2 px (inputs, chips) · `radius-full` 9999 (solo FAB de WhatsApp y avatares) |
| Sombras | `shadow-card` `0 1px 2px rgb(15 28 46 / .08)` · `shadow-float` `0 8px 24px rgb(15 28 46 / .18)` (hojas, avisos, FAB, barra de cotización) |
| Movimiento | `ease-brand` `cubic-bezier(.2,.8,.2,1)` · 150 ms (hover/estado) · 250 ms (hojas y menús) · respetar `prefers-reduced-motion` |
| Ángulo | `angle-brand` 13° · `tan13` ≈ 0.2309 (desplazamiento horizontal = alto × 0.2309) |

### 2.4 Rejilla y breakpoints

| Breakpoint | Ancho | Columnas | Margen lateral | Canal |
|---|---|---|---|---|
| base | 360–639 | 4 | 16 px | 12 px |
| `sm` | 640 | 8 | 24 px | 16 px |
| `lg` | 1024 | 12 | 32 px | 24 px |
| `xl` | 1280 | 12 | auto (contenedor 1216 px) | 24 px |

Cuadrícula de productos: 2 columnas en móvil · 3 en `sm` · 4 en `lg` (con filtros laterales: 3).

### 2.5 Implementación (Tailwind v4)

```css
@theme {
  --color-rojo: #E63323;          --color-rojo-profundo: #CF2C1E;
  --color-noche: #0F1C2E;         --color-lima: #D4F53C;
  --color-gis: #F5F3EE;           --color-blanco: #FFFFFF;
  --color-grafito: #3B4454;       --color-grafito-suave: #5F6673;
  --color-concreto: #9AA1AC;      --color-borde-control: #7E8592;
  --color-linea: #E4E1D8;         --color-exito: #1F7A45;
  --color-whatsapp: #25D366;
  --font-display: "Barlow Condensed", "Arial Narrow", Arial, sans-serif;
  --font-sans: "Barlow", Arial, sans-serif;
  --radius-sm: 2px;
  --shadow-card: 0 1px 2px rgb(15 28 46 / .08);
  --shadow-float: 0 8px 24px rgb(15 28 46 / .18);
  --ease-brand: cubic-bezier(.2,.8,.2,1);
}
```

Implementado en `apps/web/app/globals.css`:

- Colores con `@theme static` y `--color-*: initial`: la paleta por defecto de Tailwind no existe, solo los 13 tokens (`bg-rojo`, `text-noche`…).
- Espaciado: la escala por defecto de Tailwind (base 4 px) ya coincide con `space-N` (`p-4` = 16 px, `gap-6` = 24 px).
- Los 13 estilos de texto son utilidades `type-<estilo>` (`type-display`, `type-h1`… `type-caption`), con tamaño móvil y el de escritorio a partir de `lg`.
- `container-page`: márgenes de 16/24/32 px y contenedor de 1216 px desde `xl` (§2.4).
- Base: `body` con `type-body`, `bg-blanco` y `text-noche`; foco visible global (anillo `lima` de 3 px con contorno `noche`); `prefers-reduced-motion` anula animaciones.
- Utilidades de marca: `placa` (recorte a 13° con `--placa-o`) y `cancha` (franjas del PatrónCancha; se combina con `bg-noche` o `bg-rojo`). Se usan a través de `components/brand`.
- `app/theme.test.ts` compara el tema con `design/tokens/tokens.json`. Las hojas de muestra están en `/dev/tokens` y `/dev/marca` (solo con `pnpm dev`).

Solo tema claro en v1 (el header, footer y secciones oscuras usan `noche` como superficie, no un modo oscuro). Respaldo tipográfico según el manual: Arial Narrow para titulares y Arial para texto (*M-16*).

## 3. Logotipo en la interfaz

| Archivo | Uso en el sitio |
|---|---|
| `logo-horizontal-negativo.svg` | Header (fondo noche), footer |
| `logo-horizontal-positivo.svg` | Documentos, cabecera del admin, OG sobre gis |
| `logo-vertical-*.svg` | Footer, portada de redes |
| `monograma-positivo.svg` / `-mono-blanco.svg` | Favicon (sobre rojo), header compacto al hacer scroll en móvil, marca de agua en imágenes genéricas, etiqueta de nuca en fotos de uniformes |

- **Tamaños mínimos (*M-10*):** horizontal 120 px de ancho · vertical 80 px · monograma 32 px. En el header móvil el logo horizontal va a ≥ 140 px; si no cabe, monograma.
- **Área de protección:** 5x (media altura de la placa) libre alrededor.
- **Regla de fondo (*M-12*):** claro → positivo; oscuro → negativo; rojo → mono blanco; lima → mono noche.
- ⚠️ **Los SVG están reconstruidos** con la construcción de *M-9* y medidas tomadas del PDF, con texto convertido a curvas (Barlow Condensed). Se reemplazan por los archivos maestros del diseñador en cuanto existan. Script: `docs/brand/build_logos.py`. El sitio sirve copias en `apps/web/public/brand/` a través del componente `Logo`, que no baja de los tamaños mínimos.

## 4. Elementos gráficos de marca (*M-18*)

| Componente | Implementación | Dónde se usa | Límite |
|---|---|---|---|
| **DobleDiagonal** | Dos barras (fina 0.6 u + gruesa 1.1 u, separación 0.55 u) inclinadas 13°, en SVG inline | Viñeta de títulos de sección, cierre de página (junto al número de página como en el manual), separador del footer | Siempre en par, siempre 13° |
| **PatrónCancha** | `repeating-linear-gradient` a 13° de la vertical (≈ `103deg`) con franjas en blanco al 5–15 % de opacidad | Fondo del hero, franja de "Uniformes a tu medida", pantalla de confirmación, imagen genérica de categoría | Solo sobre noche o rojo |
| **Placa** | `clip-path: polygon(var(--o) 0, 100% 0, calc(100% - var(--o)) 100%, 0 100%)` con `--o = alto × 0.2309` | Botones, badges ("NUEVO", "PERSONALIZABLE"), chips de filtro activos, contador de cotización | Texto en Condensed Bold mayúsculas |
| **CorteA13** | Un lado inclinado + diagonal roja paralela. Escritorio: lado izquierdo a 13°. Móvil: borde superior más suave, ≈7° (48 px de caída a 390 px), como en `design/screens/movil/`, porque a 13° la foto de 210 px perdería casi la mitad | Foto del hero de Inicio y de Uniformes a tu medida | **Máximo uno por pantalla** |

## 5. Iconografía

- **Lucide** (trazo 2 px, esquinas redondeadas mínimas) en `noche`/`grafito`; tamaños 20 y 24 px.
- Íconos mínimos: buscar, menú, cerrar, filtro, flecha, más/menos, basura, lápiz (personalizar), ubicación, reloj, teléfono, check, alerta, imagen.
- **WhatsApp:** glifo oficial en `noche` sobre `whatsapp`, siempre acompañado de texto excepto en el FAB (que lleva `aria-label`).
- Íconos de deporte: **no** se usan pictogramas genéricos; los accesos por deporte usan foto o imagen genérica con PatrónCancha + nombre del deporte en `h3`.

## 6. Fotografía e imágenes

- **Las fotos son contenido, no parte del front.** Ninguna foto vive en el repositorio ni en el build: se suben desde el admin al almacenamiento (R2) y el sitio solo recibe su dirección. En el repositorio solo hay logos e imágenes genéricas.
- **Proporción estándar 4:5 vertical** en tarjetas, fichas y galería de equipos. Marco `gis`, `object-fit: cover`, sin bordes redondeados.
- **Imagen genérica de categoría** (producto sin foto): fondo `noche` con PatrónCancha, monograma mono blanco al 30 % del ancho y el nombre de la categoría en `eyebrow` lima. Una por categoría (10). En la ficha lleva debajo el texto "Foto próximamente".
- **Espacios de foto del sitio** (no son de producto): mientras no haya foto se muestran sobre `gis` con la DobleDiagonal en `concreto` y su nombre entre corchetes. Cada uno es un espacio editable en el admin (`site_media`, TRD §6.2):

| Espacio | Dónde aparece | Proporción |
|---|---|---|
| `[FOTO DE PORTADA]` | Hero de Inicio, con corte a 13° | Móvil ≈ 390 × 210 · escritorio: mitad derecha del hero |
| `[FOTO DE UNIFORMES]` | Hero de Uniformes a tu medida | Igual que portada |
| `[FOTO DE MUESTRA]` × 3 | Técnicas: sublimación, vinil textil, bordado | 16:10 |
| `[FOTO DEL EQUIPO con autorización]` | Galería de equipos e Inicio | 4:5 |
| `[FOTO DE LA TIENDA]`, `[FOTO DEL TALLER]` | Nosotros (dentro de Visítanos) | 4:3 |
| Foto de la asesora | AdvisorCard (Inicio y Uniformes) | 1:1; sin foto se muestran sus iniciales |
| `[MAPA]` | Visítanos e Inicio | Libre (mapa embebido o imagen) |

- Productos sin foto se marcan en el admin con una placa "SIN FOTO" (no en el sitio público).
- Nunca texto sobre caras (*M-27*). No usar fotos con logos de terceros más grandes que el nuestro (*M-19*).

## 7. Componentes

Cada componente lista **anatomía → variantes → estados → reglas**. Nombres en inglés en código.

### 7.1 Acciones

**Button**
- Variantes: `primary` (fondo `rojo`, texto blanco, forma Placa) · `secondary` (fondo `noche`, texto blanco, Placa) · `outline` (borde 2 px `noche`, texto noche, rectangular) · `ghost` (texto `rojo-profundo` subrayado al hover) · `whatsapp` (fondo `whatsapp`, glifo y texto `noche`, Placa).
- Tamaños: `lg` 56 px alto (CTA principal de ficha y cotización) · `md` 48 px · `sm` 40 px. Área táctil mínima 44 × 44.
- Estados: hover (`rojo` → `rojo-profundo`; `noche` → `grafito`) · focus (anillo 3 px `lima` + 2 px `noche` por fuera, visible en fondo claro y oscuro) · active (translateY 1 px) · disabled (40 % opacidad, sin sombra) · loading (spinner + texto "Enviando…").
- Nota WhatsApp: texto y glifo `noche` sobre `#25D366` (8.64:1). Etiqueta: "Enviar por WhatsApp" / "Escríbenos".

**WhatsAppFab** — círculo 56 px con glifo `noche` 28 px, `shadow-float`, abajo a la derecha (16 px de margen; se eleva 72 px cuando la QuoteBar está visible). En escritorio es una píldora de 56 px de alto con glifo y el texto "¿Dudas? Escríbenos", a 32 px del borde. Se oculta en `/cotizacion` (ahí la acción ya es WhatsApp) y en `/admin`.

### 7.2 Etiquetas

**Badge (Placa)** — alto 24 px, texto `eyebrow` 12 px.
| Variante | Fondo / texto | Uso |
|---|---|---|
| `new` | lima / noche | "NUEVO" (máx. 1 por tarjeta) |
| `custom` | rojo / blanco (texto 12 px bold: solo decorativo; el mismo dato está en texto accesible en la ficha) | "PERSONALIZABLE" |
| `info` | noche / blanco | "ENVÍO A ACORDAR", "POR VOLUMEN" |

En las pantallas los badges miden 22 px de alto con texto de 11 px; en código se usa el componente del sistema (24 px / 12 px).

**Chip de filtro** — `radius-sm`, borde `borde-control`; activo = Placa `noche` con texto blanco y "×".

### 7.3 Navegación

**Header** (fondo `noche`, fijo)
- **Móvil (64 px):** menú (hamburguesa) · logo horizontal negativo · buscar · QuoteButton (ícono de lista con contador en Placa `lima`).
- **Escritorio (72 px):** logo · "Deportes ▾" · "Categorías ▾" · Uniformes · Equipos · Visítanos · buscador (input "Busca en el catálogo", ocupa el espacio libre) · "Mi cotización" con contador. La sección activa lleva un subrayado inferior de 4 px (`rojo` en páginas, `lima` con el menú abierto).
- Al hacer scroll hacia abajo en móvil el header se compacta a 56 px (logo → monograma).

**QuoteButton** — contador con el total de **piezas** (no de líneas) en Placa `lima`. `aria-label="Mi cotización, 42 piezas"`. Sin piezas, el ícono va solo. En móvil y escritorio lleva a `/cotizacion` (paso 1). **No hay drawer de cotización.**

**MobileMenu** (`menu`, `menu-categorias`) — pantalla completa bajo el header (el ícono cambia a "×"). Lista en `h3`: Inicio · **Deportes** (acordeón: 7 deportes en 2 columnas + "Ver todo") · **Categorías** (acordeón: 10 categorías + "Ver todo") · Uniformes a tu medida · Equipos estrenando · Visítanos. Solo un acordeón abierto a la vez. Pie `noche`: botón whatsapp "Cotiza por WhatsApp", botón outline "Mi cotización", horario y teléfono.

**MegaMenu** (escritorio, `menu`) — panel blanco bajo el header con velo `noche` 60 % sobre la página: columna Deportes (7) · columna Categorías (10 en 2 columnas + "Ver todo el catálogo →") · tarjeta PatrónCancha "Uniformes a tu medida" con el mensaje clave y "Conoce el servicio". "Deportes" y "Categorías" abren el mismo panel.

**Breadcrumbs** — `small`, `grafito-suave`, separador "/"; en móvil solo el nivel anterior ("‹ Balones").

**Footer** (PatrónCancha sobre `noche`) — logo vertical negativo · dirección, horario y teléfono (desde `stores`) · enlaces (Catálogo, Uniformes, Equipos estrenando, Nosotros → `/visitanos#nosotros`, Aviso de privacidad) · redes · DobleDiagonal `lima` de cierre · "© 2026 P&P Deportes Coapa". En escritorio, 4 columnas.

### 7.4 Catálogo

**SportTile** — imagen 4:5 (genérica o foto), degradado `noche` abajo y el nombre del deporte en `h3` blanco. **Sin conteo de productos.** Carrusel horizontal con *scroll-snap* en móvil; 7 columnas en escritorio.

**CategoryTile** — bloque PatrónCancha con el nombre en `h3` y flecha `lima`. **Sin conteo.** 2 columnas en móvil, 5 en escritorio.

**ProductCard**
- Anatomía: imagen 4:5 (marco gis) · badges arriba a la izquierda (máx. 2) · marca (`eyebrow` grafito-suave) · nombre (`body-strong`, 2 líneas máx.) · meta ("6 tallas · 3 colores", `small`) · `PriceSlot` (vacío en modo catálogo) · acción.
- Acción: producto **sin variantes** → botón `sm` outline "+ Cotizar" (agrega 1 y muestra el aviso de agregado); **con variantes** → "Ver tallas" y toda la tarjeta lleva a la ficha.
- Destino: producto **personalizable** → ficha completa (tallas + personalización); producto **no personalizable** (un balón) → ficha sencilla con cantidad por tamaño.
- Estados: hover (imagen scale 1.03, 250 ms) · focus visible en toda la tarjeta · "En tu cotización" (check `exito` + piezas agregadas) · **cargando** (tarjeta esqueleto con la misma proporción: imagen `gis`, líneas `linea`).
- El alto de la tarjeta no cambia al activar precios (el `PriceSlot` reserva 0 px hoy y se diseña para 24 px).

**ProductGrid** — encabezado: título `h1`, descripción, dos accesos grandes en páginas de deporte, chips de subcategoría. Barra: "Filtrar (n)" + conteo ("28 productos" / "Cargando…") + ordenar. Chips de filtros activos debajo (Placa `noche` con "×"). Paginación "Mostrando 8 de 28" + "Cargar más" (24).

**FilterPanel** (`catalogo-filtros`) — móvil: hoja inferior sobre velo. Escritorio: panel lateral fijo de 264 px con "Limpiar". Grupos colapsables: Personalizable, Categoría, Marca ("Ver n marcas más"), Para. Casillas con conteo. Pie de la hoja: "Limpiar" (ghost) + "Ver 6 productos" (primary).

**SortControl** (`catalogo-ordenar`) — móvil: hoja inferior "Ordenar por" con radios. Escritorio: menú desplegable bajo "Ordenar por". Opciones: **Destacados · Más nuevos · Nombre: A a la Z · Marca: A a la Z**. En búsqueda, además "Relevancia" (por defecto). Sin orden por precio mientras el sitio no muestre precios.

**SearchBar / resultados** (`busqueda`) — móvil: al tocar buscar, el header se vuelve un campo con "‹" y "×". Resultados: `h1` "Resultados para “balón”" + conteo + chips de categoría + cuadrícula + bloque "¿No encuentras lo que buscas?" con "Pregunta por WhatsApp".

**VolumeNote** — franja `gis` con DobleDiagonal: "¿Compras para tu liga o escuela? Precio especial por volumen. Arma tu lista y te cotizamos por WhatsApp." Una vez por listado y en cada ficha. En escritorio incluye el botón "Hablar con un asesor".

### 7.5 Ficha de producto

Dos variantes de la misma página:

| | Ficha completa (`ficha-uniforme`) | Ficha sencilla (`ficha-balon`) |
|---|---|---|
| Cuándo | Producto personalizable | Producto no personalizable |
| Matriz | "Cantidad por talla" + atajos "Equipo de 12 / 18 / 24" | "Cantidad por tamaño" (o talla), sin atajos |
| Personalización | Casilla "Quiero personalizarlo" + texto (500) | No aparece |
| Relacionados | "Completa el uniforme" | "También te puede interesar" |

**ProductGallery** — móvil: imagen 4:5 a todo el ancho. Escritorio: miniaturas verticales (88 px) + imagen principal. Sin foto: imagen genérica + "Foto próximamente".

**VariantMatrix** (componente crítico, FR-M2-2)
- Fila: etiqueta (Condensed 700, 18 px) · stepper (− [input 56 px] +, 44 px de alto) · subtotal ("6 pzs" o "—").
- Móvil: una columna. Escritorio: **dos columnas**, para ver 10 tallas sin scroll.
- Con dos dimensiones (color y talla): selector de color arriba → tallas de ese color; el resumen muestra piezas por color.
- **Barra de total:** "Total" + número en estilo `number` + botón primary "Agregar a mi cotización". Con 0 piezas, el botón se sustituye por "Indica cuántas piezas necesitas por talla". En móvil es fija al borde inferior mientras se ve la ficha; en escritorio va bajo la matriz sobre `gis`.
- Teclado: Tab entre inputs; ↑/↓ suman o restan; máximo 9 999 por fila.

**ProductInfo** — orden: badges · marca · nombre · SKU · descripción corta · VariantMatrix · personalización · "Preguntar por este producto" (whatsapp) · Especificaciones (tabla) · "Para: Fútbol" (chips) · VolumeNote · relacionados.

### 7.6 Cotización

**AddedNotice** (`ficha-agregado`) — sustituye al toast. Móvil: hoja inferior sobre velo. Escritorio: aviso anclado bajo "Mi cotización", con borde superior `lima`. Contenido: check en círculo `lima` + "Agregado a tu cotización" · producto con miniatura, SKU, "con personalización" si aplica, piezas y desglose por talla · "Tu lista: 3 productos · 42 piezas" · **"Ver mi cotización"** (primary) y **"Seguir viendo el catálogo"** (outline). Se cierra con "×", Escape o tocando el velo. `aria-live="polite"`.

**QuoteBar** (solo móvil) — barra fija inferior `noche`, visible con 1 pieza o más y fuera de `/cotizacion`: "Mi cotización · 3 productos · 42 piezas" + botón "Ver". El botón flotante de WhatsApp sube 72 px mientras está visible.

**StepIndicator** — tres Placas: "1 · Tu lista", "2 · Tus datos", "3 · Enviar". Activa `noche`, completada `lima`, pendiente `gis`.

**QuoteLine** — miniatura 64 px 4:5 · nombre (enlace) · SKU · total de piezas · desglose por variante en pastillas ("CH × 3") · bloque de personalización sobre `gis` con ícono de lápiz y "Editar" · quitar (ícono de basura).

**PersonalizationEditor** (`cotizacion-editar-personalizacion`) — móvil: hoja inferior. Escritorio: ventana centrada. Producto + "¿Cómo lo quieres?" (textarea con contador "63 / 500") + nota "Te enviamos una prueba digital antes de producir." + "Quitar personalización" (enlace con basura) + "Cancelar" (ghost) y "Guardar" (primary).

**QuoteForm** (paso 2)
- Campos en este orden: Nombre* · WhatsApp* (prefijo fijo "+52", 10 dígitos) · Soy… * (4 opciones en placas) · Nombre del equipo o institución · ¿Para cuándo lo necesitas?* (fecha + atajos "Esta semana / 2 semanas / 1 mes") · Entrega (Recoger en tienda Coapa · Envío, lo acordamos por WhatsApp) · ¿Requieres factura? · Nota general · Aviso de privacidad*.
- Móvil: resumen colapsable arriba ("3 productos · 42 piezas"). Escritorio: formulario a la izquierda y panel "Tu lista" a la derecha con total y botón de envío.
- **Errores** (`cotizacion-2-datos-errores`): resumen arriba con borde 2 px `rojo-profundo` e ícono ("Faltan 3 datos para enviar tu cotización: nombre, WhatsApp y aviso de privacidad.") + cada campo con borde 2 px `rojo-profundo` y mensaje con ícono, que sustituye a la ayuda. La casilla del aviso también marca error. Nunca solo color. El foco va al resumen.
- Botón final: whatsapp lg "Enviar cotización por WhatsApp". Debajo: "Te contestamos en horario de tienda. Tu lista se guarda aunque cierres esta página."

**QuoteSummary** (escritorio, paso 1) — panel "Resumen" sobre `gis`: productos, total en `number`, "Continuar" y la nota de guardado.

**QuoteConfirmation** (`cotizacion-3-confirmacion`) — PatrónCancha: eyebrow lima "SOLICITUD ENVIADA" · `display` "¡LISTO!" · folio en Placa lima con botón copiar · "Te contestamos por WhatsApp en horario de tienda. Si WhatsApp no se abrió, toca el botón." · "Abrir WhatsApp" (whatsapp lg) · "Seguir viendo el catálogo" (outline blanco) · "Vaciar mi lista" (ghost lima). Variante **sin folio** (fallback): mismo diseño sin la placa de folio y con el titular "Tu lista está lista para enviarse".

### 7.7 Contenido

**SectionHeader** — eyebrow `rojo-profundo` + `h2` + DobleDiagonal opcional + enlace "Ver todo →".
**TeamGalleryGrid** — 2 columnas en móvil, 4 en escritorio; pie "Equipo · Deporte · Año"; filtro por deporte en chips; "Cargar más".
**StoreInfo** — mapa · dirección · estado "Abierto ahora · cierra 19:00" (America/Mexico_City) · "Cómo llegar" (secondary) y "Llamar" (outline) · referencias para llegar.
**HowItWorks** — 4 pasos numerados en Condensed 900 itálica rojo (01–04): Elige → Cotiza → Aprueba → Recibe.
**AdvisorCard** — avatar con iniciales, nombre y cargo ("Asesora de uniformes"), frase y botón WhatsApp "Escríbele a Ana". ⚠️ Datos placeholder.
**Checklist** — lista con check `rojo` (sobre claro) o `lima` (sobre noche).
**FAQ** — lista de pregunta (`h4`) y respuesta; sin acordeón en v1.

### 7.8 Estados y avisos

| Estado | Pantalla | Regla |
|---|---|---|
| Vacío | `cotizacion-vacia`, `catalogo-sin-resultados` | Bloque `gis` centrado con DobleDiagonal `concreto`, titular `h4`, una línea y **una** acción primaria ("Ver catálogo", "Limpiar filtros"). La cotización vacía añade accesos por deporte |
| Búsqueda sin resultados | `busqueda-sin-resultados` | Titular con lo buscado, corrección sugerida ("¿Quisiste decir **balón**?"), accesos por deporte y por categoría, y cierre "Pregunta por WhatsApp" |
| Cargando catálogo | `catalogo-cargando` | Tarjetas esqueleto en la misma rejilla y el texto "Cargando productos…"; el contador dice "Cargando…". Los filtros y el encabezado ya están pintados |
| Error de formulario | `cotizacion-2-datos-errores` | Ver QuoteForm |
| Error de envío | — | Nunca bloquea: se abre WhatsApp sin folio (TRD §6.4) |
| Página no encontrada | `404` | PatrónCancha, eyebrow "Error 404", titular "¡Fuera de lugar!", salidas a inicio, catálogo y búsqueda |
| Hojas y ventanas | varias | Móvil: tareas cortas en hoja inferior sobre velo `noche` 60 % (filtros, ordenar, personalización, agregado). Escritorio: panel lateral (filtros), menú desplegable (ordenar), ventana centrada (personalización), aviso bajo "Mi cotización" (agregado). *Focus trap*, Escape y retorno del foco |

## 8. Pantallas públicas

Inventario completo. **Archivo** = nombre en `design/screens/{movil,escritorio}/<archivo>.html` y `design/screenshots/…/<archivo>.png`. Las de móvil mandan.

| Ruta de la app | Pantalla | Archivo | Móvil | Escritorio |
|---|---|---|---|---|
| `/` | Inicio | `inicio` | ✅ | ✅ |
| (overlay) | Menú · Deportes abierto | `menu` | ✅ | ✅ (mega menú) |
| (overlay) | Menú · Categorías abierto | `menu-categorias` | ✅ | — (mismo mega menú) |
| `/catalogo`, `/catalogo/[categoria]`, `/deporte/[deporte]`, `/marca/[marca]` | Listado (ejemplo: Fútbol) | `catalogo` | ✅ | ✅ |
| (overlay) | Filtros | `catalogo-filtros` | ✅ | — (panel lateral dentro de `catalogo`) |
| (overlay) | Ordenar | `catalogo-ordenar` | ✅ | ✅ |
| (estado) | Listado sin resultados | `catalogo-sin-resultados` | ✅ | ✅ |
| (estado) | Listado cargando | `catalogo-cargando` | ✅ | ✅ |
| `/buscar?q=` | Resultados de búsqueda | `busqueda` | ✅ | ✅ |
| (estado) | Búsqueda sin resultados | `busqueda-sin-resultados` | ✅ | ✅ |
| `/producto/[slug]` | Ficha completa (personalizable) | `ficha-uniforme` | ✅ | ✅ |
| `/producto/[slug]` | Ficha sencilla | `ficha-balon` | ✅ | ✅ |
| (overlay) | Agregado a la cotización | `ficha-agregado` | ✅ | ✅ |
| `/cotizacion` | Paso 1 · Tu lista | `cotizacion-1-lista` | ✅ | ✅ |
| (estado) | Lista vacía | `cotizacion-vacia` | ✅ | ✅ |
| (overlay) | Editar personalización | `cotizacion-editar-personalizacion` | ✅ | ✅ |
| `/cotizacion?paso=2` | Paso 2 · Tus datos | `cotizacion-2-datos` | ✅ | ✅ |
| (estado) | Paso 2 con errores | `cotizacion-2-datos-errores` | ✅ | ✅ |
| `/cotizacion?enviada=<folio>` | Paso 3 · Confirmación | `cotizacion-3-confirmacion` | ✅ | ✅ |
| `/uniformes-personalizados` | Uniformes a tu medida | `uniformes` | ✅ | ✅ |
| `/equipos` | Equipos estrenando | `equipos` | ✅ | ✅ |
| `/visitanos` | Visítanos (incluye Nosotros) | `visitanos` | ✅ | ✅ |
| `/aviso-de-privacidad` | Aviso de privacidad | `aviso-de-privacidad` | ✅ | ✅ |
| `not-found` | Página no encontrada | `404` | ✅ | ✅ |

Sin diseñar todavía (se resuelven con los mismos componentes): página de marca con logo, confirmación sin folio, header compacto al hacer scroll, ficha con dos dimensiones (color y talla).

### 8.1 Inicio
1. Header.
2. **Hero** (PatrónCancha): eyebrow lima "P&P DEPORTES COAPA · DESDE 1969" · `display` "TU EQUIPO EMPIEZA **AQUÍ.**" (AQUÍ en rojo) · "Uniformes a la medida y todo para entrenar. Precio especial para ligas, escuelas y equipos." · "Ver catálogo" (primary lg) + "Cotiza por WhatsApp" (whatsapp lg) · `[FOTO DE PORTADA]` con corte a 13° y diagonal roja (único corte de la pantalla). En escritorio la foto ocupa la mitad derecha.
3. **Entra por tu deporte**: SportTiles (sin conteo).
4. **Uniformes a tu medida** (franja `noche` con PatrónCancha, no roja: el blanco pequeño no cumple contraste sobre `rojo`): "TU NOMBRE. TU NÚMERO. **TU EQUIPO.**" (última línea en lima), 3 puntos con check lima y "Conoce el servicio". En escritorio, a la derecha, tres piezas escalonadas (01 Jersey, 02 Short, 03 Medias).
5. **Destacados**: carrusel de ProductCards en móvil, 4 columnas en escritorio.
6. **¿Compras para tu liga o escuela?** (gis): HowItWorks + AdvisorCard.
7. **Equipos estrenando**: 4 fotos + "Ver galería".
8. **Categorías**: 10 CategoryTiles.
9. **Visítanos en Coapa**: mapa, dirección, estado abierto/cerrado, "Cómo llegar" y "Llamar".
10. Footer.

### 8.2 Listado
Breadcrumb · `h1` + descripción · en páginas de deporte, dos accesos grandes ("Uniformes de fútbol", "Equipo de entrenamiento") · chips de subcategoría (scroll horizontal) · barra de filtrar/conteo/ordenar · chips de filtros activos · ProductGrid (2 columnas móvil; 3 con panel lateral en escritorio) · VolumeNote tras la primera tanda · "Cargar más" · Footer.

### 8.3 Ficha
Ver §7.5. En móvil la barra de total queda fija abajo; al agregar se abre el AddedNotice.

### 8.4 Uniformes a tu medida
1. Hero: eyebrow "UNIFORMES A TU MEDIDA" · "TU NOMBRE. TU NÚMERO. TU EQUIPO." · texto · "Ver uniformes" + "Cotiza por WhatsApp" · `[FOTO DE UNIFORMES]`.
2. **Todo del mismo proveedor**: Uniforme completo · Personalización · Todas las tallas (ícono + título + línea).
3. **Tres técnicas**: Sublimación, Vinil textil, Bordado, cada una con `[FOTO DE MUESTRA]` y para qué conviene.
4. **De tu lista a la cancha**: HowItWorks.
5. **Ten esto a la mano**: Checklist (deporte y número de jugadores · cantidades por talla · colores · escudo en foto o archivo · fecha) + "Arma tu lista".
6. **Preguntas frecuentes**: pedido mínimo `[PEDIDO MÍNIMO]` · entrega `[TIEMPO DE ENTREGA]` · reposiciones `[CONDICIONES DE REPOSICIÓN]` · factura.
7. **¿Listo para cotizar?**: AdvisorCard.

### 8.5 Equipos estrenando
`h1` + línea · chips por deporte · TeamGalleryGrid + "Cargar más" · cierre PatrónCancha "¿Ya estrenaron uniforme?" con "Enviar foto" (whatsapp) y "Cotiza tu uniforme" (outline).

### 8.6 Mi cotización
StepIndicator siempre visible. Paso 1: QuoteLines + "+ Seguir agregando productos" + total + "Continuar". Paso 2: QuoteForm. Paso 3: QuoteConfirmation. Los pasos son estados de la misma página.

### 8.7 Visítanos (incluye Nosotros)
Mapa + dirección + estado + "Cómo llegar" / "Llamar" + `[REFERENCIAS PARA LLEGAR Y ESTACIONAMIENTO]` · **Horario** (tabla por día) · **Contacto** (WhatsApp, teléfono, Instagram, Facebook como filas con flecha) · **Nosotros** (ancla `#nosotros`, sobre `gis`): "Desde 1969", descripción, `[HISTORIA DE LA TIENDA]`, `[FOTO DE LA TIENDA]` y `[FOTO DEL TALLER]`. No existe una página `/nosotros` aparte.

### 8.8 Aviso de privacidad
`h1` + "Última actualización: [FECHA]" + 7 secciones numeradas: Quién es responsable · Qué datos pedimos · Para qué los usamos · Con quién los compartimos · Tus derechos (ARCO) · Cambios a este aviso · Contacto. Los textos entre corchetes los completa el cliente o su abogado.

### 8.9 Página no encontrada
Ver §7.8.

## 9. Panel de administración `/admin`

Sistema visual: **shadcn/ui** con los tokens de §2 (fuente Barlow, primario `noche`, destructivo `rojo-profundo`, radios 2 px). Sin PatrónCancha ni cortes: el admin es herramienta. Móvil primero (el personal sube fotos desde la tienda). **Aún sin pantallas en Claude Design** (ver §12).

| Pantalla | Contenido clave |
|---|---|
| Login | Logo positivo, correo + contraseña, "Enviar enlace mágico" |
| Inicio | Tarjetas: solicitudes nuevas (número grande), solicitudes de la semana, productos sin foto, "Cambios sin publicar" + botón **Publicar cambios** con estado del último build |
| Productos | Tabla (escritorio) / lista (móvil) con miniatura, nombre, SKU, categoría, estado (Borrador/Publicado/Archivado), "SIN FOTO"; búsqueda y filtros; acciones: nuevo, importar |
| Editor de producto | Secciones: Básico · Clasificación (categoría, deportes, público, marca) · Variantes (tallas × colores con generador y SKU automático) · Fotos (arrastrar/soltar o cámara, **recorte 4:5**, reordenar, texto alternativo) · Personalización · **Comercial (oculto en el sitio)**: precio, escalas por volumen, existencias · Vista previa (ProductDetail real) · Guardar / Publicar |
| Importar | Paso 1 descargar plantilla / subir CSV-XLSX → Paso 2 vista previa con errores por fila → Paso 3 resultado · subida de fotos en lote por SKU |
| Solicitudes | Lista con folio, fecha, cliente, tipo, piezas, estado · filtros por estado y fecha · exportar CSV |
| Detalle de solicitud | Datos del cliente, líneas, notas, historial de estados, nota interna, "Abrir chat" (wa.me al cliente) y cambio de estado en un toque (Nueva → En atención → Cotizada → Ganada/Perdida con motivo) |
| Galería | Subir foto, datos del equipo, **casillas de consentimiento obligatorias**, vincular productos, publicar |
| **Fotos del sitio** | Un espacio por cada foto de §6 (portada, uniformes, 3 muestras, tienda, taller, asesora): subir, recortar a la proporción del espacio, texto alternativo |
| Catálogos | Deportes, categorías, marcas (logo), orden por arrastre |
| Textos | Preguntas frecuentes de uniformes, historia, referencias para llegar, aviso de privacidad, datos de la asesora |
| Ajustes (admin) | WhatsApp de ventas, tienda (dirección, horario, coordenadas), flags de comercio (bloqueados en v1), usuarios del personal |

## 10. Voz y microcopy (*M-21*, *M-22*)

- Tuteo siempre; energía con máximo un signo de exclamación; sin "barato", "lo mejor del mundo" ni "no se puede".
- Palabras preferidas: equipo, cancha, temporada, cotiza, a tu medida, entrega, listo.

| Lugar | Texto |
|---|---|
| CTA de ficha | Agregar a mi cotización |
| Ficha sin piezas | Indica cuántas piezas necesitas por talla (o "por tamaño") |
| CTA sin variantes en tarjeta | + Cotizar |
| Aviso de agregado | Agregado a tu cotización · Ver mi cotización · Seguir viendo el catálogo |
| QuoteBar | Mi cotización · {n} productos · {p} piezas · Ver |
| Guardado local | Tu lista se guarda en este celular aunque cierres la página. (escritorio: "en este navegador") |
| Botón final | Enviar cotización por WhatsApp |
| Resumen de errores | Faltan {n} datos para enviar tu cotización: {campos}. |
| Errores de campo | Escribe tu nombre. · Faltan dígitos: deben ser 10. · Acepta el aviso de privacidad para enviar. |
| Confirmación | ¡Listo! · Tu folio · Te contestamos por WhatsApp en horario de tienda. Si WhatsApp no se abrió, toca el botón. |
| Error de envío | No pudimos guardar tu folio, pero tu lista está completa. Envíala por WhatsApp y te atendemos igual. |
| Lista vacía | Tu lista está vacía · Agrega productos con sus cantidades por talla y te cotizamos por WhatsApp. · Ver catálogo |
| Filtros sin productos | Ningún producto con estos filtros · Quita alguno o límpialos para ver todo lo de {deporte}. · Limpiar filtros |
| Búsqueda sin resultados | Sin resultados para “{q}” · Revisa cómo está escrito o busca por deporte, categoría o marca. · ¿Quisiste decir {sugerencia}? |
| Cierre de búsqueda | ¿No encuentras lo que buscas? Escríbenos y te decimos si lo tenemos en tienda. · Pregunta por WhatsApp |
| Cargando | Cargando productos… |
| 404 | ¡Fuera de lugar! · Esta página no existe o cambió de dirección. · Ir al inicio · Ver catálogo · Buscar un producto |
| Volumen | ¿Compras para tu liga o escuela? Precio especial por volumen. Arma tu lista y te cotizamos por WhatsApp. |
| Sin foto | Foto próximamente |
| WhatsApp flotante (escritorio) | ¿Dudas? Escríbenos |
| Admin publicar | Se verá en el sitio en unos 3 minutos. |

## 11. Accesibilidad

- Contraste según §2.1; nunca lima sobre claro; texto blanco sobre rojo solo ≥ 19 px bold.
- Foco visible (anillo lima + noche) en todos los interactivos; orden de tabulación lógico.
- Hojas, ventanas y menús con *focus trap*, Escape y retorno del foco.
- Steppers con input `inputmode="numeric"` y etiquetas "Cantidad talla M".
- `aria-live` para el aviso de agregado, el contador de piezas y "Cargando productos…".
- Errores: resumen con `role="alert"`, cada campo con `aria-invalid` y `aria-describedby` a su mensaje.
- Imágenes con `alt` descriptivo (desde el admin); imágenes genéricas y espacios de foto con `alt=""`.
- Respetar `prefers-reduced-motion` (sin zoom en hover, sin animación del contador ni del esqueleto).
- Objetivo: Lighthouse Accessibility ≥ 95.

## 12. Entregables de diseño

| # | Entregable | Dónde | Estado |
|---|---|---|---|
| D-1 | Sistema de diseño: reglas de marca, tokens, fuentes, logos, 12 componentes | Claude Design "P&P Deportes Coapa" · copia en `design/tokens/` | ✅ Al día (1-oct-2026) |
| D-2 | 24 pantallas móviles 390 px | Claude Design "P&P Deportes — Pantallas" · copia en `design/screens/movil/` | ✅ |
| D-3 | 22 pantallas de escritorio 1440 px | Mismo lienzo · copia en `design/screens/escritorio/` | ✅ |
| D-4 | Admin: Inicio, Productos, Editor de producto, Importar, Solicitudes, Fotos del sitio | — | ⬜ Pendiente |
| D-5 | Imágenes genéricas por categoría (10) como archivos | Hoy solo como componente `ImagenGenerica` | ⬜ Pendiente (se generan en la fase 1 del plan) |
| D-6 | Pantallas sin diseñar listadas en §8 | — | ⬜ Opcional |

**Paquete exportado** (`pyp-deportes-diseno.zip`): `docs/` + `design/screens` (HTML autónomo) + `design/screenshots` (PNG) + `design/tokens` + `design/fonts` + `design/assets/logos`. Se copia a la raíz del repositorio.

**Regla de trabajo:** Claude Code implementa desde este documento y los tokens. Las pantallas son la referencia visual; si difieren del documento, se avisa y se corrige el que esté mal antes de implementar. Móvil manda sobre escritorio.
