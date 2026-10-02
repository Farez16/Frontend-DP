# DP Agencia Deportiva — Frontend

Frontend real de DP Agencia Deportiva. Next.js 16 (App Router) + TypeScript + Tailwind CSS v4.
Independiente del prototipo visual (`stitch_dp_elite_editorial_hub/`), que sigue siendo la
referencia de diseño y no se modifica.

Documentación técnica completa (arquitectura, decisiones, qué falta): **[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)**.

## Requisitos

- Node.js 20+ (probado con Node 24 / npm 11)

## Empezar

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Scripts

| Script                 | Qué hace                                       |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | Servidor de desarrollo (Turbopack)             |
| `npm run build`        | Build de producción (incluye typecheck + lint) |
| `npm run start`        | Sirve el build de producción                   |
| `npm run lint`         | ESLint                                         |
| `npm run typecheck`    | TypeScript sin emitir archivos                 |
| `npm run format`       | Prettier — reescribe archivos                  |
| `npm run format:check` | Prettier — solo verifica                       |

## Estado

Al 2026-10-02: Fases 1–3 de la migración (inicialización, arquitectura base, componentes
globales) completas; Fase 4 casi completa —todas las páginas son reales salvo Medios, e Inicio
sigue sin hero de video—; Sanity conectado (Fase 6) para talentos, noticias, conferencias,
proyectos y marcas; Fase 7 (JSON-LD, `sitemap.ts`, `robots.ts`) pendiente. El detalle de qué
es real, qué falta y qué decisiones de negocio siguen abiertas está en
[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).
