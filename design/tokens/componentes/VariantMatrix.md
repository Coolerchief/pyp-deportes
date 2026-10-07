# VariantMatrix

Captura de cantidades por talla en una sola vista, con total de piezas siempre visible; es el corazón de la venta por volumen.

- Filas: talla en Barlow Condensed 700 18px · stepper (− input +, 44px de alto, borde `borde-control`) · subtotal en `small`.
- Atajos de volumen: chips "Equipo de 12 / 18 / 24" que llenan una distribución sugerida editable.
- Pie: "Total" en estilo `number` + botón primary lg "Agregar a mi cotización" (deshabilitado con 0 piezas).
- Con color y talla: primero se elige el color (placas con muestra), luego las tallas de ese color; el resumen muestra piezas por color.
- Teclado: Tab entre inputs, ↑/↓ suman o restan; máximo 9 999 por talla.
- El consumidor provee: tallas, colores, cantidades iniciales y `onAdd(lines)`.
