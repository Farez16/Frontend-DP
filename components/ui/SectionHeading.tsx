import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  /** Slot opcional — normalmente un <ArrowLink> ("Ver todas las noticias") */
  action?: ReactNode;
  className?: string;
}

/** Patrón eyebrow + H2 repetido al inicio de cada sección del sitio. */
export function SectionHeading({ eyebrow, title, action, className }: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 border-b border-line pb-7 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div>
        <p className="mb-4 font-body text-label-caps uppercase tracking-widest text-amber">
          {eyebrow}
        </p>
        <h2 className="font-display text-heading-lg uppercase">{title}</h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
