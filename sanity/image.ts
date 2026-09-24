import {
  createImageUrlBuilder,
  type SanityImageCrop,
  type SanityImageHotspot,
} from "@sanity/image-url";

import { dataset, projectId } from "./env";

/**
 * Forma en la que ./queries.ts proyecta un campo `image` que el sitio va a recortar.
 *
 * `url` sola no alcanza: es la URL del asset original, y tanto el recorte rectangular
 * que el editor dibuja en el Studio como el hotspot (el punto que marcó como "esto no
 * se puede perder") viven en el campo, no en el asset. Recortar con object-cover en el
 * navegador tira los dos a la basura y recorta desde el centro. Por eso las imágenes
 * que se recortan proyectan además el `_ref` del asset, el hotspot y el crop, que es lo
 * que necesita el builder de @sanity/image-url para pedirle el recorte correcto al CDN.
 *
 * Las imágenes que NO se recortan (logos de marcas, que van con object-contain, y la
 * imagen de OG, que se entrega tal cual) no proyectan nada de esto. Los logos de la
 * franja del Home sí añaden las dimensiones del asset, pero por otro motivo —van a
 * altura fija y ancho natural, y el navegador necesita la proporción real para
 * reservar el hueco antes de que cargue la imagen—, no para recortar.
 */
export interface ImagenSanity {
  /** URL del asset sin recortar. Respaldo si faltara el _ref. */
  url: string;
  alt: string;
  assetRef: string | null;
  hotspot: SanityImageHotspot | null;
  crop: SanityImageCrop | null;
}

const builder = createImageUrlBuilder({ projectId, dataset });

/**
 * URL de la imagen ya recortada por el CDN de Sanity.
 *
 * Con `alto`: pide exactamente ese rectángulo y el recorte se centra en el hotspot —
 * es lo que hay que usar cuando el contenedor tiene una proporción fija (el retrato
 * circular, las tarjetas de talento, las fichas de galería).
 *
 * Sin `alto`: respeta el recorte rectangular del editor pero deja la proporción libre.
 * Es para el hero, que ocupa el viewport entero y cambia de proporción entre apaisado
 * en escritorio y vertical en móvil — ahí no hay un alto único que pedir, y forzar uno
 * volvería a recortar mal en la mitad de los tamaños. El hotspot no se puede aplicar
 * sin un alto, así que ese caso sigue cerrando con object-cover.
 *
 * El resultado es la *fuente* que recibe next/image, que después arma su srcset a
 * partir de ella; no es el tamaño final de render. Regla para elegir esos números: se
 * toma el ancho más grande que declara el `sizes` del <Image> en los anchos que se
 * prueban (hasta 1440), se duplica por las pantallas 2x y se redondea al escalón que
 * usa next/image. Pedir menos que eso hace que next reescale hacia arriba una fuente
 * más chica, que es justamente lo que esta función viene a evitar.
 */
export function urlDeImagen(imagen: ImagenSanity, ancho: number, alto?: number): string {
  if (!imagen.assetRef) return imagen.url;

  // GROQ devuelve null cuando el editor no tocó el hotspot/crop; el builder espera
  // undefined para "no hay", y con null adentro calcula un recorte vacío.
  const fuente = builder.image({
    asset: { _ref: imagen.assetRef },
    hotspot: imagen.hotspot ?? undefined,
    crop: imagen.crop ?? undefined,
  });

  return alto === undefined
    ? fuente.width(ancho).url()
    : fuente.width(ancho).height(alto).fit("crop").url();
}
