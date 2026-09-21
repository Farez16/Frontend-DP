# Arquitectura — Frontend DP Agencia Deportiva

Documentación técnica del estado actual (Fases 1–3 de la migración). No es una copia de la
auditoría de Fase 0 — para el análisis completo del prototipo original, ver ese informe
("Blueprint de Migración DP"). Esto es lo necesario para seguir trabajando desde acá.

## Stack real (no lo que la auditoría asumía)

- **Next.js 16.3.5**, App Router, Turbopack. Esta versión introdujo cambios reales de API
  respecto a versiones anteriores — ver `AGENTS.md` / `node_modules/next/dist/docs/` antes de
  asumir patrones de versiones previas. Los más relevantes para este proyecto:
  - `PageProps<'/ruta/[param]'>` y `LayoutProps<'/ruta'>` son helpers de tipo **globales**
    (sin import), generados por `next dev`/`next build`. Se usan en todas las páginas
    dinámicas en vez de tipar `params`/`searchParams` a mano.
  - **Cache Components** (`cacheComponents: true` en `next.config.ts`) existe pero está
    **desactivado a propósito** en esta fase — el modelo de renderizado tradicional alcanza
    mientras los datos sean locales y síncronos (`lib/data/*`). Evaluar al conectar Sanity en
    la Fase 6, cuando haya fetches asíncronos reales.
- **React 19.2.8**.
- **Tailwind CSS v4** — CSS-first, sin `tailwind.config.ts`. Los tokens viven en
  `app/globals.css` dentro de un bloque `@theme`. Esto es una diferencia real con lo que
  proponía la auditoría de Fase 0 (que asumía `tailwind.config.ts` como probable) — se adaptó
  a la tecnología real en vez de forzar la estructura obsoleta, como pedía la autorización de
  esta fase.
- **TypeScript strict** + `noUncheckedIndexedAccess`.
- **ESLint** (`eslint-config-next`) + **Prettier** (se evaluó y se agregó — bajo costo, evita
  discusiones de formato).

## Decisiones de arquitectura y por qué

### Tokens de diseño: 15 colores reales, no los 40+ del export de Stitch

`app/globals.css` transcribe únicamente los tokens de color que el grep sobre el prototipo
confirmó en uso real (ver auditoría §7.2) — no los 40+ tokens Material Design del export
original. Nombres renombrados a semántica simple (`amber`, `foreground`, `surface`, `line`…)
en vez de la jerga M3 (`primary-container`, `on-surface-variant`…), documentado en los
comentarios del propio archivo.

El spacing (20/80/24/32/64/120px del prototipo) **no** se redeclaró — coincide exactamente con
la escala numérica por defecto de Tailwind (`5`/`20`/`6`/`8`/`16`/`30`), así que se usa
directamente. El único ancho de contenedor personalizado (1440px) vive en un solo lugar:
`components/ui/Container.tsx`, no como token de Tailwind.

### Estilos de tipo como clases CSS planas, no como tokens de Tailwind

Los 8 pares tamaño/interlineado del prototipo (`display-hero`, `headline-lg`, `stat-value`…)
son clases CSS normales en `globals.css` (`.text-display-hero`, `.text-heading-lg`, etc.), no
tokens `@theme`. Cada una resuelve su propio salto responsive **internamente** (48px móvil →
120px desktop, por ejemplo), así que nunca hace falta escribir `text-X-mobile md:text-X` en el
código que las usa — el patrón que causó los 2 bugs de overflow que encontró la auditoría
responsive del prototipo original ya no puede repetirse por construcción.

### `Header` siempre sólido — variante transparente-sobre-hero es trabajo de Fase 4

Ninguna página de esta fase tiene un hero full-bleed real, así que `Header` no implementa la
lógica de scroll (transparente→sólido) del prototipo. Se añade cuando exista el hero de video
real de Inicio, en la Fase 4.

### Menú móvil: portal a `document.body` + `inert`

Bug real encontrado verificando en el navegador (no sólo leyendo código): `<MobileNav>` se
renderizaba dentro de `<Header>`, que usa `backdrop-blur` (`backdrop-filter`). Cualquier
`filter`/`backdrop-filter`/`transform` en un ancestro crea un nuevo *containing block* para
descendientes `position:fixed` — el panel del menú quedaba encajonado en los 72px del header en
vez de cubrir la pantalla. Solucionado con `createPortal` a `document.body`.

Además, el panel usa el atributo nativo `inert` (no sólo opacidad/visibilidad) cuando está
cerrado — bloquea foco, clic y lectores de pantalla en un solo atributo, más robusto que lo que
hacía el prototipo original.

### `useSyncExternalStore` en vez de `useState` + `useEffect` para estado "sólo cliente"

