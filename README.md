# P&P Deportes Coapa — catálogo web

Catálogo sin precios: el cliente arma una lista con cantidades por talla y la envía por WhatsApp.
Stack previsto: Next.js estático + Supabase + Cloudflare (ver `docs/02-TRD.md`).

## Ver la primera pantalla (Inicio)

Con GitHub Pages activo: `https://TU_USUARIO.github.io/pyp-deportes-coapa/`

Local: abre `index.html` en el navegador (en pantalla ancha muestra la versión de escritorio de 1440 px; en móvil, la de 390 px).
Referencia: `design/screenshots/movil/inicio.png` y `design/screenshots/escritorio/inicio.png`.

## Contenido

| Carpeta | Qué hay |
|---|---|
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
| `develop` | Integración del desarrollo |
| `feature/pantalla-inicio` | Primera pantalla (Inicio) y vista previa |
| `feature/fase-0-preparacion` | Tarea T0.1 en adelante (`docs/06-IMPLEMENTATION-PLAN.md`) |
| `hotfix/*` | Correcciones urgentes desde `main` |

Flujo: `feature/*` → PR a `develop` → PR de `develop` a `main`. Commits en inglés (`feat:`, `fix:`, `docs:`, `chore:`).
