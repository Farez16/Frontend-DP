import Link from "next/link";
import Image from "next/image";
import type { Talento } from "@/types/content";

interface AthleteCardProps {
  talento: Talento;
  /** Sin href todavía: ficha real por atleta llega en la Fase 4 (rutas dinámicas). */
  href?: string;
  priority?: boolean;
}

const wrapperClasses =
  "group relative block aspect-[3/4] overflow-hidden border border-line bg-surface transition-[transform,border-color] duration-500 hover:scale-[1.02] hover:border-amber";

/**
 * Unifica las 2 implementaciones paralelas del prototipo (.dp-athlete en
 * Inicio y .athlete-card/.athlete-card-hover en el listado) en un único
 * componente dirigido por props — ver auditoría §5. Gris→color al hover,
 * degradado inferior que pasa de negro a ámbar.
 */
export function AthleteCard({ talento, href, priority = false }: AthleteCardProps) {
  const body = (
    <>
      <Image
        src={talento.foto.src}
        alt={talento.foto.alt}
        fill
        priority={priority}
        sizes="(min-width: 768px) 33vw, 100vw"
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
