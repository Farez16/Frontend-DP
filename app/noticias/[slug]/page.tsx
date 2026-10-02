import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { PortableTextBlock } from "@portabletext/react";
import { BunnyPlayer } from "@/components/sections/BunnyPlayer";
import { Container } from "@/components/ui/Container";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { Button } from "@/components/ui/Button";
import { RichText } from "@/components/ui/RichText";
import { client, sanityFetch } from "@/sanity/client";
import { urlDeImagen, type ImagenSanity } from "@/sanity/image";
import {
  NOTICIA_DETALLE_QUERY,
  NOTICIAS_LISTADO_QUERY,
  NOTICIAS_RECIENTES_QUERY,
} from "@/sanity/queries";
import { mapNoticia, formatearFechaLegible, type RawNoticiaBase } from "@/lib/noticias";
import {
  miniaturaAutomaticaBunny,
  recorteParaMarcoDeVideo,
  videoReproducible,
} from "@/lib/bunny";
import { SIZES_COLUMNA_PRINCIPAL, sizesImagenPreviaVideo } from "@/lib/columnaPrincipal";
import { conSufijo, OPEN_GRAPH_BASE, recortarParaMeta } from "@/lib/seo";

interface RawSeoNoticia {
  metaTitulo: string | null;
  metaDescripcion: string | null;
  imagenOG: { url: string } | null;
}

interface RawTalentoSidebar {
  _id: string;
  nombre: string;
  slug: string;
  disciplina: string;
  foto: ImagenSanity;
}

/**
 * Lo mínimo que dibuja la tarjeta “Más actualidad” del sidebar. No pasa por
 * mapNoticia: ese mapeador exige `portada` para recortarla al tamaño de tarjeta, y
 * aquí no se dibuja ninguna imagen — pedirla sería traer un recorte que nadie ve.
 */
interface RawNoticiaSidebar {
  titulo: string;
  slug: string;
  categoria: string;
  fecha: string;
}

interface RawVideoNoticia {
  /** Lo escribe la function `bunny-stream-upload` después de publicar; falta hasta entonces. */
  videoId: string | null;
  titulo: string | null;
  dimensiones: { ancho: number | null; alto: number | null } | null;
  miniatura: ImagenSanity | null;
}

interface RawNoticiaDetalle extends RawNoticiaBase {
  /** Opcional en el schema: una noticia puede publicarse sólo con extracto. */
  cuerpo: PortableTextBlock[] | null;
  /** El único elemento de `video[]`, o null si la noticia no lleva video. */
  video: RawVideoNoticia | null;
  talentosRelacionados: RawTalentoSidebar[] | null;
  seo: RawSeoNoticia | null;
}

/**
 * La imagen previa del reproductor, en este orden:
 *
 * 1. La miniatura que subió el editor, recortada por el CDN de Sanity a la proporción del
 *    video —la misma del marco—, así que el hotspot se respeta y object-cover no recorta
 *    nada más. Sin dimensiones todavía, a 16:9, que es a lo que cae el marco.
 * 2. La automática de Bunny, que ya tiene la proporción del video y va sin pasar por el
 *    optimizador de next/image (ver lib/bunny.ts).
 *
 * No hay un tercer respaldo porque no hace falta: el reproductor solo se dibuja con
 * `videoId`, y con `videoId` la automática existe. Solo faltaría si no está configurado el
 * hostname del CDN, y ahí queda el marco oscuro con el botón de play encima.
 */
function imagenPreviaDelVideo(
  raw: RawVideoNoticia,
  videoId: string,
  proporcion: { ancho: number; alto: number } | null,
): { src: string; sinOptimizar: boolean } | undefined {
  // Sólo `assetRef` confirma que hay un archivo: una miniatura con el `alt` escrito y sin
  // imagen llega como un objeto con todo en null, que es truthy.
  if (raw.miniatura?.assetRef) {
    const recorte = recorteParaMarcoDeVideo(1920, proporcion);
    return {
      src: urlDeImagen(raw.miniatura, recorte.ancho, recorte.alto),
      sinOptimizar: false,
    };
  }
  const automatica = miniaturaAutomaticaBunny(videoId);
  return automatica ? { src: automatica, sinOptimizar: true } : undefined;
}

