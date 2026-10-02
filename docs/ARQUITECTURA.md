# Arquitectura — Frontend DP Agencia Deportiva

Documentación técnica del estado actual (2026-10-02): Fases 1–3 completas; Fase 4 casi
completa —todas las páginas son reales salvo Proyectos y Medios, e Inicio sigue sin hero de
video—; Sanity conectado (Fase 6) para talentos, noticias, conferencias y marcas; Fase 7
(JSON-LD, `sitemap.ts`, `robots.ts`) pendiente. No es una copia de la auditoría de Fase 0 — para el análisis completo del prototipo original, ver ese informe
("Blueprint de Migración DP"). Esto es lo necesario para seguir trabajando desde acá.

## Stack real (no lo que la auditoría asumía)

- **Next.js 16.3.5**, App Router, Turbopack. Esta versión introdujo cambios reales de API
  respecto a versiones anteriores — ver `AGENTS.md` / `node_modules/next/dist/docs/` antes de
  asumir patrones de versiones previas. Los más relevantes para este proyecto:
  - `PageProps<'/ruta/[param]'>` y `LayoutProps<'/ruta'>` son helpers de tipo **globales**
    (sin import), generados por `next dev`/`next build`. Se usan en todas las páginas
    dinámicas en vez de tipar `params`/`searchParams` a mano.
  - **Cache Components** (`cacheComponents: true` en `next.config.ts`) existe pero está
    **desactivado a propósito**, y ya no está pendiente de evaluar: se evaluó al conectar
    Sanity y se decidió seguir con el modelo anterior (opciones de `fetch` + config de
    segmento), que es el que documenta `caching-without-cache-components.md`. Ver la
    decisión #84 más abajo.
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

**Numeración (a partir del 2026-09-29).** Las entradas técnicas nuevas de esta sección llevan el
número que les corresponde en `02_DECISIONES.md`, el registro consolidado del proyecto — que a
esta fecha va hasta `#83`. Así un comentario de código puede escribir "decisión #84" y apuntar a
una sola cosa, sin ambigüedad. Las entradas de esta sección anteriores a esa fecha siguen sin
número, y la lista `#1`–`#12` de "Decisiones de negocio" más abajo **queda como está**: es la
numeración cerrada de la auditoría de Fase 0, con su propio significado, y no se renumera ni se
mezcla con la de `02_DECISIONES.md`.

Al 2026-10-02 la última es la `#85` (Open Graph), y `02_DECISIONES.md` irá hasta ese mismo
número: la próxima decisión técnica toma la `#86`.

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

### `Header` transparente sobre el hero y sólido al scrollear — resuelto (decisión #52)

En las Fases 1–3 el header era siempre sólido: ninguna página tenía un hero full-bleed, y la
lógica de scroll del prototipo se había dejado para cuando existiera el hero de video de Inicio.
Quedó superado por la decisión #52: `HeaderShell`, la única parte del header que es Client
Component, lo deja transparente mientras el scroll no pasa de su propia altura (72px) y sólido
desde ahí, en todas las páginas. El primer hero full-bleed fue el de la ficha de talento, no el
de Inicio, que todavía no tiene video.

### Menú móvil: portal a `document.body` + `inert`

Bug real encontrado verificando en el navegador (no sólo leyendo código): `<MobileNav>` se
renderizaba dentro de `<Header>`, que usa `backdrop-blur` (`backdrop-filter`). Cualquier
`filter`/`backdrop-filter`/`transform` en un ancestro crea un nuevo _containing block_ para
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

### #84 — Caché de las lecturas de Sanity: ISR de 60s, no caché indefinido (2026-09-29)

Todo lo que el sitio lee de Sanity para renderizar pasa por `sanityFetch` (`sanity/client.ts`),
un envoltorio de `client.fetch` que fija `next: { revalidate: 60 }` en un solo lugar. Las
páginas que leen Sanity quedan prerenderizadas con ISR de 60s; las que no leen nada
(`/nosotros`, `/medios`, `/proyectos`) siguen estáticas puras, sin `revalidate`.

**Por qué existe.** Sin `revalidate` explícito, Next guardaba cada respuesta de Sanity en su
Data Cache (`.next/cache/fetch-cache`) con `revalidate: 31536000` — un año, que es el valor que
hereda un fetch descubierto en una ruta con `revalidate = false`. Ese directorio se comparte
entre builds a propósito, y en hosts como Vercel sobrevive a los redeploys, así que publicar en
el Studio **no se reflejaba en un build nuevo** hasta borrar el caché a mano. Verificado en un
build real: con el código anterior, un cambio ya visible en `apicdn.sanity.io` salía viejo en el
HTML generado y ningún archivo del caché se reescribía.

