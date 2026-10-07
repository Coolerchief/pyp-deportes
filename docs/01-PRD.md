# 01 · PRD — Catálogo web P&P Deportes

> **Documento para construir.** Lo leen Claude Code y Claude Design como fuente de verdad del *qué* y el *por qué*. El *cómo* vive en los demás documentos de `/docs`.
>
> | Campo | Valor |
> |---|---|
> | Versión | 0.3 |
> | Fecha | 1-oct-2026 |
> | Estado | Alcance acordado y diseñado (46 pantallas) · datos con ⚠️ o entre [corchetes] son placeholders |
> | Documentos hermanos | `02-TRD.md` · `03-UI-UX.md` · `04-APP-FLOW.md` · `05-BACKEND-SCHEMA.md` · `06-IMPLEMENTATION-PLAN.md` · `data/sitio-actual.md` · `data/catalogo-inicial.csv` · `data/referencias-y-fotos.md` · `00-ESTADO.md` · `CLAUDE.md` (raíz del repositorio) |
> | Fuentes | Manual de marca P&P Deportes Coapa v1.0 · sitio actual pypdeportescoapa.com · conversación de alcance |
>
> **Cambios 0.2 → 0.3 (tras el diseño de pantallas):** las fotos son contenido administrable, no parte del front (FR-M5-8) · ficha sencilla para productos sin personalización · aviso de agregado con dos salidas · edición de personalización desde la lista · resumen de errores en el formulario · búsqueda con sugerencia · orden sin precio · Nosotros se integra a Visítanos · página 404 · accesos sin conteo de productos · decisiones D8–D14.
>
> **Cambios 0.1 → 0.2:** una sola sucursal (Coapa) · se mantiene marca "COAPA" y dominio actual · catálogo inicial tomado del sitio actual · slugs heredados para redirecciones.

---

## 1. Resumen

P&P Deportes es una empresa familiar de artículos deportivos de la Ciudad de México (fundada en 1969 en el Centro, consolidada como tienda en 1990). Hoy opera **una sola sucursal: Coapa** (Calz. del Hueso 921), con la marca "P&P Deportes Coapa" definida en su manual. Su mercado principal es la **venta por volumen**: ligas, equipos, escuelas, academias, instituciones y empresas.

Vamos a construir un **catálogo web sin precios** donde el visitante explora productos, arma una **lista de cotización** con cantidades y tallas, y la envía a **un solo número de WhatsApp**, donde un asesor cierra la venta.

El sitio debe construirse para que en una fase posterior se convierta en **e-commerce** (precios, carrito, pago y envío) **sin reescribir** el catálogo, la base de datos ni el diseño.

## 2. Problema

- El sitio actual (WordPress, contenido de ~2020) no refleja la nueva identidad de marca ni facilita pedir una cotización.
- Las cotizaciones llegan incompletas por WhatsApp o teléfono: faltan cantidades, tallas, fecha de entrega o tipo de cliente. Esto obliga al asesor a ir y venir con preguntas.
- No hay registro de cuántas solicitudes llegan, de qué productos ni de qué tipo de cliente.
- El catálogo no lo puede mantener el personal de la tienda sin ayuda técnica.

## 3. Objetivos

| # | Objetivo | Cómo se mide |
|---|---|---|
| O1 | Convertir visitas en solicitudes de cotización **completas** por WhatsApp | Solicitudes enviadas/mes · % con cantidades, tallas y fecha |
| O2 | Mostrar un catálogo claro, rápido y fiel a la marca | LCP < 2.5 s en móvil 4G · Lighthouse ≥ 90 en Performance, SEO y Accesibilidad |
| O3 | Que el personal de la tienda mantenga el catálogo solo | Un producto con fotos se da de alta en < 5 min sin ayuda |
| O4 | Dejar la base lista para e-commerce | Activar precios y carrito sin migrar datos ni rehacer páginas (ver §9) |
| O5 | Operar casi gratis | Costo fijo mensual ≈ $0 MXN (solo el dominio anual) |

