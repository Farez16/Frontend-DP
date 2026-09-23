import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { AthleteCard } from "@/components/sections/AthleteCard";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { client } from "@/sanity/client";
import { TALENTOS_LISTADO_QUERY } from "@/sanity/queries";
import { cn } from "@/lib/utils";
import type { Talento } from "@/types/content";

export const metadata: Metadata = {
  title: "Talentos",
  description: "Roster de talentos representados por DP Agencia Deportiva.",
};

interface RawTalentoListado {
  nombre: string;
  slug: string;
  disciplina: string;
  foto: { url: string; alt: string };
}

function mapTalento(raw: RawTalentoListado): Talento {
  return {
    slug: raw.slug,
    nombre: raw.nombre,
    disciplina: raw.disciplina,
    foto: { src: raw.foto.url, alt: raw.foto.alt },
  };
}

export default async function TalentosPage() {
  const talentosRaw = await client.fetch<RawTalentoListado[]>(TALENTOS_LISTADO_QUERY);
  const talentos = talentosRaw.map(mapTalento);

  return (
    <Container className="py-30">
      <header className="mb-16">
        <h1 className="text-display-hero font-display uppercase tracking-tighter">
          NUESTROS
          <br />
          <span className="text-amber">TALENTOS</span>
        </h1>
      </header>
      {talentos.length === 0 ? (
        <ComingSoon message="Estamos preparando el roster completo de nuestros talentos." />
      ) : (
        // Decisión #8 (docs/ARQUITECTURA.md): con 1 solo talento real, no forzar la grilla de
        // 3 columnas (queda una tarjeta sola junto a espacio vacío) — se cae sola en cuanto
        // haya 2+ talentos reales, sin bandera manual que recordar quitar.
        <div
          className={cn(
            "grid grid-cols-1 gap-6",
            talentos.length === 1 ? "max-w-sm" : "md:grid-cols-2 lg:grid-cols-3",
          )}
        >
          {talentos.map((talento, index) => (
            <AthleteCard
              key={talento.slug}
              talento={talento}
              href={`/talentos/${talento.slug}`}
              priority={index === 0}
            />
          ))}
        </div>
      )}
    </Container>
  );
}
