# P&P Deportes Coapa — paquete de diseño y documentación

Todo lo necesario para construir el catálogo web en VS Code con Claude Code. Exportado el 1-oct-2026 desde Claude Design: lienzo "P&P Deportes — Pantallas" (46 pantallas) y sistema de diseño "P&P Deportes Coapa".

**Empieza por `docs/00-ESTADO.md`**: dice qué está listo y qué falta.

## Qué hay aquí

```
CLAUDE.md                     Reglas del repositorio para Claude Code (va en la raíz)
docs/
  00-ESTADO.md                Índice, estado y pendientes
  01-PRD.md                   Qué se construye y por qué
  02-TRD.md                   Arquitectura, stack y reglas técnicas
  03-UI-UX.md                 Tokens, componentes, estados, pantallas y microcopy
  04-APP-FLOW.md              Flujos del visitante y del personal, con casos de error
  05-BACKEND-SCHEMA.md        Tablas, seguridad, funciones y Edge Functions
  06-IMPLEMENTATION-PLAN.md   Fases y tareas, en el orden en que se ejecutan
  data/                       Catálogo inicial (CSV), sitio actual, referencias y fotos
  brand/logos/                Logotipos SVG (reconstruidos; ver 03-UI-UX.md §3)
design/
  screens/movil/              24 pantallas a 390 px, en HTML autónomo
  screens/escritorio/         22 pantallas a 1440 px
  screenshots/{movil,escritorio}/   Las mismas pantallas en PNG, a tamaño completo
  tokens/
    tokens.json               Colores, tipografía, espaciado, radios, sombras
    tokens.css                Los mismos tokens como variables CSS y clases de texto
    components.css            Estilos de los componentes base (.pyp-btn, .pyp-badge, …)
    SISTEMA-DE-DISENO.md      Reglas de uso de la marca en interfaz
    componentes/              Guía de cada componente (Button, ProductCard, VariantMatrix, …)
  fonts/                      Barlow y Barlow Condensed (woff2, licencia OFL)
  assets/logos/               Logos usados por las pantallas
  source-canvas/              Archivos originales del lienzo (.dc.html); solo de respaldo
```

## Pantallas

Mismo nombre de archivo en `movil/` y `escritorio/`. **Móvil manda:** la de escritorio es la misma pantalla acomodada a lo ancho.

| Archivo | Qué muestra | Móvil | Escritorio |
|---|---|---|---|
| `inicio` | Inicio | ✅ | ✅ |
| `menu` | Menú abierto en Deportes (mega menú en escritorio) | ✅ | ✅ |
| `menu-categorias` | Menú abierto en Categorías | ✅ | — |
| `catalogo` | Listado de Fútbol | ✅ | ✅ |
| `catalogo-filtros` | Hoja de filtros (en escritorio es el panel lateral de `catalogo`) | ✅ | — |
| `catalogo-ordenar` | Ordenar por | ✅ | ✅ |
| `catalogo-sin-resultados` | Filtros sin productos | ✅ | ✅ |
| `catalogo-cargando` | Tarjetas esqueleto | ✅ | ✅ |
| `busqueda` | Resultados de búsqueda | ✅ | ✅ |
| `busqueda-sin-resultados` | Sin resultados, con sugerencia | ✅ | ✅ |
| `ficha-uniforme` | Ficha completa: tallas, atajos y personalización (funciona) | ✅ | ✅ |
| `ficha-balon` | Ficha sencilla: cantidad por tamaño (funciona) | ✅ | ✅ |
| `ficha-agregado` | Aviso "Agregado a tu cotización" | ✅ | ✅ |
| `cotizacion-1-lista` | Mi cotización, paso 1 | ✅ | ✅ |
| `cotizacion-vacia` | Lista vacía | ✅ | ✅ |
| `cotizacion-editar-personalizacion` | Editar personalización | ✅ | ✅ |
| `cotizacion-2-datos` | Paso 2, formulario | ✅ | ✅ |
| `cotizacion-2-datos-errores` | Paso 2 con errores | ✅ | ✅ |
| `cotizacion-3-confirmacion` | Confirmación con folio | ✅ | ✅ |
| `uniformes` | Uniformes a tu medida | ✅ | ✅ |
| `equipos` | Equipos estrenando | ✅ | ✅ |
| `visitanos` | Visítanos (incluye Nosotros) | ✅ | ✅ |
| `aviso-de-privacidad` | Aviso de privacidad | ✅ | ✅ |
| `404` | Página no encontrada | ✅ | ✅ |

## Cómo verlas en VS Code

- **PNG:** clic en cualquier archivo de `design/screenshots/`.
- **HTML:** instala la extensión *Live Preview* (Microsoft), clic derecho sobre un archivo de `design/screens/` → "Show Preview". También se pueden abrir directo en el navegador. Los enlaces entre pantallas funcionan.

## Cómo usarlas con Claude Code

Copia `CLAUDE.md`, `docs/` y `design/` a la raíz del repositorio. El trabajo se pide tarea por tarea, siguiendo `docs/06-IMPLEMENTATION-PLAN.md`:

> Lee `CLAUDE.md` y `docs/00-ESTADO.md`. Ejecuta la tarea **T0.1** de `docs/06-IMPLEMENTATION-PLAN.md`. Lee antes los documentos que la tarea indica. Al terminar, corre las verificaciones de la definición de terminado y resume qué hiciste y qué quedó pendiente.

Para una pieza visual concreta:

> Lee `docs/00-ESTADO.md`, `docs/02-TRD.md` y `docs/03-UI-UX.md`. Implementa `VariantMatrix` según `03-UI-UX.md` §7.5, con `design/screens/movil/ficha-uniforme.html` y su PNG como referencia visual, y `design/tokens/tokens.json` para los valores. Después ajusta la vista de escritorio según `design/screens/escritorio/ficha-uniforme.html`.

## Lo que hay que saber antes de copiar código de aquí

- **Los HTML son referencia visual, no código de producción.** Tienen estilos en línea y medidas fijas (390 o 1440 px); no son responsivos. La app se construye con Next.js + Tailwind según el TRD, tomando de aquí medidas, colores y estructura.
- **Si un HTML y `03-UI-UX.md` difieren**, avisa y corrige el que esté mal antes de implementar.
- **Elementos fijos dibujados en el primer pliegue.** El botón de WhatsApp, la barra "Mi cotización" y la barra del total aparecen donde quedaría el borde inferior de la pantalla (y ≈ 844 en móvil, 820 en escritorio), por eso tapan contenido en la imagen larga. En la app son `position: fixed`.
- **Las hojas y avisos** (filtros, ordenar, agregado, personalización, menú) se muestran abiertos sobre la página con un velo.
- **No hay fotos.** Las fotos son contenido que se carga desde el admin. Los productos muestran la imagen genérica de su categoría y los espacios del sitio un marcador: `[FOTO DE PORTADA]`, `[FOTO DE MUESTRA]`, etc.
- **Textos entre corchetes son datos pendientes:** `[HORARIO]`, `[MAPA]`, `[PEDIDO MÍNIMO]`, `[Ana Martínez]`, `[POR CONFIRMAR]`…
- **Logos reconstruidos** desde el manual; reemplazar por los archivos maestros cuando existan.