## 4. Usuarios

Basado en las audiencias del manual de marca, priorizadas por el foco en volumen.

| Prioridad | Usuario | Qué necesita | Qué valora |
|---|---|---|---|
| **P1** | **Delegado o capitán de liga/equipo amateur** | Uniformes completos y equipo para 10–30 jugadores | Rapidez, buen precio por volumen, entrega a tiempo |
| **P1** | **Coordinador de escuela o academia** | Volumen, tallas infantiles, reposiciones durante el año | Confianza, que surtan tallas completas |
| **P1** | **Institución, asociación o empresa** | Equipo deportivo, artículos promocionales con o sin impresión | Factura, formalidad, seguimiento |
| P2 | Mamá o papá | Comprar para sus hijos (a veces para todo el equipo) | Que les expliquen las opciones |
| P2 | Deportista individual | Equipo, calzado y accesorios | Asesoría honesta |
| Interno | **Administrador** (equipo de desarrollo al inicio, dueño después) | Configurar todo, cargar catálogo inicial | Control total |
| Interno | **Editor** (personal de tienda) | Dar de alta productos, fotos y galería; ver solicitudes | Panel simple, en español, usable desde el celular |

## 5. Alcance

### 5.1 Dentro de v1

| ID | Módulo | Resumen |
|---|---|---|
| M1 | Catálogo público | Navegación por deporte y categoría, marcas, búsqueda, filtros, ficha de producto |
| M2 | Lista de cotización | "Carrito sin precios": productos + cantidades por talla/color + notas → datos del cliente → WhatsApp |
| M3 | Galería "Equipos estrenando" | Fotos de clientes con su uniforme nuevo (con permiso) |
| M4 | Páginas institucionales | Inicio, Uniformes a tu medida, Visítanos (tienda Coapa, con Nosotros), Aviso de privacidad, página no encontrada |
| M5 | Panel de administración | Productos, variantes, fotos, categorías, deportes, marcas, galería, fotos y textos del sitio, tienda, solicitudes |
| M6 | SEO y migración | Metadatos, sitemap, datos estructurados, redirecciones del sitio WordPress actual |
| M7 | Analítica | Eventos del embudo catálogo → lista → WhatsApp |

### 5.2 Fuera de v1 (explícito)

- Precios públicos, pago en línea, checkout, envíos y cálculo de fletes → **Fase e-commerce**.
- Cuentas de cliente o login para visitantes.
- Inventario en tiempo real o sincronización con punto de venta.
- **Configurador/cotizador de uniformes por pasos** (descartado: la personalización se captura como notas en la lista de cotización).
- Sección separada de "paquetes para ligas y escuelas" (ver pregunta abierta Q3).
- Multi-idioma, blog, chat en vivo, app móvil nativa.

## 6. Requisitos funcionales

Formato: `FR-<módulo>-<n>`. **Prioridad** con MoSCoW (M = Must, S = Should, C = Could). Cada requisito tiene criterios de aceptación verificables.

### M1 · Catálogo público

**FR-M1-1 · Navegación por deporte y categoría** — **M**
- El menú principal muestra **deportes** (Fútbol, Básquetbol, Voleibol, Box, Fitness y gimnasio, Natación, Atletismo) y **categorías** (Uniformes, Balones, Ropa deportiva, Material de entrenamiento, Protecciones, Box y combate, Fitness y gimnasio, Natación, Accesorios y arbitraje, Primeros auxilios). Taxonomía completa en `data/sitio-actual.md` §3.
- Un producto puede pertenecer a **varios deportes** y a **una categoría principal**. Las categorías admiten un nivel de subcategoría.
- Los accesos por deporte y por categoría muestran **solo el nombre, sin conteo de productos**.
- *Aceptación:* desde el inicio se llega a cualquier producto publicado en ≤ 3 clics. Deportes y categorías sin productos publicados no aparecen en el menú.

