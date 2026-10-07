P&P Deportes Coapa es la tienda deportiva y taller de uniformes del sur de la Ciudad de México. Vende sobre todo **por volumen** a ligas, escuelas, equipos e instituciones. Este sistema traduce su *Manual de identidad de marca v1.0* (septiembre 2026) a reglas para el catálogo web y su panel. Frase de marca: **"Tu equipo empieza aquí."**

## Esencia y voz

- Personalidad: "como el coach del barrio". Entusiasta pero nunca exagerado · directo pero nunca cortante · cercano pero nunca igualado · experto pero nunca presumido · confiable pero nunca aburrido.
- Habla de **tú**. Usa "usted" solo si el cliente lo usa primero.
- Claro y concreto: tallas, cantidades, fechas y siguiente paso. Máximo **un** signo de exclamación. Sin párrafos en mayúsculas ni cadenas de emojis. Sin groserías ni albures.
- Palabras que sí: equipo, cancha, temporada, cotiza, a tu medida, entrega, listo. Palabras que no: "barato", "lo mejor del mundo", "no se puede".
- Mensajes clave: "TU NOMBRE. TU NÚMERO. TU EQUIPO." (uniformes) · "EQUIPA TU JUEGO." (entrenamiento) · "PREGÚNTANOS, SABEMOS DE ESTO." (asesoría).
- Ejemplos: botón "Agregar a mi cotización"; toast "Agregaste 20 piezas de Uniforme de Fútbol"; error "No pudimos guardar tu folio, pero tu lista está completa. Envíala por WhatsApp y te atendemos igual."
- Cada pieza cierra con una llamada a la acción.

## Color

- Estructura con `blanco`/`gis` (~45 %) y `noche` (~30 %); dirige la atención con `rojo` (~17 %); guarda `lima` (~8 %) para el detalle que tiene que brillar: "NUEVO", el contador de piezas, diagonales sobre `noche`, el foco.
- Texto principal `noche` sobre `blanco` o `gis`; secundario `grafito`; terciario y ayudas `grafito-suave`.
- Texto rojo pequeño (eyebrows, enlaces, errores) siempre en `rojo-profundo`. `rojo` como texto solo en titulares de 24px o más.
- Texto `blanco` sobre `rojo` solo a 19px bold o más (4.32:1, AA grande): por eso el estilo `button` es de 19px.
- Nunca `lima` como texto sobre `blanco` o `gis`, nunca `lima` como fondo dominante, nunca `rojo` y `lima` juntos en superficies grandes.
- `concreto` es solo para líneas decorativas; los bordes de controles usan `borde-control`.
- El botón de WhatsApp es `whatsapp` con glifo y texto `noche`.
- Adiciones intencionales (derivadas para cumplir WCAG AA, no están en el manual): `rojo-profundo`, `grafito-suave`, `borde-control`, `linea`, `exito`, `whatsapp`.

## Tipografía

- Titulares en `display`, `h1`, `h2`, `h3` (Barlow Condensed Black/ExtraBold **itálica**, siempre MAYÚSCULAS, interlineado 90–105 %). En móvil: `display` 48px, `h1` 40px, `h2` 30px, `h3` 22px.
- Etiquetas en `eyebrow` (Condensed 700, 13px, tracking 0.15em); botones en `button`; totales, folio y futuros precios en `number`.
- Texto en `body` (Barlow 400, 16px, 145 %) en tipo oración; `body-strong` para nombres de producto; `small` y `caption` para metadatos y legales. Nada por debajo de 12px.
- Respaldo: Arial Narrow Bold Italic para titulares y Arial para texto.

## Ángulo, placas y elementos de marca

- Todo lo inclinado va a **13°** (`angle-brand`): placas, diagonales y cortes. Desplazamiento horizontal = alto × 0.2309.
- **Placa**: paralelogramo con `clip-path` para botones primarios, badges, chips activos y el contador de piezas. Texto dentro en Barlow Condensed 700 mayúsculas.
- **DobleDiagonal**: siempre en par (fina + gruesa), como viñeta de sección, separador o cierre.
- **PatronCancha**: franjas a 13° al 5–15 % de blanco, solo sobre `noche` o `rojo`, para hero, franjas de uniformes, confirmación e imágenes genéricas.
- **Corte a 13°**: fotos o bloques con un lado inclinado y una diagonal `rojo` paralela. Máximo uno por pantalla.
- Radios: `radius-0` en casi todo (la marca es angular); `radius-sm` en inputs y chips; `radius-full` solo en el botón flotante de WhatsApp y avatares.
- Sombras solo donde algo flota: `shadow-card` en tarjetas sobre `gis`, `shadow-float` en drawer, barra de cotización y botón flotante.

## Logotipo

- Horizontal por defecto (header, documentos); vertical en espacios cuadrados o altos; monograma en espacios pequeños (favicon, avatar, marca en imágenes genéricas).
- Fondo claro → positivo o mono noche; fondo oscuro → negativo o mono blanco; fondo `rojo` → siempre mono blanco; fondo `lima` → mono noche.
- Tamaños mínimos en pantalla: horizontal 120px, vertical 80px, monograma 32px de ancho. Área de protección: media altura de la placa en todos los lados.
- No deformar, rotar, recolorear, quitar las diagonales, añadir sombras, cambiar la tipografía ni encerrarlo en otras formas.

