/**
 * Helpers compartidos de conferencia: mapeador de raw Sanity → Conferencia.
 * Sigue el mismo patrón que lib/noticias.ts para desacoplar el consumo de GROQ
 * del renderizado de componentes.
 */

import { urlDeImagen, type ImagenSanity } from "@/sanity/image";
import { RECORTE_TARJETA_CONFERENCIA } from "@/components/sections/ConferenceCard";
import type { Conferencia } from "@/types/content";

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