`eslint-plugin-react-hooks` (versión instalada con Next 16) incluye la regla
`set-state-in-effect`, que marca como error llamar a un setter de estado de forma síncrona
dentro de un efecto. Dos casos reales de este proyecto necesitaban saber algo que sólo existe
en el cliente (¿ya se vio el brand beat en `sessionStorage`?, ¿ya se montó para poder usar
`createPortal`?) sin poder usar esa lectura para el HTML que manda el servidor. La solución
correcta de React para esto es `useSyncExternalStore` con un snapshot de servidor explícito —
ver `BrandBeat.tsx` y `MobileNav.tsx`. Evita además el parpadeo de contenido que este proyecto
ya sufrió antes (commits "Fix visible flash..." del prototipo original).

### Sin `clsx`/`tailwind-merge`

Se evaluaron; con la cantidad actual de clases condicionales (1–2 por componente), una función
`cn()` de 3 líneas en `lib/utils.ts` cubre el mismo caso sin sumar una dependencia. Reevaluar si
la complejidad condicional crece.

### Material Symbols: `<link>` centralizado, no `next/font/google`

Las 3 tipografías reales (Anton, Archivo Narrow, Dancing Script) usan `next/font/google` — se
autohospedan, cero petición a Google en runtime. Material Symbols Outlined es una fuente de
ícono **variable** con ejes propios (`FILL`/`wght`/`GRAD`/`opsz`) que el prototipo controla vía
parámetros de URL de Google Fonts (`display=block` a propósito, para no mostrar el texto de
respaldo del ligature mientras carga). Se mantiene como un único `<link>` en `app/layout.tsx`
(una vez, no 14 veces como el prototipo) en vez de `next/font/google`, que no expone esos ejes
de forma tan directa. Ver el comentario junto al `<link>` y los 2 `eslint-disable` puntuales que
lo acompañan (documentados, no un silenciado sin razón).

### `AthleteCard`: unificación real, no sólo una nota

El prototipo tenía **dos** implementaciones del mismo componente (`.dp-athlete` en Inicio,
`.athlete-card`/`.athlete-card-hover` en el listado). `components/sections/AthleteCard.tsx` es
una sola implementación dirigida por props (`talento: Talento`), usada en ambos contextos.

### Degradado del hover de `AthleteCard`: clase CSS plana, no utilidades de gradiente de Tailwind

Se intentó primero con las utilidades `from-*`/`to-*`/`group-hover:from-*` de Tailwind
transicionando las variables internas de gradiente — no interpola de forma confiable (las
custom properties no animan por defecto sin `@property`). Se resolvió como en el prototipo
original: una clase CSS con `background: linear-gradient(...)` completo por estado, transicionando
la propiedad `background` directamente. Ver `.athlete-overlay` en `globals.css`.

## Datos temporales (`lib/data/`) — no es Sanity todavía

Fixtures locales, tipados en `types/content.ts` con una forma que ya se parece a lo que una
consulta GROQ devolvería (facilita el reemplazo en la Fase 6). Reglas seguidas a propósito:

