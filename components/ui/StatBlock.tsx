import { cn } from "@/lib/utils";

interface StatBlockProps {
  value: string;
  label: string;
  /** Ámbar + borde izquierdo de 2px — reservado para el hito principal de un grupo */
  emphasis?: boolean;
  className?: string;
}

/** Número grande (Anton) + etiqueta — hitos del atleta, stats de patrocinio, alcance digital. */
export function StatBlock({ value, label, emphasis = false, className }: StatBlockProps) {
  return (
    <div
      className={cn(
        "flex flex-col border-l pl-6",
        emphasis ? "border-amber" : "border-line",
        className,
      )}
    >
      <span
        className={cn(
          "font-display text-stat leading-none",
          emphasis ? "text-amber" : "text-foreground",
        )}
      >
        {value}
      </span>
      <span className="mt-2 font-body text-label-caps uppercase tracking-widest text-foreground-muted">
        {label}
      </span>
    </div>
  );
}
