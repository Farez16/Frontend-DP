/**
 * Helpers compartidos de noticia: mapeador de raw Sanity → Noticia y formateador
 * de fecha. Se extrae de app/page.tsx para que lo usen Home, /noticias y
 * /noticias/[slug] sin duplicar código.
 *
 * No importa nada de Next ni de React: el módulo puede probarse de forma aislada.
 */

import { urlDeImagen, type ImagenSanity } from "@/sanity/image";
import { RECORTE_TARJETA_NOTICIA } from "@/components/sections/NewsCard";
import type { Noticia } from "@/types/content";

// Manual, igual que calcularEdad en /talentos/[slug]/page.tsx: new Date("YYYY-MM-DD")
// parsea en UTC y puede correr un día en zonas horarias negativas.
const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

export function formatearFechaLegible(fechaISO: string): string {
  const partes = fechaISO.split("-");
  const anio = Number(partes[0]);
  const mes = Number(partes[1]);
  const dia = Number(partes[2]);
  return `${dia} ${MESES_CORTOS[mes - 1]} ${anio}`;
}

/** Campos mínimos que comparten Home, listado y detalle. */
export interface RawNoticiaBase {
  _id: string;
  titulo: string;
  slug: string;
  categoria: string;
  fecha: string;
  extracto: string;
  portada: ImagenSanity;
}

export function mapNoticia(raw: RawNoticiaBase): Noticia {
  return {
    slug: raw.slug,
    categoria: raw.categoria,
    titulo: raw.titulo,
    fecha: raw.fecha,
    fechaLegible: formatearFechaLegible(raw.fecha),
    extracto: raw.extracto,
    portada: {
      src: urlDeImagen(
        raw.portada,
        RECORTE_TARJETA_NOTICIA.ancho,
        RECORTE_TARJETA_NOTICIA.alto,
      ),
      alt: raw.portada.alt,
    },
  };
}
