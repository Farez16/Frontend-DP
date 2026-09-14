"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "dpBrandBeatSeen";
const AUTO_DISMISS_MS = 1900;
const REMOVE_AFTER_MS = 650;

// Lee sessionStorage vía useSyncExternalStore en vez de useState+effect:
// evita el mismatch de hidratación (el servidor no tiene sessionStorage)
// sin caer en el anti-patrón "setState síncrono dentro de un efecto"
// (react-hooks/set-state-in-effect).
function subscribe() {
  return () => {};
}
function getSnapshot() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
function getServerSnapshot() {
  return false; // en el servidor no hay sessionStorage: se asume "no visto todavía"
}

/**
 * Beat de marca a pantalla completa antes del hero de Inicio (estilo
 * Ferrari), una sola vez por sesión de pestaña. A pedido del cliente
 * ignora prefers-reduced-motion a propósito — única excepción del
 * sitio, decisión de marca ya tomada, no un descuido (ver prototype.js
 * original y el commit "Make brand-beat splash ignore
 * prefers-reduced-motion"). Construido ahora como pidió esta fase; se
 * monta en Inicio en la Fase 4, cuando exista el hero de video real al
 * que precede — montarlo antes no tendría nada que preceder.
 */
export function BrandBeat() {
  const alreadySeen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [dismissing, setDismissing] = useState(false);
  const [removed, setRemoved] = useState(false);
  const dismissedRef = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setDismissing(true);
    window.setTimeout(() => {
      document.body.classList.remove("dp-scroll-lock");
      setRemoved(true);
    }, REMOVE_AFTER_MS);
  }, []);

  useEffect(() => {
    if (alreadySeen) return;

    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Sin sessionStorage disponible (modo privado estricto, etc.):
      // se muestra igual, simplemente no persiste entre pestañas.
    }

    document.body.classList.add("dp-scroll-lock");

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
        dismiss();
      }
    }

    const timer = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    document.addEventListener("keydown", handleKeydown);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [alreadySeen, dismiss]);

  if (alreadySeen || removed) return null;

  return (
    <div
      role="presentation"
      aria-hidden="true"
      onClick={dismiss}
      className={cn(
        "fixed inset-0 z-[200] flex cursor-pointer flex-col items-center justify-center gap-5 bg-ink transition-[opacity,visibility] duration-[600ms]",
        dismissing ? "invisible pointer-events-none opacity-0" : "visible opacity-100",
      )}
    >
      <span className="dp-beat-mark text-display-hero font-display tracking-tighter text-foreground">
        DP
      </span>
      <span className="dp-beat-tag px-8 text-center font-body text-label-caps uppercase tracking-[0.2em] text-amber">
        El deporte no se construye solo.
      </span>
    </div>
  );
}
