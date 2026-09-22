import { cn } from "@/lib/utils";

interface ComingSoonProps {
  message: string;
  className?: string;
}

/**
 * Estado vacío por sección cuando Sanity todavía no tiene contenido real
 * para esa franja (decisión #41) — mismo tratamiento tipográfico que el
 * resto del sitio, sin el botón "Volver al inicio" de PlaceholderNotice
 * (no tiene sentido dentro de una sección de Inicio).
 */
export function ComingSoon({ message, className }: ComingSoonProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 border border-dashed border-line px-6 py-16 text-center",
        className,
      )}
    >
      <p className="font-display text-heading-md uppercase text-foreground-muted">Próximamente</p>
      <p className="max-w-md font-body text-body-md text-foreground-muted">{message}</p>
    </div>
  );
}
