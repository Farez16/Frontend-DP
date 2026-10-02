import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { NewsCard } from "@/components/sections/NewsCard";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { sanityFetch } from "@/sanity/client";
import { imagenesOpenGraph } from "@/sanity/image";
import { NOTICIAS_LISTADO_QUERY } from "@/sanity/queries";
import { mapNoticia, type RawNoticiaBase } from "@/lib/noticias";
import { conSufijo, OPEN_GRAPH_BASE } from "@/lib/seo";

const TITULO = "Noticias";
const DESCRIPCION =
  "Resultados, preparación y apariciones públicas de nuestros talentos y conferencistas.";

/**
 * La imagen OG es la portada de la primera noticia del listado, que va por fecha
 * descendente: la más reciente. Mismo criterio que /conferencias y /talentos. Sin
 * noticias publicadas se comparte sin imagen.
 *
 * Se repite la query de la página a propósito: Next deduplica el fetch entre
 * generateMetadata y el render, así que no es una segunda petición a Sanity.
 */
export async function generateMetadata(): Promise<Metadata> {
  const noticias = await sanityFetch<RawNoticiaBase[]>(NOTICIAS_LISTADO_QUERY);
  const primera = noticias[0];

  return {
    title: TITULO,
    description: DESCRIPCION,
    openGraph: {
      ...OPEN_GRAPH_BASE,
      // og:title no pasa por la plantilla del layout: el sufijo va a mano.
      title: conSufijo(TITULO),
      description: DESCRIPCION,
      images: imagenesOpenGraph(
        primera?.portada,
        primera?.portada.alt || primera?.titulo || TITULO,
      ),
    },
  };
}

export default async function NoticiasPage() {
  const noticiasRaw = await sanityFetch<RawNoticiaBase[]>(NOTICIAS_LISTADO_QUERY);
  const noticias = noticiasRaw.map(mapNoticia);

  return (
    <Container className="py-30">
      <header className="mb-16 max-w-[62ch]">
        <p className="mb-5 font-body text-label-caps uppercase tracking-widest text-amber">
          Noticias
        </p>
        <h1 className="text-heading-lg mb-6 font-display uppercase">
          Lo último de DP Agencia Deportiva
        </h1>
        <p className="font-body text-body-lg text-foreground-muted">
          Resultados, preparación y apariciones públicas de nuestros talentos y
          conferencistas.
        </p>
      </header>
      {noticias.length === 0 ? (
        <ComingSoon message="Estamos publicando las primeras noticias en este espacio." />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {noticias.map((noticia) => (
            <NewsCard key={noticia.slug} noticia={noticia} />
          ))}
        </div>
      )}
    </Container>
  );
}
