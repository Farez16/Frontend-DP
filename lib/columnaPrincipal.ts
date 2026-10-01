import { PROPORCION_VIDEO_POR_DEFECTO, TOPE_ALTO_VIDEO_VH } from "@/lib/bunny";

/**
 * La columna principal de los detalles de noticia y de conferencia, que comparten la misma
 * rejilla (Container de 1440 con px-5/px-20, gap-12 que pasa a gap-16 en xl, sidebar de
 * 340px). De acá salen los `sizes` de las imágenes que viven en ella, así que los dos
 * detalles no pueden desincronizarse:
 *
 *   >=1440   1280 de contenido - 64 de gap - 340 de sidebar = 876px
 *   >=1280   (100vw - 160) - 64 - 340                       = 100vw - 564px
 *   >=1024   (100vw - 160) - 48 - 340                       = 100vw - 548px
 *   >=768    una sola columna: 100vw - 160
 *   resto    una sola columna: 100vw - 40
 */
const TRAMOS_COLUMNA_PRINCIPAL = [
  ["(min-width: 1440px)", "876px"],
  ["(min-width: 1280px)", "calc(100vw - 564px)"],
  ["(min-width: 1024px)", "calc(100vw - 548px)"],
  ["(min-width: 768px)", "calc(100vw - 160px)"],
  ["", "calc(100vw - 40px)"],
] as const;

/** Arma un `sizes` con los tramos de la columna, transformando el ancho de cada uno. */
function sizesPorTramo(ancho: (anchoColumna: string) => string): string {
  return TRAMOS_COLUMNA_PRINCIPAL.map(([consulta, anchoColumna]) =>
    `${consulta} ${ancho(anchoColumna)}`.trim(),
  ).join(", ");
}

/** Una imagen que ocupa la columna entera en todos los tramos (la portada). */
export const SIZES_COLUMNA_PRINCIPAL = sizesPorTramo((anchoColumna) => anchoColumna);

/**
 * `sizes` de la imagen que va dentro del marco de un video en la columna. Al marco lo
 * limitan dos cosas a la vez —el ancho de la columna y el tope de alto de BunnyPlayer— y en
 * un video vertical manda el alto: a 1440x900 el marco de un 9:16 mide 354px de ancho en una
 * columna de 876. Declarar la columna entera hacía que el navegador bajara una imagen 2,5
 * veces más ancha que la caja.
 *
 * Mismo criterio que `sizesAmpliada` en /talentos/[slug]: un tope de N vh de alto en una
 * imagen de proporción r son N*r vh de ancho, y min() se queda con el límite que mande en
 * cada tramo. Se redondea hacia arriba porque declarar de menos sí sería un bug (la imagen
 * se dibujaría más chica que su caja); un navegador que no entienda min() descarta el
 * atributo y cae a 100vw, que pide de más: el lado seguro.
 *
 * Solo es exacto si la imagen viene recortada a la proporción del marco (ver
 * recorteParaMarcoDeVideo en lib/bunny.ts): con otra proporción, object-cover la agranda
 * más allá de la caja.
 */
export function sizesImagenPreviaVideo(
  proporcion: { ancho: number; alto: number } | null,
): string {
  const { ancho, alto } = proporcion ?? PROPORCION_VIDEO_POR_DEFECTO;
  const anchoPorTopeDeAlto = Math.ceil(((TOPE_ALTO_VIDEO_VH * ancho) / alto) * 10) / 10;
  return sizesPorTramo((anchoColumna) => `min(${anchoColumna}, ${anchoPorTopeDeAlto}vh)`);
}
