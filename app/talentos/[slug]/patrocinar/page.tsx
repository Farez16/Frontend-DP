import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { PlaceholderNotice } from "@/components/ui/PlaceholderNotice";
import { talentos, getTalentoPorSlug } from "@/lib/data/talentos";

export function generateStaticParams() {
  return talentos.map((talento) => ({ slug: talento.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/talentos/[slug]/patrocinar">): Promise<Metadata> {
  const { slug } = await params;
  const talento = getTalentoPorSlug(slug);
  if (!talento) return {};
  return { title: `Patrocinar a ${talento.nombre}` };
}

export default async function PatrocinarPage({
  params,
}: PageProps<"/talentos/[slug]/patrocinar">) {
  const { slug } = await params;
  const talento = getTalentoPorSlug(slug);
  if (!talento) notFound();

  return (
    <>
      <Container className="pt-8">
        <ArrowLink href={`/talentos/${talento.slug}`}>Volver al perfil</ArrowLink>
      </Container>
      <PlaceholderNotice
        eyebrow="Patrocinio"
        title={`Asóciate con ${talento.nombre}`}
        note="El dossier comercial y el formulario de patrocinio se construyen en la Fase 4/5, con Resend como servicio de envío ya decidido (ver docs/ARQUITECTURA.md)."
      />
    </>
  );
}
