import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { IconType } from "react-icons";
import { SiInstagram, SiTiktok } from "react-icons/si";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Icon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatBlock } from "@/components/ui/StatBlock";
import { Expandable } from "@/components/sections/Expandable";
import { client } from "@/sanity/client";
import { urlDeImagen, type ImagenSanity } from "@/sanity/image";
import { TALENTO_PERFIL_QUERY, TALENTOS_LISTADO_QUERY } from "@/sanity/queries";
import { cn } from "@/lib/utils";
import { conSufijo, recortarParaMeta } from "@/lib/seo";

interface RawMetricaRed {
  fechaReferencia: string;
  seguidores: number | null;
  visualizaciones: number | null;
  interacciones: number | null;
  meGusta: number | null;
}

interface RawRedSocial {
  _key: string;
  red: string;
  url: string;
  handle: string | null;
  metricas: RawMetricaRed[] | null;
}

// `red` es texto libre en Sanity (ver studio: "Ej: Instagram, TikTok, YouTube. Usar el
// mismo nombre de forma consistente"), no un enum — normaliza antes de comparar (el dato
// real de hoy trae "Tik Tok", con espacio). Red no mapeada (YouTube, etc.) cae al ícono
// genérico de Icon en vez de no renderizar nada.
const ICONOS_RED_SOCIAL: Record<string, IconType> = {
  instagram: SiInstagram,
  tiktok: SiTiktok,
};

function iconoDeRed(nombreRed: string): IconType | undefined {
  return ICONOS_RED_SOCIAL[nombreRed.toLowerCase().replace(/\s+/g, "")];
}

interface RawHito {
  _key: string;
  anio: number | null;
  categoria: string;
  medalla: string | null;
  competencia: string | null;
  evento: string | null;
  ciudad: string | null;
  descripcion: string;
  destacado: boolean | null;
}

interface RawGaleriaImagen extends ImagenSanity {
  _type: "image";
  _key: string;
}

interface RawGaleriaVideo {
  _type: "videoBunny";
  _key: string;
  videoId: string;
  titulo: string | null;
  miniatura: ImagenSanity | null;
}

type RawGaleriaItem = RawGaleriaImagen | RawGaleriaVideo;

interface RawSponsor {
  _key: string;
  nombre: string;
  tier: string;
  url: string | null;
  logo: { url: string; alt: string | null } | null;
}

/**
 * Lo que llega de GROQ antes del guard. La query proyecta `sponsors[]{_key, ...@->{}}`:
 * si la referencia no resuelve (documento borrado o despublicado) el spread no aporta
 * nada y del miembro solo sobrevive el `_key`. Verificado con groq-js.
 */
type RawSponsorCrudo = Partial<RawSponsor> & { _key: string };

function esSponsorResuelto(sponsor: RawSponsorCrudo | null): sponsor is RawSponsor {
  return typeof sponsor?.nombre === "string" && typeof sponsor?.tier === "string";
}

interface RawSeo {
  metaTitulo: string | null;
  metaDescripcion: string | null;
  imagenOG: { url: string } | null;
}

interface RawConferencista {
  ofrece: boolean | null;
  experienciaPrevia: string | null;
}

interface RawTalentoPerfil {
  nombre: string;
  slug: string;
  disciplina: string;
  ubicacion: string | null;
  fechaNacimiento: string;
  foto: ImagenSanity;
  /** Apaisada, para el hero. Null si el editor no la cargó (decisión #59). */
  fotoHero: ImagenSanity | null;
  redesSociales: RawRedSocial[] | null;
  bioCorta: string;
  bioAmpliada: unknown;
  valores: string[] | null;
  frase: string | null;
  hitos: RawHito[] | null;
  galeria: RawGaleriaItem[] | null;
  sponsors: (RawSponsorCrudo | null)[] | null;
  conferencista: RawConferencista | null;
  seo: RawSeo | null;
}

async function getTalentoPerfil(slug: string) {
  return client.fetch<RawTalentoPerfil | null>(TALENTO_PERFIL_QUERY, { slug });
}

// useCdn:false a propósito, distinto del resto del sitio (ver sanity-best-practices/nextjs):
// generateStaticParams corre en build, donde un talento recién publicado y todavía no
// propagado al CDN de Sanity debe igual generar su página estática.
export async function generateStaticParams() {
  const talentos = await client
    .withConfig({ useCdn: false })
    .fetch<{ slug: string }[]>(TALENTOS_LISTADO_QUERY);
  return talentos.map(({ slug }) => ({ slug }));
}

