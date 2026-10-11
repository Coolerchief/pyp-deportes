# 00 · Estado del proyecto y pendientes

> Índice de la documentación y lista de lo que falta. Se actualiza cada vez que cambia un documento o el diseño.
> **Última actualización:** 11-oct-2026.

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
| Imágenes genéricas de las 10 categorías como archivos | ✅ `apps/web/public/img/placeholder/` (T0.5) |
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
- Cuenta de Cloudflare: Workers, R2, Turnstile. ✅ Cuenta y token de Workers en los secretos de GitHub (11-oct-2026); R2 y Turnstile se configuran más adelante.
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

**Hecho:** T0.4 (componentes base en `apps/web/components/ui`: `Button`, `Badge`, `Chip`, `FormField`, `Sheet`, `EmptyState`, `Skeleton`, `SectionHeader`; hoja `/dev/componentes`; pruebas de teclado de `Sheet`). Badge `custom` en `noche` por contraste.

**Hecho:** T0.5 (10 imágenes genéricas WebP 800 × 1000 en `apps/web/public/img/placeholder/<slug>.webp`, generadas con `pnpm placeholders` desde `ImagenGenerica` vía la hoja `/dev/genericas`; la salida es idéntica byte a byte entre corridas; prueba que verifica los 10 archivos).

**En curso:** T0.6. Listo: `ci.yml` con los trabajos `web` (lint, typecheck, pruebas, build, Playwright) y `db` (pgTAP); `deploy.yml` (push a `main` o manual → `wrangler deploy`); `apps/web/wrangler.jsonc` (Worker `pyp-deportes`, solo *static assets*); `_headers` con caché inmutable de `/_next/static/*`. Secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` cargados en GitHub (11-oct-2026). Falta: primer push a `main` que publique en `workers.dev` (en espera: el usuario pidió no subir nada a `main` todavía).

**Hecho:** T0.7 (`CLAUDE.md` revisado contra el repositorio, 11-oct-2026: activación del `.venv`, `pnpm format`, hojas `/dev/*`, qué genera hoy `pnpm build`, despliegue y estructura real). Comandos probados: `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `placeholders`, `db:link`, `test:db`, `db:types` y `db:import` (avisa que el importador llega en T1.5). `db:reset` no se corrió porque borra pyp-dev y aún no hay migraciones.

**Hecho:** T1.1 (migraciones de extensiones, tipos, personal, taxonomía, catálogo, comercio oculto y triggers; RLS activado en las 11 tablas; 26 pruebas pgTAP de tablas y triggers). `pnpm db:reset` aplicado en pyp-dev (11-oct-2026) y `database.types.ts` regenerado. La salida de la fase 0 (sitio en `workers.dev`) sigue pendiente del primer push a `main`.

**Hecho:** T1.2 (12 tablas más: clientes, contadores de folio, solicitudes con sus líneas e historial, galería con consentimientos, `site_media`, `site_texts`, `settings`, `publish_runs`, `system_heartbeats`; RLS en todas; 14 pruebas pgTAP). El esquema tiene las 23 tablas de §4. `pnpm db:reset` aplicado en pyp-dev (11-oct-2026).

**Hecho:** T1.3 (15 vistas `public_*` de solo lectura, `is_staff`/`is_admin`, políticas RLS por rol y privilegios: `anon` no tiene acceso a ninguna tabla base; pruebas de seguridad 1–6 de §7 en verde, 22 pruebas pgTAP). `pnpm db:reset` aplicado en pyp-dev (11-oct-2026); comprobado también con la API REST y la llave `anon`.

**Hecho:** T1.4 (10 funciones de §8 más ayudantes `require_staff`, `require_admin`, `variant_sku` y `variant_label`; 51 pruebas pgTAP, entre ellas la 7; la 8, de folios simultáneos, con `scripts/folio-concurrency.mjs` dentro de `pnpm test:db` y en CI). Las 8 pruebas de seguridad de §7 pasan contra pyp-dev (11-oct-2026); `pnpm db:reset` aplicado y comprobado con la API REST y la llave `anon`.

**Siguiente paso:** tarea T1.5 (`admin_import_products` y `pnpm db:import`).

## 5. Reglas vigentes que cambian cómo se construye

- **Móvil manda.** Se implementa la pantalla de 390 px y la de escritorio es la misma acomodada a lo ancho.
- **Las fotos son contenido.** Ninguna foto en el repositorio; todas se administran desde el panel.
- **Si un HTML de `design/` y `03-UI-UX.md` difieren**, se avisa y se corrige el que esté mal antes de implementar.
- **Todo dato entre corchetes o marcado ⚠️ es placeholder** y vive en la base de datos o en ajustes, nunca fijo en el código.