**FR-M1-2 · Listado de productos** — **M**
- Cuadrícula con foto, nombre, marca y placas de estado ("NUEVO", "PERSONALIZABLE").
- Paginación o carga incremental de 24 productos.
- Orden: **Destacados** (por defecto), **Más nuevos**, **Nombre (A a la Z)**, **Marca (A a la Z)**. Sin orden por precio mientras el sitio no muestre precios.
- Estados: **cargando** (tarjetas esqueleto y "Cargando productos…") y **sin productos con estos filtros** (una acción: "Limpiar filtros").
- *Aceptación:* el listado muestra solo productos publicados, respeta el orden elegido en el admin (destacados primero) y conserva filtros y orden en la URL para compartir.

**FR-M1-3 · Filtros** — **M**
- Filtros por deporte, categoría, marca, público (hombre, mujer, niño, unisex) y "personalizable".
- *Aceptación:* los filtros se combinan (AND entre tipos, OR dentro de un tipo), se reflejan en la URL y muestran el conteo de resultados.

**FR-M1-4 · Búsqueda** — **M**
- Búsqueda por texto sobre nombre, marca, SKU y etiquetas. Tolerante a acentos y mayúsculas ("futbol" encuentra "Fútbol").
- Los resultados se ordenan por relevancia y se pueden acotar por categoría.
- **Sin resultados:** muestra lo que se buscó, una corrección sugerida ("¿Quisiste decir balón?"), accesos por deporte y por categoría, y el cierre "Pregunta por WhatsApp".
- *Aceptación:* resultados en < 500 ms percibidos; "valon" sugiere "balón"; ninguna búsqueda termina sin una salida.

**FR-M1-5 · Ficha de producto** — **M**
- Galería de fotos (zoom en escritorio, deslizar en móvil), nombre, marca, SKU, descripción, especificaciones (material, tallas disponibles, colores), deportes, etiqueta "Personalizable" con qué técnicas admite (bordado, sublimación, vinil, serigrafía).
- **Sin precio.** En su lugar: cantidades por variante + botón **"Agregar a mi cotización"**.
- **Dos variantes de ficha:** *completa* para productos personalizables (cantidad por talla, atajos de equipo y texto de personalización) y *sencilla* para los que no se personalizan, como un balón (cantidad por tamaño, sin atajos ni personalización).
- Sin foto, muestra la imagen genérica de la categoría y el texto "Foto próximamente".
- Productos relacionados (misma categoría/deporte).
- *Aceptación:* sin variantes, el producto se agrega con cantidad. Con variantes, el usuario captura cantidades por talla/color en una sola vista (ver FR-M2-2).

**FR-M1-6 · Marcas** — **S**
- Página de cada marca con su logo y productos. Marcas de la carga inicial: ADX, Adidas, Cruzeiro, Escualo, Manríquez, Molten, P&P (propia), Palomares, Rinat, Seyer, Spalding y Wilson (detalle y pendientes en `data/sitio-actual.md` §3.3).

### M2 · Lista de cotización

> Es la pieza clave para escalar: **por dentro funciona como un carrito**. En la fase e-commerce se le agregan precios y un checkout; no se reemplaza.

**FR-M2-1 · Agregar y editar** — **M**
- Agregar desde la ficha o, en productos sin variantes, desde el listado.
- Ícono persistente en el encabezado con el total de **piezas**. En móvil, además, una barra inferior "Mi cotización · n productos · n piezas". Ambos llevan al paso 1 de la cotización (no hay panel lateral de cotización).
- Al agregar aparece el aviso **"Agregado a tu cotización"** con el producto, sus tallas, el total de la lista y dos salidas: "Ver mi cotización" y "Seguir viendo el catálogo".
- Lista vacía: mensaje, "Ver catálogo" y accesos por deporte.
- Editar cantidades, quitar líneas, vaciar la lista.
- La lista **persiste en el navegador** (sobrevive a recargas y cierres) por al menos 30 días.

**FR-M2-2 · Captura por volumen** — **M**
- Para productos con tallas: una **matriz talla × cantidad** (y por color si aplica) en lugar de agregar talla por talla. Ejemplo: `CH 4 · M 8 · G 6 · XG 2 = 20 piezas`.
- Total de piezas por línea y total general.
- *Aceptación:* un delegado captura 20 jerseys en 4 tallas en < 30 segundos.

