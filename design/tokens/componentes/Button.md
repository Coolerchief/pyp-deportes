# Button

Botón de acción con forma de placa a 13° para las acciones que importan; rectangular para las secundarias.

- **primary** (`rojo`, texto `blanco`): la acción de la pantalla — "Agregar a mi cotización", "Ver catálogo". Una por vista.
- **secondary** (`noche`, texto `blanco`): acción fuerte alternativa sobre fondos claros.
- **whatsapp** (`whatsapp`, glifo y texto `noche`): enviar la cotización o preguntar por un producto. Nunca texto blanco encima.
- **outline** (borde 2px `noche`): acciones de apoyo ("Ver tallas", "+ Cotizar" en tarjetas).
- **ghost** (texto `rojo-profundo`): acciones terciarias ("Limpiar", "Vaciar mi lista").
- Tamaños: `lg` 56px (CTA de ficha y cotización), `md` 48px, `sm` 40px. Área táctil mínima 44 × 44.
- Etiqueta en estilo `button` (Barlow Condensed 700, 19px, mayúsculas); 19px es el mínimo para que blanco sobre `rojo` cumpla AA grande.
- Foco: la placa recorta el `outline`, así que envuelve el botón en `.pyp-btn-wrap` (anillo `lima` de 3px + contorno `noche`).
- El consumidor provee: texto (verbo primero), ícono opcional, `href` o `onClick`, estado `disabled`/`loading` ("Enviando…").
- No: dos primarios en la misma vista, texto en minúsculas, íconos solos sin `aria-label`.
