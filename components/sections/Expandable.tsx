"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

interface ExpandableProps {
  labelMore: string;
  labelLess?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Lista/panel expandible (data-expand-toggle del prototipo) — único uso
 * hoy: "Ver todos los logros" en la ficha de Daniel (Fase 4). Client
 * Component: necesita estado de abierto/cerrado.
 */
export function Expandable({ labelMore, labelLess, children, className }: ExpandableProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  return (
    <div className={className}>
      <div className="flex justify-end">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setIsOpen((open) => !open)}
          className="inline-flex items-center gap-2 border border-amber px-6 py-3 font-body text-label-caps uppercase tracking-widest text-amber transition-colors hover:bg-amber hover:text-ink"
        >
          {isOpen ? (labelLess ?? labelMore) : labelMore}
          <Icon
            name="expand_more"
            size={20}
            className={cn("transition-transform duration-300", isOpen && "rotate-180")}
          />
        </button>
      </div>
      {isOpen ? (
        <div id={panelId} style={{ animation: "dp-fade-up 0.5s ease" }} className="mt-8">
          {children}
        </div>
      ) : null}
    </div>
  );
}