- **Sólo contenido real y ya aprobado** — Daniel Pintado (único talento real), las 2 noticias
  reales del prototipo, los nombres reales de sponsors. **Cero** atletas ficticios de relleno
  del prototipo (Camila Ordóñez, Daniela Ríos, etc. — ver auditoría, decisión pendiente #8).
- `Sponsor.logo` es **opcional** a propósito: los PNG de sponsors del prototipo son
  provisionales (decisión pendiente #5), así que no se copiaron. `SponsorMarquee` muestra una
  insignia de texto cuando no hay logo — probado en el navegador, funciona.
- Sólo se copiaron 3 imágenes reales del prototipo (`daniel-pintado.jpg`,
  `temporada-2026.jpg`, `conferencia-ueb.jpg`, en `public/`) — las necesarias para probar
  `next/image` de punta a punta con contenido real, no assets ficticios ni hotlinked.

## Estructura de carpetas

```
app/
├── layout.tsx              Fuentes, metadata base, Header, Footer
├── page.tsx                 Inicio (hero simplificado + 3 secciones reales)
├── icon.tsx                 Favicon generado (next/og)
├── not-found.tsx
├── talentos/
│   ├── page.tsx
│   └── [slug]/
│       ├── page.tsx
│       └── patrocinar/page.tsx
├── noticias/
│   ├── page.tsx
│   └── [slug]/page.tsx
├── conferencias/, proyectos/, medios/, nosotros/, contacto/
│   └── page.tsx             Placeholders honestos (PlaceholderNotice)
└── globals.css
components/
├── layout/                  Header, NavLink, MobileNav, Footer, BrandBeat
├── ui/                      Button, Container, SectionHeading, ArrowLink,
│                             StatBlock, Pill, Icon, PlaceholderNotice
└── sections/                 AthleteCard, NewsCard, SponsorMarquee,
                              MediaSwitcher, Expandable
lib/
├── fonts.ts, nav.ts, utils.ts
└── data/                     talentos.ts, noticias.ts, sponsors.ts (temporales)
types/content.ts
public/talentos/, public/noticias/   (3 fotos reales copiadas, ver arriba)
```

`sanity/` no existe todavía — se crea en la Fase 6 cuando haya algo real para poner ahí; una
carpeta vacía hoy no aportaría nada.

## Componentes — Server vs. Client

**Client** (necesitan estado/API del navegador — la única razón válida):

- `NavLink` — `usePathname()` para el estado activo.
- `MobileNav` — abrir/cerrar, portal, foco, Escape, resize.
- `BrandBeat` — `sessionStorage`, temporizador, teclado.
- `MediaSwitcher` — qué medio está activo, play/pause de video.
- `Expandable` — abierto/cerrado del acordeón.

**Todo lo demás es Server Component**, incluido `SponsorMarquee` — su animación es
`@keyframes` puro en CSS, no necesita JavaScript de cliente en absoluto.

## Rutas

| Ruta | Contenido | Notas |
| --- | --- | --- |
| `/` | Real (parcial) | Hero sin video/brand beat todavía |
| `/talentos` | Real | Grid con `AthleteCard` |
| `/talentos/[slug]` | Real (mínimo) | `generateStaticParams` sobre `lib/data/talentos.ts` |
| `/talentos/[slug]/patrocinar` | Placeholder | Depende de decisión pendiente #7 (servicio de envío) |
| `/noticias` | Real | Grid con `NewsCard` |
| `/noticias/[slug]` | Real (mínimo) | Cuerpo completo (Portable Text) llega con Sanity |
| `/conferencias`, `/proyectos`, `/medios`, `/nosotros`, `/contacto` | Placeholder | Contenido real en Fase 4 |

## SEO base implementado

`metadata` con `title.template`, `description`, `metadataBase` (`somosdp.com`, ya confirmado
por el cliente) y `openGraph` base en el layout raíz; `generateMetadata` por página dinámica.
**No** implementado todavía (Fase 7, según el plan de la auditoría): JSON-LD, `sitemap.ts`,
`robots.ts`, imágenes OG dinámicas por página.

## Validado

`npm run lint`, `npm run typecheck` y `npm run build` — limpios, sin advertencias sin
justificar (los 2 `eslint-disable` puntuales están documentados en el código). Verificado en
navegador: render de Inicio, responsive en mobile (375px) y desktop (1440px), apertura/cierre
real del menú móvil con navegación funcional, ruta dinámica `/talentos/daniel-pintado`.

**Actualización 2026-09-14** (tras registrar las decisiones #1/#2/#7/#8/#12 y el ajuste de
"talento único" en Inicio y `/talentos`): re-ejecutados `lint`/`typecheck`/`build`, limpios.

**Actualización 2026-09-14 (más tarde el mismo día) — focus trap de `MobileNav` corregido.**
Mientras el panel está abierto, todo lo que no sea el panel (`Header`, `main`, `Footer`) se
marca `inert`, y Tab/Shift+Tab ciclan manualmente dentro del panel (último→primero,
primero→último). `role="dialog"` + `aria-modal="true"` agregados. Detalle completo, incluido un
bug real de timing encontrado y corregido en el propio proceso (devolver el foco al botón que
abrió el menú no puede ser síncrono con el `setIsOpen(false)` que lo dispara — hay que esperar
a que el efecto de `inert` limpie primero), en [[project-frontend-dp-fase1-3]]. `lint`/
`typecheck`/`build` limpios. Siguiente paso, todavía sin empezar: auditar `Studio-DP`.

## Pendiente para la Fase 4+

- Migrar las 8 páginas completas con su contenido y layout real (hoy: Inicio parcial, Talentos
  y Noticias con listados reales, el resto son placeholders honestos).
- `LeadForm` (formulario de contacto real) — todavía no construido. Ya no depende de una
  decisión pendiente: la decisión #7 (Resend + Route Handler) está tomada, ver arriba.
- Hero de video + `BrandBeat` montado en Inicio (el componente ya existe).
- Ficha completa de talento (hitos, galería, sponsors por tier, redes) — hoy sólo nombre,
  disciplina, hito destacado y bio corta.

## Decisiones de negocio (de la auditoría de Fase 0)

Se numeran igual que en la auditoría de Fase 0 y en la auditoría de Fases 1-3 (2026-09-14),
para que el número siga significando lo mismo en comentarios de código y en memoria. El
2026-09-14, tras la auditoría de Fases 1-3, el usuario resolvió 5 de las 12 — quedan oficiales,
no se vuelven a discutir salvo que cambie la realidad del negocio (ej. un segundo talento real).

### Resueltas (2026-09-14)

1. **Modelo de Gestión / Servicios** → se integra como sección dentro de `/nosotros`. Sin ruta
   `/servicios` propia y sin entrada en el nav principal — coincide con que el nav sugerido por
   el propio cliente nunca incluyó "Servicios". El contenido de los 5 servicios oficiales
   (hoy en el prototipo, `modelo_de_gesti_n_dp_gesti_n_deportiva/code.html`) ya está redactado
   y aprobado; se traslada tal cual a `/nosotros` en la Fase 4, no hace falta reescribirlo.
2. **Para Marcas** → no se construye como página independiente. El caso de negocio real de hoy
   (patrocinar) ya lo cubren `/talentos/[slug]/patrocinar` + Contacto. Regla explícita y
   permanente: nunca atletas ficticios, estadísticas inventadas ni métricas falsas — el
   prototipo actual de "Para Marcas" viola esto (6 atletas inventados, fotos hotlinked de
   `googleusercontent.com`, stats de portafolio inventadas) y no debe usarse como referencia de
   contenido, solo como referencia de layout si algún día se retoma. Revisitar solo cuando el
   roster real crezca más allá de 1-2 talentos y haya sustancia real para una landing de marca.
7. **Servicio de formularios** → Resend + Route Handler propio de Next.js. Flujo: `LeadForm`
   (Client Component) → `app/api/.../route.ts` → validación/anti-spam → Resend → correo del
   equipo. Los leads **no** se guardan en Sanity — Sanity queda como CMS de contenido editorial
   únicamente. Se implementa junto con `LeadForm` en Fase 4/5 (todavía no instalado: sigue sin
   agregarse la dependencia `resend` ni el route handler, eso no era parte de este cambio).
8. **Talentos ficticios** → nunca, permanente. El roster muestra únicamente talento real —
   `lib/data/talentos.ts` ya cumplía esto (cero atletas ficticios). Mientras exista un solo
   talento real (Daniel Pintado), Inicio y `/talentos` se comunican explícitamente como
   "talento destacado" en vez de como un roster/grid a medio llenar — ver "Presentación de
   talento único" más abajo. La condición vive en el código (`length === 1`), así que en cuanto
   haya 2+ talentos reales el layout de grid normal vuelve solo, sin que haga falta recordarlo.
12. **Convención de rutas — Medios** → `/medios` es definitiva, no cambia a `/medios-y-prensa`.
    No se investigó si `somosdp.com` ya está indexado (el usuario pidió no bloquear por eso);
    si en el futuro se quisiera cambiar de todos modos, revisar primero si hace falta un
    `redirect` permanente en `next.config.ts`.

### Pendientes

Ninguna bloquea la Fase 4, pero conviene resolverlas antes de fijar los schemas de Sanity en
la Fase 6:

3. ¿Ruta de patrocinio anidada (`/talentos/[slug]/patrocinar`, ya así en el código) o plana?
4. ¿"Conferencias" necesita un sub-tipo repetible ("Aparición") en Sanity?
5. ¿Los logos de sponsors actuales son assets finales o placeholders?
6. ¿El logo de DP es final o un placeholder de Stitch?
9. ¿Sanity Studio embebido en `/studio` o desplegado por separado?
10. ¿Sitio 100% en español, permanente?
11. ¿`conferencias-daniel.mp4` migra a Bunny Stream antes del lanzamiento?

### Presentación de talento único (ajuste de Fase 1-3, 2026-09-14)

Con un solo talento real, forzar el grid de "roster" original (pensado para varios) dejaba una
tarjeta sola dentro de columnas vacías — se leía como contenido faltante, no como diseño
intencional. Ajustado en `app/page.tsx` (sección "Nuestros talentos" de Inicio) y
`app/talentos/page.tsx` (listado): cuando `talentos`/`talentosDestacados` tiene exactamente 1
elemento, se renderiza como una pieza "talento destacado" (en Inicio: solo la tarjeta —foto, disciplina
y nombre—, sin `hitoDestacado` ni bio) en vez de forzar la grilla de 2-3 columnas. Ambos usan la
misma condición de longitud — no hay una bandera manual que alguien deba recordar apagar; el
día que haya 2+ talentos reales, vuelve a ser un grid normal automáticamente. No se agregó
ninguna franja "Próximamente / nuevos talentos" — quedó propuesta, no construida, a la espera
de que el usuario confirme si la quiere.

**Actualización 2026-09-21** — en Inicio, la pieza "talento destacado" muestra solo la tarjeta,
centrada; `hitoDestacado` y bio ya no aparecen ahí (siguen en los datos y en la ficha
`/talentos/[slug]`).
