import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

type ButtonVariant = "amber" | "ghost";

interface ButtonProps {
  href?: string;
  variant?: ButtonVariant;
  /** Nombre de un Material Symbol, renderizado al final con desplazamiento al hover */
  icon?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  amber:
    "bg-amber text-ink border border-transparent transition-[filter,border-color] duration-200 hover:brightness-110 hover:border-foreground active:scale-[0.97]",
  ghost:
    "bg-transparent text-foreground border-2 border-foreground transition-colors duration-300 hover:bg-foreground hover:text-ink active:scale-[0.97]",
};

const baseClasses =
  "group inline-flex items-center justify-center gap-2 px-9 py-4 font-display text-[20px] uppercase tracking-wide";

/** Botón amber (alto valor) o ghost (secundario) — únicas 2 variantes del prototipo. */
export function Button({
  href,
  variant = "amber",
  icon,
  type = "button",
  onClick,
  className,
  children,
}: ButtonProps) {
  const classes = cn(baseClasses, variantClasses[variant], className);

  const content = (
    <>
      {children}
      {icon ? (
        <Icon
          name={icon}
          className="text-[20px] transition-transform duration-300 group-hover:translate-x-1"
        />
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes}>
      {content}
    </button>
  );
}