**Por qué 60s y no otra cosa.** Es el valor que usa la propia guía de Sanity para Next
("Caching and revalidation in Next.js"). Da freshness razonable sin montar infraestructura de
webhook, y de paso vence la entrada del caché entre un build y el siguiente, que es lo que
arregla el bug. Se descartaron `cache: 'no-store'` y `revalidate: 0`: vuelven las rutas
dinámicas y matan el prerenderizado.

**Ventana conocida.** Publicar y rebuildear dentro del mismo minuto puede salir con contenido
viejo — la entrada del caché todavía no venció. En runtime se corrige solo al minuto siguiente.
Si algún día hace falta que sea inmediato y exacto, el camino es el otro que documenta Sanity:
`next: { tags }` + un webhook del Studio que llame a `revalidateTag`, y ahí `revalidate` pasa a
`false`. No se construyó porque pide route handler, webhook y secreto nuevos.

**Los `generateStaticParams` quedan afuera**, con `client.withConfig({ useCdn: false })` directo
y sin `revalidate`: Next no guarda en el Data Cache los fetch de esa fase —verificado leyendo
`.next/cache/fetch-cache` tras un build, cero entradas de esas queries—, así que ya ven siempre
la lista de slugs fresca. Ojo con la intuición inversa: `withConfig({ useCdn: false })` **no**
exime del Data Cache; lo que salva a esos fetch es la fase en la que corren, no el host.

Esto es independiente del `useCdn: process.env.NODE_ENV === "production"` del cliente, que no
cambió. Son dos cachés distintos: el CDN de Sanity y el Data Cache de Next. Al diagnosticar
contenido viejo, confirmar primero con `curl` a `apicdn.sanity.io` que el CDN ya sirve el valor
nuevo antes de culpar a Next — el CDN tardó ~25s en propagar un borrado en una prueba real.

### #85 — Open Graph: campos base compartidos e imagen recortada a 1200×630 (2026-10-02)

- **Campos base en un solo lugar.** Next mezcla la metadata de los segmentos a un solo nivel:
  una página que declara su propio `openGraph` reemplaza entero el del layout. Por eso
  `og:type`, `og:locale` y `og:site_name` viven en `OPEN_GRAPH_BASE` (`lib/seo.ts`), que se
  esparce en el layout y en cada página que declara `openGraph`. Una página nueva que no lo
  esparza los pierde sin aviso: hasta esta fecha les pasaba a Inicio, `/talentos` y las tres
  fichas de detalle.
- **El sufijo de `og:title` va a mano.** La plantilla `%s | DP Agencia Deportiva` del layout
  solo se aplica al `<title>`; `og:title` se arma con `conSufijo()`.
- **La imagen siempre va recortada a 1200×630.** `imagenesOpenGraph()` (`sanity/image.ts`)
  devuelve la entrada de `openGraph.images` recortada por el CDN de Sanity, en JPG y con ancho
  y alto declarados, respetando el hotspot y el crop del editor. Por eso las proyecciones de
  `seo.imagenOG` traen `assetRef`, `hotspot` y `crop`, como el resto de las imágenes que se
  recortan. Antes se mandaba el asset original (1,3 MB la foto de Daniel Pintado, 2 MB la
  miniatura PNG de la conferencia); recortadas pesan entre 51 y 126 KB. Ninguna página arma a
  mano la url de su imagen OG.
- **`twitter:*` no se declara.** Next lo deriva de `openGraph`: `summary_large_image` cuando
  hay imagen y `summary` cuando no.

De dónde sale la imagen de cada página (la primera que exista):

| Página                   | Imagen OG                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `/`                      | `seo.imagenOG` de `configuracionSitio` → foto del primer talento destacado                            |
| `/talentos`              | `seo.imagenOG` de `configuracionSitio` → foto del primer talento del listado                          |
| `/talentos/[slug]`       | `seo.imagenOG` → `fotografiaPrincipal`                                                                |
| `/noticias`              | Portada de la noticia más reciente                                                                    |
| `/noticias/[slug]`       | `seo.imagenOG` → portada                                                                              |
| `/conferencias`          | Primera conferencia en orden alfabético: imagen o miniatura manual del medio → foto del conferencista |
| `/conferencias/[slug]`   | `seo.imagenOG` → imagen o miniatura manual del medio → foto del conferencista                         |
| `/nosotros`, `/contacto` | Ninguna, a propósito (ver abajo)                                                                      |
| `/proyectos`, `/medios`  | Heredan el `openGraph` genérico del layout: siguen siendo placeholders                                |

