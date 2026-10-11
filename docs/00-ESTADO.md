# 00 · Estado del proyecto y pendientes

> Índice de la documentación y lista de lo que falta. Se actualiza cada vez que cambia un documento o el diseño.
> **Última actualización:** 9-oct-2026.

## 1. Qué es

Catálogo web de P&P Deportes Coapa: sin precios, el cliente arma una lista con cantidades por talla y la envía a un solo WhatsApp. Preparado para convertirse en e-commerce sin rehacerse. Stack: Next.js estático + Supabase + Cloudflare (Workers y R2), costo fijo ≈ $0.

## 2. Documentos

| # | Documento | Versión | Estado | Contenido |
|---|---|---|---|---|
| 01 | `01-PRD.md` | 0.3 | ✅ Al día | Qué se construye, requisitos por módulo, decisiones D1–D14, preguntas abiertas |
| 02 | `02-TRD.md` | 0.3 | ✅ Al día | Arquitectura, stack, límites de planes, repositorio, reglas técnicas, ruta a e-commerce |
| 03 | `03-UI-UX.md` | 0.2 | ✅ Al día | Tokens, componentes, estados, inventario de 46 pantallas, microcopy |
| 04 | `04-APP-FLOW.md` | 0.1 | ✅ | Mapa del sitio, flujos del visitante, envío con y sin folio, casos de error, panel, publicación, analítica por paso |
| 05 | `05-BACKEND-SCHEMA.md` | 0.1 | ✅ | 23 tablas, vistas públicas, seguridad por fila, funciones, contratos de las 4 Edge Functions, datos semilla |
| 06 | `06-IMPLEMENTATION-PLAN.md` | 0.1 | ✅ | 8 fases, 54 tareas con qué leer y cómo saber que terminaron, checklist de salida a producción |
| — | `CLAUDE.md` (raíz del repo) | — | ✅ | Reglas del repositorio para Claude Code |
| — | `data/catalogo-inicial.csv` | — | ✅ | 56 productos (48 del sitio actual, 8 inventados); tallas y colores supuestos |
| — | `data/sitio-actual.md` | — | ✅ Al día | Sitio WordPress actual, datos del negocio, taxonomía, formato del importador |
| — | `data/referencias-y-fotos.md` | — | ✅ Al día | Sitios de referencia, fotos recibidas, fotos que faltan |
| — | `brand/logos/` | — | ⚠️ Reconstruidos | 12 SVG; sustituir por los archivos maestros del diseñador |

## 3. Diseño (Claude Design)

| Entregable | Estado |
|---|---|
| Sistema de diseño "P&P Deportes Coapa": reglas, tokens, fuentes, logos, 12 componentes | ✅ |
| 24 pantallas móviles (390 px) | ✅ |
| 22 pantallas de escritorio (1440 px) | ✅ |
| Paquete exportado para VS Code (`design/`): HTML, PNG, tokens, fuentes, logos | ✅ |
| Pantallas del panel de administración | ⬜ Falta |
| Imágenes genéricas de las 10 categorías como archivos | ⬜ Falta (se generan en la fase 1) |
| Página de marca, confirmación sin folio, header compacto, ficha con color y talla | ⬜ Opcional (se resuelven con los componentes existentes) |

## 4. Qué falta, en orden

### A. Documentación
Completa. Los seis documentos y `CLAUDE.md` están escritos. Se actualizan cuando la implementación se desvíe de ellos.

### B. Diseño
- Pantallas del admin (Inicio, Productos, Editor, Importar, Solicitudes, Fotos del sitio). Se puede construir con shadcn/ui desde `03-UI-UX.md` §9 si no se diseñan.