/**
 * SEO real (decisión #62): lo que el editor cargue en el objeto `seo` manda; si está
 * vacío, se arma el respaldo automático.
 *
 * El título va como cadena suelta, sin `absolute`: este es un segmento hijo del layout
 * raíz, así que la plantilla "%s | DP Agencia Deportiva" le agrega el sufijo sola, tanto
 * al metaTitulo escrito a mano como al respaldo. Mismo criterio que Inicio y /talentos:
 * el sufijo va siempre.
 */
export async function generateMetadata({
  params,
}: PageProps<"/talentos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const talento = await getTalentoPerfil(slug);
  if (!talento) return {};

  const metaTitulo = talento.seo?.metaTitulo?.trim();
  const metaDescripcion = talento.seo?.metaDescripcion?.trim();

  // `||` y no `??`: un metaTitulo en cadena vacía debe caer al respaldo.
  const title = metaTitulo || talento.nombre;
  const description =
    metaDescripcion ||
    (talento.bioCorta
      ? recortarParaMeta(talento.bioCorta)
      : `${talento.nombre} — ${talento.disciplina}, DP Agencia Deportiva.`);

  // imagenOG vacía hereda la fotografía principal, tal como promete la descripción
  // del campo en el Studio.
  const imagenOG = talento.seo?.imagenOG?.url ?? talento.foto.url;

  return {
    title,
    description,
    openGraph: {
      // og:title no pasa por la plantilla del layout, así que el sufijo se agrega aquí
      // a mano sobre el mismo `title` — override o respaldo, el resultado coincide.
      title: conSufijo(title),
      description,
      images: imagenOG ? [{ url: imagenOG, alt: talento.foto.alt }] : undefined,
    },
  };
}

// Manual, sin Date() sobre el string ISO (mismo motivo que formatearFechaLegible en
// app/page.tsx): new Date("YYYY-MM-DD") parsea en UTC y puede correr un día en zonas
// horarias negativas.
function calcularEdad(fechaNacimientoISO: string): number {
  const partes = fechaNacimientoISO.split("-");
  const anioNac = Number(partes[0]);
  const mesNac = Number(partes[1]);
  const diaNac = Number(partes[2]);

  const hoy = new Date();
  const anioHoy = hoy.getFullYear();
  const mesHoy = hoy.getMonth() + 1;
  const diaHoy = hoy.getDate();

  let edad = anioHoy - anioNac;
  const aunNoCumpleEsteAnio = mesHoy < mesNac || (mesHoy === mesNac && diaHoy < diaNac);
  if (aunNoCumpleEsteAnio) edad -= 1;
  return edad;
}

const ETIQUETAS_MEDALLA: Record<string, string> = {
  oro: "Oro",
  plata: "Plata",
  bronce: "Bronce",
  finalista: "Finalista",
  participacion: "Participación",
};

/**
 * Íconos de podio (decisión #54). Material Symbols, la misma fuente de íconos que ya
 * carga el layout y que usa <Icon> en todo el sitio — sin dependencias nuevas.
 *
 * Los colores salen de tokens que ya existen en globals.css: ámbar para el oro, el gris
 * claro del sistema para la plata y el tono cálido apagado para el bronce. No se
 * inventaron colores de medalla fuera de la paleta.
 */
const ICONOS_MEDALLA: Record<string, { nombre: string; color: string }> = {
  oro: { nombre: "military_tech", color: "text-amber" },
  plata: { nombre: "military_tech", color: "text-foreground-faint" },
  bronce: { nombre: "military_tech", color: "text-outline" },
  finalista: { nombre: "workspace_premium", color: "text-foreground-muted" },
  participacion: { nombre: "flag", color: "text-foreground-muted" },
};

/**
 * `medalla` es opcional en el schema: un hito de ranking o de récord no tiene podio.
 * En ese caso no se pinta ícono, en vez de uno neutro — un ícono genérico sugeriría una
 * distinción que no existe, y la Pill de la etiqueta ya se omite por el mismo motivo.
 */