**FR-M2-3 · Notas de personalización** — **M**
- Por línea: casilla "Quiero personalizarlo" + campo de texto (escudo, nombres, números, colores, técnica).
- La personalización se puede **editar o quitar desde la lista** (hoja en móvil, ventana en escritorio; máximo 500 caracteres con contador).
- Nota general de la solicitud.

**FR-M2-4 · Datos del solicitante** — **M**
- Nombre, WhatsApp (10 dígitos MX), tipo de cliente (Liga/Equipo, Escuela/Academia, Empresa/Institución, Particular), nombre del equipo o institución (opcional), **fecha en que lo necesita**, forma de entrega (Recoger en tienda Coapa · Envío a acordar), requiere factura (sí/no).
- Si en el futuro hay más de una sucursal activa, aparece un selector de sucursal. Con una sola, no se muestra (el modelo de datos ya lo soporta).
- Aceptación del aviso de privacidad (obligatoria).
- Los datos se recuerdan en el navegador para una siguiente solicitud.
- Si faltan datos al enviar: un **resumen arriba del formulario** dice cuántos faltan y cuáles, y cada campo muestra su mensaje. Nunca solo color.
- *Aceptación:* con nombre vacío, WhatsApp incompleto y aviso sin aceptar, el resumen dice "Faltan 3 datos para enviar tu cotización: nombre, WhatsApp y aviso de privacidad."

**FR-M2-5 · Envío por WhatsApp** — **M**
- Al enviar: (1) se guarda la solicitud en la base de datos con un **folio** legible (`PYP-2026-000123`); (2) se abre WhatsApp (`wa.me`) al número único con un mensaje ya formateado que incluye folio, datos del cliente, líneas con SKU, variantes, cantidades y notas.
- Si guardar falla, igual se abre WhatsApp con el mensaje (sin folio) y se registra el error. **Nunca se bloquea la venta.**
- Tras enviar: pantalla de confirmación con el folio, opción de "volver a abrir WhatsApp" y de vaciar la lista.
- *Aceptación:* el mensaje cabe en un mensaje de WhatsApp y el asesor puede cotizar sin hacer preguntas de cantidades o tallas.

**FR-M2-6 · Botón de WhatsApp directo** — **M**
- Botón flotante "Escríbenos" en todo el sitio y botón "Preguntar por este producto" en la ficha, con mensaje prellenado (nombre y SKU del producto).

### M3 · Galería "Equipos estrenando"

**FR-M3-1 · Galería pública** — **M**
- Cuadrícula de fotos con nombre del equipo/escuela, deporte, año y, opcionalmente, productos vinculados ("Así quedó su uniforme → ver producto").
- Filtro por deporte y "Cargar más". Vista ampliada (lightbox).
- Cierre de página: "¿Ya estrenaron uniforme?" con **"Enviar foto"** por WhatsApp (se publica solo con autorización) y "Cotiza tu uniforme".

**FR-M3-2 · Consentimiento** — **M**
- En el admin, cada foto exige marcar "Cuento con autorización por escrito" y, si aparecen menores, "Autorización de padres o tutores". Sin ambas casillas no se publica.

### M4 · Páginas institucionales

**FR-M4-1 · Inicio** — **M**: hero con la frase de marca y foto de portada, accesos por deporte, bloque "Uniformes a tu medida", destacados, bloque "¿Compras para tu liga o escuela?" con los 4 pasos y la asesora, galería (4 fotos), categorías, "Visítanos en Coapa" y CTA a WhatsApp.

**FR-M4-2 · Nosotros** — **S**: es una **sección dentro de Visítanos** (`/visitanos#nosotros`), no una página aparte: "Desde 1969", descripción, historia y fotos de la tienda y del taller. Texto e imágenes editables en el admin.

