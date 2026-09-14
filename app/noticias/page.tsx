import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { NewsCard } from "@/components/sections/NewsCard";
import { noticias } from "@/lib/data/noticias";

export const metadata: Metadata = {
  title: "Noticias",
  description: "Resultados, preparación y apariciones públicas de nuestros talentos y conferencistas.",
};

export default function NoticiasPage() {
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
          Resultados, preparación y apariciones públicas de nuestros talentos y conferencistas.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {noticias.map((noticia) => (
          <NewsCard key={noticia.slug} noticia={noticia} />
        ))}
      </div>
    </Container>
  );
}