function IconoMedalla({
  medalla,
  className,
}: {
  medalla: string | null;
  className?: string;
}) {
  const icono = medalla ? ICONOS_MEDALLA[medalla] : undefined;
  if (!icono) return null;
  // Sin `size`: se queda en el 24px por defecto, que es el tamaño con el que se validó
  // visualmente contra los 3 hitos reales. Pasar un tamaño aquí sí tendría efecto.
  return <Icon name={icono.nombre} filled className={cn(icono.color, className)} />;
}

// Orden de podio, para resumir un grupo que mezcla resultados: "2× Juegos Olímpicos"
// con un oro y una plata se representa con el oro, que es el techo del grupo.
const JERARQUIA_MEDALLA = ["oro", "plata", "bronce", "finalista", "participacion"];

function medallaDestacada(hitos: RawHito[]): string | null {
  return (
    JERARQUIA_MEDALLA.find((medalla) => hitos.some((hito) => hito.medalla === medalla)) ??
    null
  );
}

/**
 * Tope de la franja destacada. La grilla es de 3 columnas: un cuarto destacado
 * abriría una segunda fila con un solo elemento huérfano, y "destacado" deja de
 * significar algo si el editor puede marcar diez. Si sobran, se quedan los de
 * medalla más alta — y todos siguen apareciendo completos en la sección Logros.
 */
const MAX_MEDALLAS_DESTACADAS = 3;

function rankMedalla(medalla: string | null): number {
  const i = medalla ? JERARQUIA_MEDALLA.indexOf(medalla) : -1;
  return i === -1 ? JERARQUIA_MEDALLA.length : i;
}

function medallasDestacadas(hitos: RawHito[]): RawHito[] {
  return hitos
    .filter((hito) => hito.destacado === true && hito.medalla)
    .sort(
      (a, b) =>
        rankMedalla(a.medalla) - rankMedalla(b.medalla) || (b.anio ?? 0) - (a.anio ?? 0),
    )
    .slice(0, MAX_MEDALLAS_DESTACADAS);
}

// La lista completa se ordena año descendente (más reciente primero); los hitos sin año
// se mandan al final sin importar la dirección de orden, en vez de saltar al frente.
function ordenarHitosDescendente(hitos: RawHito[]): RawHito[] {
  return [...hitos].sort((a, b) => (b.anio ?? -Infinity) - (a.anio ?? -Infinity));
}

// "20km Marcha Lima 2019" a partir de evento/ciudad/año — omite lo que falte.
function etiquetaHito(hito: RawHito): string {
  return [hito.evento, hito.ciudad, hito.anio != null ? String(hito.anio) : null]
    .filter((parte): parte is string => Boolean(parte))
    .join(" ");
}

interface GrupoLogros {
  competencia: string;
  cantidad: number;
  anioMasReciente: number;
  detalle: string;
  medalla: string | null;
}

/**
 * Agrupa por `competencia` (texto libre — "Juegos Olímpicos", "Campeonato
 * Panamericano", etc.), no por `categoria` (ese campo es un enum interno,
 * sin uso visual todavía). Hitos sin `competencia` quedan fuera del resumen
 * agrupado a propósito — igual aparecen en la lista completa de abajo.
 * Grupos ordenados por año más reciente descendente (mismo criterio que la
 * lista completa); dentro de cada grupo, los eventos van en orden
 * ascendente (más antiguo primero — cuenta una progresión de carrera).
 */
function agruparLogros(hitos: RawHito[]): GrupoLogros[] {
  const grupos = new Map<string, RawHito[]>();
  for (const hito of hitos) {
    if (!hito.competencia) continue;
    const lista = grupos.get(hito.competencia) ?? [];
    lista.push(hito);
    grupos.set(hito.competencia, lista);
  }

  return Array.from(grupos.entries())
    .map(([competencia, hitosDelGrupo]) => {
      const ordenAscendente = [...hitosDelGrupo].sort(
        (a, b) => (a.anio ?? Infinity) - (b.anio ?? Infinity),
      );
      return {
        competencia,
        cantidad: hitosDelGrupo.length,
        anioMasReciente: Math.max(...hitosDelGrupo.map((hito) => hito.anio ?? -Infinity)),
        detalle: ordenAscendente.map(etiquetaHito).filter(Boolean).join(" · "),
        medalla: medallaDestacada(hitosDelGrupo),
      };
    })
    .sort((a, b) => b.anioMasReciente - a.anioMasReciente);
}

