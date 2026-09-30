/**
 * Helpers compartidos de conferencia: mapeadores de raw Sanity → Conferencia (listado)
 * y → ConferenciaDetalle. Sigue el mismo patrón que lib/noticias.ts para desacoplar el
 * consumo de GROQ del renderizado de componentes.
 */

import type { PortableTextBlock } from "@portabletext/react";
import { urlDeImagen, type ImagenSanity } from "@/sanity/image";
import { RECORTE_TARJETA_CONFERENCIA } from "@/components/sections/ConferenceCard";
// Formateador genérico de fecha; vive en lib/noticias.ts porque la noticia fue el
// primer contenido con fecha. Duplicar acá la tabla de meses sería peor.
import { formatearFechaLegible } from "@/lib/noticias";
import type {
  AparicionConferencia,
  Conferencia,
  ConferenciaDetalle,
} from "@/types/content";

export interface RawConferenciaTalento {
  nombre: string;
  foto?: ImagenSanity | null;
}

export interface RawConferenciaListado {
  _id: string;
  titulo: string;
  slug: string;
  publicoObjetivo: string;
  talento: RawConferenciaTalento | null;
  portada?: ImagenSanity | null;
}

export interface RawAparicion {
  _key: string;
  fecha: string;
  lugar: string;
  ciudad: string | null;
}

export interface RawConferenciaDetalleTalento {
  _id: string;
  nombre: string;
  slug: string;
  disciplina: string;
  foto?: ImagenSanity | null;
}

export interface RawConferenciaVideo {
  videoId: string | null;
  titulo: string | null;
  /**
   * Las escribe la function `bunny-stream-upload` leyendo la API de Bunny, y solo cuando la
   * codificación terminó — que tarda minutos. Faltan durante ese rato, y también en los
   * documentos anteriores a que el campo existiera.
   */
  dimensiones?: { ancho: number | null; alto: number | null } | null;
  miniatura?: ImagenSanity | null;
}

export interface RawSeoConferencia {
  metaTitulo: string | null;
  metaDescripcion: string | null;
  imagenOG: { url: string } | null;
}

export interface RawConferenciaDetalle {
  _id: string;
  titulo: string;
  slug: string;
  /** Requerido en el schema, pero se tipa nullable: un draft puede llegar sin bloques. */
  descripcion: PortableTextBlock[] | null;
  publicoObjetivo: string;
  notaComercial: string | null;
  talento: RawConferenciaDetalleTalento | null;
  /** GROQ devuelve null —no []— cuando el array no existe en el documento. */
  apariciones: RawAparicion[] | null;
  video: RawConferenciaVideo | null;
  seo: RawSeoConferencia | null;
}

const RECORTE_AVATAR_TALENTO = { ancho: 96, alto: 96 };

/**
 * Un campo `image` al que el editor le escribió el texto alternativo pero nunca le subió
 * el archivo NO se proyecta como null: GROQ devuelve el objeto con todas sus claves en
 * null (`url`, `assetRef`, `hotspot`, `crop`). Ese objeto es truthy, así que un `??` o un
 * `foto ? … : …` lo dan por bueno, `urlDeImagen` se queda sin `assetRef` y sin `url` de
 * respaldo, y la tarjeta termina pintando un <img> sin `src` —un hueco— en vez de caer
 * al respaldo que sí está diseñado (el ícono de micrófono, o directamente no dibujar el
 * avatar). `assetRef` es la única clave que confirma que hay un archivo detrás.
 */
function imagenConArchivo(
  imagen: ImagenSanity | null | undefined,
): ImagenSanity | undefined {
  return imagen?.assetRef ? imagen : undefined;
}

export function mapConferencia(raw: RawConferenciaListado): Conferencia {
  const fotoTalento = imagenConArchivo(raw.talento?.foto);
  // Portada prioriza la miniatura del video Bunny Stream; si no existe,
  // usa la foto principal del conferencista como respaldo.
  const fotoPortada = imagenConArchivo(raw.portada) ?? fotoTalento;

  return {
    slug: raw.slug,
    titulo: raw.titulo,
    publicoObjetivo: raw.publicoObjetivo,
    talento: raw.talento
      ? {
          nombre: raw.talento.nombre,
          foto: fotoTalento
            ? {
                src: urlDeImagen(
                  fotoTalento,
                  RECORTE_AVATAR_TALENTO.ancho,
                  RECORTE_AVATAR_TALENTO.alto,
                ),
              }
            : undefined,
        }
      : null,
    portada: fotoPortada
      ? {
          src: urlDeImagen(
            fotoPortada,
            RECORTE_TARJETA_CONFERENCIA.ancho,
            RECORTE_TARJETA_CONFERENCIA.alto,
          ),
          alt: fotoPortada.alt || raw.titulo,
        }
      : undefined,
  };
}

