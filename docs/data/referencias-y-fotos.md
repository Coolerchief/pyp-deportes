# Referencias de diseño y material fotográfico

> Insumo para `03-UI-UX.md` y Claude Design. Cada referencia indica **qué tomar** y **qué no copiar**. Nada de esto sustituye al manual de marca: se toma estructura e interacción, no estilo visual.
> Revisado el 29-sep-2026. Actualizado el 1-oct-2026 (§3 y §4).

## 1. Referencias

### A. Venta por volumen a equipos (el modelo de negocio más parecido)

| Sitio | Qué observar | Qué tomar para P&P | Qué no copiar |
|---|---|---|---|
| **BSN Sports** — https://www.bsnsports.com/sports/mens-soccer/ | Navegación doble: por **deporte** y por **tipo de comprador** (club, prepa, universidad). "Request a Quote" repetido 3+ veces. "Contact a Sales Pro" con nombre y teléfono. Programa aparte para clubes. | Página por deporte que mezcla uniformes + equipo · CTA de cotización repetido en la página · asesor con nombre y cara ("Ana, tu asesora de uniformes", como en el manual) · bloque "¿Compras para tu liga o escuela?" | Densidad de enlaces y marcas de terceros al frente |
| **Custom Ink (Group Order)** — https://www.customink.com/ink/group-order-form | Captura de **cantidades por talla** en una sola vista; "comprar por tamaño de grupo". | Matriz talla × cantidad (FR-M2-2) · total de piezas visible en todo momento · atajos tipo "equipo de 12 / 20 / 30" | Formularios largos de diseño en línea |
| **Kitlocker** — https://kitlocker.com/football/ | Teamwear por deporte; comunica descuentos por volumen y tiendas de club. | Mensajes de volumen sin precio ("más piezas, mejor precio") · landings por deporte | Tiendas por club (fuera de alcance) |
| **owayo** — https://www.owayo.com/soccer/team_kit_set-us.htm | Presenta el **juego de equipación** (jersey + short + medias) como un solo producto. | Ficha de "Uniforme completo" que muestra las 3 piezas y qué se personaliza | El configurador 3D (descartado en PRD D6) |

### B. Grandes catálogos (navegación, filtros, fichas)

| Sitio | Qué observar | Qué tomar para P&P | Qué no copiar |
|---|---|---|---|
| **Decathlon México** — https://www.decathlon.com.mx/descubre-mas-de-65-deportes | Arquitectura **"por deporte"** (65+) y filtros por público (hombre, mujer, infantil). | Deporte como puerta principal · filtro "público" · índice de deportes simple | Listado solo de texto sin imágenes |
| **Nike** — https://www.nike.com/mx/ | Tarjetas con imagen protagonista, filtros laterales fijos, ficha limpia con galería grande y selector de tallas claro. | Proporción de tarjetas, jerarquía de la ficha, selector de tallas en rejilla, filtros como "drawer" en móvil | Estética minimalista neutra: P&P es más enérgica (13°, placas, color) |
| **Martí** — https://www.marti.mx/deportes | Competencia local: lenguaje y categorías que el cliente mexicano ya conoce. | Nombres de categorías familiares · sección "Deportes" | Exceso de banners promocionales |
| **Innovasport** — https://www.innovasport.com/ | Menú móvil y localizador de tiendas. | Patrón de "Visítanos" con mapa y horario | Lenguaje de ofertas ("hasta 50% OFF") — el manual evita "barato" |

### C. Fabricantes mexicanos de uniformes

| Sitio | Qué observar | Qué tomar para P&P | Qué no copiar |
|---|---|---|---|
| **Garcis** — https://garcis.com/collections/uniformes | Marca que P&P distribuye. Botón de WhatsApp prominente y sección "Mayoreo". | Validación de que el cliente mexicano espera WhatsApp como canal principal | Colecciones vacías sin mensaje útil: P&P siempre ofrece "Pregúntanos por WhatsApp" |

## 2. Patrones que se adoptan (resumen para diseño)