La miniatura automática de Bunny nunca entra en esa cascada, aunque sí en las portadas que
dibujan las páginas: su pull zone responde 403 a las peticiones sin Referer, y los crawlers de
las redes no lo mandan.

`/nosotros` y `/contacto` se comparten sin imagen porque el sitio no tiene una imagen OG
genérica: el layout no declara ninguna y `configuracionSitio` no está publicado en el dataset
(verificado el 2026-10-02). La foto del primer talento, que es el respaldo de Inicio, diría que
esas páginas tratan sobre él, y leer Sanity sacaría a `/nosotros` de estática.

## Datos temporales (`lib/data/`) — superados por Sanity

**Superado.** Talentos, noticias y sponsors salen hoy de Sanity (`sanity/queries.ts`).
`lib/data/` quedó sin uso: ningún archivo lo importa, y las 3 fotos de `public/` solo las
referencian esos fixtures. Lo que sigue describe cómo se armaron en las Fases 1–3.

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
├── page.tsx                 Inicio (hero simplificado + 4 secciones reales)
├── icon.tsx                 Favicon generado (next/og)
├── not-found.tsx
├── talentos/
│   ├── page.tsx
│   └── [slug]/page.tsx
├── noticias/
│   ├── page.tsx
│   └── [slug]/page.tsx
├── contacto/page.tsx        Página real: LeadForm + datos de contacto
├── api/contacto/route.ts    POST del formulario (valida y envía con Resend)
├── nosotros/page.tsx        Página real y estática: equipo + servicios, sin Sanity
├── conferencias/
│   ├── page.tsx
│   └── [slug]/page.tsx
├── proyectos/, medios/
│   └── page.tsx             Placeholders honestos (PlaceholderNotice)
└── globals.css
components/
├── layout/                  Header, HeaderShell, NavLink, MobileNav, Footer, BrandBeat
├── ui/                      Button, Container, SectionHeading, ArrowLink,
│                             StatBlock, Pill, Icon, PlaceholderNotice,
│                             ComingSoon, Field, RichText
└── sections/                 AthleteCard, NewsCard, ConferenceCard, SponsorMarquee,
                              SponsorMarqueeHome, Expandable, LeadForm, Lightbox,
                              AppearanceCarousel, BunnyPlayer,
                              MediaSwitcher (sin uso, ver "Componentes")