function calcularTiempoLectura(
  extracto: string,
  cuerpo: PortableTextBlock[] | null,
): number {
  let totalPalabras = extracto.split(/\s+/).filter(Boolean).length;
  if (Array.isArray(cuerpo)) {
    for (const block of cuerpo) {
      if (block._type === "block" && Array.isArray(block.children)) {
        for (const child of block.children as { text?: string }[]) {
          if (typeof child.text === "string") {
            totalPalabras += child.text.split(/\s+/).filter(Boolean).length;
          }
        }
      }
    }
  }
  return Math.max(1, Math.ceil(totalPalabras / 180));
}

// useCdn:false a propósito en generateStaticParams: igual que en /talentos/[slug],
// en build hay que ver noticias recién publicadas que aún no llegaron al CDN.
export async function generateStaticParams() {
  const noticias = await client
    .withConfig({ useCdn: false })
    .fetch<{ slug: string }[]>(NOTICIAS_LISTADO_QUERY);
  return noticias.map(({ slug }) => ({ slug }));
}

/**
 * SEO real del detalle (mismo patrón que /talentos/[slug]).
 *
 * - metaTitulo / metaDescripcion del campo seo mandan si el editor los rellenó.
 * - imagenOG vacía hereda la portada de la noticia (igual que el talento hereda
 *   su fotografiaPrincipal).
 * - Fallback automático: título = titulo de la noticia, descripción = extracto
 *   recortado a 155 caracteres.
 */
export async function generateMetadata({
  params,
}: PageProps<"/noticias/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const noticia = await sanityFetch<RawNoticiaDetalle | null>(NOTICIA_DETALLE_QUERY, {
    slug,
  });
  if (!noticia) return {};

  const metaTitulo = noticia.seo?.metaTitulo?.trim();
  const metaDescripcion = noticia.seo?.metaDescripcion?.trim();

  // || y no ??: cadena vacía debe caer al respaldo.
  const title = metaTitulo || noticia.titulo;
  const description = metaDescripcion || recortarParaMeta(noticia.extracto);
  // imagenOG vacía hereda la portada (url sin recortar, suficiente para OG).
  const imagenOG = noticia.seo?.imagenOG?.url ?? noticia.portada.url;

  return {
    title,
    description,
    openGraph: {
      ...OPEN_GRAPH_BASE,
      title: conSufijo(title),
      description,
      images: imagenOG ? [{ url: imagenOG, alt: noticia.portada.alt }] : undefined,
    },
  };
}

