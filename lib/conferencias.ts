/**
 * Helpers compartidos de conferencia: mapeadores de raw Sanity → Conferencia (listado)
 * y → ConferenciaDetalle. Sigue el mismo patrón que lib/noticias.ts para desacoplar el
 * consumo de GROQ del renderizado de componentes.
 */

import type { PortableTextBlock } from "@portabletext/react";
import { urlDeImagen, type ImagenSanity } from "@/sanity/image";
import { RECORTE_TARJETA_CONFERENCIA } from "@/components/sections/ConferenceCard";
import {
  miniaturaAutomaticaBunny,
  recorteParaMarcoDeVideo,
  videoReproducible,
} from "@/lib/bunny";
// Formateador genérico de fecha; vive en lib/noticias.ts porque la noticia fue el
// primer contenido con fecha. Duplicar acá la tabla de meses sería peor.
import { formatearFechaLegible } from "@/lib/noticias";
import type {
  AparicionConferencia,
  Conferencia,
  ConferenciaDetalle,
  ImagenContenido,
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
  /** `videoId` del medio cuando es un video; null si es una imagen o no hay medio. */
  videoIdPortada?: string | null;
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
  _type: "videoBunny";
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

export interface RawConferenciaImagen extends ImagenSanity {
  _type: "image";
}

/** El único elemento de `conferencia.medio[]`: la imagen o el video que eligió el editor. */
export type RawConferenciaMedio = RawConferenciaImagen | RawConferenciaVideo;

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
  /** null cuando el editor no eligió ni imagen ni video. */
  medio: RawConferenciaMedio | null;
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

/**
 * La portada de una conferencia, en este orden:
 *
 * 1. La imagen que eligió el editor, o la miniatura que subió para el video (`manual`).
 * 2. Si el medio es un video sin miniatura propia, la automática de Bunny — que existe
 *    recién cuando la Function copió el video y escribió el `videoId`.
 * 3. La foto del conferencista.
 *
 * Las de Sanity salen recortadas por su CDN al tamaño de la caja; la de Bunny va tal cual
 * y marcada `sinOptimizar` (ver lib/bunny.ts), así que el encuadre lo hace object-cover.
 */
function resolverPortada(
  manual: ImagenSanity | undefined,
  videoId: string | null | undefined,
  fotoTalento: ImagenSanity | undefined,
  recorte: { ancho: number; alto: number },
  altRespaldo: string,
): ImagenContenido | undefined {
  if (manual) {
    return {
      src: urlDeImagen(manual, recorte.ancho, recorte.alto),
      alt: manual.alt || altRespaldo,
    };
  }
  const automatica = miniaturaAutomaticaBunny(videoId);
  if (automatica) return { src: automatica, alt: altRespaldo, sinOptimizar: true };
  if (fotoTalento) {
    return {
      src: urlDeImagen(fotoTalento, recorte.ancho, recorte.alto),
      alt: fotoTalento.alt || altRespaldo,
    };
  }
  return undefined;
}

export function mapConferencia(raw: RawConferenciaListado): Conferencia {
  const fotoTalento = imagenConArchivo(raw.talento?.foto);

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
    // `portada` ya viene resuelta en la query: la imagen elegida o la miniatura manual.
    portada: resolverPortada(
      imagenConArchivo(raw.portada),
      raw.videoIdPortada,
      fotoTalento,
      RECORTE_TARJETA_CONFERENCIA,
      raw.titulo,
    ),
  };
}

/**
 * Recortes del detalle. Son más grandes que los de la tarjeta porque la caja también
 * lo es, y salen de la regla que documenta sanity/image.ts: el ancho máximo que
 * declara el `sizes` del <Image> en los anchos que se prueban (876px, la columna
 * principal cuando el Container topa en 1440), ×2 por las pantallas 2x = 1752, y el
 * escalón de next/image que lo cubre es 1920. El alto sale del `aspect-video` (16:9) cuando
 * la portada va sola; si va dentro del marco de un video, de la proporción de ese marco (ver
 * recorteParaMarcoDeVideo).
 *
 * El retrato del sidebar usa los mismos 160×160 que la tarjeta de talento del detalle
 * de noticia, que es el mismo componente a 64px.
 */
const RECORTE_PORTADA_DETALLE = { ancho: 1920, alto: 1080 };
const RECORTE_RETRATO_SIDEBAR = { ancho: 160, alto: 160 };

export function mapConferenciaDetalle(raw: RawConferenciaDetalle): ConferenciaDetalle {
  const fotoTalento = imagenConArchivo(raw.talento?.foto);
  const videoMedio = raw.medio?._type === "videoBunny" ? raw.medio : null;
  // El GUID se recorta y se valida acá, una sola vez: la proyección lo declara opcional y
  // una cadena vacía no es un video. Río abajo, que el objeto exista ya significa que hay
  // algo reproducible, así que la vista no vuelve a preguntar.
  const video = videoReproducible(videoMedio);

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
    // Misma regla que el listado; la diferencia es que acá el recorte es de página. Con
    // video, la portada va dentro de su marco y se recorta a esa proporción: object-cover
    // agrandaría cualquier otra hasta cubrirlo, y se vería borrosa.
    portada: resolverPortada(
      imagenConArchivo(imagenDelMedio(raw.medio)),
      videoMedio?.videoId,
      fotoTalento,
      video
        ? recorteParaMarcoDeVideo(RECORTE_PORTADA_DETALLE.ancho, video.proporcion)
        : RECORTE_PORTADA_DETALLE,
      raw.titulo,
    ),
    video,
  };
}

/**
 * La imagen de Sanity que representa al medio: la propia si es una imagen, la miniatura
 * que subió el editor si es un video. No incluye la miniatura automática de Bunny: la
 * portada la agrega en resolverPortada(), y la imagen OG la deja fuera a propósito (ver
 * generateMetadata en app/conferencias/[slug]/page.tsx).
 */
export function imagenDelMedio(
  medio: RawConferenciaMedio | null | undefined,
): ImagenSanity | null | undefined {
  if (medio?._type === "image") return medio;
  if (medio?._type === "videoBunny") return medio.miniatura;
  return undefined;
}
