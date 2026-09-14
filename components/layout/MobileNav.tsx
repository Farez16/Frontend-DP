"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNav, contactoNav } from "@/lib/nav";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const DESKTOP_BREAKPOINT_PX = 1280; // xl — coincide con el nav de 7 enlaces + CTA
const FOCUSABLE_SELECTOR = "a[href], button:not([disabled])";

// "¿Ya estamos montados en el cliente?" vía useSyncExternalStore en vez
// de useState+effect (mismo motivo que en BrandBeat.tsx): createPortal
// necesita document, que no existe en el render de servidor.
function subscribeNoop() {
  return () => {};
}
function getIsClientSnapshot() {
  return true;
}
function getServerSnapshot() {
  return false;
}

/**
 * Overlay de navegación móvil (.dp-mobilenav del prototipo). Client
 * Component: abrir/cerrar, foco al abrir/cerrar, Escape, bloqueo de
 * scroll y cierre automático al pasar a escritorio son todo estado y
 * eventos del navegador — no hay forma de hacer esto en un Server Component.
 *
 * El panel se renderiza vía portal a document.body (no como hijo normal
 * de <header>): <header> usa backdrop-blur (backdrop-filter), y
 * cualquier filter/backdrop-filter/transform en un ancestro crea un
 * nuevo containing block para descendientes position:fixed — el panel
 * quedaba encajonado en los 72px del header en vez de cubrir la
 * pantalla completa. Detectado verificando en el navegador, no sólo
 * leyendo el código.
 *
 * Focus trap: mientras isOpen, todo hijo directo de document.body que
 * no sea este panel (Header, main, Footer) se marca inert — sin esto,
 * Tab podía llegar a elementos cubiertos e invisibles detrás del
 * overlay (bug real de auditoría: el foco escapaba al link "DP" del
 * Header). inert por sí solo no crea el ciclo último→primero/
 * primero→último dentro del panel, así que ese wrap se maneja aparte,
 * a mano, en el keydown de Tab.
 */
export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const mounted = useSyncExternalStore(subscribeNoop, getIsClientSnapshot, getServerSnapshot);
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const shouldRestoreFocusRef = useRef(false);

  function closeMenu() {
    setIsOpen(false);
  }

  function closeMenuAndReturnFocus() {
    shouldRestoreFocusRef.current = true;
    setIsOpen(false);
  }

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("dp-scroll-lock");
      firstLinkRef.current?.focus();
    } else {
      document.body.classList.remove("dp-scroll-lock");
    }
    return () => document.body.classList.remove("dp-scroll-lock");
  }, [isOpen]);

  // Bloquea el fondo mientras el panel está abierto: todo lo que no sea
  // el panel deja de ser foco-alcanzable (y de recibir clics/lectores de
  // pantalla). Sin esto, un elemento tapado por el overlay seguía
  // siendo alcanzable con Tab — ver comentario del componente arriba.
  useEffect(() => {
    if (!isOpen) return;
    const panelEl = panelRef.current;
    if (!panelEl) return;

    const siblings = Array.from(document.body.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== panelEl,
    );
    for (const el of siblings) el.inert = true;

    return () => {
      for (const el of siblings) el.inert = false;
    };
  }, [isOpen]);

  // Devuelve el foco al botón que abrió el panel (Escape / "Cerrar
  // menú"), pero sólo después de este punto: setIsOpen(false) no aplica
  // el DOM de inmediato (React agrupa la actualización), así que llamar
  // a .focus() en el mismo tick que setIsOpen encontraba el botón
  // todavía dentro de un Header marcado inert por el efecto de arriba —
  // .focus() en un elemento inert no hace nada y el foco caía a <body>
  // (confirmado en el navegador). Este efecto corre después de que la
  // limpieza del efecto anterior ya quitó el inert del fondo. No se usa
  // en el cierre por clic en un link de navegación (closeMenu a secas):
  // ahí la página está navegando, forzar el foco al toggle no aporta.
  useEffect(() => {
    if (isOpen) return;
    if (!shouldRestoreFocusRef.current) return;
    shouldRestoreFocusRef.current = false;
    toggleRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenuAndReturnFocus();
        return;
      }
      if (event.key !== "Tab") return;

      const panelEl = panelRef.current;
      if (!panelEl) return;
      const focusables = Array.from(panelEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    function handleResize() {
      if (window.innerWidth >= DESKTOP_BREAKPOINT_PX) setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeydown);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  const panel = (
    <div
      id="dp-mobile-nav-panel"
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Menú de navegación"
      // inert (no sólo opacidad) bloquea foco/clic/lectores de pantalla en
      // el panel cerrado en un solo atributo nativo — más robusto que
      // depender de "visibility", que transiciona de forma inconsistente
      // en algunos motores (confirmado probando un <div> aislado en el
      // propio navegador antes de aplicar este fix).
      inert={!isOpen}
      className={cn(
        "fixed inset-0 z-[60] flex flex-col bg-surface-deep transition-[opacity,transform] duration-300 xl:hidden",
        isOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2.5 opacity-0",
      )}
    >
      <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-line px-5">
        <Link
          href="/"
          className="font-display text-heading-md leading-none tracking-tighter text-foreground"
        >
          DP
        </Link>
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={closeMenuAndReturnFocus}
          className="-mr-2 p-2 text-foreground"
        >
          <Icon name="close" className="text-[28px]" />
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-center overflow-y-auto px-5 py-4">
        {primaryNav.map((item, index) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              ref={index === 0 ? firstLinkRef : undefined}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              onClick={closeMenu}
              className={cn(
                "block border-b border-line py-3.5 font-display text-[26px] uppercase leading-none transition-[color,padding-left] duration-300",
                isActive ? "pl-2 text-amber" : "text-foreground hover:pl-2 hover:text-amber",
              )}
            >
              {item.label}
            </Link>
          );
        })}
        <Link
          href={contactoNav.href}
          onClick={closeMenu}
          className="block border-b border-line py-3.5 font-display text-[26px] uppercase leading-none text-foreground transition-[color,padding-left] duration-300 hover:pl-2 hover:text-amber"
        >
          {contactoNav.label}
        </Link>
      </div>

      <div className="shrink-0 px-5 pb-10 pt-6">
        {/* Button no aplica onClick cuando recibe href (renderiza un
            next/link plano) — este wrapper cierra el menú por bubbling
            del clic, sin tocar components/ui/Button.tsx. Necesario:
            sin esto, navegar por "Hablemos" dejaba el fondo de la
            página siguiente marcado inert (el layout raíz no
            remonta entre rutas, así que isOpen nunca volvía a false). */}
        <div onClick={closeMenu} className="w-full">
          <Button href={contactoNav.href} className="w-full">
            Hablemos
          </Button>
        </div>
        <p className="mt-6 font-body text-body-md text-foreground-muted opacity-70">
          Cuenca, Ecuador
        </p>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls="dp-mobile-nav-panel"
        aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
        onClick={() => setIsOpen((open) => !open)}
        className="-mr-2 p-2 text-foreground xl:hidden"
      >
        <Icon name={isOpen ? "close" : "menu"} className="text-[28px]" />
      </button>
      {mounted ? createPortal(panel, document.body) : null}
    </>
  );
}
