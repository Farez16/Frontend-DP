/**
 * Helpers de metadata compartidos por el layout raíz y las páginas del sitio.
 *
 * Todo aquí es texto puro, sin tipos de Next: el módulo se puede ejecutar de forma
 * aislada para probar el texto generado con 0, 1 o N talentos sin levantar la app ni
 * tocar el dataset. Los únicos imports son de tipo y desaparecen al compilar.
 */

import type { PortableTextBlock } from "@portabletext/react";
import type { ImagenRecortable } from "@/sanity/image";

export const SITE_NAME = "DP Agencia Deportiva";

export const SITE_DESCRIPTION =
  "Representamos talento, construimos oportunidades y conectamos a las personas y marcas que hacen crecer al deporte.";

/**
 * Campos de Open Graph que valen igual para todo el sitio.
 * Decisión #85 (docs/ARQUITECTURA.md).
 *
 * Next mezcla la metadata de los segmentos a un solo nivel: una página que declara su
 * propio `openGraph` reemplaza entero el del layout y, si no los repite, pierde og:type,
 * og:locale y og:site_name. Por eso viven acá y se esparcen en el layout y en cada página
 * que declara `openGraph`.
 */
export const OPEN_GRAPH_BASE = {
  type: "website",
  locale: "es_EC",
  siteName: SITE_NAME,
} as const;

/** 155 es donde Google suele cortar la descripción en el resultado de búsqueda. */
export const LARGO_META_DESCRIPCION = 155;

/** Corta en el último espacio para no partir una palabra a la mitad. */
export function recortarParaMeta(texto: string): string {
  const limpio = texto.trim().replace(/\s+/g, " ");
  if (limpio.length <= LARGO_META_DESCRIPCION) return limpio;
  const cortado = limpio.slice(0, LARGO_META_DESCRIPCION);
  const ultimoEspacio = cortado.lastIndexOf(" ");
  return `${(ultimoEspacio > 0 ? cortado.slice(0, ultimoEspacio) : cortado).trimEnd()}…`;
}

/**
 * Aplana Portable Text a texto corrido para la meta descripción.
 *
 * Es el respaldo automático de los documentos que no tienen un campo corto equivalente
 * al `extracto` de la noticia: la `descripcion` de la conferencia y la del proyecto.
 * Recorre igual que calcularTiempoLectura() en el detalle de noticia: solo bloques
 * `block`, solo el `text` de sus hijos. Un `_type` que no sea `block` no puede aparecer
 * (los arrays no admiten tipos personalizados) y si algún día lo hiciera, se ignora en
 * vez de imprimir "[object Object]" en el <head>.
 */
export function textoPlano(bloques: PortableTextBlock[] | null): string {
  if (!Array.isArray(bloques)) return "";
  const partes: string[] = [];
  for (const bloque of bloques) {
    if (bloque._type !== "block" || !Array.isArray(bloque.children)) continue;
    for (const hijo of bloque.children as { text?: string }[]) {
      if (typeof hijo.text === "string") partes.push(hijo.text);
    }
  }
  return partes.join(" ").replace(/\s+/g, " ").trim();
}

export function conSufijo(titulo: string): string {
  return `${titulo} | ${SITE_NAME}`;
}

/**
 * Enumeración en español: "a", "a y b", "a, b y c". Sin coma antes de la "y" —
 * es lo correcto en español, a diferencia del inglés.
 */
export function unirEnumeracion(items: string[]): string {
  const limpios = items.map((item) => item.trim()).filter(Boolean);
  if (limpios.length === 0) return "";
  if (limpios.length === 1) return limpios[0] ?? "";
  return `${limpios.slice(0, -1).join(", ")} y ${limpios[limpios.length - 1] ?? ""}`;
}

export interface TalentoParaMeta {
  nombre: string;
  disciplina: string;
}

/** Forma que devuelve CONFIGURACION_SITIO_QUERY. */
export interface RawConfiguracionSitio {
  seo: {
    metaTitulo: string | null;
    metaDescripcion: string | null;
    imagenOG: ImagenRecortable | null;
  } | null;
}

export interface OverrideSeo {
  titulo?: string;
  descripcion?: string;
  imagenOG?: ImagenRecortable;
}

/**
 * Normaliza el override del singleton. Un campo que quedó en blanco o solo con
 * espacios cuenta como ausente, no como "publicar una cadena vacía".
 */
export function leerOverrideSeo(
  configuracion: RawConfiguracionSitio | null,
): OverrideSeo {
  const seo = configuracion?.seo;
  return {
    titulo: seo?.metaTitulo?.trim() || undefined,
    descripcion: seo?.metaDescripcion?.trim() || undefined,
    imagenOG: seo?.imagenOG?.url ? seo.imagenOG : undefined,
  };
}

/**
 * Descripción de Inicio cuando no hay override cargado en configuracionSitio.
 *
 * El sustantivo concuerda en número ("talento" / "talentos") y las disciplinas van
 * deduplicadas: dos atletas de marcha atlética no deben producir "en marcha atlética
 * y marcha atlética". Sin talentos publicados cae al texto genérico de la agencia,
 * que no menciona a nadie.
 */
export function describirAgencia(talentos: TalentoParaMeta[]): string {
  if (talentos.length === 0) return SITE_DESCRIPTION;

  const nombres = unirEnumeracion(talentos.map((talento) => talento.nombre));
  const disciplinas = unirEnumeracion([
    ...new Set(talentos.map((talento) => talento.disciplina.trim()).filter(Boolean)),
  ]);
  const sustantivo = talentos.length === 1 ? "talento" : "talentos";
  const enDisciplinas = disciplinas ? ` en ${disciplinas}` : "";

  return recortarParaMeta(
    `Representamos a ${nombres}, ${sustantivo} del deporte ecuatoriano${enDisciplinas}.`,
  );
}

/**
 * Descripción del listado /talentos cuando no hay override.
 *
 * Con un solo talento evita el "los 1 talentos" y usa la forma en singular.
 */
export function describirRoster(talentos: TalentoParaMeta[]): string {
  if (talentos.length === 0) return SITE_DESCRIPTION;

  const nombres = unirEnumeracion(talentos.map((talento) => talento.nombre));
  const encabezado =
    talentos.length === 1
      ? `Conoce al talento que representa ${SITE_NAME}`
      : `Conoce a los ${talentos.length} talentos que representa ${SITE_NAME}`;

  return recortarParaMeta(`${encabezado}: ${nombres}.`);
}
