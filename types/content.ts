/**
 * Formas de contenido pensadas para que ya se parezcan a lo que Sanity
 * devolverá en la Fase 6 (slug, campos planos, referencias por slug) —
 * así los componentes de presentación no deberían necesitar reescribirse
 * cuando lib/data/* se reemplace por consultas GROQ reales.
 */

export interface ImagenContenido {
  src: string;
  alt: string;
}

export interface Talento {
  slug: string;
  nombre: string;
  disciplina: string;
  foto: ImagenContenido;
}

export interface Noticia {
  slug: string;
  categoria: string;
  titulo: string;
  /** ISO 8601, para <time dateTime> */
  fecha: string;
  fechaLegible: string;
  extracto: string;
  portada: ImagenContenido;
}

export type SponsorTier = "principal" | "suplementacion" | "aliado";

export interface Sponsor {
  /** `_id` del documento en Sanity: estable y único, a diferencia del
   *  nombre o del índice del array. */
  id: string;
  nombre: string;
  /** Ausente cuando el sponsor viene derivado de talentos (Home): esa
   *  franja ignora el tier a propósito, ver sanity/queries.ts. */
  tier?: SponsorTier;
  url?: string;
  /**
   * Opcional a propósito: los logos actuales del prototipo son
   * provisionales (decisión pendiente de la auditoría, #5). Sin logo,
   * SponsorMarquee muestra una insignia de texto en su lugar.
   */
  logo?: ImagenContenido;
}

export interface NavItem {
  href: string;
  label: string;
}
