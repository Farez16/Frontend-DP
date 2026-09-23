import type { Talento } from "@/types/content";

/**
 * FIXTURE TEMPORAL — no es Sanity todavía (Fase 6). Un único talento
 * real y ya aprobado (Daniel Pintado); deliberadamente NO incluye a
 * los atletas ficticios de relleno del prototipo (Camila Ordóñez,
 * Daniela Ríos, etc. — ver auditoría §3, decisión pendiente #8).
 * El shape ya imita lo que una consulta GROQ devolvería.
 */
export const talentos: Talento[] = [
  {
    slug: "daniel-pintado",
    nombre: "Daniel Pintado",
    disciplina: "Marcha Atlética",
    foto: {
      src: "/talentos/daniel-pintado.jpg",
      alt: "Daniel Pintado entrenando en pista, Cuenca",
    },
  },
];

export function getTalentoPorSlug(slug: string): Talento | undefined {
  return talentos.find((talento) => talento.slug === slug);
}
