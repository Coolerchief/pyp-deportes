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

Después de activar el entorno: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`. `pnpm test:db` y `pnpm db:reset` necesitan Docker para la base local de Supabase.

## Contenido

| Carpeta | Qué hay |
|---|---|
| `apps/web/` | Sitio Next.js (exportación estática a `apps/web/out`) |
| `packages/shared/` | Reglas de negocio compartidas (TypeScript puro) |
| `supabase/` | Configuración, migraciones, funciones y pruebas de la base |
| `workers/cron/` | Worker de tareas programadas |
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
