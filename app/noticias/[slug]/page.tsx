import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { PortableTextBlock } from "@portabletext/react";
import { Container } from "@/components/ui/Container";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { Button } from "@/components/ui/Button";
import { RichText } from "@/components/ui/RichText";
import { client } from "@/sanity/client";
import { urlDeImagen, type ImagenSanity } from "@/sanity/image";
import {
  NOTICIA_DETALLE_QUERY,
  NOTICIAS_LISTADO_QUERY,
  NOTICIAS_RECIENTES_QUERY,
} from "@/sanity/queries";
import { mapNoticia, formatearFechaLegible, type RawNoticiaBase } from "@/lib/noticias";
import { conSufijo, recortarParaMeta } from "@/lib/seo";

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

interface RawNoticiaDetalle extends RawNoticiaBase {
  /** Opcional en el schema: una noticia puede publicarse sólo con extracto. */
  cuerpo: PortableTextBlock[] | null;
  talentosRelacionados: RawTalentoSidebar[] | null;
  seo: RawSeoNoticia | null;
}

function calcularTiempoLectura(extracto: string, cuerpo: PortableTextBlock[] | null): number {
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
 */
export async function generateMetadata({
  params,
}: PageProps<"/noticias/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const noticia = await client.fetch<RawNoticiaDetalle | null>(NOTICIA_DETALLE_QUERY, {
    slug,
  });
  if (!noticia) return {};

  const metaTitulo = noticia.seo?.metaTitulo?.trim();
  const metaDescripcion = noticia.seo?.metaDescripcion?.trim();

  const title = metaTitulo || noticia.titulo;
  const description = metaDescripcion || recortarParaMeta(noticia.extracto);
  const imagenOG = noticia.seo?.imagenOG?.url ?? noticia.portada.url;

  return {
    title,
    description,
    openGraph: {
      title: conSufijo(title),
      description,
      images: imagenOG ? [{ url: imagenOG, alt: noticia.portada.alt }] : undefined,
    },
  };
}

export default async function NoticiaPage({ params }: PageProps<"/noticias/[slug]">) {
  const { slug } = await params;

  const [noticiaRaw, otrasNoticiasRaw] = await Promise.all([
    client.fetch<RawNoticiaDetalle | null>(NOTICIA_DETALLE_QUERY, { slug }),
    client.fetch<RawNoticiaBase[]>(NOTICIAS_RECIENTES_QUERY, { slug }),
  ]);

  if (!noticiaRaw) notFound();

  const noticia = mapNoticia(noticiaRaw);
  const fechaLegible = formatearFechaLegible(noticiaRaw.fecha);
  const tiempoLectura = calcularTiempoLectura(noticia.extracto, noticiaRaw.cuerpo);
  const otrasNoticias = otrasNoticiasRaw.map(mapNoticia);

  // Limpieza de comillas dobles si el editor las ingresó literalmente en Sanity Studio
  const altLimpio = noticiaRaw.portada.alt
    ? noticiaRaw.portada.alt.replace(/^"(.*)"$/, "$1")
    : noticiaRaw.titulo;

  // Punto focal inteligente: si el editor configuró hotspot, se usa fielmente;
  // de lo contrario, "center 22%" garantiza que en fotos verticales el rostro y cabeza
  // del deportista siempre queden visibles dentro del encuadre.
  const posicionObjeto = noticiaRaw.portada.hotspot
    ? `${(noticiaRaw.portada.hotspot.x * 100).toFixed(0)}% ${(noticiaRaw.portada.hotspot.y * 100).toFixed(0)}%`
    : "center 22%";

  const portadaHero = noticiaRaw.portada.assetRef
    ? urlDeImagen(noticiaRaw.portada, 1200)
    : noticiaRaw.portada.url;

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
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-outline-variant" />
              <time
                dateTime={noticia.fecha}
                className="font-body text-body-md text-foreground-muted"
              >
                {fechaLegible}
              </time>
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-outline-variant" />
              <span className="font-body text-body-md text-foreground-muted">
                {tiempoLectura} min de lectura
              </span>
            </div>
            <h1 className="text-heading-lg font-display uppercase leading-tight text-foreground">
              {noticia.titulo}
            </h1>
            {noticia.extracto && (
              <p className="mt-6 border-l-2 border-amber pl-4 font-body text-body-lg text-foreground-muted italic leading-relaxed">
                {noticia.extracto}
              </p>
            )}
          </header>

          {/* Marco con tamaño determinado para la portada */}
          <div className="mb-10 overflow-hidden border border-line bg-surface-deep">
            <div className="relative aspect-[16/10] max-h-[460px] w-full">
              <Image
                src={portadaHero}
                alt={altLimpio}
                fill
                priority
                className="object-cover transition-opacity duration-300"
                style={{ objectPosition: posicionObjeto }}
                sizes="(min-width: 1024px) 840px, 100vw"
              />
            </div>
            {altLimpio && (
              <div className="border-t border-line/60 bg-surface px-4 py-2.5">
                <p className="font-body text-body-sm text-foreground-muted">{altLimpio}</p>
              </div>
            )}
          </div>

          {/* Cuerpo del artículo: alineado al ritmo de lectura sin centrado flotante */}
          <div className="font-body text-body-lg text-foreground-muted">
            <RichText value={noticiaRaw.cuerpo} />
          </div>

          {/* Cierre de página: enlace de retorno */}
          <div className="mt-14 border-t border-line pt-8">
            <ArrowLink href="/noticias">Ver todas las noticias</ArrowLink>
          </div>
        </div>

        {/* COLUMNA LATERAL (SIDEBAR) */}
        <aside className="space-y-8 lg:sticky lg:top-28 lg:self-start">
          {/* 1. Atleta(s) relacionado(s) (100% estricto a Sanity) */}
          {talentosRelacionados.length > 0 && (
            <div className="border border-line bg-surface p-6">
              <p className="mb-4 font-body text-label-caps uppercase tracking-widest text-amber">
                {talentosRelacionados.length === 1
                  ? "Talento relacionado"
                  : "Talentos relacionados"}
              </p>
              <div className="space-y-5">
                {talentosRelacionados.map((talento) => (
                  <div key={talento._id}>
                    <div className="flex items-center gap-4">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-amber">
                        <Image
                          src={urlDeImagen(talento.foto, 160, 160)}
                          alt={talento.foto.alt || talento.nombre}
                          fill
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
              <p className="mb-4 font-body text-label-caps uppercase tracking-widest text-amber">
                Más actualidad
              </p>
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
                    <h4 className="font-display text-[17px] uppercase leading-tight text-foreground transition-colors duration-200 group-hover:text-amber">
                      {item.titulo}
                    </h4>
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
            <p className="mb-2 font-body text-label-caps uppercase tracking-widest text-amber">
              Prensa y Marcas
            </p>
            <p className="mb-5 font-body text-body-sm text-foreground-muted">
              ¿Deseas gestionar apariciones, conferencias o patrocinios con nuestros talentos?
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
