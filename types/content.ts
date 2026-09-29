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

export interface Conferencia {
  slug: string;
  titulo: string;
  publicoObjetivo: string;
  talento: {
    nombre: string;
    /**
     * Sin `alt`: el avatar es decorativo —el nombre del conferencista va como texto
     * en el elemento hermano— y la tarjeta lo dibuja con `alt=""`.
     */
    foto?: Pick<ImagenContenido, "src">;
  } | null;
  portada?: ImagenContenido;
}

/** Una fecha en la que la conferencia se dictó o se va a dictar. */
export interface AparicionConferencia {
  /** `_key` del miembro del array en Sanity: dos apariciones pueden repetir fecha y lugar. */
  key: string;
  /** ISO 8601 (YYYY-MM-DD), para `<time dateTime>` */
  fecha: string;
  fechaLegible: string;
  lugar: string;
  ciudad?: string;
}

/**
 * Detalle de /conferencias/[slug]. No extiende `Conferencia` a propósito: la tarjeta
 * del listado y el detalle no comparten forma. El detalle necesita el slug y la
 * disciplina del talento (enlaza a su perfil), un `alt` real para el retrato del
 * sidebar, las apariciones y la nota comercial; el listado no usa nada de eso.
 *
 * `descripcion` no aparece aquí, igual que `cuerpo` no aparece en `Noticia`: el
 * Portable Text viaja crudo desde GROQ hasta RichText sin pasar por el mapeador, que
 * solo existe para resolver URLs de imagen.
 */
export interface ConferenciaDetalle {
  slug: string;
  titulo: string;
  publicoObjetivo: string;
  notaComercial?: string;
  talento: {
    nombre: string;
    slug: string;
    disciplina: string;
    foto?: ImagenContenido;
  } | null;
  apariciones: AparicionConferencia[];
  /** Miniatura del video; sin ella, la foto del talento. Sin ninguna de las dos, ausente. */
  portada?: ImagenContenido;
  /**
   * Solo `true` si el documento trae `video.videoId`. Es lo que autoriza a dibujar el
   * ícono de reproducción: sobre una portada que es la foto del talento sería mentira.
   */
  tieneVideo: boolean;
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
