import type { Noticia } from "@/types/content";

/**
 * FIXTURE TEMPORAL — no es Sanity todavía (Fase 6). Los 2 artículos
 * reales que ya existen en el prototipo (noticia_temporada_2026,
 * noticia_conferencia_ueb), no contenido inventado para esta fase.
 */
export const noticias: Noticia[] = [
  {
    slug: "temporada-2026",
    categoria: "Deportes",
    titulo: "Daniel Pintado inicia su preparación rumbo a Los Ángeles 2028",
    fecha: "2026-09-02",
    fechaLegible: "2 sep 2026",
    extracto:
      "Tras el oro en los 20 km marcha de París 2024, el marchista ecuatoriano vuelve a los entrenamientos en Cuenca con un nuevo objetivo en el calendario: Los Ángeles 2028.",
    portada: {
      src: "/noticias/temporada-2026.jpg",
      alt: "Daniel Pintado entrenando en pista, Cuenca",
    },
  },
  {
    slug: "conferencia-ueb",
    categoria: "Conferencias",
    titulo: '"Ganar antes de ganar" llega a la Universidad Estatal de Bolívar',
    fecha: "2026-08-18",
    fechaLegible: "18 ago 2026",
    extracto:
      "El campeón olímpico llevó su conferencia insignia a la Universidad Estatal de Bolívar, ante estudiantes y autoridades académicas.",
    portada: {
      src: "/noticias/conferencia-ueb.jpg",
      alt: "Daniel Pintado hablando en el escenario de la Universidad Estatal de Bolívar",
    },
  },
];

export function getNoticiaPorSlug(slug: string): Noticia | undefined {
  return noticias.find((noticia) => noticia.slug === slug);
}
