import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { ConferenceCard } from "@/components/sections/ConferenceCard";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { sanityFetch } from "@/sanity/client";
import { imagenesOpenGraph } from "@/sanity/image";
import { CONFERENCIAS_LISTADO_QUERY } from "@/sanity/queries";
import { mapConferencia, type RawConferenciaListado } from "@/lib/conferencias";
import { conSufijo, OPEN_GRAPH_BASE } from "@/lib/seo";
import { cn } from "@/lib/utils";

const TITULO = "Conferencias";
const DESCRIPCION =
  "Charlas inspiracionales y formativas impartidas por nuestros atletas y talentos de élite para empresas, instituciones y foros de liderazgo.";

/**
 * La imagen OG es la de la primera conferencia del listado, en el mismo orden que la
 * grilla — el criterio de /talentos, que usa la foto del primer talento. Sigue la
 * cascada de la portada de /conferencias/[slug] para OG: la imagen o la miniatura que
 * subió el editor y, si no hay, la foto del conferencista. La miniatura automática de
 * Bunny queda fuera por lo mismo que allá: la pull zone le responde 403 a un crawler
 * sin Referer. Sin conferencias publicadas se comparte sin imagen.
 *
 * Se repite la query de la página a propósito: Next deduplica el fetch entre
 * generateMetadata y el render, así que no es una segunda petición a Sanity.
 */
export async function generateMetadata(): Promise<Metadata> {
  const conferencias = await sanityFetch<RawConferenciaListado[]>(
    CONFERENCIAS_LISTADO_QUERY,
  );
  const primera = conferencias[0];
  // `?.url` y no la sola presencia del objeto: un campo con alt pero sin archivo
  // llega con `url: null` (ver imagenConArchivo en lib/conferencias.ts).
  const imagen = [primera?.portada, primera?.talento?.foto].find((foto) => foto?.url);

  return {
    title: TITULO,
    description: DESCRIPCION,
    openGraph: {
      ...OPEN_GRAPH_BASE,
      // og:title no pasa por la plantilla del layout: el sufijo va a mano.
      title: conSufijo(TITULO),
      description: DESCRIPCION,
      images: imagenesOpenGraph(imagen, imagen?.alt || primera?.titulo || TITULO),
    },
  };
}

/**
 * Las tres configuraciones reales de la grilla, cada una con el `sizes` que le
 * corresponde. Van en la misma tabla a propósito: el ancho que ocupa la tarjeta lo
 * decide esta rama y nada más, así que tenerlos en lugares distintos es la forma
 * conocida de que el `sizes` se quede describiendo una grilla que ya cambió —
 * next/image pediría entonces un ancho que no es el de la caja y la portada saldría
 * estirada.
 *
 * Los números salen del Container (max-w-[1440px], px-5 en móvil y px-20 desde md) y
 * del gap-6 de la grilla:
 * - 1 tarjeta: la grilla va a `max-w-xl`, así que desde 768 la caja mide 576px fijos
 *   (el contenido ya es más ancho que el tope) y deja de depender del viewport.
 * - 2 columnas: a 1440 la caja mide (1280 - 24) / 2 = 628px.
 * - 3 columnas: a 1440 la caja mide (1280 - 48) / 3 = 411px.
 *
 * Por debajo de 768 la tarjeta ocupa el ancho del contenido, que es el viewport menos
 * los 20px de margen de cada lado: `calc(100vw - 40px)` y no `100vw` a secas, que
 * sobredeclara esos 40px.
 */
const GRILLAS = {
  una: {
    clases: "max-w-xl",
    sizes: "(min-width: 768px) 576px, calc(100vw - 40px)",
  },
  dos: {
    clases: "md:grid-cols-2",
    sizes: "(min-width: 1440px) 628px, (min-width: 768px) 50vw, calc(100vw - 40px)",
  },
  tres: {
    clases: "md:grid-cols-2 lg:grid-cols-3",
    sizes:
      "(min-width: 1440px) 411px, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, calc(100vw - 40px)",
  },
} as const;

export default async function ConferenciasPage() {
  const conferenciasRaw = await sanityFetch<RawConferenciaListado[]>(
    CONFERENCIAS_LISTADO_QUERY,
  );
  const conferencias = conferenciasRaw.map(mapConferencia);
  const grilla =
    conferencias.length === 1
      ? GRILLAS.una
      : conferencias.length === 2
        ? GRILLAS.dos
        : GRILLAS.tres;

  return (
    <Container className="py-30">
      <header className="mb-16 max-w-[62ch]">
        <p className="mb-5 font-body text-label-caps uppercase tracking-widest text-amber">
          Conferencias
        </p>
        <h1 className="text-heading-lg mb-6 font-display uppercase">
          Del alto rendimiento a la vida y los negocios
        </h1>
        <p className="font-body text-body-lg text-foreground-muted">
          Charlas inspiracionales y formativas impartidas por nuestros atletas y talentos
          de élite para empresas, instituciones y foros de liderazgo.
        </p>
      </header>
      {conferencias.length === 0 ? (
        <ComingSoon message="Estamos preparando el catálogo de conferencias de nuestros talentos." />
      ) : (
        <div className={cn("grid grid-cols-1 gap-6", grilla.clases)}>
          {conferencias.map((conferencia, index) => (
            <ConferenceCard
              key={conferencia.slug}
              conferencia={conferencia}
              sizes={grilla.sizes}
              priority={index === 0}
            />
          ))}
        </div>
      )}
    </Container>
  );
}
