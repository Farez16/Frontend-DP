import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { client } from "@/sanity/client";
import { urlDeImagen } from "@/sanity/image";
import { NOTICIA_DETALLE_QUERY, NOTICIAS_LISTADO_QUERY } from "@/sanity/queries";
import { mapNoticia, formatearFechaLegible, type RawNoticiaBase } from "@/lib/noticias";
import { conSufijo, recortarParaMeta } from "@/lib/seo";

interface RawSeoNoticia {
  metaTitulo: string | null;
  metaDescripcion: string | null;
  imagenOG: { url: string } | null;
}

interface RawNoticiaDetalle extends RawNoticiaBase {
  seo: RawSeoNoticia | null;
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
  const noticia = await client.fetch<RawNoticiaDetalle | null>(NOTICIA_DETALLE_QUERY, {
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
      title: conSufijo(title),
      description,
      images: imagenOG ? [{ url: imagenOG, alt: noticia.portada.alt }] : undefined,
    },
  };
}

export default async function NoticiaPage({ params }: PageProps<"/noticias/[slug]">) {
  const { slug } = await params;
  const noticiaRaw = await client.fetch<RawNoticiaDetalle | null>(NOTICIA_DETALLE_QUERY, {
    slug,
  });

  // Slug inexistente → 404 limpio, sin crash.
  if (!noticiaRaw) notFound();

  const noticia = mapNoticia(noticiaRaw);
  const fechaLegible = formatearFechaLegible(noticiaRaw.fecha);

  // La portada del detalle va en aspecto-video sin un recorte fijo en el alto:
  // el contenedor tiene max-h-[520px], así que el alto máximo está acotado por CSS.
  // Se pide el ancho máximo de la caja (1440px max-w del Container, que ocupa 100%)
  // y se deja que object-cover recorte el resto — el hotspot aquí pierde sentido
  // porque la proporción del contenedor varía con el viewport.
  const portadaHero = noticiaRaw.portada.assetRef
    ? urlDeImagen(noticiaRaw.portada, 1440)
    : noticiaRaw.portada.url;

  return (
    <Container as="article" className="py-30">
      <ArrowLink href="/noticias" className="mb-8">
        Volver a Noticias
      </ArrowLink>
      <header className="mt-8 mb-16 max-w-4xl">
        <div className="mb-5 flex items-center gap-3">
          <span className="font-body text-label-caps uppercase tracking-widest text-amber">
            {noticia.categoria}
          </span>
          <span aria-hidden="true" className="h-1 w-1 rounded-full bg-outline-variant" />
          <time dateTime={noticia.fecha} className="font-body text-body-md text-foreground-muted">
            {fechaLegible}
          </time>
        </div>
        <h1 className="text-heading-lg font-display uppercase">{noticia.titulo}</h1>
      </header>
      <div className="relative mb-16 aspect-video max-h-[520px] w-full overflow-hidden border border-line">
        <Image
          src={portadaHero}
          alt={noticiaRaw.portada.alt}
          fill
          priority
          className="object-cover"
        />
      </div>
      <div className="mx-auto max-w-[68ch] font-body text-body-lg text-foreground-muted">
        <p>{noticia.extracto}</p>
        {/* cuerpo (Portable Text) llega en la Fase N2 */}
        <p className="mt-6 opacity-60">
          El cuerpo completo del artículo (Portable Text real) llega con Sanity en la
          Fase N2.
        </p>
      </div>
    </Container>
  );
}
