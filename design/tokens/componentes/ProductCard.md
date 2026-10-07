# ProductCard

Tarjeta del catálogo: foto 4:5, marca, nombre, metadatos y una acción; sin precio en modo catálogo.

- Imagen 4:5 sobre `gis` (o ImagenGenerica); badges arriba a la izquierda, máximo dos.
- Marca en eyebrow `grafito-suave`; nombre en `body-strong` `noche` (2 líneas máx.); metadatos en `small` `grafito-suave` ("6 tallas · 3 colores").
- `PriceSlot` reservado entre metadatos y acción: hoy no ocupa espacio; en modo tienda muestra el precio en estilo `number`.
- Acción: sin variantes → botón outline sm "+ Cotizar" (agrega 1); con variantes → "Ver tallas" y toda la tarjeta lleva a la ficha.
- Estado "En tu cotización": check `exito` + piezas agregadas.
- Destino: un producto con personalización abre la ficha con tallas y texto de personalización; uno sin personalización (un balón) abre la ficha sencilla, con cantidad por tamaño.
- Cargando: tarjeta esqueleto con la misma proporción (imagen `gis`, líneas `linea`).
- El consumidor provee: producto (nombre, marca, imagen o categoría, badges, número de tallas/colores, si tiene variantes).