1. **Deporte primero:** el inicio y el menú abren por deporte; la categoría es el segundo nivel.
2. **Página de deporte = uniformes + equipo + CTA de volumen** (BSN).
3. **Matriz de tallas** con total de piezas siempre visible (Custom Ink).
4. **Uniforme como juego completo** en una ficha (owayo), sin configurador.
5. **Asesor humano visible** con nombre, foto y WhatsApp (BSN + manual pág. 24).
6. **Mensajes de volumen sin precio:** "Precio especial para ligas y escuelas", "Pregunta por paquetes".
7. **Tarjetas con imagen protagonista** y filtros en drawer en móvil (Nike).

## 3. Material fotográfico recibido

Carpeta de Google Drive compartida por el cliente (propietario: semb.mkt@gmail.com), revisada el 29-sep-2026.

| Archivo | Tipo | Tamaño | Producto del CSV |
|---|---|---|---|
| Balon Cruzeiro IMG 1–6 | PNG 1122 × 1402 (4:5) | 1.6–2.6 MB | BAL-002 / BAL-003 (confirmar cuál) |
| Balon Molten IMG 7–8 | PNG 1122 × 1402 (4:5) | 2.2–2.4 MB | BAL-005 |
| VIDEO GASER 1 | MP4 | 4.6 MB | Video del producto GASER (confirmado por el cliente); agregar el producto al CSV cuando se conozcan sus datos |

**Decisión (1-oct-2026): las fotos son contenido, no parte del front.** Las pantallas ya no llevan ninguna foto incrustada: los productos usan la imagen genérica de su categoría y los espacios del sitio muestran un marcador (`[FOTO DE PORTADA]`, etc.). Estas 8 fotos se cargan desde el admin cuando exista, igual que cualquier otra.

**Observaciones (de las muestras revisadas):**

- **Formato 4:5 vertical.** Se adopta **4:5 como proporción estándar** de fotos de producto en tarjetas y fichas (coincide con el formato de Instagram). El pipeline de imágenes del TRD §8 debe recortar/encuadrar a 4:5.
- **Dos estilos:** *estudio* con escenografía de color (balón Cruzeiro rosa sobre fondo rosa) y *estilo de vida* (balón Molten en partido). Las tarjetas no deben depender de fondo blanco: se enmarcan sobre gis `#F5F3EE`.
- **Aspecto generado o muy retocado.** Las escenas se ven sintéticas. El manual (pág. 19) pide gente real de la zona y evitar fotos genéricas; conviene usarlas como provisionales.
- **Logos de otras marcas.** En la foto de estilo de vida los jugadores visten uniformes con logos de Adidas y Nike, más visibles que cualquier elemento de P&P. El manual pide que otras marcas no sean más grandes que la nuestra. **No usar esa foto en portada** y revisar el uso de marcas de terceros.
- **Cobertura:** las 8 fotos cubren 2 de 56 productos. El diseño debe verse bien con **imágenes genéricas por categoría** como estado principal durante el arranque.
- El balón Cruzeiro fotografiado es **rosa con leyenda "México"**; el CSV supone otro color. Corregir en la carga.

## 4. Fotos que hacen falta

| Para | Cuántas | Proporción | Notas |
|---|---|---|---|
| Productos | 54 productos sin foto | 4:5 | Producto sobre fondo gis o noche, luz lateral |
| Portada de Inicio | 1 | 4:3 | Gente real de la zona, acción real; sin logos de terceros dominantes |
| Portada de Uniformes | 1 | 4:3 | Equipo con uniforme hecho por P&P |
| Muestras de técnicas | 3 | 16:10 | Detalle de sublimación, vinil textil y bordado |
| Tienda y taller | 2 | 4:3 | Fachada o interior, y el taller de uniformes |
| Equipos estrenando | 8 o más | 4:5 | Con autorización por escrito (y de tutores si hay menores) |
| Asesora de uniformes | 1 | 1:1 | Opcional; hoy se muestran iniciales |