export default async function NoticiaPage({ params }: PageProps<"/noticias/[slug]">) {
  const { slug } = await params;

  const [noticiaRaw, otrasNoticiasRaw] = await Promise.all([
    sanityFetch<RawNoticiaDetalle | null>(NOTICIA_DETALLE_QUERY, { slug }),
    sanityFetch<RawNoticiaSidebar[]>(NOTICIAS_RECIENTES_QUERY, { slug }),
  ]);

  // Slug inexistente → 404 limpio, sin crash.
  if (!noticiaRaw) notFound();

  const noticia = mapNoticia(noticiaRaw);
  const fechaLegible = formatearFechaLegible(noticiaRaw.fecha);
  const tiempoLectura = calcularTiempoLectura(noticia.extracto, noticiaRaw.cuerpo);
  const otrasNoticias = otrasNoticiasRaw.map((item) => ({
    ...item,
    fechaLegible: formatearFechaLegible(item.fecha),
  }));

  /**
   * El `alt` del editor hace también de pie de foto, pero sólo si existe: son dos
   * cosas distintas. Sin `alt`, el <Image> cae al titular para no quedarse sin texto
   * alternativo, y ese titular NO se dibuja como pie — repetiría el <h1> unos
   * centímetros más abajo.
   *
   * El replace() quita comillas dobles que algún editor escribió literalmente dentro
   * del campo. Es un parche de dato sucio, no una regla: lo correcto es arreglarlo
   * en el Studio.
   */
  const pieDeFoto = noticiaRaw.portada.alt
    ? noticiaRaw.portada.alt.trim().replace(/^"(.*)"$/, "$1")
    : "";
  const altPortada = pieDeFoto || noticiaRaw.titulo;

  /**
   * 1920×1200 y no un ancho a secas: el `sizes` del <Image> declara como máximo
   * 876px (el ancho real de esta columna cuando el Container topa en sus 1440px),
   * ×2 por las pantallas 2x da 1752, y el escalón de next/image que lo cubre es
   * 1920 — la regla que documenta sanity/image.ts. El alto sale de la misma
   * proporción 16:10 del marco.
   *
   * Pedir el alto es lo que cambia el recorte de bando: con él, el CDN devuelve el
   * rectángulo exacto centrado en el hotspot que marcó el editor, en vez de la foto
   * entera escalada por ancho que luego había que recortar a ojo con objectPosition.
   */
  const portadaHero = noticiaRaw.portada.assetRef
    ? urlDeImagen(noticiaRaw.portada, 1920, 1200)
    : noticiaRaw.portada.url;

  // Sin `videoId` no hay nada que reproducir —la function todavía no copió el video, o la
  // noticia no lleva—, y entonces el bloque no existe.
  const video = videoReproducible(noticiaRaw.video);
  const imagenPreviaVideo =
    video && noticiaRaw.video
      ? imagenPreviaDelVideo(noticiaRaw.video, video.videoId, video.proporcion)
      : undefined;

  // Talentos vinculados a la noticia: 100% estricto a Sanity.
  // Solo se muestran si el editor los relacionó explícitamente en el documento.
  const talentosRelacionados = (noticiaRaw.talentosRelacionados ?? []).filter(
    (talento): talento is RawTalentoSidebar => Boolean(talento && talento.slug),
  );

  return (
    <Container as="article" className="py-20 md:py-28">
      {/* Estructura editorial a dos columnas */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-16">
        {/* COLUMNA PRINCIPAL */}
        <div className="min-w-0">
          <header className="mb-8">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="font-body text-label-caps uppercase tracking-widest text-amber">
                {noticia.categoria}
              </span>
              <span
                aria-hidden="true"
                className="h-1 w-1 rounded-full bg-outline-variant"
              />
              <time
                dateTime={noticia.fecha}
                className="font-body text-body-md text-foreground-muted"
              >
                {fechaLegible}
              </time>
              <span
                aria-hidden="true"
                className="h-1 w-1 rounded-full bg-outline-variant"
              />
              <span className="font-body text-body-md text-foreground-muted">
                {tiempoLectura} min de lectura
              </span>
            </div>
            <h1 className="text-heading-lg font-display uppercase leading-tight text-foreground">
              {noticia.titulo}
            </h1>
            {/* El extracto hace de entradilla. Va aparte del cuerpo a propósito: es un
                campo propio del schema (máx. 130 caracteres, el mismo que resumen las
                tarjetas), no el primer párrafo del artículo. */}
            <p className="mt-6 border-l-2 border-amber pl-4 font-body text-body-lg text-foreground-muted italic leading-relaxed">
              {noticia.extracto}
            </p>
          </header>

          {/* Marco de la portada, 16:10 en todos los anchos: sin max-h, que es lo que
              rompía la proporción en cuanto la columna pasa de ~736px. El recorte ya
              viene hecho por el CDN (ver portadaHero), así que object-cover queda de
              red de seguridad y no hace falta ningún objectPosition. El `sizes` describe
              la caja tramo por tramo (ver SIZES_COLUMNA_PRINCIPAL). */}
          <div className="mb-10 overflow-hidden border border-line bg-surface-deep">
            <div className="relative aspect-[16/10] w-full">
              <Image
                src={portadaHero}
                alt={altPortada}
                fill
                priority
                className="object-cover transition-opacity duration-300"
                sizes={SIZES_COLUMNA_PRINCIPAL}
              />
            </div>
            {pieDeFoto && (
              <div className="border-t border-line/60 bg-surface px-4 py-2.5">
                <p className="font-body text-body-sm text-foreground-muted">
                  {pieDeFoto}
                </p>
              </div>
            )}
          </div>

          {/* El video va aparte de la portada y debajo de ella, no en su lugar como en la
              conferencia: la portada es un recorte apaisado 16:10 que además usan la
              tarjeta y la imagen OG, y el material de DP suele ser vertical — usarla de
              imagen previa de un 9:16 la recortaría a una franja.

              El marco toma la proporción real del video y, si es vertical, encoge a lo
              ancho para no pasar del 70vh de alto (ver BunnyPlayer); mientras Bunny no
              terminó de codificar, cae a 16:9. El iframe recién existe al pulsar
              reproducir. No hace falta nada más de lo que BunnyPlayer trae para el
              lightbox: acá hay una sola instancia en una página normal.

              La imagen previa es decorativa, igual que en la galería de talento: el
              botón que la cubre ya se llama "Reproducir: título", y un alt encima lo
              repetiría. Su `sizes` sigue al marco y no a la columna (ver
              sizesImagenPreviaVideo); solo cuenta para la miniatura manual, porque la
              automática de Bunny no pasa por el optimizador. */}
          {video && (
            <BunnyPlayer
              videoId={video.videoId}
              titulo={video.titulo ?? noticia.titulo}
              proporcion={video.proporcion}
              className="mb-10 border border-line bg-surface-deep"
            >
              {imagenPreviaVideo ? (
                <Image
                  src={imagenPreviaVideo.src}
                  alt=""
                  aria-hidden="true"
                  fill
                  sizes={sizesImagenPreviaVideo(video.proporcion)}
                  unoptimized={imagenPreviaVideo.sinOptimizar}
                  className="object-cover"
                />
              ) : null}
            </BunnyPlayer>
          )}

          {/* RichText ya envuelve el cuerpo en su propio div con font-body,
              text-body-lg y text-foreground-muted — no hace falta repetirlas aquí. */}
          <RichText value={noticiaRaw.cuerpo} />

          {/* Cierre de página: enlace de retorno */}
          <div className="mt-14 border-t border-line pt-8">
            <ArrowLink href="/noticias">Ver todas las noticias</ArrowLink>
          </div>
        </div>

        {/* COLUMNA LATERAL (SIDEBAR)

            Jerarquía: <aside> es una región complementaria, aparte del artículo, así
            que el rótulo de cada tarjeta es su <h2> y lo que va dentro (nombre del
            talento, titulares de otras noticias) baja a <h3>. Antes eran <p> + <h3>
            + <h4>, que anunciaba una jerarquía de cuatro niveles inexistente. */}
        <aside className="space-y-8 lg:sticky lg:top-28 lg:self-start">
          {/* 1. Atleta(s) relacionado(s) (100% estricto a Sanity) */}
          {talentosRelacionados.length > 0 && (
            <div className="border border-line bg-surface p-6">
              <h2 className="mb-4 font-body text-label-caps uppercase tracking-widest text-amber">
                {talentosRelacionados.length === 1
                  ? "Talento relacionado"
                  : "Talentos relacionados"}
              </h2>
              <div className="space-y-5">
                {talentosRelacionados.map((talento) => (
                  <div key={talento._id}>
                    <div className="flex items-center gap-4">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-amber">
                        <Image
                          src={urlDeImagen(talento.foto, 160, 160)}
                          alt={talento.foto.alt || talento.nombre}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-display text-heading-md uppercase text-foreground">
                          {talento.nombre}
                        </h3>
                        <p className="truncate font-body text-body-sm text-foreground-muted">
                          {talento.disciplina}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 border-t border-line/60 pt-3">
                      <ArrowLink href={`/talentos/${talento.slug}`}>
                        Ver perfil del atleta
                      </ArrowLink>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Otras noticias recientes */}
          {otrasNoticias.length > 0 && (
            <div className="border border-line bg-surface p-6">
              <h2 className="mb-4 font-body text-label-caps uppercase tracking-widest text-amber">
                Más actualidad
              </h2>
              <div className="divide-y divide-line/60">
                {otrasNoticias.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/noticias/${item.slug}`}
                    className="group block py-4 first:pt-0 last:pb-0"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-body text-[11px] uppercase tracking-wider text-amber">
                        {item.categoria}
                      </span>
                      <span
                        aria-hidden="true"
                        className="h-1 w-1 rounded-full bg-outline-variant"
                      />
                      <time className="font-body text-body-sm text-foreground-muted">
                        {item.fechaLegible}
                      </time>
                    </div>
                    <h3 className="font-display text-[17px] uppercase leading-tight text-foreground transition-colors duration-200 group-hover:text-amber">
                      {item.titulo}
                    </h3>
                  </Link>
                ))}
              </div>
              <div className="mt-5 border-t border-line/60 pt-4">
                <ArrowLink href="/noticias">Ir al archivo de noticias</ArrowLink>
              </div>
            </div>
          )}

          {/* 3. Tarjeta de contacto / Prensa */}
          <div className="border border-line bg-surface p-6">
            <h2 className="mb-2 font-body text-label-caps uppercase tracking-widest text-amber">
              Prensa y Marcas
            </h2>
            <p className="mb-5 font-body text-body-sm text-foreground-muted">
              ¿Deseas gestionar apariciones, conferencias o patrocinios con nuestros
              talentos?
            </p>
            <Button href="/contacto" variant="ghost" className="w-full justify-center">
              Contactar a la agencia
            </Button>
          </div>
        </aside>
      </div>
    </Container>
  );
}
