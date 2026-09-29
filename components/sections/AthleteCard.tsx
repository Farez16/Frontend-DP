import Link from "next/link";
import Image from "next/image";
import type { Talento } from "@/types/content";

interface AthleteCardProps {
  talento: Talento;
  /** Sin href todavía: ficha real por atleta llega en la Fase 4 (rutas dinámicas). */
  href?: string;
  priority?: boolean;
  /**
   * Ancho de la caja por tramo, para que next/image elija bien del srcset. El valor
   * por defecto describe la grilla de 3 columnas; cualquier otra distribución tiene
   * que pasar el suyo, porque sólo quien arma la grilla sabe cuántas columnas hay en
   * cada breakpoint. La tarjeta no puede adivinarlo.
   */
  sizes?: string;
}

/** Grilla de 3 columnas desde md — la distribución del prototipo y la de /talentos. */
const SIZES_3_COLUMNAS = "(min-width: 768px) 33vw, 100vw";

/**
 * Grilla de 4 columnas en lg, 2×2 en md (decisión #80, Inicio con 4 destacados).
 *
 * Los números salen del Container (max-w-[1440px], px-5 y md:px-20) y del gap-6 de
 * la grilla, no de un redondeo a ojo:
 *   lg+   (min(100vw, 1440) − 160 de márgenes − 72 de los 3 gaps) / 4 → 302px al topar
 *   md    (100vw − 160 de márgenes − 24 del gap) / 2
 *   base  100vw − 40 de márgenes
 */
export const SIZES_TARJETA_4_COLUMNAS =
  "(min-width: 1440px) 302px, (min-width: 1024px) calc((100vw - 232px) / 4), (min-width: 768px) calc((100vw - 184px) / 2), calc(100vw - 40px)";

/**
 * Grilla del listado /talentos: 2 columnas en md, 3 en lg. Mismos ingredientes que
 * la de arriba —Container y gap-6— repartidos de otra forma:
 *   lg+   (min(100vw, 1440) − 160 de márgenes − 48 de los 2 gaps) / 3 → 411px al topar
 *   md    (100vw − 160 de márgenes − 24 del gap) / 2
 *   base  100vw − 40 de márgenes
 *
 * No sirve el valor por defecto: ese describe 3 columnas ya desde md, y aquí en md
 * hay 2 — declarar 33vw donde la tarjeta ocupa ~38vw hace que el navegador pida una
 * imagen más chica que la caja.
 */
export const SIZES_TARJETA_2_Y_3_COLUMNAS =
  "(min-width: 1440px) 411px, (min-width: 1024px) calc((100vw - 208px) / 3), (min-width: 768px) calc((100vw - 184px) / 2), calc(100vw - 40px)";

const wrapperClasses =
  "group relative block aspect-[3/4] overflow-hidden border border-line bg-surface transition-[transform,border-color] duration-500 hover:scale-[1.02] hover:border-amber";

/**
 * Recorte que hay que pedirle a Sanity para esta tarjeta — vive acá, al lado del
 * `aspect-[3/4]` de arriba, porque los dos tienen que decir la misma proporción: si una
 * cambia sin la otra, el recorte con hotspot deja de coincidir con el marco y vuelve a
 * recortarlo el navegador. La tarjeta en sí recibe un `src` ya listo (también la usan
 * datos que no vienen de Sanity), así que el recorte se aplica donde se mapea el dato.
 */
export const RECORTE_TARJETA_TALENTO = { ancho: 1080, alto: 1440 };

/**
 * Unifica las 2 implementaciones paralelas del prototipo (.dp-athlete en
 * Inicio y .athlete-card/.athlete-card-hover en el listado) en un único
 * componente dirigido por props — ver auditoría §5. Gris→color al hover,
 * degradado inferior que pasa de negro a ámbar.
 */
export function AthleteCard({
  talento,
  href,
  priority = false,
  sizes = SIZES_3_COLUMNAS,
}: AthleteCardProps) {
  const body = (
    <>
      <Image
        src={talento.foto.src}
        alt={talento.foto.alt}
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover object-center grayscale opacity-80 transition-all duration-700 group-hover:scale-[1.04] group-hover:opacity-100 group-hover:grayscale-0"
      />
      <div aria-hidden="true" className="athlete-overlay absolute inset-0" />
      <div className="absolute inset-0 flex flex-col justify-end p-6">
        <span className="mb-2 font-body text-label-caps uppercase tracking-widest text-amber transition-colors duration-300 group-hover:text-ink">
          {talento.disciplina}
        </span>
        <h3 className="font-display text-heading-md uppercase leading-none text-foreground transition-colors duration-300 group-hover:text-ink">
          {talento.nombre}
        </h3>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} aria-label={`Ver perfil de ${talento.nombre}`} className={wrapperClasses}>
        {body}
      </Link>
    );
  }

  return <div className={wrapperClasses}>{body}</div>;
}
