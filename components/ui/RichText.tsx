import Link from "next/link";
import {
  PortableText,
  type PortableTextBlock,
  type PortableTextComponents,
  type PortableTextMarkComponentProps,
} from "@portabletext/react";
import { cn } from "@/lib/utils";

/**
 * Renderiza un campo de Portable Text de Sanity. Hoy lo usan `noticia.cuerpo`,
 * `conferencia.descripcion` y `proyecto.descripcion` — de ahí el nombre genérico
 * y no `Cuerpo`.
 *
 * Los tres campos son `type: 'array', of: [{type: 'block'}]` sin `styles`, `lists`
 * ni `marks` propios, así que el bloque hereda tal cual los valores por defecto de
 * Sanity, que son lo único que el editor puede llegar a producir (verificado en
 * @sanity/schema: DEFAULT_BLOCK_STYLES, DEFAULT_LIST_TYPES, DEFAULT_DECORATORS,
 * DEFAULT_ANNOTATIONS):
 *
 *   estilos      normal, h1…h6, blockquote
 *   listas       bullet, number
 *   decoradores  strong, em, code, underline, strike-through
 *   anotaciones  link — un único campo href (http, https, tel, mailto o relativo)
 *
 * `types` queda sin mapear a propósito: el array no admite bloques personalizados,
 * así que dentro del cuerpo no puede aparecer una imagen ni un video. Ese es el
 * lugar donde se agregarían el día que el schema los acepte; hasta entonces, un
 * `_type` desconocido cae en la advertencia por consola que trae la librería, que
 * es exactamente la señal de que el schema se movió y esto se quedó atrás.
 */

/**
 * Los h1…h6 del editor bajan un nivel al dibujarse: la página ya tiene su propio
 * <h1> (el título de la noticia) y un segundo <h1> metido en el cuerpo rompe el
 * esquema de encabezados del documento. <h6> es el piso, así que h5 y h6 caen los
 * dos ahí.
 *
 * Seis niveles, tres tratamientos visuales — todos con tokens que el sitio ya usa,
 * sin inventar una escala intermedia de titulares:
 *
 *   h1  32px Anton en mayúsculas (text-heading-md, la misma voz que la "frase" de
 *       la ficha de talento) — un escalón por debajo del <h1> de la página, que va
 *       a 48/64px.
 *   h2  20px Anton en mayúsculas: el mismo cuerpo que el texto, pero otra familia.
 *   h3…h6  la etiqueta del sitio (text-label-caps): 14px Archivo 700, mayúsculas y
 *       tracking. Un cuerpo de noticia que necesita seis niveles tiene un problema
 *       de estructura, no de estilos: los seis existen porque son el default de
 *       Sanity, no porque el diseño los haya pedido.
 */
const TITULO_1 =
  "mt-16 first:mt-0 font-display text-heading-md uppercase text-balance text-foreground";
const TITULO_2 = "mt-12 first:mt-0 font-display text-body-lg uppercase text-foreground";
const TITULO_3 =
  "mt-10 first:mt-0 font-body text-label-caps uppercase tracking-widest text-foreground";

/**
 * Ritmo vertical: cada bloque lleva sólo margen superior y el primero lo anula, de
 * modo que el hueco entre un título y el párrafo que le sigue (24px) es más chico
 * que el que lo separa de lo anterior (40-64px) — el título queda pegado a lo que
 * introduce. `first:mt-0` además evita que el margen del primer bloque se escape
 * del contenedor por colapso y desplace la caja entera.
 */
const PARRAFO = "mt-6 first:mt-0";
const LISTA = "space-y-2 pl-6 marker:text-amber";

/**
 * El margen superior de una lista depende de su profundidad, que la librería
 * calcula y entrega en `level` (arranca en 1): una lista de primer nivel abre un
 * bloque nuevo y se separa como un párrafo (24px), mientras que una anidada es la
 * continuación de la viñeta que la contiene y va pegada a ella con el mismo hueco
 * que separa dos puntos hermanos (8px). Con los 24px de la de primer nivel, la
 * sublista quedaba más cerca del punto siguiente que del suyo propio.
 *
 * Se emite una sola utilidad de margen por lista, nunca las dos: sin tailwind-merge
 * (decisión de arquitectura del proyecto) dos `mt-*` en el mismo elemento las
 * resuelve el orden del CSS generado, no el del atributo.
 */
