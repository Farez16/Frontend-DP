"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onNavigate?: () => void;
}

/**
 * Único fragmento de Header que necesita ser Client Component: el
 * estado "activo" depende de usePathname(), que no existe en Server
 * Components. El resto del Header se queda en el servidor.
 */
export function NavLink({ href, children, className, onNavigate }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "relative inline-block pb-1.5 font-body text-label-caps uppercase tracking-wide transition-colors duration-300",
        isActive ? "text-amber-soft" : "text-foreground-muted hover:text-amber-soft",
        "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-left after:scale-x-0 after:bg-amber after:transition-transform after:duration-300 hover:after:scale-x-100",
        isActive && "after:scale-x-100",
        className,
      )}
    >
      {children}
    </Link>
  );
}