**FR-M4-3 · Uniformes a tu medida** (`/uniformes-personalizados`) — **M**: hero con el mensaje clave, qué incluye (uniforme completo, personalización, todas las tallas), **tres técnicas** (sublimación, vinil textil, bordado) con foto de muestra y para qué conviene cada una, cómo funciona en 4 pasos (elige → cotiza → aprueba prueba digital → recibe), lista "Ten esto a la mano" antes de cotizar, preguntas frecuentes (pedido mínimo, tiempo de entrega, reposiciones, factura) y asesora con WhatsApp. Las respuestas de las preguntas frecuentes son editables en el admin.

**FR-M4-4 · Visítanos** — **M**: mapa, dirección, estado "Abierto ahora / Cerrado", "Cómo llegar", "Llamar", referencias para llegar y estacionamiento, horario por día, contacto (WhatsApp, teléfono, Instagram, Facebook) y la sección Nosotros. Datos editables en el admin. El modelo admite varias sucursales; con una sola activa no hay listado.

**FR-M4-5 · Aviso de privacidad** — **M**: requerido por la LFPDPPP al recolectar nombre y teléfono. Siete secciones: responsable, datos que se piden, para qué se usan, con quién se comparten, derechos ARCO, cambios al aviso y contacto. Texto proporcionado o validado por el cliente.

**FR-M4-6 · Página no encontrada** — **M**: mensaje "¡Fuera de lugar!" con salidas a inicio, catálogo y búsqueda.

### M5 · Panel de administración

**FR-M5-1 · Acceso y roles** — **M**
- Login solo para personal (correo + enlace mágico o contraseña). Roles: **Admin** (todo, incluidos usuarios y configuración) y **Editor** (catálogo, galería, solicitudes).
- Todo en español, usable desde el celular.

**FR-M5-2 · Productos** — **M**
- Crear, editar, duplicar, archivar. Estados: Borrador → Publicado → Archivado.
- Campos: nombre, slug automático, marca, categoría, deportes, público, descripción, especificaciones, etiquetas, "personalizable" y técnicas, destacado, orden.
- **Variantes** por talla y color, con SKU por variante.
- **Campos comerciales ocultos** (precio, precio por volumen, existencias): se pueden capturar desde v1 pero **no se muestran** en el sitio público (ver §9).
- Fotos: subir varias, **recortar a 4:5**, reordenar, texto alternativo. El sistema comprime y genera tamaños automáticamente.

**FR-M5-3 · Importación masiva** — **M**
- Importar productos y variantes desde **CSV/Excel** con plantilla descargable, vista previa, validación por fila y reporte de errores. Es la vía para la carga inicial.
- Importar fotos en lote asociadas por SKU (nombre de archivo = SKU).

**FR-M5-4 · Catálogos de apoyo** — **M**: deportes, categorías, marcas (con logo), sucursales, textos de páginas simples y número de WhatsApp.

**FR-M5-5 · Galería** — **M**: subir fotos, datos del equipo, consentimiento (FR-M3-2), vincular productos, publicar/ocultar.

**FR-M5-6 · Solicitudes de cotización** — **M**
- Bandeja con folio, fecha, cliente, tipo, total de piezas y estado.
- Estados: **Nueva → En atención → Cotizada → Ganada / Perdida**, con motivo de pérdida opcional y nota interna.
- Ver detalle, botón "Abrir chat" (wa.me al cliente) y exportar a CSV.
- *Aceptación:* el dueño puede responder "¿cuántas solicitudes tuvimos este mes y cuántas ganamos?" sin salir del panel.

**FR-M5-7 · Tablero básico** — **C**: solicitudes por semana, top productos solicitados y tipo de cliente.

**FR-M5-8 · Fotos y textos del sitio** — **M**
- Las fotos **no forman parte del código del sitio**: todas se suben desde el panel y el sitio solo recibe su dirección.
- Un espacio editable por cada foto del sitio: portada, uniformes, tres muestras de técnicas, tienda, taller y asesora. Cada espacio guía el recorte a su proporción y pide texto alternativo.
- Textos editables: preguntas frecuentes de uniformes, historia, referencias para llegar, datos de la asesora y aviso de privacidad.
- *Aceptación:* cambiar la foto de portada no requiere tocar código; un espacio sin foto muestra su marcador y el sitio se ve completo.

