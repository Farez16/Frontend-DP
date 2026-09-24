/**
 * Formas de contenido pensadas para que ya se parezcan a lo que Sanity
 * devolverá en la Fase 6 (slug, campos planos, referencias por slug) —
 * así los componentes de presentación no deberían necesitar reescribirse
 * cuando lib/data/* se reemplace por consultas GROQ reales.
 */

export interface ImagenContenido {
  src: string;
  alt: string;
  /**
   * Dimensiones reales del archivo. Sólo las necesita la franja de marcas del Home,
   * que muestra los logos sueltos a una altura fija y ancho natural: con ellas el
   * navegador reserva el ancho exacto y el logo no salta al cargar. El resto de las
   * imágenes van en cajas de proporción conocida y no las proyectan.
   */
  ancho?: number;
  alto?: number;
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
  /** Identificador estable y único dentro de la lista, nunca el nombre ni
   *  el índice del array: el `_id` del documento en el Home, y el `_key` del
   *  miembro del array en la ficha de talento — ahí el mismo documento puede
   *  estar referenciado dos veces y el `_id` se repetiría. */
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
