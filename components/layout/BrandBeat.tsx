"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "dpBrandBeatSeen";
const AUTO_DISMISS_MS = 1900;
const REMOVE_AFTER_MS = 650;
const OVERLAY_ID = "dp-brand-beat";

function readSeen() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

// Sin nada a lo que suscribirse: "¿ya se vio?" no cambia durante la vida de
// un montaje (ver createSeenSnapshot).
function subscribe() {
  return () => {};
}
function getServerSnapshot() {
  return false; // en el servidor no hay sessionStorage: se asume "no visto todavía"
}

// "¿Ya se vio en esta pestaña?" se lee UNA vez por montaje y se congela.
// Leer sessionStorage vía useSyncExternalStore en vez de useState+effect evita
// el mismatch de hidratación (el servidor no tiene sessionStorage) sin caer en
// el anti-patrón "setState síncrono dentro de un efecto"
// (react-hooks/set-state-in-effect). Pero un getSnapshot que releyera el
// storage en cada render se contradice con el propio setItem de abajo: el
// render siguiente (p. ej. el de setDismissing(true)) veía "ya visto" y
// devolvía null antes de que corriera el fade-out de salida. Congelado por
// montaje, sigue coincidiendo con el servidor mientras se hidrata
// (useSyncExternalStore usa getServerSnapshot ahí) y corrige justo después si
// la pestaña ya lo había visto.
function createSeenSnapshot() {
  const seen = readSeen();
  return () => seen;
}

// El servidor no puede leer sessionStorage y siempre emite el overlay: en una
// recarga de la pestaña se vería (negro, a pantalla completa) hasta que React
// hidrate. Este script corre síncrono mientras el navegador parsea el HTML,
// justo después del overlay y antes del primer pintado, y lo oculta si la
// pestaña ya lo vio. Patrón de la guía "How to prevent flash before hydration"
// de Next; React retira el overlay del DOM al hidratar.
const HIDE_IF_SEEN_SCRIPT = `try{if(sessionStorage.getItem("${STORAGE_KEY}")==="1"){var n=document.getElementById("${OVERLAY_ID}");if(n)n.style.display="none"}}catch(e){}`;

// type="text/plain" en el cliente: React avisa en desarrollo cuando un
// componente renderiza un <script> ejecutable (en el cliente nunca correría de
// todos modos). suppressHydrationWarning absorbe la diferencia de "type".
function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Beat de marca a pantalla completa antes del hero de Inicio (estilo
 * Ferrari), una sola vez por sesión de pestaña. A pedido del cliente
 * ignora prefers-reduced-motion a propósito — única excepción del
 * sitio, decisión de marca ya tomada, no un descuido (ver prototype.js
 * original y el commit "Make brand-beat splash ignore
 * prefers-reduced-motion"). Se monta en app/page.tsx, justo antes del hero.
 *
 * En este componente, dp-scroll-lock (clase compartida con MobileNav) lo pone
 * y lo quita únicamente el primer efecto de abajo: su cleanup lo suelta en
 * toda salida (cierre normal, "ya visto" que llega tras hidratar en una
 * recarga, doble montaje de StrictMode, desmontaje por navegación). Como en
 * el prototipo, se libera al empezar el fade-out, no al retirar el overlay.
 *
 * Como el servidor no puede leer sessionStorage, siempre emite el overlay;
 * HIDE_IF_SEEN_SCRIPT lo oculta antes del primer pintado en las recargas.
 */
export function BrandBeat() {
  const [getSnapshot] = useState(createSeenSnapshot);
  const alreadySeen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [dismissing, setDismissing] = useState(false);
  const [removed, setRemoved] = useState(false);

  // Idempotente: clic, teclado y temporizador pueden coincidir sin coordinarse.
  const dismiss = useCallback(() => setDismissing(true), []);

  // Mientras el splash espera su cierre: marca la pestaña como vista, bloquea
  // el scroll y arma los cierres (temporizador y teclado).
  useEffect(() => {
    if (alreadySeen || dismissing) return;

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
      document.body.classList.remove("dp-scroll-lock");
    };
  }, [alreadySeen, dismissing, dismiss]);

  // Retira el overlay del DOM solo cuando ya terminó el fade-out (duration-[600ms]
  // del className), no antes.
  useEffect(() => {
    if (!dismissing) return;

    const timer = window.setTimeout(() => setRemoved(true), REMOVE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [dismissing]);

  if (alreadySeen || removed) return null;

  return (
    <>
      <div
        id={OVERLAY_ID}
        role="presentation"
        aria-hidden="true"
        onClick={dismiss}
        // HIDE_IF_SEEN_SCRIPT puede haberle puesto display:none antes de hidratar.
        suppressHydrationWarning
        className={cn(
          "fixed inset-0 z-[200] flex cursor-pointer flex-col items-center justify-center gap-5 bg-ink transition-[opacity,visibility] duration-[600ms]",
          dismissing ? "invisible pointer-events-none opacity-0" : "visible opacity-100",
        )}
      >
        {/* tracking-*! (importante): .text-display-hero y .text-label-caps viven en
            globals.css fuera de @layer y su letter-spacing ganaría a los
            utilitarios, que sí están en @layer utilities. */}
        <span className="dp-beat-mark text-display-hero font-display tracking-tighter! text-foreground">
          DP
        </span>
        <span className="dp-beat-tag px-8 text-center font-body text-label-caps uppercase tracking-[0.2em]! text-amber">
          El deporte no se construye solo.
        </span>
      </div>
      <InlineScript html={HIDE_IF_SEEN_SCRIPT} />
    </>
  );
}