const LOGROS_VISIBLES_SIN_EXPANDIR = 3;

// `destacado` recibe año más grande + color ámbar (mismo idioma visual que StatBlock
// `emphasis`), en vez de reordenar la lista — el orden sigue siendo año descendente.
function HitoItem({ hito }: { hito: RawHito }) {
  const titulo = [hito.competencia, hito.evento].filter(Boolean).join(" · ");
  return (
    <div
      className={cn("border-l-2 pl-6", hito.destacado ? "border-amber" : "border-line")}
    >
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "font-display uppercase leading-none",
            hito.destacado
              ? "text-heading-md text-amber"
              : "text-body-lg text-foreground",
          )}
        >
          {hito.anio ?? "—"}
        </span>
        <IconoMedalla medalla={hito.medalla} />
        {hito.medalla ? (
          <Pill>{ETIQUETAS_MEDALLA[hito.medalla] ?? hito.medalla}</Pill>
        ) : null}
      </div>
      {titulo ? (
        <p className="mb-1 font-body text-body-md text-foreground">{titulo}</p>
      ) : null}
      {/* `descripcion` sigue en el schema y en la query, pero ya no se muestra
          (decisión #55): repetía lo que ya dicen competencia, evento y medalla. */}
      {hito.ciudad ? (
        <p className="font-body text-label-caps uppercase tracking-widest text-foreground-muted">
          {hito.ciudad}
        </p>
      ) : null}
    </div>
  );
}

// Hero: 2400 es el techo razonable para una imagen a ancho de viewport en pantallas
// grandes a 2x; next/image arma su srcset hacia abajo desde ahí.
const HERO_RECORTE_ANCHO = 2400;

// Retrato circular de "El Atleta" (decisión #73). Cuadrado, porque el marco es un
// círculo: acá es donde el hotspot marcado en el Studio hace toda la diferencia, ya que
// fotografiaPrincipal es vertical y un recorte al centro suele cortar la cara.
// 640 = el escalón de next/image que cubre el diámetro más grande (224px) a 2x.
const RETRATO_RECORTE = 640;
const RETRATO_SIZES = "(min-width: 1024px) 224px, (min-width: 640px) 192px, 160px";

const GALERIA_TILE_CLASSES =
  "group relative aspect-square overflow-hidden border border-line bg-surface transition-[transform,border-color] duration-500 hover:scale-[1.02] hover:border-amber";
const GALERIA_SIZES = "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw";
// Cuadrado, igual que el `aspect-square` del marco. El `sizes` de abajo declara 33vw,
// que a 1440 son 475px; a 2x eso cae en el escalón de 1080 de next/image.
const GALERIA_RECORTE = 1080;

