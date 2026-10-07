# FormField

Campo de formulario de la cotización: etiqueta arriba, input de 48px, ayuda o error abajo.

- Etiqueta Barlow 600 14px `noche`; input borde `borde-control`, radio `radius-sm`, texto 16px (evita zoom en iOS).
- Foco: anillo `lima` con contorno `noche`. Error: borde 2px `rojo-profundo` + mensaje con ícono y el mismo color debajo; el mensaje sustituye a la ayuda.
- Al enviar con errores, un resumen arriba del formulario dice cuántos datos faltan y cuáles. La casilla del aviso de privacidad también marca error.
- WhatsApp: prefijo fijo "+52" y `inputmode="numeric"` (10 dígitos).
- El consumidor provee: etiqueta, nombre, valor, ayuda, error y si es obligatorio.
