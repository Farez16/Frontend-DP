import Link from "next/link";
import Image from "next/image";
import type { Proyecto } from "@/types/content";
import { Icon } from "@/components/ui/Icon";
import { estiloTituloAjustable } from "@/lib/tituloAjustable";

interface ProjectCardProps {
  proyecto: Proyecto;
  priority?: boolean;
  /**
   * Obligatorio por lo mismo que en ConferenceCard: el ancho de la tarjeta lo decide la
   * grilla, que tiene dos configuraciones. Describe el ancho máximo del logo —la
   * tarjeta menos el `p-10`—, no el de la tarjeta. Ver GRILLAS en app/proyectos/page.tsx.
   */
  sizes: string;
}

/**
 * Ancho que se le pide al CDN para el logo de la tarjeta. Sale de la regla de
 * sanity/image.ts: el mayor ancho que declara `sizes` (548px, dos columnas a 1440), ×2
 * por las pantallas 2x = 1096, y el escalón de next/image que lo cubre es 1200. Sin alto:
 * el logo va entero, con object-contain.
 */
export const RECORTE_TARJETA_PROYECTO = { ancho: 1200 };

/**
 * Tarjeta de proyecto. Solo aparece con dos proyectos o más: con uno, /proyectos muestra
 * su presentación completa. El prototipo no tenía tarjeta (solo existía DP Team), así
 * que toma el idioma de ConferenceCard —borde ámbar y zoom sutil al hover— con el logo
 * en lugar de la portada.
 */
export function ProjectCard({ proyecto, priority = false, sizes }: ProjectCardProps) {
  return (
    <Link
      href={`/proyectos/${proyecto.slug}`}
      className="group flex flex-col border border-line bg-surface transition-[border-color,transform] duration-300 hover:-translate-y-1 hover:border-amber"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-deep">
        {proyecto.logo ? (
          <Image
            src={proyecto.logo.src}
            alt=""
            fill
            priority={priority}
            sizes={sizes}
            className="object-contain p-10 transition-transform duration-[600ms] group-hover:scale-[1.05]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-high/50">
            <Icon
              name="rocket_launch"
              size={48}
              className="text-outline-variant transition-colors duration-300 group-hover:text-amber"
            />
          </div>
        )}
      </div>
      {/* @container: el nombre se ajusta al ancho de esta caja (ver ProjectHero). */}
      <div className="flex flex-1 flex-col p-6 @container">
        {/* Misma medida que el héroe a su escala: a 32px fijos, "Independientemente"
            se partía en las tarjetas de 768 y 1024. */}
        <h2
          className="mb-3 line-clamp-2 break-words font-display text-heading-md-ajustable uppercase leading-tight text-foreground"
          style={estiloTituloAjustable(proyecto.nombre)}
        >
          {proyecto.nombre}
        </h2>

        {/* Decisión #34: la relación con la agencia se ve siempre que exista, también
            aquí y no solo en la presentación. */}
        {proyecto.notaRelacionAgencia ? (
          <p className="mb-6 line-clamp-3 font-body text-body-sm text-foreground-muted">
            {proyecto.notaRelacionAgencia}
          </p>
        ) : null}

        <span className="mt-auto inline-flex items-center gap-2 font-body text-label-caps uppercase tracking-widest text-foreground-muted transition-colors duration-300 group-hover:text-amber">
          Ver proyecto
          <Icon
            name="arrow_forward"
            size={20}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </span>
      </div>
    </Link>
  );
}
