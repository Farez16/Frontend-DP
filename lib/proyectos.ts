/**
 * Helpers compartidos de proyecto: mapeadores de raw Sanity → Proyecto (tarjeta) y →
 * ProyectoDetalle (presentación), y la resolución de sus enlaces externos. Sigue el
 * mismo patrón que lib/conferencias.ts.
 */

import type { PortableTextBlock } from "@portabletext/react";
import { urlDeImagen, type ImagenRecortable, type ImagenSanity } from "@/sanity/image";
import { RECORTE_TARJETA_PROYECTO } from "@/components/sections/ProjectCard";
import { RECORTE_LOGO_PRESENTACION } from "@/components/sections/ProjectHero";
import { recortarParaMeta, SITE_NAME, textoPlano, unirEnumeracion } from "@/lib/seo";
import type {
  EnlaceProyecto,
  Proyecto,
  ProyectoDetalle,
  RedConIcono,
} from "@/types/content";

export interface RawRedSocialProyecto {
  _key: string;
  /** Texto libre en el Studio (sin lista de opciones, a diferencia del de talento). */
  red: string | null;
  url: string | null;
}

export interface RawLogoProyecto extends ImagenSanity {
  ancho: number | null;
  alto: number | null;
}

export interface RawSeoProyecto {
  metaTitulo: string | null;
  metaDescripcion: string | null;
  imagenOG: ImagenRecortable | null;
}

/** Lo que devuelven PROYECTOS_LISTADO_QUERY (por elemento) y PROYECTO_DETALLE_QUERY. */
export interface RawProyecto {
  _id: string;
  nombre: string;
  slug: string;
  /** Requerido en el schema, pero se tipa nullable: un draft puede llegar sin bloques. */
  descripcion: PortableTextBlock[] | null;
  frase: string | null;
  notaRelacionAgencia: string | null;
  url: string | null;
  /** GROQ devuelve null —no []— cuando el array no existe en el documento. */
  redesSociales: RawRedSocialProyecto[] | null;
  logo: RawLogoProyecto | null;
  seo: RawSeoProyecto | null;
}

export interface RawProyectoDetalle extends RawProyecto {
  /** Proyectos que /proyectos listaría. Con 1, /proyectos ya es esta misma página. */
  totalProyectos: number;
}

/**
 * Un logo al que el editor le escribió el texto alternativo pero nunca le subió el
 * archivo llega con todas sus claves en null, y ese objeto es truthy (ver
 * imagenConArchivo en lib/conferencias.ts). `assetRef` confirma que hay un archivo; las
 * dimensiones las necesita la presentación para reservar la caja, y un asset de imagen
 * siempre las tiene.
 */
function logoConArchivo(
  logo: RawLogoProyecto | null | undefined,
): (RawLogoProyecto & { ancho: number; alto: number }) | undefined {
  if (!logo?.assetRef || !logo.ancho || !logo.alto) return undefined;
  return { ...logo, ancho: logo.ancho, alto: logo.alto };
}

/**
 * Redes con ícono de marca, por nombre y por dominio. Las mismas dos que dibuja la ficha
 * de talento; cualquier otra va como enlace de texto con su nombre.
 */
const NOMBRE_RED: Record<RedConIcono, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
};

const DOMINIO_RED: Record<string, RedConIcono> = {
  "instagram.com": "instagram",
  "tiktok.com": "tiktok",
};

/** Igual que iconoDeRed en la ficha de talento: el dato real trae "Tik Tok", con espacio. */
function redPorNombre(nombre: string): RedConIcono | undefined {
  const normalizado = nombre.toLowerCase().replace(/\s+/g, "");
  return normalizado === "instagram" || normalizado === "tiktok"
    ? normalizado
    : undefined;
}

/** También los subdominios: m.instagram.com, vm.tiktok.com. */
function redPorDominio(destino: URL): RedConIcono | undefined {
  const host = destino.hostname.toLowerCase();
  for (const [dominio, red] of Object.entries(DOMINIO_RED)) {
    if (host === dominio || host.endsWith(`.${dominio}`)) return red;
  }
  return undefined;
}

/**
 * Solo http y https. El Studio ya lo valida, pero un documento escrito por API no pasa
 * por esa validación, y un `javascript:` en un href es justo lo que no puede colarse.
 */