function clasesLista(nivel: number | undefined, marcador: string): string {
  return cn(marcador, LISTA, (nivel ?? 1) > 1 ? "mt-2" : "mt-6 first:mt-0");
}

/**
 * Enlace en línea. El `href` de la anotación por defecto de Sanity valida el
 * formato pero no es obligatorio, así que puede llegar vacío: en ese caso el texto
 * marcado se dibuja igual, sin enlace, en vez de romper el render.
 */
const ENLACE =
  "text-amber underline underline-offset-4 transition-colors duration-300 hover:text-amber-soft";

interface AnotacionEnlace {
  _type: string;
  _key?: string;
  href?: string;
}

function EnlaceCuerpo({
  value,
  children,
}: PortableTextMarkComponentProps<AnotacionEnlace>) {
  const href = value?.href?.trim();
  if (!href) return <>{children}</>;

  // Interno → <Link>, para no perder el prefetch ni la navegación del cliente.
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={ENLACE}>
        {children}
      </Link>
    );
  }

  // Externo → pestaña nueva con el mismo rel que ya usan las marcas y las redes de
  // la ficha de talento. mailto: y tel: se abren en su app, no en una pestaña, así
  // que no llevan target (un _blank ahí deja una ventana en blanco detrás).
  const esExterno = /^https?:\/\//i.test(href);
  return (
    <a
      href={href}
      target={esExterno ? "_blank" : undefined}
      rel={esExterno ? "noopener noreferrer" : undefined}
      className={ENLACE}
    >
      {children}
    </a>
  );
}

const componentes: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p className={PARRAFO}>{children}</p>,
    h1: ({ children }) => <h2 className={TITULO_1}>{children}</h2>,
    h2: ({ children }) => <h3 className={TITULO_2}>{children}</h3>,
    h3: ({ children }) => <h4 className={TITULO_3}>{children}</h4>,
    h4: ({ children }) => <h5 className={TITULO_3}>{children}</h5>,
    h5: ({ children }) => <h6 className={TITULO_3}>{children}</h6>,
    h6: ({ children }) => <h6 className={TITULO_3}>{children}</h6>,
    // Mismo idioma de cita que la ficha de talento (filete ámbar + voz de titular).
    // Ahí se descartó a propósito la alternativa de dejarla en cuerpo y cursiva:
    // competía con el párrafo que tenía al lado y sólo las separaba la itálica.
    blockquote: ({ children }) => (
      <blockquote className="mt-10 first:mt-0 border-l-4 border-amber pl-6 font-display text-heading-md uppercase text-balance text-foreground">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ value, children }) => (
      <ul className={clasesLista(value.level, "list-disc")}>{children}</ul>
    ),
    number: ({ value, children }) => (
      <ol className={clasesLista(value.level, "list-decimal")}>{children}</ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li className="pl-1">{children}</li>,
    number: ({ children }) => <li className="pl-1">{children}</li>,
  },
  marks: {
    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    underline: ({ children }) => (
      <span className="underline underline-offset-4">{children}</span>
    ),
    "strike-through": ({ children }) => <s className="opacity-70">{children}</s>,
    // Sin radio: el lenguaje del sitio son cajas rectas (bordes, nunca esquinas
    // redondeadas salvo el retrato circular). 0.9em porque una monoespaciada pesa
    // más que la Archivo Narrow al mismo tamaño en px.
    code: ({ children }) => (
      <code className="border border-line bg-surface-high px-1.5 py-0.5 font-mono text-[0.9em] text-foreground">
        {children}
      </code>
    ),
    link: EnlaceCuerpo,
  },
};

interface RichTextProps {
  value: PortableTextBlock[] | null | undefined;
  className?: string;
}

export function RichText({ value, className }: RichTextProps) {
  // El campo es opcional en el schema: sin bloques no hay nada que dibujar, y
  // devolver null evita dejar un contenedor vacío ocupando el ritmo de la página.
  if (!Array.isArray(value) || value.length === 0) return null;

  return (
    <div className={cn("font-body text-body-lg text-foreground-muted", className)}>
      <PortableText value={value} components={componentes} />
    </div>
  );
}
