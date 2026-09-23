"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Sólo la cáscara del header es Client Component, no el header entero: así los
 * NavLink, el Button de contacto y el Container siguen siendo Server Components y
 * no se arrastra todo el nav al bundle del cliente por un listener de scroll.
 *
 * Transparente sobre el hero full-bleed y sólido apenas se scrollea (decisión #52,
 * mismo comportamiento que el prototipo). El umbral es la altura del propio header:
 * pasado eso el hero ya no está detrás, así que el fondo sólido deja de taparlo y
 * empieza a hacer falta para que los links se lean sobre el contenido.
 */
const UMBRAL_SOLIDO = 72;

export function HeaderShell({ children }: { children: ReactNode }) {
  const [solido, setSolido] = useState(false);

  useEffect(() => {
    const sincronizar = () => setSolido(window.scrollY >= UMBRAL_SOLIDO);
    // Se llama una vez antes de suscribirse: si la página carga ya scrolleada
    // (recarga a media página, o llegada a un ancla) el header debe nacer sólido
    // en vez de esperar al primer evento.
    sincronizar();
    window.addEventListener("scroll", sincronizar, { passive: true });
    return () => window.removeEventListener("scroll", sincronizar);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-300",
        solido
          ? "border-line/35 bg-background/82 backdrop-blur-md"
          : "border-transparent bg-transparent",
      )}
    >
      {children}
    </header>
  );
}
