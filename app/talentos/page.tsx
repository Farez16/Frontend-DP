import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { AthleteCard } from "@/components/sections/AthleteCard";
import { talentos } from "@/lib/data/talentos";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Talentos",
  description: "Roster de talentos representados por DP Agencia Deportiva.",
};

export default function TalentosPage() {
  return (
    <Container className="py-30">
      <header className="mb-16">
        <h1 className="text-display-hero font-display uppercase tracking-tighter">
          NUESTROS
          <br />
          <span className="text-amber">TALENTOS</span>
        </h1>
      </header>
      {/* Decisión #8 (docs/ARQUITECTURA.md): con 1 solo talento real, no forzar la grilla de
          3 columnas (queda una tarjeta sola junto a espacio vacío) — se cae sola en cuanto
          haya 2+ talentos reales, sin bandera manual que recordar quitar. */}
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
    </Container>
  );
}
