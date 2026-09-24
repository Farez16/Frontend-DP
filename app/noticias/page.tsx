import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { NewsCard } from "@/components/sections/NewsCard";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { client } from "@/sanity/client";
import { NOTICIAS_LISTADO_QUERY } from "@/sanity/queries";
import { mapNoticia, type RawNoticiaBase } from "@/lib/noticias";

export const metadata: Metadata = {
  title: "Noticias",
  description:
    "Resultados, preparación y apariciones públicas de nuestros talentos y conferencistas.",
};

export default async function NoticiasPage() {
  const noticiasRaw = await client.fetch<RawNoticiaBase[]>(NOTICIAS_LISTADO_QUERY);
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