lib/
├── fonts.ts, nav.ts, utils.ts
├── seo.ts                    Helpers de metadata y OPEN_GRAPH_BASE (decisión #85)
├── noticias.ts, conferencias.ts   Mapeo de lo que devuelve GROQ a los tipos del sitio
├── contacto.ts               Reglas del formulario, compartidas por cliente y servidor
├── bunny.ts                  Miniatura automática y recorte para el marco del video
├── columnaPrincipal.ts       `sizes` de la columna principal de los detalles
└── data/                     talentos.ts, noticias.ts (sin uso, ver arriba)
sanity/                       client.ts, env.ts, image.ts, queries.ts
types/content.ts
public/talentos/, public/noticias/   (3 fotos reales; solo las usa lib/data/)
```

`sanity/` concentra el acceso a Sanity: el cliente y `sanityFetch` (`client.ts`, decisión
#84), las variables de entorno (`env.ts`), los recortes por el CDN (`image.ts`, que incluye la
imagen OG de la decisión #85) y todas las queries GROQ (`queries.ts`).

## Componentes — Server vs. Client

**Client** (necesitan estado/API del navegador — la única razón válida):

- `NavLink` — `usePathname()` para el estado activo.
- `HeaderShell` — escucha el scroll para pasar el header de transparente a sólido (decisión
  #52).
- `MobileNav` — abrir/cerrar, portal, foco, Escape, resize.
- `BrandBeat` — `sessionStorage`, temporizador, teclado.
- `MediaSwitcher` — qué medio está activo, play/pause de video. **Sin uso:** se construyó en
  las Fases 1–3 para la vitrina de medios del prototipo y ninguna página llegó a montarlo.
- `Expandable` — abierto/cerrado del acordeón.
- `LeadForm` — estado del envío y validación interactiva; lee el prellenado de la URL con
  `useSearchParams()`, por eso va dentro de un `<Suspense>` (ver `app/contacto/page.tsx`).
- `Lightbox` — vista ampliada de la galería del talento: elemento abierto, foco atrapado,
  Escape y flechas, bloqueo del scroll del fondo.
- `AppearanceCarousel` — avance automático de las apariciones de una conferencia, con pausas
  por puntero o foco, y `prefers-reduced-motion` leído con `matchMedia`.
- `BunnyPlayer` — monta el iframe del player de Bunny recién al hacer clic.

**Todo lo demás es Server Component**, incluido `SponsorMarquee` — su animación es
`@keyframes` puro en CSS, no necesita JavaScript de cliente en absoluto.

## Rutas

| Ruta                          | Contenido      | Notas                                                                                               |
| ----------------------------- | -------------- | --------------------------------------------------------------------------------------------------- |
| `/`                           | Real (parcial) | Hero sin video todavía; `BrandBeat` ya montado antes del hero                                       |
| `/talentos`                   | Real           | Grid con `AthleteCard`                                                                              |
| `/talentos/[slug]`            | Real           | Perfil desde Sanity; slugs de `TALENTOS_LISTADO_QUERY`. Falta dibujar `bioAmpliada`                 |
| `/talentos/[slug]/patrocinar` | **Eliminada**  | Redirect 308 a `/contacto?motivo=patrocinio-deportista&deportista=:slug` (`next.config.ts`)         |
| `/noticias`                   | Real           | Grid con `NewsCard`                                                                                 |
| `/noticias/[slug]`            | Real           | Cuerpo completo (Portable Text) desde Sanity y, si la noticia lo tiene, video de Bunny              |
| `/nosotros`                   | Real           | Estática, sin Sanity: inicio, equipo y los 5 servicios (decisión #1). Ver abajo                     |
| `/conferencias`               | Real           | Grid con `ConferenceCard` desde Sanity                                                              |
| `/conferencias/[slug]`        | Real           | Ficha desde Sanity: video de Bunny o portada, apariciones y CTA a contacto con el motivo ya elegido |
| `/contacto`                   | Real           | `LeadForm` + datos de contacto                                                                      |
| `/proyectos`, `/medios`       | Placeholder    | Contenido real en Fase 4                                                                            |

### `/nosotros` (2026-10-02)

Página estática pura: no lee Sanity, así que tampoco tiene `revalidate` (ver #84). El texto es
el del prototipo tal cual, confirmado por Ariel: `nosotros_dp_agencia_deportiva` para el inicio
y el equipo, y `modelo_de_gesti_n_dp_gesti_n_deportiva` para los cinco servicios, que viven acá
por la decisión de negocio #1. Orden: inicio → equipo → servicios.

Lo que cambió respecto del prototipo, y por qué:

- **Servicios dentro de la misma página.** "Ver servicios" es un ancla a `#servicios` (con
  `scroll-mt` por el header fijo) y no el enlace a Modelo de Gestión. Se quitaron la nota "El
  detalle completo de cada servicio vive en Nuestros Servicios" y el CTA de cierre del prototipo
  de servicios, cuyo "Conoce al equipo" habría enlazado a la propia página. "Nuestros Servicios"
  va como etiqueta, igual que "El Equipo", y no como el H1 gigante de la página original.
- **Desbordes medidos en el propio prototipo.** Con su padding de 64px, los títulos de las
  tarjetas de servicio se salían en 375, 768, 1024, 1280 y 1440 (a 375, "REPRESENTACIÓN" se
  salía 190px y la página se ensanchaba a 480). Acá el padding es de 32/48px, el título de la
  tarjeta insignia baja a 32px en móvil y las otras cuatro van de a dos hasta xl. El equipo pasa
  a dos columnas desde lg y no desde sm: a 768 la fila de Joel Gutiérrez se salía 28px.
- **Inicio a dos columnas desde xl, no desde lg.** A 1024 el H1 se partía en cuatro líneas con
  un "DEL" suelto. Mientras va en una columna, el bloque se topa en 672px para que los párrafos
  no pasen de ~110 caracteres por línea.
- **Nota de la tarjeta de eventos al 65% de opacidad, no al 50%.** A 11px, el 50% daba 3,52:1
  de contraste; con 65%, 5,05:1.

