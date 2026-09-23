import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatBlockProps {
  value: string;
  label: string;
  /** Ámbar + borde izquierdo de 2px — reservado para el hito principal de un grupo */
  emphasis?: boolean;
  /** Marca opcional junto al número, p. ej. el ícono de medalla de un grupo de logros. */
  icon?: ReactNode;
  /**
   * Sobrescribe el tamaño del valor. El default (`text-stat`) está pensado para
   * cifras cortas; un valor que es una palabra larga —"FINALISTA"— no entra en una
   * columna angosta y desborda la sección. Ver la franja de destacados del perfil.
   */
  valueClassName?: string;
  className?: string;
}

/** Número grande (Anton) + etiqueta — hitos del atleta, stats de patrocinio, alcance digital. */
export function StatBlock({
  value,
  label,
  emphasis = false,
  icon,
  valueClassName,
  className,
}: StatBlockProps) {
  return (
    <div
      className={cn(
        "flex flex-col border-l pl-6",
        emphasis ? "border-amber" : "border-line",
        className,
      )}
    >
      <span className="flex items-center gap-3">
        <span
          className={cn(
            "font-display leading-none",
            // Reemplaza, no se apila: `cn` es un join simple (sin tailwind-merge) y
            // `.text-stat` vive en globals.css después del import de Tailwind, así que
            // le ganaría por orden de carga a cualquier utilidad de tamaño que se sume.
            valueClassName ?? "text-stat",
            emphasis ? "text-amber" : "text-foreground",
          )}
        >
          {value}
        </span>
        {icon}
      </span>
      <span className="mt-2 font-body text-label-caps uppercase tracking-widest text-foreground-muted">
        {label}
      </span>
    </div>
  );
}
