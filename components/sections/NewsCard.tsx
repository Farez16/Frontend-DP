import Link from "next/link";
import Image from "next/image";
import type { Noticia } from "@/types/content";
import { Icon } from "@/components/ui/Icon";

interface NewsCardProps {
  noticia: Noticia;
  priority?: boolean;
}

/** Tarjeta de noticia (.dp-news-card) — hover discreto: borde ámbar + zoom de imagen. */
export function NewsCard({ noticia, priority = false }: NewsCardProps) {
  return (
    <Link
      href={`/noticias/${noticia.slug}`}
      className="group flex flex-col border border-line bg-surface transition-[border-color,transform] duration-300 hover:-translate-y-1 hover:border-amber"
    >
      <div className="relative aspect-[3/2] overflow-hidden bg-surface-deep">
        <Image
          src={noticia.portada.src}
          alt={noticia.portada.alt}
          fill
          priority={priority}
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-[600ms] group-hover:scale-[1.06]"
        />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="font-body text-label-caps uppercase tracking-widest text-amber">
            {noticia.categoria}
          </span>
          <span aria-hidden="true" className="h-1 w-1 rounded-full bg-outline-variant" />
          <time dateTime={noticia.fecha} className="font-body text-body-md text-foreground-muted">
            {noticia.fechaLegible}
          </time>
        </div>
        <h3 className="mb-3 font-display text-heading-md uppercase leading-tight text-foreground">
          {noticia.titulo}
        </h3>
        <p className="mb-6 line-clamp-3 font-body text-body-md text-foreground-muted">
          {noticia.extracto}
        </p>
        <span className="mt-auto inline-flex items-center gap-2 font-body text-label-caps uppercase tracking-widest text-foreground-muted transition-colors duration-300 group-hover:text-amber">
          Leer más
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
