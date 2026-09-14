import { cn } from "@/lib/utils";

interface IconProps {
  /** Nombre ligature de Material Symbols, p. ej. "arrow_forward" */
  name: string;
  /** Variante "filled" (FILL 1) — algunos íconos del prototipo la usan por énfasis */
  filled?: boolean;
  className?: string;
}

/**
 * Envuelve Material Symbols Outlined (cargada una sola vez como <link>
 * en app/layout.tsx — ver docs/ARQUITECTURA.md sobre por qué no usa
 * next/font como las 3 tipografías reales). Decorativo por defecto:
 * el texto visible siempre debe venir de un elemento hermano.
 */
export function Icon({ name, filled = false, className }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("material-symbols-outlined", className)}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  );
}
