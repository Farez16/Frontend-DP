import { cn } from "@/lib/utils";

interface PillProps {
  children: string;
  className?: string;
}

/** Etiqueta bordeada en mayúsculas — "Disciplina", "Resiliencia", "Autenticidad"… */
export function Pill({ children, className }: PillProps) {
  return (
    <span
      className={cn(
        "inline-block border border-line px-4 py-2 font-body text-label-caps uppercase tracking-widest text-foreground-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
