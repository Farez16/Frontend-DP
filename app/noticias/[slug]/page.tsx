import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { noticias, getNoticiaPorSlug } from "@/lib/data/noticias";

export function generateStaticParams() {
  return noticias.map((noticia) => ({ slug: noticia.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/noticias/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const noticia = getNoticiaPorSlug(slug);
  if (!noticia) return {};
  return { title: noticia.titulo, description: noticia.extracto };
}

export default async function NoticiaPage({ params }: PageProps<"/noticias/[slug]">) {
  const { slug } = await params;
  const noticia = getNoticiaPorSlug(slug);
  if (!noticia) notFound();

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
            {noticia.fechaLegible}
          </time>
        </div>
        <h1 className="text-heading-lg font-display uppercase">{noticia.titulo}</h1>
      </header>
      <div className="relative mb-16 aspect-video max-h-[520px] w-full overflow-hidden border border-line">
        <Image
          src={noticia.portada.src}
          alt={noticia.portada.alt}
          fill
          priority
          className="object-cover"
        />
      </div>
      <div className="mx-auto max-w-[68ch] font-body text-body-lg text-foreground-muted">
        <p>{noticia.extracto}</p>
        <p className="mt-6 opacity-60">
          El cuerpo completo del artículo (Portable Text real) llega con Sanity en la Fase 6.
        </p>
      </div>
    </Container>
  );
}
