import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface IconProps {
  /** Nombre ligature de Material Symbols, p. ej. "arrow_forward" */
  name: string;
  /** Variante "filled" (FILL 1) — algunos íconos del prototipo la usan por énfasis */
  filled?: boolean;
  /**
   * Tamaño en px. Va por `style` y no por clase de Tailwind a propósito: la hoja de
   * Google Fonts declara `.material-symbols-outlined { font-size: 24px }`, que tiene la
   * misma especificidad que `text-[Npx]` y le gana por orden de carga. Durante un tiempo
   * el sitio entero renderizó todo a 24px por eso, ignorando en silencio cada tamaño
   * pedido. Un estilo inline gana siempre, así que este es el único mecanismo confiable.
   *
   * Sin `size`, se hereda el 24px de Google, que es el tamaño por defecto deseado.
   */
  size?: number;
  className?: string;
}

/**
 * Envuelve Material Symbols Outlined (cargada una sola vez como <link>
 * en app/layout.tsx — ver docs/ARQUITECTURA.md sobre por qué no usa
 * next/font como las 3 tipografías reales). Decorativo por defecto:
 * el texto visible siempre debe venir de un elemento hermano.
 */
export function Icon({ name, filled = false, size, className }: IconProps) {
  const style: CSSProperties = {};
  if (filled) style.fontVariationSettings = "'FILL' 1";
  if (size !== undefined) style.fontSize = `${size}px`;

  return (
    <span
      aria-hidden="true"
      className={cn("material-symbols-outlined", className)}
      style={Object.keys(style).length > 0 ? style : undefined}
    >
      {name}
    </span>
  );
}