/**
 * Recortes del detalle. Son más grandes que los de la tarjeta porque la caja también
 * lo es, y salen de la regla que documenta sanity/image.ts: el ancho máximo que
 * declara el `sizes` del <Image> en los anchos que se prueban (876px, la columna
 * principal cuando el Container topa en 1440), ×2 por las pantallas 2x = 1752, y el
 * escalón de next/image que lo cubre es 1920. El alto sale del `aspect-video` (16:9).
 *
 * El retrato del sidebar usa los mismos 160×160 que la tarjeta de talento del detalle
 * de noticia, que es el mismo componente a 64px.
 */
const RECORTE_PORTADA_DETALLE = { ancho: 1920, alto: 1080 };
const RECORTE_RETRATO_SIDEBAR = { ancho: 160, alto: 160 };

export function mapConferenciaDetalle(raw: RawConferenciaDetalle): ConferenciaDetalle {
  const fotoTalento = imagenConArchivo(raw.talento?.foto);
  // Misma regla que el listado: manda la miniatura del video, y sin ella la foto del
  // conferencista. La diferencia es que acá el recorte es de página, no de tarjeta.
  const fotoPortada = imagenConArchivo(raw.video?.miniatura) ?? fotoTalento;

  const apariciones: AparicionConferencia[] = (raw.apariciones ?? []).map(
    (aparicion) => ({
      key: aparicion._key,
      fecha: aparicion.fecha,
      fechaLegible: formatearFechaLegible(aparicion.fecha),
      lugar: aparicion.lugar,
      // || y no ??: una ciudad en blanco cuenta como ausente, no como cadena vacía.
      ciudad: aparicion.ciudad?.trim() || undefined,
    }),
  );

  return {
    slug: raw.slug,
    titulo: raw.titulo,
    publicoObjetivo: raw.publicoObjetivo,
    notaComercial: raw.notaComercial?.trim() || undefined,
    talento: raw.talento
      ? {
          nombre: raw.talento.nombre,
          slug: raw.talento.slug,
          disciplina: raw.talento.disciplina,
          foto: fotoTalento
            ? {
                src: urlDeImagen(
                  fotoTalento,
                  RECORTE_RETRATO_SIDEBAR.ancho,
                  RECORTE_RETRATO_SIDEBAR.alto,
                ),
                alt: fotoTalento.alt || raw.talento.nombre,
              }
            : undefined,
        }
      : null,
    apariciones,
    portada: fotoPortada
      ? {
          src: urlDeImagen(
            fotoPortada,
            RECORTE_PORTADA_DETALLE.ancho,
            RECORTE_PORTADA_DETALLE.alto,
          ),
          alt: fotoPortada.alt || raw.titulo,
        }
      : undefined,
    // El GUID se recorta y se valida acá, una sola vez: la proyección lo declara opcional
    // y una cadena vacía no es un video. Río abajo, que el objeto exista ya significa que
    // hay algo reproducible, así que la vista no vuelve a preguntar.
    video: videoReproducible(raw.video),
  };
}

/**
 * Convierte el objeto `videoBunny` crudo en algo embebible, o `undefined` si no hay video.
 *
 * `proporcion` solo sobrevive si vienen los dos lados y son positivos: un 0 —que es lo que
 * devuelve la API de Bunny mientras codifica, y lo que podría quedar guardado si algo
 * saliera mal— produciría una división por cero en `aspect-ratio` y una caja de alto
 * infinito. Ante la duda, null, y quien consuma cae a 16:9.
 */
function videoReproducible(
  raw: RawConferenciaVideo | null | undefined,
): ConferenciaDetalle["video"] {
  const videoId = raw?.videoId?.trim();
  if (!videoId) return undefined;

  const ancho = raw?.dimensiones?.ancho ?? null;
  const alto = raw?.dimensiones?.alto ?? null;

  return {
    videoId,
    titulo: raw?.titulo ?? null,
    proporcion: ancho && alto && ancho > 0 && alto > 0 ? { ancho, alto } : null,
  };
}
