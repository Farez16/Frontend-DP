import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ContainerProps {
  as?: ElementType;
  children: ReactNode;
  className?: string;
}

/**
 * Ancho máximo + márgenes laterales del prototipo (container-max:
 * 1440px, margin-mobile: 20px, margin-desktop: 80px) — se repetía en
 * el wrapper de cada sección de cada página; ahora vive en un solo
 * lugar. gutter/stack-* se aplican con la escala numérica normal de
 * Tailwind (gap-6, py-30, etc.) porque ya coinciden exactamente.
 */
export function Container({ as: Tag = "div", children, className }: ContainerProps) {
  return (
    <Tag className={cn("mx-auto w-full max-w-[1440px] px-5 md:px-20", className)}>{children}</Tag>
  );
}
