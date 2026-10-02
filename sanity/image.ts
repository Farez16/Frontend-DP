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
 * Las imágenes que NO se recortan (logos de marcas, que van con object-contain) no
 * proyectan nada de esto. Los logos de la franja del Home sí añaden las dimensiones del
 * asset, pero por otro motivo —van a altura fija y ancho natural, y el navegador
 * necesita la proporción real para reservar el hueco antes de que cargue la imagen—, no
 * para recortar. La imagen OG sí se recorta (ver imagenesOpenGraph).
 */
export interface ImagenSanity {
  /** URL del asset sin recortar. Respaldo si faltara el _ref. */
  url: string;
  alt: string;
  assetRef: string | null;
  hotspot: SanityImageHotspot | null;
  crop: SanityImageCrop | null;
}

/**
 * Lo que hace falta para recortar: la proyección de `seo.imagenOG` no trae `alt`, porque
 * el campo del Studio no lo tiene.
 */
export type ImagenRecortable = Pick<
  ImagenSanity,
  "url" | "assetRef" | "hotspot" | "crop"
>;

const builder = createImageUrlBuilder({ projectId, dataset });

function fuente(imagen: ImagenRecortable & { assetRef: string }) {
  // GROQ devuelve null cuando el editor no tocó el hotspot/crop; el builder espera
  // undefined para "no hay", y con null adentro calcula un recorte vacío.
  return builder.image({
    asset: { _ref: imagen.assetRef },
    hotspot: imagen.hotspot ?? undefined,
    crop: imagen.crop ?? undefined,
  });
}

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
export function urlDeImagen(
  imagen: ImagenRecortable,
  ancho: number,
  alto?: number,
): string {
  if (!imagen.assetRef) return imagen.url;

  const recorte = fuente({ ...imagen, assetRef: imagen.assetRef });
  return alto === undefined
    ? recorte.width(ancho).url()
    : recorte.width(ancho).height(alto).fit("crop").url();
}

/** El tamaño de referencia de Open Graph para la vista previa grande (1,91:1). */
export const OG_ANCHO = 1200;
export const OG_ALTO = 630;

/**
 * `openGraph.images` de una página: la imagen recortada por el CDN de Sanity a
 * 1200×630, en JPG, con el ancho y el alto declarados. Sin imagen devuelve undefined,
 * que para Next es "no hay og:image".
 *
 * Antes se mandaba la url del asset original, que es lo que el crawler descarga entero:
 * 1,3 MB la foto de Daniel Pintado (4672×7008) y 2 MB la miniatura PNG de la conferencia.
 * Recortadas pesan entre 51 y 126 KB. El recorte respeta el hotspot y el crop del
 * editor, igual que en el resto del sitio; sin ellos, el CDN recorta desde el centro.
 *
 * JPG forzado porque esta url va directo a los crawlers, sin next/image en el medio que
 * negocie el formato: esa miniatura PNG, recortada pero sin `fm=jpg`, pesa 1,5 MB.
 *
 * Si faltara el `_ref`, el builder también acepta la url del CDN y saca de ella el id del
 * asset, así que el tamaño declarado sigue siendo cierto (pierde hotspot y crop).
 */
export function imagenesOpenGraph(
  imagen: ImagenRecortable | null | undefined,
  alt: string,
) {
  // `?.url` y no la sola presencia del objeto: un campo con alt pero sin archivo llega
  // con `url: null`.
  if (!imagen?.url) return undefined;

  const recorte = imagen.assetRef
    ? fuente({ ...imagen, assetRef: imagen.assetRef })
    : builder.image(imagen.url);
  const url = recorte.width(OG_ANCHO).height(OG_ALTO).fit("crop").format("jpg").url();

  return [{ url, width: OG_ANCHO, height: OG_ALTO, alt }];
}