### M6 · SEO y migración

**FR-M6-1** — **M**: título y descripción por página, Open Graph con imagen del producto, `sitemap.xml`, `robots.txt` y URLs legibles. Fichas en `/producto/<slug>` y listados en `/catalogo/<categoria>` con filtros por query string.

**FR-M6-2** — **M**: datos estructurados `Product` (sin `offers` mientras no haya precios), `SportingGoodsStore` para la tienda, `Organization` y `BreadcrumbList`.

**FR-M6-3** — **M**: los productos **conservan el slug** que tenían en WooCommerce, así que `/producto/<slug>/` redirige 301 a `/producto/<slug>`. El resto de URLs se mapea según `data/sitio-actual.md` §1. *Aceptación:* las 48 URLs de `url_anterior` del CSV responden 301 a una página existente.

### M7 · Analítica

**FR-M7-1** — **M**: eventos `view_item`, `search`, `add_to_quote`, `view_quote`, `submit_quote`, `whatsapp_click` (con origen: flotante, ficha, confirmación). Se usan los nombres de eventos de e-commerce estándar para que los reportes sigan sirviendo cuando haya carrito real.

**FR-M7-2** — **S**: herramienta gratuita y respetuosa de privacidad (por definir en el TRD).

## 7. Requisitos no funcionales

| ID | Requisito |
|---|---|
| NFR-1 | **Mobile-first.** La mayoría de los usuarios llega desde el celular vía WhatsApp e Instagram. Diseño y pruebas empiezan en 360 px. |
| NFR-2 | **Rendimiento.** LCP < 2.5 s, CLS < 0.1, INP < 200 ms en móvil 4G. Imágenes en formatos modernos y tamaños responsivos. |
| NFR-3 | **Accesibilidad** WCAG 2.1 AA: contraste según la tabla del manual (lima nunca como texto sobre blanco), navegación con teclado, textos alternativos. |
| NFR-4 | **Marca.** Aplicar íntegramente el manual: colores, Barlow/Barlow Condensed, ángulo de 13°, placas, doble diagonal y voz de "tú". Detalle en `03-UI-UX.md`. |
| NFR-5 | **Costo.** Servicios en planes gratuitos que permitan uso comercial. Costo fijo ≈ $0 salvo el dominio. |
| NFR-6 | **Seguridad.** Panel protegido con políticas de acceso a nivel de fila en la base de datos. Los datos de solicitudes solo los ve el personal. Formularios públicos con protección anti-spam (sin captchas molestos si es posible). |
| NFR-7 | **Privacidad.** Cumplir la LFPDPPP: aviso de privacidad, consentimiento explícito y solo los datos necesarios. |
| NFR-8 | **Mantenibilidad.** Código tipado, con pruebas en las reglas de negocio críticas (lista de cotización, mensaje de WhatsApp, importador) y convenciones en `CLAUDE.md` para que Claude Code trabaje de forma consistente. |
| NFR-9 | **Resiliencia.** Si la base de datos no responde, el catálogo sigue visible (páginas pre-generadas o en caché) y el botón de WhatsApp sigue funcionando. |
| NFR-10 | **Idioma.** Español de México en todo el sitio y el panel. |

## 8. Contenido y datos iniciales

Detalle completo, taxonomía y formato del importador en **`data/sitio-actual.md`**. Carga inicial en **`data/catalogo-inicial.csv`** (56 productos: 48 del sitio actual y 8 inventados, sobre todo uniformes).

