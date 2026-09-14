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

| Script                | Qué hace                                    |
| ---------------------- | -------------------------------------------- |
| `npm run dev`           | Servidor de desarrollo (Turbopack)           |
| `npm run build`         | Build de producción (incluye typecheck + lint) |
| `npm run start`         | Sirve el build de producción                |
| `npm run lint`          | ESLint                                       |
| `npm run typecheck`     | TypeScript sin emitir archivos               |
| `npm run format`        | Prettier — reescribe archivos                |
| `npm run format:check`  | Prettier — solo verifica                     |

## Estado

Fase 1–3 de la migración (inicialización, arquitectura base, componentes globales) completa.
Las 8 secciones oficiales todavía no tienen su contenido final — ver
[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) para el detalle de qué es real, qué es temporal, y
qué decisiones de negocio están pendientes antes de la Fase 6 (Sanity).
