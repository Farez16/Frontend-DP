import Link from "next/link";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

interface ArrowLinkProps {
  href: string;
  children: string;
  className?: string;
}

/** Enlace de texto con flecha animada (.dp-arrowlink del prototipo) — "Ver roster completo", "Leer más", etc. */
export function ArrowLink({ href, children, className }: ArrowLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2 font-body text-label-caps uppercase tracking-widest text-foreground-muted transition-colors duration-300 hover:text-amber",
        className,
      )}
    >
      {children}
      <Icon
        name="arrow_forward"
        className="text-[20px] transition-transform duration-300 group-hover:translate-x-1"
      />
    </Link>
  );
}
