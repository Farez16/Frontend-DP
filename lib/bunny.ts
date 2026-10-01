import type { VideoReproducible } from "@/types/content";

/**
 * Miniatura automática de Bunny Stream: el fotograma que Bunny extrae de cada video al
 * codificarlo y publica en el CDN de la pull zone como `/{videoId}/thumbnail.jpg`.
 *
 * Verificado contra el CDN real, no supuesto: `thumbnail.jpg` es un JPEG estático del
 * tamaño del video (1080x1920 en los dos videos verticales que hay hoy). `preview.webp`,
 * que también existe, es una animación de ~800 KB y no sirve como portada.
 *
 * ## Por qué estas URLs van sin optimizar (`unoptimized` en next/image)
 *
 * La pull zone bloquea las peticiones que llegan sin `Referer` (403) y deja pasar las que
 * traen uno. El navegador lo manda siempre al pedir la imagen desde la página, pero el
 * optimizador de next/image la descarga desde el servidor con un `fetch` sin cabeceras
 * (node_modules/next/dist/server/image-optimizer.js, `fetchExternalImage`) — medido: ese
 * fetch recibe 403 y uno con Referer recibe 200. Por eso agregar el hostname a
 * `images.remotePatterns` no alcanzaba: la imagen salía rota. Con `unoptimized` el `src`
 * llega tal cual al <img> y la pide el navegador. El costo es servir el JPEG original
 * (~60-90 KB) sin el srcset de next/image, que para un fotograma de video es poco.
 *
 * Si algún día se desactiva "Block no-referrer requests" en la pull zone, esto puede pasar
 * a `remotePatterns` y al optimizador como el resto de las imágenes.
 */

/** Hostname del CDN de la pull zone (p. ej. `vz-xxxxxxxx-xxx.b-cdn.net`). Público por diseño. */
const CDN_HOSTNAME = process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME?.trim();

/**
 * URL de la miniatura automática, o `undefined` si no se puede armar: sin `videoId` (la
 * Function todavía no copió el video a Bunny) o sin el hostname configurado.
 */
export function miniaturaAutomaticaBunny(
  videoId: string | null | undefined,
): string | undefined {
  const id = videoId?.trim();
  if (!id || !CDN_HOSTNAME) return undefined;
  return `https://${CDN_HOSTNAME}/${encodeURIComponent(id)}/thumbnail.jpg`;
}

/**
 * Los campos de un objeto `videoBunny` crudo que hacen falta para reproducirlo. Es el
 * mínimo común de las proyecciones que lo traen —el medio de la conferencia y el video de
 * la noticia—, así que cualquiera de las dos encaja sin adaptarla.
 */
interface RawVideoBunny {
  videoId?: string | null;
  titulo?: string | null;
  /**
   * Las escribe la function `bunny-stream-upload` leyendo la API de Bunny, y solo cuando la
   * codificación terminó — que tarda minutos. Faltan durante ese rato.
   */
  dimensiones?: { ancho: number | null; alto: number | null } | null;
}

/**
 * Convierte el objeto `videoBunny` crudo en algo embebible, o `undefined` si no hay video.
 *
 * El GUID se recorta y se valida acá, una sola vez: la proyección lo declara opcional y una
 * cadena vacía no es un video. Río abajo, que el objeto exista ya significa que hay algo
 * reproducible, así que la vista no vuelve a preguntar.
 *
 * `proporcion` solo sobrevive si vienen los dos lados y son positivos: un 0 —que es lo que
 * devuelve la API de Bunny mientras codifica, y lo que podría quedar guardado si algo
 * saliera mal— produciría una división por cero en `aspect-ratio` y una caja de alto
 * infinito. Ante la duda, null, y quien consuma cae a 16:9.
 */
export function videoReproducible(
  raw: RawVideoBunny | null | undefined,
): VideoReproducible | undefined {
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