Pendiente: las fotos del equipo. Hoy cada miembro muestra la silueta del prototipo en una caja
3:4 que ya tiene el tamaño de la foto, así que reemplazarla no mueve el layout. Con ellas
llegaría también una imagen OG para la página. Las medidas de cada ajuste están en los
comentarios de `app/nosotros/page.tsx`.

## SEO base implementado

`metadata` con `title.template`, `description`, `metadataBase` (`somosdp.com`, ya confirmado
por el cliente) y `openGraph` base en el layout raíz; `generateMetadata` en cada página que arma
su SEO con datos de Sanity.

El patrón de Open Graph —campos base, sufijo de `og:title` e imagen de cada página— es la
decisión #85, en "Decisiones de arquitectura".

**No** implementado todavía (Fase 7, según el plan de la auditoría): JSON-LD, `sitemap.ts`,
`robots.ts` y una imagen OG genérica del sitio para las páginas que no tienen una propia.

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

- Migrar las 8 páginas completas con su contenido y layout real (hoy: Inicio parcial;
  Talentos, Noticias, Conferencias, Contacto y Nosotros reales; Proyectos y Medios siguen
  siendo placeholders honestos).
- `LeadForm` (formulario de contacto real) — **construido** (2026-09-28). `/contacto` tiene la
  página real con los 6 campos + mensaje que pidió el cliente, validación compartida entre
  cliente y servidor (`lib/contacto.ts`), honeypot y `app/api/contacto/route.ts`. Se puede
  llegar con el formulario prellenado vía `?motivo=…&deportista=…` (lo usan el CTA del perfil
  de talento y el redirect de la ruta `/patrocinar` eliminada). **El envío también está
  hecho** (2026-09-28, `a1b3d87`): el route handler manda el correo con Resend, en texto plano
  y con `replyTo` a quien escribió, y responde `{ ok: true, entregado: true }`. Necesita
  `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` y `CONTACT_TO_EMAIL` (ver `.env.example`): sin alguna
  de las tres responde 500 `envio-no-configurado`, y si Resend rechaza el envío o no se lo
  alcanza, 502 `envio-fallido`. El formulario solo se vacía cuando el correo salió.
- Hero de video en Inicio (`BrandBeat` ya está montado antes del hero).
- Ficha completa de talento (hitos, galería, sponsors por tier, redes) — **hecha**, desde
  Sanity; solo falta dibujar `bioAmpliada`.

## Decisiones de negocio (de la auditoría de Fase 0)

Se numeran igual que en la auditoría de Fase 0 y en la auditoría de Fases 1-3 (2026-09-14),
para que el número siga significando lo mismo en comentarios de código y en memoria. El
2026-09-14, tras la auditoría de Fases 1-3, el usuario resolvió 5 de las 12 — quedan oficiales,
no se vuelven a discutir salvo que cambie la realidad del negocio (ej. un segundo talento real).

### Resueltas (2026-09-14)

<!-- Los números de esta lista son los de la auditoría de Fase 0 y son salteados a
     propósito (1, 2, 7, 8, 12): el número identifica la decisión y se cita así desde
     comentarios de código. La directiva de abajo evita que Prettier los renumere a
     1..5 y rompa esas referencias. No quitar. -->

<!-- prettier-ignore -->
1. **Modelo de Gestión / Servicios** → se integra como sección dentro de `/nosotros`. Sin ruta
   `/servicios` propia y sin entrada en el nav principal — coincide con que el nav sugerido por
   el propio cliente nunca incluyó "Servicios". El contenido de los 5 servicios oficiales
   (hoy en el prototipo, `modelo_de_gesti_n_dp_gesti_n_deportiva/code.html`) ya está redactado
   y aprobado; se traslada tal cual a `/nosotros` en la Fase 4, no hace falta reescribirlo.
   **Aplicada el 2026-10-02:** sección "Nuestros Servicios" de `/nosotros`, con el ancla
   `#servicios` (ver "`/nosotros`" en Rutas).
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
   únicamente. Implementada junto con `LeadForm`: el envío con Resend funciona desde el
   2026-09-28 (`a1b3d87`, ver "Pendiente para la Fase 4+").
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

<!-- Misma razón que la lista de "Resueltas": numeración de la auditoría de Fase 0
     (3, 4, 5, 6, 9, 10, 11), salteada a propósito. No renumerar. -->

<!-- prettier-ignore -->
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