| Dato | Estado |
|---|---|
| Dirección Coapa: Calz. del Hueso 921, local 42, Granjas Coapa, Tlalpan, 14330 | ✅ Real |
| Teléfono 55 6582 2426 · correo pyp_coapa@hotmail.com | ⚠️ De 2020, validar |
| WhatsApp de ventas 55 0000 0000 | ⚠️ Placeholder |
| Horario Lun–Vie 10–19 · Sáb 10–17 | ⚠️ Placeholder |
| Catálogo (nombres, marcas, categorías) | ✅ Del sitio actual · tallas y colores ⚠️ supuestos |
| Fotos de productos | ❓ Hay 8 fotos de balones en Drive; se cargan desde el admin. El resto usa imagen genérica por categoría |
| Fotos del sitio (portada, uniformes, 3 muestras, tienda, taller) y de equipos | ❓ Pendiente; el sitio muestra un marcador mientras tanto |
| Textos pendientes: pedido mínimo, tiempo de entrega, condiciones de reposición, historia, referencias para llegar, tela y material de productos | ❓ Pendiente (entre corchetes en las pantallas) |
| Asesora de uniformes "[Ana Martínez]" | ⚠️ Placeholder tomado del manual |
| Logos de marcas distribuidas | ❓ Pendiente |
| Aviso de privacidad | ⚠️ Estructura lista; faltan razón social, otros usos, transferencias, medio ARCO, correo y fecha |
| Archivos maestros SVG del logotipo | ❓ Pendiente (si no existen, se vectoriza desde el manual) |

**Regla:** todo placeholder vive en la base de datos o en configuración editable desde el admin, nunca fijo en el código.

## 9. Preparación para e-commerce (requisito de diseño, no de funcionalidad)

Estas decisiones se toman **desde v1** para que la fase e-commerce sea "activar", no "reconstruir":

1. **Modelo de datos de comercio completo desde el inicio:** producto → variante (SKU) → precio(s) → existencias por sucursal. En v1 los precios existen pero no se publican.
2. **La lista de cotización es un carrito.** Misma estructura (líneas con variante y cantidad). Una *solicitud de cotización* y un futuro *pedido* comparten la forma de sus líneas.
3. **Interruptores de funcionalidad** (`show_prices`, `enable_checkout`, `enable_shipping`) guardados en configuración y leídos por el frontend. En v1 todos están apagados.
4. **Componentes preparados:** la tarjeta y la ficha de producto tienen un espacio reservado para precio. El botón principal cambia de texto según el modo ("Agregar a mi cotización" ↔ "Agregar al carrito").
5. **Clientes como entidad.** Cada solicitud crea o reutiliza un *cliente* (por teléfono). Ese historial se hereda en e-commerce.
6. **Precios por volumen previstos** (escalas por cantidad), porque es el negocio principal.
7. **Fuera de v1 pero anticipado en el TRD:** pasarela de pago (Mercado Pago / Stripe / Conekta), facturación CFDI, envíos, cuentas de cliente.

## 10. Métricas de éxito (primeros 90 días)

| Métrica | Meta inicial (ajustar con datos reales) |
|---|---|
| Solicitudes de cotización enviadas | ≥ 30/mes |
| % de solicitudes con tallas, cantidades y fecha completas | ≥ 80 % |
| Tasa visita a ficha → agregar a cotización | ≥ 5 % |
| Tasa lista iniciada → solicitud enviada | ≥ 35 % |
| Productos publicados con ≥ 1 foto | 100 % |
| Solicitudes con estado actualizado en el panel | ≥ 70 % (mide adopción del equipo) |

## 11. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Faltan fotos de calidad de productos | Catálogo pobre, baja conversión | Plantilla de foto simple (fondo gis, luz lateral, según manual); permitir publicar con foto genérica de categoría y marcarla para reemplazo |
| El equipo de tienda no actualiza estados de solicitudes | Se pierden las métricas | Panel móvil, un toque para cambiar estado, recordatorio semanal |
| Plan gratuito de la base de datos pausa el proyecto por inactividad | Panel y guardado de solicitudes caídos | Tarea programada de "keep-alive" y catálogo pre-generado (NFR-9); detallado en el TRD |
| Datos placeholder publicados por error (WhatsApp, horario, textos entre corchetes) | Clientes escriben a un número equivocado o ven "[PEDIDO MÍNIMO]" | Checklist de salida a producción; el build de producción falla con el WhatsApp placeholder y avisa de textos entre corchetes |
| Mensaje de WhatsApp muy largo en listas grandes | Mensaje truncado o poco legible | Formato compacto + folio; el detalle completo vive en el panel |
| Uso de logos de marcas de terceros | Riesgo legal | Solo como distribuidor, sin protagonismo sobre la marca propia (manual, pág. 19) |