function leerUrl(texto: string | null | undefined): URL | undefined {
  if (!texto?.trim()) return undefined;
  try {
    const destino = new URL(texto.trim());
    return destino.protocol === "http:" || destino.protocol === "https:"
      ? destino
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Lo que hace que dos enlaces sean el mismo destino: dominio sin `www.` y ruta sin la
 * barra final. Ignora protocolo y parámetros, porque los enlaces que se copian de
 * Instagram traen un `?igsh=…` distinto cada vez.
 */
function claveDeDestino(destino: URL): string {
  const host = destino.hostname.toLowerCase().replace(/^www\./, "");
  return `${host}${destino.pathname.replace(/\/+$/, "").toLowerCase()}`;
}

/**
 * Los enlaces externos del proyecto, en el orden en que se dibujan: primero
 * `redesSociales`, en el orden del editor, y al final el campo suelto `url`.
 *
 * El Studio titula a `url` "Sitio o red social", así que puede traer cualquiera de las
 * dos cosas. Si es de Instagram o TikTok se dibuja como un ícono más; si es otra cosa,
 * como "Sitio web". Si apunta a un destino que ya está en las redes, no se repite.
 *
 * Una red sin url válida se descarta: no hay nada a lo que llevar.
 */
export function construirEnlaces(
  url: string | null | undefined,
  redesSociales: RawRedSocialProyecto[] | null | undefined,
): EnlaceProyecto[] {
  const enlaces: EnlaceProyecto[] = [];
  const vistos = new Set<string>();

  for (const red of redesSociales ?? []) {
    const destino = leerUrl(red.url);
    if (!destino) continue;
    const clave = claveDeDestino(destino);
    if (vistos.has(clave)) continue;
    vistos.add(clave);

    const nombre = red.red?.trim();
    // Manda el nombre que eligió el editor; el dominio solo completa cuando el nombre
    // no es una de las redes con ícono ("Otro", o vacío).
    const conIcono =
      (nombre ? redPorNombre(nombre) : undefined) ?? redPorDominio(destino);
    enlaces.push({
      key: red._key,
      href: destino.href,
      etiqueta: conIcono
        ? NOMBRE_RED[conIcono]
        : nombre || destino.hostname.replace(/^www\./, ""),
      red: conIcono,
    });
  }

  const suelto = leerUrl(url);
  if (suelto && !vistos.has(claveDeDestino(suelto))) {
    const conIcono = redPorDominio(suelto);
    enlaces.push({
      key: "url",
      href: suelto.href,
      etiqueta: conIcono ? NOMBRE_RED[conIcono] : "Sitio web",
      red: conIcono,
    });
  }

  return enlaces;
}

export function mapProyecto(raw: RawProyecto): Proyecto {
  const logo = logoConArchivo(raw.logo);
  return {
    slug: raw.slug,
    nombre: raw.nombre,
    // || y no ??: una nota en blanco cuenta como ausente.
    notaRelacionAgencia: raw.notaRelacionAgencia?.trim() || undefined,
    logo: logo ? { src: urlDeImagen(logo, RECORTE_TARJETA_PROYECTO.ancho) } : undefined,
  };
}

export function mapProyectoDetalle(raw: RawProyecto): ProyectoDetalle {
  const logo = logoConArchivo(raw.logo);
  return {
    slug: raw.slug,
    nombre: raw.nombre,
    frase: raw.frase?.trim() || undefined,
    notaRelacionAgencia: raw.notaRelacionAgencia?.trim() || undefined,
    logo: logo
      ? {
          // Sin alto: el logo va entero, nunca recortado (ver PROYECTOS_LISTADO_QUERY).
          src: urlDeImagen(logo, RECORTE_LOGO_PRESENTACION.ancho),
          alt: logo.alt?.trim() || `Logo de ${raw.nombre}`,
          ancho: logo.ancho,
          alto: logo.alto,
        }
      : undefined,
    enlaces: construirEnlaces(raw.url, raw.redesSociales),
  };
}

/**
 * Meta descripción de un proyecto: la que escribió el editor en `seo` o, si no hay, la
 * `descripcion` aplanada y recortada. Si viniera vacía, la nota de relación con la
 * agencia, y como último recurso el nombre. La usan su detalle y /proyectos cuando ese
 * proyecto es el único.
 */
export function describirProyecto(raw: RawProyecto): string {
  // || y no ??: cadena vacía debe caer al respaldo.
  return (
    raw.seo?.metaDescripcion?.trim() ||
    recortarParaMeta(
      textoPlano(raw.descripcion) || raw.notaRelacionAgencia?.trim() || raw.nombre,
    )
  );
}

/** Lo que dice /proyectos —en la página y en la meta descripción— mientras esté vacío. */
export const DESCRIPCION_SIN_PROYECTOS =
  "Estamos preparando la presentación de los proyectos.";

/**
 * Meta descripción de /proyectos cuando no presenta un proyecto solo. Sale de los
 * nombres, como describirRoster en lib/seo.ts, para no afirmar nada que los datos no
 * digan. "Presenta" y no "tiene" ni "impulsa": DP Team, el primero, es justamente un
 * proyecto independiente de la agencia.
 */
export function describirProyectos(nombres: string[]): string {
  if (nombres.length === 0) return DESCRIPCION_SIN_PROYECTOS;
  return recortarParaMeta(
    `Proyectos que presenta ${SITE_NAME}: ${unirEnumeracion(nombres)}.`,
  );
}

/**
 * La imagen OG de un proyecto: la que el editor eligió en `seo.imagenOG`, que se recorta
 * como en el resto del sitio, o si no hay, el logo, que va entero sobre el fondo del
 * sitio (ver `ajuste` en imagenesOpenGraph).
 */
export function imagenOGDelProyecto(raw: RawProyecto): {
  imagen: ImagenRecortable | undefined;
  ajuste: "recortar" | "contener";
  alt: string;
} {
  if (raw.seo?.imagenOG?.url) {
    // El campo de imagenOG no tiene alt en el Studio.
    return { imagen: raw.seo.imagenOG, ajuste: "recortar", alt: raw.nombre };
  }
  const logo = logoConArchivo(raw.logo);
  return {
    imagen: logo,
    ajuste: "contener",
    alt: logo?.alt?.trim() || `Logo de ${raw.nombre}`,
  };
}