// videoBunny: este frontend no tiene credenciales de Bunny Stream configuradas (sin
// BUNNY_* en .env.local, sin dependencia instalada) — no hay forma de construir la URL
// de miniatura automática de Bunny ni embeber un reproductor real todavía. Usa
// `miniatura` si el documento la cargó; si no, un placeholder simple con ícono de play.
function GaleriaItemView({ item }: { item: RawGaleriaItem }) {
  if (item._type === "image") {
    return (
      <div className={GALERIA_TILE_CLASSES}>
        <Image
          src={urlDeImagen(item, GALERIA_RECORTE, GALERIA_RECORTE)}
          alt={item.alt}
          fill
          sizes={GALERIA_SIZES}
          className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
      </div>
    );
  }

  return (
    <div className={GALERIA_TILE_CLASSES} role="img" aria-label={item.titulo ?? "Video"}>
      {item.miniatura ? (
        <Image
          src={urlDeImagen(item.miniatura, GALERIA_RECORTE, GALERIA_RECORTE)}
          alt=""
          aria-hidden="true"
          fill
          sizes={GALERIA_SIZES}
          className="object-cover opacity-70 transition-transform duration-700 group-hover:scale-[1.04]"
        />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center bg-ink/20"
      >
        <Icon name="play_circle" filled size={56} className="text-foreground" />
      </div>
    </div>
  );
}

const ETIQUETAS_TIER: Record<string, string> = {
  principal: "Principales",
  suplementacion: "Suplementación",
  aliado: "Aliados de Rendimiento",
};

const ORDEN_TIERS = ["principal", "suplementacion", "aliado"];

interface GrupoMarcas {
  tier: string;
  etiqueta: string;
  sponsors: RawSponsor[];
}

// Orden fijo (principal → suplementación → aliado) en vez del orden de llegada de
// Sanity. Un tier sin sponsors no se muestra — ver respuesta al usuario.
//
// El guard descarta las referencias que no resolvieron: sin `nombre` ni `tier` no hay
// nada que pintar, y dejarlas pasar significaría una ficha vacía en la grilla. Queda
// rastro en el log del servidor (esto es un Server Component, así que el console.warn
// sale en la consola del build o del servidor, nunca en la del visitante).
function agruparSponsoresPorTier(
  sponsors: (RawSponsorCrudo | null)[],
  slugTalento: string,
): GrupoMarcas[] {
  const resueltos: RawSponsor[] = [];
  for (const sponsor of sponsors) {
    if (esSponsorResuelto(sponsor)) {
      resueltos.push(sponsor);
      continue;
    }
    console.warn(
      `[talento:${slugTalento}] Referencia a sponsor sin resolver (_key: ${
        sponsor?._key ?? "desconocido"
      }). Se omite de la sección Marcas.`,
    );
  }

  return ORDEN_TIERS.map((tier) => ({
    tier,
    etiqueta: ETIQUETAS_TIER[tier] ?? tier,
    sponsors: resueltos.filter((sponsor) => sponsor.tier === tier),
  })).filter((grupo) => grupo.sponsors.length > 0);
}

function MarcaTile({ sponsor }: { sponsor: RawSponsor }) {
  const contenido = (
    <div className="flex h-24 flex-col items-center justify-center gap-2 border border-line bg-surface px-4 py-3 transition-[transform,border-color] duration-300 hover:scale-[1.02] hover:border-amber">
      {sponsor.logo ? (
        <Image
          src={sponsor.logo.url}
          alt={sponsor.logo.alt ?? sponsor.nombre}
          width={120}
          height={48}
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="text-center font-display text-[13px] uppercase leading-tight tracking-wide text-foreground-muted">
          {sponsor.nombre}
        </span>
      )}
    </div>
  );

  if (sponsor.url) {
    return (
      <a
        href={sponsor.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={sponsor.nombre}
      >
        {contenido}
      </a>
    );
  }

  return contenido;
}

// `fechaReferencia` es un `date` de Sanity ("YYYY-MM-DD") — comparable como string
// directamente, sin pasar por Date(), para el mismo criterio anti-timezone que
// calcularEdad/formatearFechaLegible.
function metricaMasReciente(metricas: RawMetricaRed[]): RawMetricaRed | undefined {
  return metricas.reduce<RawMetricaRed | undefined>((masReciente, actual) => {
    if (!masReciente || actual.fechaReferencia > masReciente.fechaReferencia)
      return actual;
    return masReciente;
  }, undefined);
}

interface AlcanceRed {
  /** Se arrastra el `_key` de la red de origen para no volver a usar el
   *  nombre de la red como clave de React. */
  _key: string;
  red: string;
  metrica: RawMetricaRed;
}

// Solo el snapshot más reciente por red — nunca promedia ni suma históricos. Redes sin
// ninguna métrica cargada quedan fuera (su ícono/link sigue en "El Atleta", eso no cambia).
function construirAlcanceDigital(redesSociales: RawRedSocial[]): AlcanceRed[] {
  const resultado: AlcanceRed[] = [];
  for (const red of redesSociales) {
    if (!red.metricas || red.metricas.length === 0) continue;
    const reciente = metricaMasReciente(red.metricas);
    if (reciente) resultado.push({ _key: red._key, red: red.red, metrica: reciente });
  }
  return resultado;
}

function formatearMetrica(valor: number): string {
  if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (valor >= 1_000) return `${(valor / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(valor);
}

export default async function TalentoPage({ params }: PageProps<"/talentos/[slug]">) {
  const { slug } = await params;
  const talento = await getTalentoPerfil(slug);
  if (!talento) notFound();

  const primerNombre = talento.nombre.split(" ")[0] ?? talento.nombre;
  const edad = calcularEdad(talento.fechaNacimiento);

  const hitosOrdenados = ordenarHitosDescendente(talento.hitos ?? []);
  const hitosVisibles = hitosOrdenados.slice(0, LOGROS_VISIBLES_SIN_EXPANDIR);
  const hitosExpandibles = hitosOrdenados.slice(LOGROS_VISIBLES_SIN_EXPANDIR);
  const gruposLogros = agruparLogros(hitosOrdenados);
  const medallasFranja = medallasDestacadas(hitosOrdenados);

  // Respaldo del hero (decisión #59): sin fotografiaHero cargada se usa la principal,
  // que es vertical — el object-cover la recorta, pero la ficha nunca queda sin hero.
  const fotoHero = talento.fotoHero ?? talento.foto;

  const galeria = talento.galeria ?? [];
  const gruposMarcas = agruparSponsoresPorTier(talento.sponsors ?? [], slug);
  const alcanceDigital = construirAlcanceDigital(talento.redesSociales ?? []);
  const ofreceConferencias = talento.conferencista?.ofrece === true;

  return (
    <>
      {/* Hero full-bleed (decisión #52). `-mt-[72px]` lo mete bajo el header fijo, que
          sobre el hero se muestra transparente — el layout raíz conserva su pt-[72px]
          para las demás páginas, así que la corrección es local a esta. */}
      <section className="hero-full relative -mt-[72px] flex w-full items-end overflow-hidden">
        {/* Sin alto: el hero ocupa el viewport entero, que va de apaisado en escritorio
            a vertical en móvil, así que no hay una proporción única que pedirle al CDN
            (ver sanity/image.ts). Lo que sí se respeta es el recorte rectangular que el
            editor haya dibujado; el encuadre final lo termina el object-cover. */}
        <Image
          src={urlDeImagen(fotoHero, HERO_RECORTE_ANCHO)}
          alt={fotoHero.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div aria-hidden="true" className="hero-degradado absolute inset-0" />

        {/* Divisor: la curva se rellena del mismo color que la franja de abajo, así que
            la franja parece subir hacia el hero. `preserveAspectRatio="none"` la estira
            a cualquier ancho, y `vector-effect` mantiene el trazo a 3px reales sin que
            el estirado lo engorde. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 z-[3] h-[60px] w-full md:h-[100px] lg:h-[130px]"
        >
          <path
            d="M0,40 C360,100 1080,100 1440,40 L1440,100 L0,100 Z"
            fill="var(--color-surface-deep)"
          />
          <path
            d="M0,40 C360,100 1080,100 1440,40"
            fill="none"
            stroke="var(--color-amber)"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <Container className="relative z-10 pb-[calc(60px+3rem)] md:pb-[calc(100px+3rem)] lg:pb-[calc(130px+3rem)]">
          <div className="md:w-2/3">
            <ArrowLink href="/talentos" className="mb-6">
              Volver al roster
            </ArrowLink>
            <p className="mb-4 font-body text-label-caps uppercase tracking-widest text-amber">
              {talento.disciplina}
            </p>
            <h1 className="text-display-hero font-display uppercase">{talento.nombre}</h1>
          </div>
        </Container>
      </section>

      {/* Franja de destacados: fondo propio (el mismo que rellena el divisor) y las
          agrupaciones debajo, separadas por un borde — misma composición del prototipo. */}
      {medallasFranja.length > 0 || gruposLogros.length > 0 ? (
        <section className="w-full border-y border-line bg-surface-deep py-16">
          <Container>
            {medallasFranja.length > 0 ? (
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                {medallasFranja.map((hito, indice) => (
                  <StatBlock
                    key={hito._key}
                    value={(
                      ETIQUETAS_MEDALLA[hito.medalla ?? ""] ??
                      hito.medalla ??
                      ""
                    ).toUpperCase()}
                    label={[hito.competencia, hito.evento, hito.anio]
                      .filter(Boolean)
                      .join(" · ")}
                    emphasis={indice === 0}
                    icon={<IconoMedalla medalla={hito.medalla} />}
                    // El valor aquí es una palabra, no una cifra: "FINALISTA" a los
                    // 80px fijos de text-stat desborda la columna a 768px. El clamp lo
                    // ata al ancho de viewport para que la etiqueta más larga entre en
                    // las 3 columnas sin sacrificar el impacto en pantallas grandes.
                    valueClassName="text-[clamp(2.25rem,5.5vw,5rem)]"
                  />
                ))}
              </div>
            ) : null}

            {gruposLogros.length > 0 ? (
              <div
                className={cn(
                  "grid grid-cols-1 gap-6 sm:grid-cols-2",
                  medallasFranja.length > 0 && "mt-12 border-t border-line pt-12",
                )}
              >
                {gruposLogros.map((grupo) => (
                  <div key={grupo.competencia} className="flex items-start gap-3">
                    <IconoMedalla medalla={grupo.medalla} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="mb-1.5 font-display text-heading-md uppercase leading-none">
                        {grupo.cantidad}× {grupo.competencia}
                      </p>
                      {grupo.detalle ? (
                        <p className="font-body text-body-md text-foreground-muted">
                          {grupo.detalle}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </Container>
        </section>
      ) : null}

      <Container className="py-30">
        <section>
          <SectionHeading eyebrow="Perfil" title="El Atleta" />
          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-12">
            <div className="md:col-span-7">
              {talento.frase ? (
                <blockquote className="mb-8 border-l-2 border-amber pl-6 font-body text-body-lg italic text-foreground">
                  “{talento.frase}”
                </blockquote>
              ) : null}
              <p className="mb-8 max-w-[60ch] font-body text-body-lg text-foreground-muted">
                {talento.bioCorta}
              </p>
              {talento.valores && talento.valores.length > 0 ? (
                <div className="mb-10 flex flex-wrap gap-3">
                  {talento.valores.map((valor) => (
                    <Pill key={valor}>{valor}</Pill>
                  ))}
                </div>
              ) : null}
              <p className="font-signature text-heading-lg text-amber">
                {talento.nombre}
              </p>
            </div>
            <div className="md:col-span-5">
              {/* Retrato circular (decisión #73). Va en esta columna, no en la izquierda
                como el prototipo original. El recorte cuadrado lo hace el CDN de Sanity
                respetando el hotspot (ver sanity/image.ts); acá el `rounded-full` solo
                le da forma a un cuadrado que ya viene bien encuadrado. */}
              <div className="relative mb-8 aspect-square w-40 overflow-hidden rounded-full border border-line sm:w-48 lg:w-56">
                <Image
                  src={urlDeImagen(talento.foto, RETRATO_RECORTE, RETRATO_RECORTE)}
                  alt={talento.foto.alt}
                  fill
                  sizes={RETRATO_SIZES}
                  className="object-cover"
                />
              </div>
              <p className="mb-8 font-body text-body-md text-foreground-muted">
                {talento.ubicacion ? `${talento.ubicacion} · ` : ""}
                {edad} años
              </p>
              {talento.redesSociales && talento.redesSociales.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {talento.redesSociales.map((red) => {
                    const IconoMarca = iconoDeRed(red.red);
                    return (
                      <a
                        key={red._key}
                        href={red.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-2 font-body text-label-caps uppercase tracking-widest text-foreground-muted transition-colors duration-300 hover:text-amber"
                      >
                        {IconoMarca ? (
                          <IconoMarca className="text-[20px] transition-transform duration-300 group-hover:translate-x-1" />
                        ) : (
                          <Icon
                            name="open_in_new"
                            size={20}
                            className="transition-transform duration-300 group-hover:translate-x-1"
                          />
                        )}
                        {red.red}
                        {/* `normal-case` corta el uppercase que hereda del enlace (lo traen
                          text-label-caps y la utilidad `uppercase`): el handle se muestra con
                          la capitalización exacta con la que se guardó en Sanity. */}
                        {red.handle ? (
                          <span className="normal-case">{` · @${red.handle}`}</span>
                        ) : null}
                      </a>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-24 border-t border-line pt-16">
          <SectionHeading eyebrow="Trayectoria" title="Logros" />
          {hitosOrdenados.length === 0 ? (
            <ComingSoon
              className="mt-16"
              message="Estamos registrando los logros de este talento."
            />
          ) : (
            <div className="mt-16">
              {/* Las agrupaciones ("2× Juegos Olímpicos") se mudaron a la franja de
                destacados, arriba, donde las pone el prototipo. Acá queda solo la lista
                cronológica completa, que es lo que esta sección aporta. */}
              <div className="flex flex-col gap-10">
                {hitosVisibles.map((hito) => (
                  <HitoItem key={hito._key} hito={hito} />
                ))}
              </div>

              {hitosExpandibles.length > 0 ? (
                <Expandable
                  labelMore="Ver todos los logros"
                  labelLess="Ver menos"
                  className="mt-10"
                >
                  <div className="flex flex-col gap-10">
                    {hitosExpandibles.map((hito) => (
                      <HitoItem key={hito._key} hito={hito} />
                    ))}
                  </div>
                </Expandable>
              ) : null}
            </div>
          )}
        </section>

        <section className="mt-24 border-t border-line pt-16">
          <SectionHeading eyebrow="Contenido" title="Galería" />
          {galeria.length === 0 ? (
            <ComingSoon
              className="mt-16"
              message="Estamos organizando la galería de este talento."
            />
          ) : (
            <div className="mt-16 grid grid-cols-2 gap-6 md:grid-cols-3">
              {galeria.map((item) => (
                <GaleriaItemView key={item._key} item={item} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-24 border-t border-line pt-16">
          <SectionHeading eyebrow="Respaldo" title="Marcas" />
          {gruposMarcas.length === 0 ? (
            <ComingSoon
              className="mt-16"
              message="Todavía no hay marcas vinculadas a este talento."
            />
          ) : (
            <div className="mt-16 flex flex-col gap-12">
              {gruposMarcas.map((grupo) => (
                <div key={grupo.tier}>
                  <p className="mb-6 font-body text-label-caps uppercase tracking-widest text-foreground-muted">
                    {grupo.etiqueta}
                  </p>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {grupo.sponsors.map((sponsor) => (
                      <MarcaTile key={sponsor._key} sponsor={sponsor} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {alcanceDigital.length > 0 ? (
          <section className="mt-24 border-t border-line pt-16">
            <SectionHeading eyebrow="Comunidad" title="Alcance Digital" />
            <div className="mt-16 flex flex-col gap-12">
              {alcanceDigital.map((item) => {
                const IconoMarca = iconoDeRed(item.red);
                const { seguidores, visualizaciones, interacciones, meGusta } =
                  item.metrica;
                return (
                  <div key={item._key}>
                    <div className="mb-6 flex items-center gap-2 font-body text-label-caps uppercase tracking-widest text-foreground-muted">
                      {IconoMarca ? (
                        <IconoMarca className="text-[20px]" />
                      ) : (
                        <Icon name="open_in_new" size={20} />
                      )}
                      {item.red}
                    </div>
                    <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
                      {seguidores != null ? (
                        <StatBlock
                          value={formatearMetrica(seguidores)}
                          label="Seguidores"
                        />
                      ) : null}
                      {visualizaciones != null ? (
                        <StatBlock
                          value={formatearMetrica(visualizaciones)}
                          label="Visualizaciones"
                        />
                      ) : null}
                      {interacciones != null ? (
                        <StatBlock
                          value={formatearMetrica(interacciones)}
                          label="Interacciones"
                        />
                      ) : null}
                      {meGusta != null ? (
                        <StatBlock value={formatearMetrica(meGusta)} label="Me gusta" />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {ofreceConferencias ? (
          <section className="mt-24 border-t border-line pt-16">
            <div className="border border-amber bg-surface p-10 md:p-16">
              <p className="mb-4 font-body text-label-caps uppercase tracking-widest text-amber">
                Conferencista
              </p>
              <h2 className="text-heading-lg mb-8 font-display uppercase">
                También es conferencista
              </h2>
              {talento.conferencista?.experienciaPrevia ? (
                <p className="mb-10 max-w-[60ch] break-words font-body text-body-lg text-foreground-muted">
                  {talento.conferencista.experienciaPrevia}
                </p>
              ) : null}
              <Button href="/conferencias" variant="ghost" icon="arrow_forward">
                Ver conferencias
              </Button>
            </div>
          </section>
        ) : null}

        {/* Decisión #51: el CTA va a /contacto, no a la ruta /patrocinar. Esa ruta
            sigue existiendo, solo dejó de ser el destino del botón. Cierra la página
            (decisión #73): el visitante llega acá habiendo visto logros, galería,
            marcas y alcance — recién ahí el pedido de patrocinio tiene respaldo.
            Lleva el mismo separador que las demás secciones para no quedar colgando
            del bloque anterior. */}
        <section className="mt-24 border-t border-line pt-16">
          <Button href="/contacto" icon="arrow_forward">
            Quiero patrocinar a {primerNombre}
          </Button>
        </section>
      </Container>
    </>
  );
}