## 12. Decisiones y preguntas abiertas

### Resueltas

| # | Decisión |
|---|---|
| D1 | Una sola sucursal activa: **Coapa**. El modelo de datos soporta varias. |
| D2 | Se usa la marca del manual tal cual, con el localizador **COAPA**. |
| D3 | Se conserva el dominio **pypdeportescoapa.com**. |
| D4 | Datos no confirmados se inventan como placeholders editables y se reemplazan después. |
| D5 | El catálogo inicial parte de los productos del sitio actual. |
| D6 | Sin configurador de uniformes; la personalización se captura como notas en la lista de cotización. |
| D7 | Galería "Equipos estrenando" entra en v1. |

| D8 | **Móvil manda:** cada pantalla se define a 390 px y la de escritorio es la misma acomodada a lo ancho. |
| D9 | **Las fotos son contenido, no parte del front:** se administran desde el panel (FR-M5-8). |
| D10 | Accesos por deporte y por categoría **sin conteo** de productos. |
| D11 | **Nosotros** es una sección de Visítanos, no una página. |
| D12 | Sin orden por precio mientras no haya precios públicos. |
| D13 | El aviso de agregado sustituye al toast; en escritorio no hay panel lateral de cotización. |
| D14 | Dos fichas: completa (personalizable) y sencilla (no personalizable). |

### Abiertas (no bloquean el desarrollo)

| # | Pregunta | Propuesta mientras se responde |
|---|---|---|
| Q1 | WhatsApp de ventas, horario, teléfono y correo vigentes | Placeholders de `data/sitio-actual.md` |
| Q2 | ¿Hay mínimos de compra o beneficios por volumen que convenga comunicar sin mostrar precios? (p. ej. "precio especial desde 12 piezas") | Campo opcional "mínimo sugerido" por producto |
| Q3 | ¿Queremos **kits armados** (p. ej. "Kit entrenamiento fútbol infantil")? | No en v1; el modelo de datos lo permite después como producto tipo "paquete" |
| Q4 | ¿Quién redacta o aprueba el aviso de privacidad? | Plantilla marcada como pendiente de revisión legal |
| Q5 | ¿Existen los archivos maestros SVG del logotipo? | Si no, se vectoriza desde el manual en la fase de diseño |
| Q6 | Tallas y colores reales de cada producto | Supuestos razonables en el CSV; el cliente los corrige en el admin |
| Q7 | La página de uniformes muestra **tres técnicas**; el catálogo también usa "serigrafía" en 2 productos. ¿Se ofrece serigrafía? | Se conserva como atributo de producto; no aparece en la página de uniformes |
| Q8 | Pedido mínimo, tiempo de entrega y condiciones de reposición | Marcadores entre corchetes, editables en el admin |
| Q9 | Nombre y foto reales de la asesora de uniformes | Placeholder "[Ana Martínez]" con iniciales |

## 13. Glosario

- **Ficha completa / ficha sencilla:** las dos variantes de la página de producto (D14).
- **Espacio de foto del sitio:** lugar fijo del sitio (portada, muestras, tienda…) cuya imagen se administra desde el panel.
- **Lista de cotización:** carrito sin precios que el visitante envía por WhatsApp.
- **Solicitud / folio:** registro guardado de una lista enviada (`PYP-AAAA-NNNNNN`).
- **Variante:** combinación de talla y color de un producto, con su propio SKU.
- **Personalizable:** producto que admite escudo, nombre, número u otras aplicaciones.
- **Modo catálogo / modo tienda:** estado del sitio según los interruptores de §9.
