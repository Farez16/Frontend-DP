import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { talentos, getTalentoPorSlug } from "@/lib/data/talentos";

export function generateStaticParams() {
  return talentos.map((talento) => ({ slug: talento.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/talentos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const talento = getTalentoPorSlug(slug);
  if (!talento) return {};
  return {
    title: talento.nombre,
    description: talento.bio ?? `${talento.nombre} — ${talento.disciplina}, DP Agencia Deportiva.`,
  };
}

export default async function TalentoPage({ params }: PageProps<"/talentos/[slug]">) {
  const { slug } = await params;
  const talento = getTalentoPorSlug(slug);
  if (!talento) notFound();

  const primerNombre = talento.nombre.split(" ")[0] ?? talento.nombre;

  return (
    <Container className="py-30">
      <ArrowLink href="/talentos" className="mb-8">
        Volver al roster
      </ArrowLink>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-center">
        <div className="relative aspect-[3/4] overflow-hidden border border-line md:col-span-5">
          <Image
            src={talento.foto.src}
            alt={talento.foto.alt}
            fill
            priority
            className="object-cover"
          />
        </div>
        <div className="md:col-span-7">
          <p className="mb-4 font-body text-label-caps uppercase tracking-widest text-amber">
            {talento.disciplina}
          </p>
          <h1 className="text-display-hero mb-6 font-display uppercase">{talento.nombre}</h1>
          {talento.hitoDestacado ? (
            <p className="mb-6 border-l-2 border-amber pl-6 font-body text-body-lg text-foreground">
              {talento.hitoDestacado}
            </p>
          ) : null}
          {talento.bio ? (
            <p className="mb-8 max-w-[60ch] font-body text-body-lg text-foreground-muted">
              {talento.bio}
            </p>
          ) : null}
          <Button href={`/talentos/${talento.slug}/patrocinar`} icon="arrow_forward">
            Quiero patrocinar a {primerNombre}
          </Button>
          <p className="mt-10 border-t border-line pt-8 font-body text-body-md text-foreground-muted opacity-60">
            La ficha completa (hitos, galería, sponsors, redes) se construye en la Fase 4.
          </p>
        </div>
      </div>
    </Container>
  );
}