## Fotografía

- Proporción estándar **4:5 vertical**, marco `gis`, sin esquinas redondeadas.
- Gente real de la zona, acción real, producto sobre `gis` o `noche` con luz lateral. Fotos de equipos siempre con autorización por escrito (y de padres o tutores si hay menores).
- No: fotos de banco genéricas, filtros, imágenes oscuras, ni logos de otras marcas más grandes que el nuestro. Nunca texto sobre caras.
- Sin foto, usa **ImagenGenerica** de la categoría: es el estado normal al arranque del catálogo.
- Las fotos son contenido, no parte del front: se cargan desde el almacenamiento del catálogo y el sitio solo recibe su dirección. En las pantallas, los espacios que esperan foto van sobre `gis` con la DobleDiagonal en `concreto` y su nombre entre corchetes: `[FOTO DE PORTADA]`, `[FOTO DE UNIFORMES]`, `[FOTO DE MUESTRA]`, `[FOTO DEL EQUIPO con autorización]`, `[FOTO DE LA TIENDA]`, `[FOTO DEL TALLER]`.

## Iconografía

- Lucide, trazo 2px, en `noche` o `grafito`, a 20 o 24px. Íconos con significado llevan texto o `aria-label`.
- WhatsApp usa su glifo oficial (paquete simple-icons) en `noche`.
- No se usan pictogramas de deportes: los accesos por deporte usan foto o ImagenGenerica con el nombre en `h3`.

## Layout

- Móvil manda: cada pantalla se diseña primero a 390px y la de escritorio (1440px) es la misma pantalla acomodada a lo ancho. Un cambio en una se replica en la otra.
- Móvil primero desde 360px: 4 columnas, margen `space-4`, canal `space-3`. 640px: 8 columnas, margen `space-6`. 1024px: 12 columnas, margen `space-8`, canal `space-6`. Contenedor máximo 1216px.
- Rejilla de productos: 2 columnas en móvil, 3 en tablet, 4 en escritorio.
- Separación entre secciones `space-12` en móvil y `space-16` en escritorio.
- Los accesos por deporte y por categoría muestran solo el nombre, sin conteo de productos.

## Estados y foco

- Foco visible en todo interactivo: anillo `lima` de 3px con contorno `noche` (se ve sobre claro y oscuro). Los elementos con placa se envuelven en `.pyp-btn-wrap` porque el `clip-path` recorta el `outline`.
- Hover: `rojo` → `rojo-profundo`; `noche` → `grafito`; imágenes de tarjeta escalan 1.03.
- Deshabilitado: 40 % de opacidad. Botón enviando: texto "Enviando…".
- Movimiento: 150ms para estados, 250ms para drawers, curva `cubic-bezier(.2,.8,.2,1)`; respeta `prefers-reduced-motion`.

## Estados y avisos

- **Vacío** (cotización sin productos, filtros sin productos): bloque `gis` centrado con DobleDiagonal en `concreto`, titular `h4`, una línea de texto y **una** sola acción primaria ("Ver catálogo", "Limpiar filtros").
- **Búsqueda sin resultados**: titular con lo que se buscó, la corrección sugerida ("¿Quisiste decir balón?") y accesos por deporte y por categoría. Cierra con "Pregunta por WhatsApp".
- **Cargando catálogo**: tarjetas esqueleto en la misma rejilla (imagen `gis`, líneas `linea`) y el texto "Cargando productos…". El contador de productos dice "Cargando…".
- **Error de formulario**: resumen arriba del formulario con borde 2px `rojo-profundo` e ícono ("Faltan 3 datos para enviar tu cotización: …"); cada campo con borde 2px `rojo-profundo` y su mensaje con ícono debajo. Nunca solo color.
- **Hojas y ventanas**: en móvil las tareas cortas se abren en una hoja inferior sobre velo `noche` al 60 % (filtros, ordenar, editar personalización, aviso de agregado). En escritorio la misma tarea es un panel lateral (filtros), un menú desplegable (ordenar), una ventana centrada (personalización) o un aviso bajo "Mi cotización" (agregado).
- **Agregado a la cotización**: check en círculo `lima`, producto con sus tallas, total de la lista y dos acciones: "Ver mi cotización" (primary) y "Seguir viendo el catálogo" (outline).
- **Página no encontrada**: PatronCancha, titular "¡Fuera de lugar!" y salidas a inicio, catálogo y búsqueda.
- **Ordenar**: Destacados, Más nuevos, Nombre (A a la Z), Marca (A a la Z). Sin orden por precio mientras el sitio no muestre precios.

## Uso en código

- Las clases de componentes (`.pyp-btn`, `.pyp-badge`, `.pyp-card`, `.pyp-matrix`…) están en `components/bundle.css` y leen las variables de `tokens.css`. En la app Next.js los mismos valores viven en el `@theme` de Tailwind v4 descrito en `docs/03-UI-UX.md` §2.5.
- Solo tema claro. Las secciones oscuras usan `noche` como superficie, no un modo oscuro.
