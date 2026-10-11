# P&P Deportes Coapa — catálogo web

Catálogo sin precios de una tienda deportiva que vende por volumen a ligas, escuelas y equipos. El visitante arma una lista con cantidades por talla y la envía a un solo WhatsApp; cada envío se guarda con folio. Está hecho para convertirse en e-commerce sin rehacerse.

## Antes de cualquier tarea

1. Lee `docs/00-ESTADO.md` (qué está listo y qué falta).
2. Lee la tarea en `docs/06-IMPLEMENTATION-PLAN.md` y los documentos que indica.
3. Mira la pantalla de referencia en `design/screenshots/movil/` y luego la de `escritorio/`.

| Necesitas saber | Documento |
|---|---|
| Qué se construye y por qué | `docs/01-PRD.md` |
| Arquitectura, stack, reglas técnicas | `docs/02-TRD.md` |
| Tokens, componentes, pantallas, textos | `docs/03-UI-UX.md` |
| Flujos y casos de error | `docs/04-APP-FLOW.md` |
| Tablas, seguridad, funciones | `docs/05-BACKEND-SCHEMA.md` |
| Orden de trabajo | `docs/06-IMPLEMENTATION-PLAN.md` |

## Stack

Next.js 16 (App Router, `output: 'export'`) · React 19 · TypeScript estricto · Tailwind v4 · Zustand · React Hook Form + Zod · MiniSearch · Supabase (Postgres, Auth, Edge Functions) · Cloudflare Workers (static assets), R2 y Turnstile · pnpm · Vitest, Testing Library, Playwright, pgTAP.

No agregues dependencias sin anotarlas en `docs/02-TRD.md` §3.

## Comandos

```bash
pnpm dev            # sitio en http://localhost:3000 (datos de pyp-dev vía .env.local)
pnpm build          # genera apps/web/out, catalog.json y _redirects
pnpm lint
pnpm typecheck
pnpm test           # Vitest + pruebas de scripts/
pnpm test:e2e       # Playwright contra el build estático
pnpm db:link        # enlaza la CLI con pyp-dev (solo pyp-dev)
pnpm test:db        # pgTAP contra pyp-dev (scripts/pgtap.mjs; cada prueba: begin…rollback y create extension pgtap)
pnpm db:reset       # migraciones + semilla en pyp-dev (borra sus datos)
pnpm db:types       # regenera packages/shared/database.types.ts desde pyp-dev
pnpm db:import docs/data/catalogo-inicial.csv   # importa a pyp-dev (T1.5)
```

**Modo sin Docker.** No hay base de datos local: los comandos `db:*` y `test:db` usan el proyecto remoto de desarrollo **pyp-dev** con `--linked`, a través de `scripts/supabase-dev.mjs`, que aborta si el proyecto enlazado no es `SUPABASE_DEV_PROJECT_REF`. La configuración vive en `.env.local` de la raíz (plantilla: `.env.example`). En GitHub Actions, el trabajo `db` corre pgTAP contra un Postgres desechable del runner. Detalle: `docs/06-IMPLEMENTATION-PLAN.md`, fase 1.

Antes de dar una tarea por terminada: `pnpm lint && pnpm typecheck && pnpm test`.

## Estructura

```
apps/web/            Next.js: sitio público en app/(public), panel en app/admin
packages/shared/     Esquemas Zod, tipos, folio, normalización de texto (sin dependencias de Node)
supabase/            migrations/, functions/, seed.sql, tests/
workers/cron/        Latido, publicación nocturna, respaldo
docs/                Documentación (fuente de verdad)
design/              Referencia visual exportada de Claude Design (no es código de la app)
```

## Reglas que no se rompen

1. **El sitio público es estático.** Las páginas públicas no consultan la base de datos en tiempo de visita. La única llamada al servidor es `submit-quote`.
2. **El sitio público lee solo vistas `public_*`.** Nunca tablas base ni columnas de precio o existencias.
3. **Ninguna foto en el repositorio.** En `public/` solo van logos, favicon y las imágenes genéricas de categoría. Lo demás está en R2.
4. **Ningún dato del negocio fijo en el código.** WhatsApp, horario, dirección, textos y fotos del sitio vienen de `settings`, `stores`, `site_texts` y `site_media`.
5. **Un fallo técnico nunca impide enviar la lista por WhatsApp.** Si guardar falla, se abre WhatsApp sin folio.
6. **Móvil manda.** Se implementa primero la vista de 390 px; la de escritorio es la misma acomodada a lo ancho.
7. **La llave `service_role` nunca llega al navegador ni al build público.**
8. **Nunca se enlaza el proyecto de producción** desde una máquina de desarrollo ni con `supabase link`. Solo pyp-dev, y siempre con `pnpm db:link`.
9. **Cambios de esquema solo con migraciones nuevas.** Después: `pnpm db:types` y prueba pgTAP si se toca seguridad. No edites migraciones ya aplicadas.
10. **Reglas de negocio compartidas en `packages/shared`**, con pruebas.
11. **Todo producto tiene al menos una variante;** la lista de cotización siempre guarda `variantId`.

## Convenciones de código

- Código, identificadores, commits y nombres de tablas en **inglés**. Interfaz y contenido en **español de México**, de "tú".
- Componentes de marca desde `components/brand` (`Placa`, `DobleDiagonal`, `PatronCancha`, `ImagenGenerica`). No recrees estilos de marca a mano.
- Colores y tipografía solo desde los tokens de Tailwind (`docs/03-UI-UX.md` §2). Nada de valores hexadecimales sueltos.
- Los componentes no leen flags directamente: usan `useCommerceMode()`.
- `design/` es referencia visual: no importes de ahí código ni estilos en línea.
- Accesibilidad: foco visible, botones y enlaces reales, hojas y ventanas con trampa de foco, errores con texto e ícono además de color.
- Texto blanco sobre `rojo` solo a 19 px bold o más; nunca `lima` como texto sobre fondo claro; el botón de WhatsApp lleva texto `noche`.

## Si algo no cuadra

- Si un HTML de `design/` y `docs/03-UI-UX.md` difieren, dilo y pregunta antes de implementar.
- Si la implementación obliga a desviarse de un documento, actualiza el documento en el mismo cambio.
- Los textos entre corchetes (`[HORARIO]`, `[PEDIDO MÍNIMO]`) son datos pendientes: van a la base de datos como están, no se inventan.