### C. Datos y contenido que debe dar el negocio
| Dato | Dónde aparece | Bloquea salir a producción |
|---|---|---|
| Número de WhatsApp de ventas | Todo el sitio | **Sí** (el build de producción falla sin él) |
| Horario real | Footer, Visítanos, estado "Abierto ahora" | Sí |
| Teléfono y correo vigentes | Footer, Visítanos, aviso de privacidad | Sí |
| Aviso de privacidad: razón social, otros usos, transferencias, medio para derechos ARCO, correo, fecha | `/aviso-de-privacidad` | **Sí** (obligación legal al pedir nombre y teléfono) |
| Pedido mínimo, tiempo de entrega, condiciones de reposición | Uniformes → Preguntas frecuentes | Sí |
| Tallas, colores, telas y materiales reales | Fichas | No (se corrigen en el admin) |
| ¿Se ofrece serigrafía? | Uniformes muestra 3 técnicas; 2 productos la mencionan | No |
| Nombre y foto de la asesora de uniformes | Inicio, Uniformes | No (hoy "[Ana Martínez]") |
| Historia de la tienda y referencias para llegar | Visítanos | No |
| Fotos: productos, portada, uniformes, 3 muestras, tienda, taller, equipos con autorización | Todo el sitio | No (hay marcadores e imagen genérica) |
| Datos del producto GASER (hay un video) | Catálogo | No |
| Archivos maestros del logotipo | Todo | No |
| Coordenadas exactas de la tienda | Mapa | No |

### D. Cuentas y accesos (para la fase 0 del plan)
- Repositorio de GitHub (privado).
- Proyecto de Supabase (plan Free).
- Cuenta de Cloudflare: Workers, R2, Turnstile.
- Acceso al DNS de `pypdeportescoapa.com` (hoy en el hosting de WordPress) y copia de sus registros, sobre todo los de correo.
- Google Analytics 4 y Search Console.

### E. Construcción
En curso. El detalle está en `06-IMPLEMENTATION-PLAN.md`.

**Hecho:** T0.1 (monorepo pnpm: `apps/web`, `packages/shared`, `supabase/`, `workers/cron`; `pnpm build` genera `apps/web/out/`). Pendiente de T0.1: `test:db` no se probó en local por falta de Docker; `db:import` llega con T1.5.

**Hecho:** T0.2 (Tailwind v4 con los tokens en `@theme`, fuentes Barlow con `next/font/local`, 13 estilos `type-*`, estilos base; hoja de muestra en `/dev/tokens`).


| Fase | Objetivo | Tareas |
|---|---|---|
| 0 · Preparación | Repositorio que compila, prueba y despliega una página con la marca | 7 |
| 1 · Datos | Base de datos segura con el catálogo inicial cargado | 8 |
| 2 · Catálogo público | Encontrar y ver cualquier producto | 8 |
| 3 · Cotización | Armar la lista y enviarla por WhatsApp con folio | 9 |
| 4 · Panel de administración | El personal mantiene el catálogo y atiende solicitudes | 10 |
| 5 · Contenido, SEO y migración | Páginas de contenido, redirecciones del sitio actual | 7 |
| 6 · Calidad | Pruebas de punta a punta, accesibilidad, rendimiento, respaldos | 5 |
| 7 · Salida a producción | Datos reales, cambio de dominio (13 pasos) | — |

**Hecho:** modo sin Docker (scripts `db:*` contra pyp-dev con candado, `.env.local`, trabajo `db` de CI con pgTAP). pyp-dev enlazado (10-oct-2026); `pnpm db:types` y `pnpm test:db` probados contra pyp-dev. Aún no existe el proyecto de producción.

**Hecho:** T0.3 (componentes de marca en `apps/web/components/brand`: `Logo`, `Placa`, `DobleDiagonal`, `PatronCancha`, `CorteA13`, `ImagenGenerica`; hoja `/dev/marca`; pruebas de render). CorteA13 en móvil va a ≈7° como el diseño (decidido el 10-oct-2026).

**Siguiente paso:** tarea T0.4 (componentes base). Las cuentas del apartado D se necesitan a partir de T0.6.

## 5. Reglas vigentes que cambian cómo se construye

- **Móvil manda.** Se implementa la pantalla de 390 px y la de escritorio es la misma acomodada a lo ancho.
- **Las fotos son contenido.** Ninguna foto en el repositorio; todas se administran desde el panel.
- **Si un HTML de `design/` y `03-UI-UX.md` difieren**, se avisa y se corrige el que esté mal antes de implementar.
- **Todo dato entre corchetes o marcado ⚠️ es placeholder** y vive en la base de datos o en ajustes, nunca fijo en el código.
