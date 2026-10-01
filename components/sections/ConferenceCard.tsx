import Link from "next/link";
import Image from "next/image";
import type { Conferencia } from "@/types/content";
import { Icon } from "@/components/ui/Icon";

interface ConferenceCardProps {
  conferencia: Conferencia;
  priority?: boolean;
  /**
   * Obligatorio a propósito: el ancho de la tarjeta no lo decide la tarjeta sino la
   * grilla que la contiene, y esta misma se usa en tres configuraciones distintas
   * (1 tarjeta a 576px, 2 columnas, 3 columnas) cuyos anchos no se parecen entre sí.
   * Un valor por defecto acertaría en una de las tres y serviría imágenes chicas
   * estiradas en las otras dos, en silencio. Ver GRILLAS en app/conferencias/page.tsx.
   */
  sizes: string;
}

/**
 * Recorte que se le pide a Sanity para la portada de la conferencia (16:9, proporción
 * de video estándar para miniaturas de Bunny Stream).
 */
export const RECORTE_TARJETA_CONFERENCIA = { ancho: 1280, alto: 720 };

/**
 * Tarjeta de conferencia — hover consistente con NewsCard: borde ámbar + zoom sutil
 * de la portada. Muestra portada/miniatura, conferencista con avatar, título en Anton
 * y público objetivo resumido.
 */
export function ConferenceCard({
  conferencia,
  priority = false,
  sizes,
}: ConferenceCardProps) {
  return (
    <Link
      href={`/conferencias/${conferencia.slug}`}
      className="group flex flex-col border border-line bg-surface transition-[border-color,transform] duration-300 hover:-translate-y-1 hover:border-amber"
    >
      <div className="relative aspect-video overflow-hidden bg-surface-deep">
        {conferencia.portada ? (
          <Image
            src={conferencia.portada.src}
            alt={conferencia.portada.alt}
            fill
            priority={priority}
            sizes={sizes}
            // La miniatura automática de Bunny no pasa por el optimizador (lib/bunny.ts).
            unoptimized={conferencia.portada.sinOptimizar}
            className="object-cover transition-transform duration-[600ms] group-hover:scale-[1.05]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-high/50">
            <Icon
              name="mic"
              size={48}
              className="text-outline-variant transition-colors duration-300 group-hover:text-amber"
            />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-4 flex items-center gap-2.5">
          {conferencia.talento?.foto && (
            <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-line bg-surface-high">
              <Image
                src={conferencia.talento.foto.src}
                alt=""
                fill
                sizes="24px"
                className="object-cover"
              />
            </div>
          )}
          <span className="truncate font-body text-label-caps uppercase tracking-widest text-amber">
            {conferencia.talento?.nombre ?? "Talento DP"}
          </span>
        </div>

        <h3 className="mb-3 line-clamp-2 font-display text-heading-md uppercase leading-tight text-foreground">
          {conferencia.titulo}
        </h3>

        <div className="mb-6 flex-1">
          <p className="mb-1.5 font-body text-label-caps uppercase tracking-wider text-foreground-faint">
            Público objetivo
          </p>
          <p className="line-clamp-3 font-body text-body-sm text-foreground-muted">
            {conferencia.publicoObjetivo}
          </p>
        </div>

        <span className="mt-auto inline-flex items-center gap-2 font-body text-label-caps uppercase tracking-widest text-foreground-muted transition-colors duration-300 group-hover:text-amber">
          Ver conferencia
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
