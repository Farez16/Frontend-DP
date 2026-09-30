import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { PortableTextBlock } from "@portabletext/react";
import { Container } from "@/components/ui/Container";
import { AppearanceCarousel } from "@/components/sections/AppearanceCarousel";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { RichText } from "@/components/ui/RichText";
import { client, sanityFetch } from "@/sanity/client";
import { CONFERENCIA_DETALLE_QUERY, CONFERENCIAS_LISTADO_QUERY } from "@/sanity/queries";
import { mapConferenciaDetalle, type RawConferenciaDetalle } from "@/lib/conferencias";
import { MOTIVO_CONFERENCIA, PARAM_MOTIVO } from "@/lib/contacto";
import { conSufijo, recortarParaMeta } from "@/lib/seo";

/**
 * Aplana Portable Text a texto corrido para la meta descripción.
 *
 * La conferencia no tiene un campo corto equivalente al `extracto` de la noticia, así
 * que el respaldo automático sale de `descripcion`. Recorre igual que
 * calcularTiempoLectura() en el detalle de noticia: solo bloques `block`, solo el
 * `text` de sus hijos. Un `_type` que no sea `block` no puede aparecer (el array no
 * admite tipos personalizados) y si algún día lo hiciera, se ignora en vez de
 * imprimir "[object Object]" en el <head>.
 */
function textoPlano(bloques: PortableTextBlock[] | null): string {
  if (!Array.isArray(bloques)) return "";
  const partes: string[] = [];
  for (const bloque of bloques) {
    if (bloque._type !== "block" || !Array.isArray(bloque.children)) continue;
    for (const hijo of bloque.children as { text?: string }[]) {
      if (typeof hijo.text === "string") partes.push(hijo.text);
    }
  }
  return partes.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * El `sizes` de la columna principal, tramo por tramo. Es el mismo que el hero del
 * detalle de noticia porque la rejilla es idéntica (Container de 1440 con px-5/px-20,
 * gap-12 que pasa a gap-16 en xl, sidebar de 340px):
 *
 *   >=1440   1280 de contenido - 64 de gap - 340 de sidebar = 876px
 *   >=1280   (100vw - 160) - 64 - 340                       = 100vw - 564px
 *   >=1024   (100vw - 160) - 48 - 340                       = 100vw - 548px
 *   >=768    una sola columna: 100vw - 160
 *   resto    una sola columna: 100vw - 40
 */
const SIZES_COLUMNA_PRINCIPAL =
  "(min-width: 1440px) 876px, (min-width: 1280px) calc(100vw - 564px), (min-width: 1024px) calc(100vw - 548px), (min-width: 768px) calc(100vw - 160px), calc(100vw - 40px)";

// useCdn:false a propósito, igual que en /noticias/[slug] y /talentos/[slug]: en build
// hay que ver conferencias recién publicadas que todavía no llegaron al CDN.
export async function generateStaticParams() {
  const conferencias = await client
    .withConfig({ useCdn: false })
    .fetch<{ slug: string }[]>(CONFERENCIAS_LISTADO_QUERY);
  return conferencias.map(({ slug }) => ({ slug }));
}

/**
 * SEO real del detalle (mismo patrón que /noticias/[slug] y /talentos/[slug]).
 *
 * - metaTitulo / metaDescripcion del campo seo mandan si el editor los rellenó.
 * - Respaldo automático: título = titulo de la conferencia; descripción = la
 *   `descripcion` aplanada y recortada a 155 caracteres, y si viniera vacía, el
 *   público objetivo, que es el otro campo obligatorio con texto corrido.
 * - imagenOG vacía hereda la miniatura del video, o la foto del conferencista si no
 *   hay video — la misma cascada que dibuja la portada de la página.
 */
export async function generateMetadata({
  params,
}: PageProps<"/conferencias/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const raw = await sanityFetch<RawConferenciaDetalle | null>(CONFERENCIA_DETALLE_QUERY, {
    slug,
  });
  if (!raw) return {};

  const metaTitulo = raw.seo?.metaTitulo?.trim();
  const metaDescripcion = raw.seo?.metaDescripcion?.trim();

  // || y no ??: cadena vacía debe caer al respaldo.
  const title = metaTitulo || raw.titulo;
  const description =
    metaDescripcion ||
    recortarParaMeta(textoPlano(raw.descripcion) || raw.publicoObjetivo);

  const conferencia = mapConferenciaDetalle(raw);
  // La url sin recortar del asset alcanza para OG; el recorte de la página no sirve
  // acá porque las redes piden su propia proporción.
  const imagenOG =
    raw.seo?.imagenOG?.url ?? raw.video?.miniatura?.url ?? raw.talento?.foto?.url ?? null;

  return {
    title,
    description,
    openGraph: {
      title: conSufijo(title),
      description,
      images: imagenOG
        ? [{ url: imagenOG, alt: conferencia.portada?.alt ?? raw.titulo }]
        : undefined,
    },
  };
}

