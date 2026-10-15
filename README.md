# P&P Deportes Coapa — catálogo web

Catálogo sin precios: el cliente arma una lista con cantidades por talla y la envía por WhatsApp.
Stack previsto: Next.js estático + Supabase + Cloudflare (ver `docs/02-TRD.md`).

## Ver la primera pantalla (Inicio)

Con GitHub Pages activo: `https://coolerchief.github.io/pyp-deportes/`

Local: abre `index.html` en el navegador (en pantalla ancha muestra la versión de escritorio de 1440 px; en móvil, la de 390 px).
Referencia: `design/screenshots/movil/inicio.png` y `design/screenshots/escritorio/inicio.png`.

## Entorno de desarrollo

Node y pnpm viven aislados dentro de un entorno virtual (`.venv`, no se versiona):

```bash
python -m venv .venv
.venv/Scripts/python -m pip install nodeenv        # en Linux/macOS: .venv/bin/...
.venv/Scripts/nodeenv -p --node=24.14.0 --prebuilt
source .venv/Scripts/activate                       # PowerShell: .venv\Scripts\Activate.ps1
npm install -g pnpm@10.20.0                         # se instala dentro de .venv
pnpm install
pnpm exec playwright install chromium               # desde apps/web, solo para pruebas E2E
```

Después de activar el entorno: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` y `pnpm placeholders` (regenera las imágenes genéricas de categoría). Base de datos (sin Docker, contra el proyecto remoto pyp-dev): copia `.env.example` a `.env.local`, llénalo, corre `node_modules\.bin\supabase login` una vez y luego `pnpm db:link`. `pnpm build` lee el catálogo de pyp-dev con las variables `NEXT_PUBLIC_SUPABASE_*` de `.env.local`; CI usa la copia `apps/web/fixtures/build-data.json` (se regenera con `pnpm --filter @pyp/web data:snapshot`). Después: `pnpm db:setup` (borra pyp-dev, aplica migraciones y semilla, e importa el catálogo inicial), `pnpm db:types`, `pnpm test:db`. Edge Functions: `pnpm test:functions` (parte de `pnpm test`) necesita Deno; el entorno trae `deno.exe` 2.9.7 en `.venv/Scripts` (binario oficial de `denoland/deno`, verificado con su SHA-256). `pnpm functions:deploy` publica `submit-quote` y `sign-upload` en pyp-dev con sus secretos de `.env.local` (las fotos necesitan los `DEV_R2_*`; ver `docs/00-ESTADO.md`). Para poder entrar con el admin de desarrollo (`admin@pyp.test`) define `SUPABASE_DEV_ADMIN_PASSWORD` en `.env.local` antes de correr `db:setup` o `db:reset`, o aplícala sin borrar nada con `pnpm db:admin-password`. `pnpm db:migrate` aplica a pyp-dev solo las migraciones nuevas, sin tocar sus datos. Nunca enlaces el proyecto de producción.

## Contenido

| Carpeta | Qué hay |
|---|---|
| `apps/web/` | Sitio Next.js (exportación estática a `apps/web/out`) |
| `packages/shared/` | Reglas de negocio compartidas (TypeScript puro) |
| `supabase/` | Configuración, migraciones, funciones y pruebas de la base |
| `workers/cron/` | Worker de tareas programadas |

## Despliegue

Cada push a `main` corre `.github/workflows/deploy.yml`: compila el sitio y lo publica con `wrangler deploy` en Cloudflare Workers (Worker `pyp-deportes`, configurado en `apps/web/wrangler.jsonc`). También se puede lanzar a mano desde la pestaña Actions. Usa los secretos del repositorio `CLOUDFLARE_API_TOKEN` (permiso de edición de Workers), `CLOUDFLARE_ACCOUNT_ID`, y `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` de producción (el build lee el catálogo de sus vistas públicas). Para revisar sin publicar: `pnpm build` y luego `pnpm --filter @pyp/web exec wrangler deploy --dry-run`. Mientras no se haga el cambio de dominio, todo build sale con `noindex` (meta robots y `robots.txt`); solo `SITE_INDEXABLE=true` lo quita.

La base de datos de producción se actualiza solo con `.github/workflows/db-production.yml` (nunca con `supabase link`): aplica las migraciones pendientes, la semilla base la primera vez, apaga el registro público de Auth, crea el primer admin y verifica que `anon` no lea tablas base. Solo se lanza a mano desde la pestaña Actions, sobre `main`, escribiendo `PRODUCCION`. Usa los secretos del repositorio descritos en `docs/02-TRD.md` §9.3.
| `docs/` | PRD, TRD, UI/UX, flujos, esquema de base de datos, plan de implementación, datos y logos |
| `design/screens/` | 24 pantallas móviles y 22 de escritorio en HTML (navegables entre sí) |
| `design/screenshots/` | Las mismas pantallas en PNG |
| `design/tokens/` | Colores, tipografía, espaciado y guía de componentes |
| `CLAUDE.md` | Reglas del repositorio para Claude Code |

> Los HTML de `design/` son **referencia visual** (medidas fijas), no el código final de la app.

## Ramas

| Rama | Uso |
|---|---|
| `main` | Versión estable / publicada (GitHub Pages) |
| `develop` | Desarrollo e integración de cambios |

Flujo: se trabaja en `develop`; cuando algo queda probado, se pasa a `main` con un Pull Request. Commits en inglés (`feat:`, `fix:`, `docs:`, `chore:`).