export default async function ConferenciaPage({
  params,
}: PageProps<"/conferencias/[slug]">) {
  const { slug } = await params;

  const raw = await sanityFetch<RawConferenciaDetalle | null>(CONFERENCIA_DETALLE_QUERY, {
    slug,
  });

  // Slug inexistente → 404 limpio, sin crash.
  if (!raw) notFound();

  const conferencia = mapConferenciaDetalle(raw);
  const { talento, portada, apariciones } = conferencia;

  return (
    <Container as="article" className="py-20 md:py-28">
      {/* Misma rejilla editorial a dos columnas que el detalle de noticia. */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-16">
        {/* COLUMNA PRINCIPAL */}
        <div className="min-w-0">
          <header className="mb-8">
            <p className="mb-4 font-body text-label-caps uppercase tracking-widest text-amber">
              Conferencia
            </p>
            <h1 className="text-heading-lg font-display uppercase leading-tight text-foreground">
              {conferencia.titulo}
            </h1>
            {talento && (
              <p className="mt-4 font-body text-body-lg text-foreground-muted">
                Con {talento.nombre}
                <span aria-hidden="true" className="mx-2 text-outline-variant">
                  ·
                </span>
                {talento.disciplina}
              </p>
            )}
          </header>

          {/* Marco de la portada, 16:9 — la proporción de la miniatura de Bunny Stream.
              El recorte ya viene hecho por el CDN con el hotspot del editor, así que
              object-cover queda de red de seguridad.

              El ícono de reproducción solo aparece si el documento tiene videoId: sobre
              una portada que en realidad es la foto del conferencista sería mentira. Y
              aun con videoId el video no se reproduce — este frontend sigue sin
              credenciales de Bunny Stream, igual que la galería de /talentos/[slug]. */}
          {portada && (
            <div className="relative mb-10 aspect-video overflow-hidden border border-line bg-surface-deep">
              <Image
                src={portada.src}
                alt={portada.alt}
                fill
                priority
                sizes={SIZES_COLUMNA_PRINCIPAL}
                className="object-cover"
              />
              {conferencia.tieneVideo && (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center justify-center bg-ink/20"
                >
                  <Icon name="play_circle" filled size={56} className="text-foreground" />
                </div>
              )}
            </div>
          )}

          {/* RichText ya envuelve el contenido en su propio div con font-body,
              text-body-lg y text-foreground-muted — no hace falta repetirlas. */}
          <RichText value={raw.descripcion} />

          <section className="mt-12 border-t border-line pt-8">
            <h2 className="mb-3 font-body text-label-caps uppercase tracking-widest text-amber">
              Público objetivo
            </h2>
            <p className="font-body text-body-lg text-foreground-muted">
              {conferencia.publicoObjetivo}
            </p>
          </section>

          {/* Cierre de página: enlace de retorno */}
          <div className="mt-14 border-t border-line pt-8">
            <ArrowLink href="/conferencias">Ver todas las conferencias</ArrowLink>
          </div>
        </div>

        {/* COLUMNA LATERAL (SIDEBAR)

            Misma jerarquía que el sidebar del detalle de noticia: <aside> es una
            región complementaria, el rótulo de cada tarjeta es su <h2> y lo que va
            dentro (el nombre del conferencista) baja a <h3>. */}
        <aside className="space-y-8 lg:sticky lg:top-28 lg:self-start">
          {/* 1. Conferencista */}
          {talento && (
            <div className="border border-line bg-surface p-6">
              <h2 className="mb-4 font-body text-label-caps uppercase tracking-widest text-amber">
                Conferencista
              </h2>
              <div className="flex items-center gap-4">
                {talento.foto && (
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-amber">
                    <Image
                      src={talento.foto.src}
                      alt={talento.foto.alt}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                )}
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
          )}

          {/* 2. Apariciones — ordenadas por fecha descendente en la query, no por el
                arrastre del editor en el Studio (ver CONFERENCIA_DETALLE_QUERY). Con
                dos o más rotan solas en un carrusel; con una queda fija. Esa decisión
                vive dentro del componente y no acá para que el rótulo de arriba sea lo
                único que esta página tenga que saber contar. */}
          {apariciones.length > 0 && (
            <div className="border border-line bg-surface p-6">
              <h2 className="mb-4 font-body text-label-caps uppercase tracking-widest text-amber">
                {apariciones.length === 1 ? "Aparición" : "Apariciones"}
              </h2>
              <AppearanceCarousel apariciones={apariciones} />
            </div>
          )}

          {/* 3. Contratación. La nota comercial es texto del editor y nunca un precio
                (decisión #30); sin ella la tarjeta cae a una línea genérica. */}
          <div className="border border-line bg-surface p-6">
            <h2 className="mb-2 font-body text-label-caps uppercase tracking-widest text-amber">
              Contratar esta conferencia
            </h2>
            <p className="mb-5 font-body text-body-sm text-foreground-muted">
              {conferencia.notaComercial ??
                "Escríbenos para conocer formatos, disponibilidad y condiciones."}
            </p>
            <Button
              href={`/contacto?${PARAM_MOTIVO}=${MOTIVO_CONFERENCIA}`}
              variant="ghost"
              className="w-full justify-center"
            >
              Solicitar información
            </Button>
          </div>
        </aside>
      </div>
    </Container>
  );
}
