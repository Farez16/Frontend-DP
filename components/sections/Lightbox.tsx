"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR = "a[href], button:not([disabled])";

/** Los tres controles del overlay comparten lenguaje: caja con borde, ámbar al apuntarlos. */
const CONTROL_CLASSES =
  "flex border border-line bg-surface-deep p-2 text-foreground transition-colors hover:border-amber hover:text-amber";

export interface ElementoLightbox {
  /** Clave estable del elemento (el _key de Sanity). */
  key: string;
  /** Qué es, en palabras: nombre accesible del mosaico y del diálogo. No se muestra como texto. */
  descripcion: string;
  /** La ficha de la grilla, ya renderizada en el servidor. */
  mosaico: ReactNode;
  /** Lo que se ve en grande, ya renderizado en el servidor. */
  ampliada: ReactNode;
}

interface LightboxProps {
  items: ElementoLightbox[];
  /** Clases de la grilla de mosaicos: el layout lo sigue decidiendo la página. */
  className?: string;
}

/**
 * Galería con vista ampliada sobre un fondo oscuro a pantalla completa (lightbox) y
 * navegación entre elementos. Único uso hoy: la galería de la ficha de talento.
 *
 * Este componente es dueño de los mosaicos, no sólo del overlay: para pasar al siguiente
 * elemento hay que conocer el arreglo entero, así que el estado es un índice acá y no un
 * abierto/cerrado por ficha. Lo que sigue llegando del servidor es el contenido — cada
 * `mosaico` y cada `ampliada` vienen ya renderizados (ver la página); acá sólo se decide
 * cuál se muestra. Client Component porque abrir/cerrar/navegar, Escape, flechas, foco y
 * bloqueo de scroll son estado y eventos del navegador.
 *
 * Portal a document.body por el mismo motivo que MobileNav: cualquier ancestro con
 * filter/backdrop-filter/transform crea un containing block nuevo para los descendientes
 * position:fixed, y el overlay quedaría encajonado en vez de cubrir la pantalla. Acá no
 * es hipotético — el propio mosaico anima `scale` al pasar el mouse, que es uno de esos
 * casos.
 *
 * La vuelta es circular (del último al primero y al revés) en vez de deshabilitar la
 * flecha en los extremos: con galerías de 6 elementos un tope muerto no aporta nada, y
 * un <button disabled> además pierde el foco justo cuando lo acaban de pulsar, lo que
 * obligaría a reubicarlo a mano y haría que el ciclo de Tab cambie de largo según dónde
 * esté parado el visitante.
 */
export function Lightbox({ items, className }: LightboxProps) {
  const [indice, setIndice] = useState<number | null>(null);
  const abierto = indice !== null;
  const mosaicosRef = useRef<Array<HTMLButtonElement | null>>([]);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const devolverFocoRef = useRef(false);
  const indiceAbiertoRef = useRef(0);

  function abrir(i: number) {
    devolverFocoRef.current = true;
    setIndice(i);
  }

  function cerrar() {
    setIndice(null);
  }

  // Actualización funcional a propósito: así no hace falta cerrar sobre `indice`. Con
  // useCallback (como el dismiss de BrandBeat) la identidad sólo cambia si cambia el
  // largo de la galería, y el efecto del teclado no se vuelve a montar en cada paso.
  const mover = useCallback(
    (paso: number) => {
      setIndice((actual) =>
        actual === null ? actual : (actual + paso + items.length) % items.length,
      );
    },
    [items.length],
  );

  // El mosaico al que hay que devolver el foco es el del elemento que se está viendo, que
  // no tiene por qué ser el que abrió la vista: navegar y cerrar deja al visitante parado
  // en otra ficha de la grilla.
  useEffect(() => {
    if (indice !== null) indiceAbiertoRef.current = indice;
  }, [indice]);

  // Depende de `abierto` (booleano) y no de `indice`: si dependiera del índice, navegar
  // con el mouse le robaría el foco a la flecha recién pulsada para mandarlo a Cerrar.
  useEffect(() => {
    if (!abierto) return;
    document.body.classList.add("dp-scroll-lock");
    cerrarRef.current?.focus();
    return () => document.body.classList.remove("dp-scroll-lock");
  }, [abierto]);

  // Bloquea el fondo mientras el overlay está abierto: nada de lo que queda detrás sigue
  // siendo alcanzable con Tab (mismo tratamiento que el panel de MobileNav). Se filtran
  // los hermanos que YA venían inert —el panel cerrado de MobileNav lo está por prop de
  // React—: devolverles inert=false a mano los dejaría enfocables, porque React no lo
  // vuelve a poner mientras la prop no cambie.
  useEffect(() => {
    if (!abierto) return;
    const panelEl = panelRef.current;
    if (!panelEl) return;

    const bloqueados = Array.from(document.body.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== panelEl && !el.inert,
    );
    for (const el of bloqueados) el.inert = true;

    return () => {
      for (const el of bloqueados) el.inert = false;
    };
  }, [abierto]);

  // Devuelve el foco al mosaico, y recién en este efecto: el de arriba todavía no limpió
  // el inert de <main>, y .focus() sobre un elemento inert no hace nada (el mismo bug de
  // timing ya documentado en MobileNav). El flag evita que el efecto robe el foco en el
  // primer render, cuando nunca hubo overlay abierto.
  useEffect(() => {
    if (abierto) return;
    if (!devolverFocoRef.current) return;
    devolverFocoRef.current = false;
    mosaicosRef.current[indiceAbiertoRef.current]?.focus();
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        cerrar();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        mover(-1);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        mover(1);
        return;
      }
      if (event.key !== "Tab") return;

      const panelEl = panelRef.current;
      if (!panelEl) return;
      const focusables = Array.from(
        panelEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;

      // inert deja el foco encerrado en el panel, pero no cierra el ciclo último→primero
      // dentro de él; eso se hace a mano, igual que en MobileNav.
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

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [abierto, mover]);

  // Se monta el elemento visible y sus dos vecinos, ocultos: así la foto siguiente ya está
  // descargada cuando se pulsa la flecha, en vez de dejar el overlay en negro mientras
  // carga (el <img> mide 0x0 hasta que llega la imagen — ver el comentario de la caja en
  // la página). Montar los seis de golpe descargaría la galería entera por abrir una sola
  // foto. `hidden` es display:none: el navegador igual baja la imagen, que es el punto,
  // pero no ocupa lugar ni recibe clics.
  const ventana = new Set(
    abierto
      ? [(indice - 1 + items.length) % items.length, indice, (indice + 1) % items.length]
      : [],
  );

  return (
    <div className={className}>
      {items.map((item, i) => (
        <button
          key={item.key}
          ref={(el) => {
            mosaicosRef.current[i] = el;
          }}
          type="button"
          aria-label={`Ampliar: ${item.descripcion}`}
          onClick={() => abrir(i)}
          className="block cursor-zoom-in"
        >
          {item.mosaico}
        </button>
      ))}

      {abierto
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={`Vista ampliada: ${items[indice]?.descripcion ?? ""}`}
              // Cierra al hacer clic FUERA de la imagen: el fondo se da por pulsado sólo
              // cuando el clic no salió de ninguno de sus hijos (la foto, los botones),
              // sin repartir stopPropagation por cada uno de ellos.
              onClick={(event) => {
                if (event.target === event.currentTarget) cerrar();
              }}
              className="dp-lightbox fixed inset-0 z-[70] flex items-center justify-center bg-ink/95 p-5"
            >
              <button
                ref={cerrarRef}
                type="button"
                aria-label="Cerrar vista ampliada"
                onClick={cerrar}
                className={cn(CONTROL_CLASSES, "absolute right-5 top-5 z-10")}
              >
                <Icon name="close" size={28} />
              </button>

              {items.map((item, i) =>
                ventana.has(i) ? (
                  // El envoltorio ocupa siempre la misma posición del árbol para que React
                  // no desmonte la imagen al pasar de vecino a visible (un remonte la haría
                  // parpadear). `contents` lo borra del layout: el <img> queda como hijo
                  // directo del flex, igual que si el envoltorio no existiera.
                  <div
                    key={item.key}
                    hidden={i !== indice}
                    className={i === indice ? "contents" : undefined}
                  >
                    {item.ampliada}
                  </div>
                ) : null,
              )}

              {items.length > 1 ? (
                // Al costado de la foto desde md; abajo y centradas en móvil, donde a los
                // lados no hay lugar sin encimarse con la imagen. El contenedor no recibe
                // clics (pointer-events-none) para que el clic en el hueco entre la flecha
                // y la foto siga llegando al fondo y cierre la vista.
                <div className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center gap-3 md:inset-x-5 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:justify-between">
                  <button
                    type="button"
                    aria-label="Anterior"
                    onClick={() => mover(-1)}
                    className={cn(CONTROL_CLASSES, "pointer-events-auto")}
                  >
                    <Icon name="chevron_left" size={28} />
                  </button>
                  <button
                    type="button"
                    aria-label="Siguiente"
                    onClick={() => mover(1)}
                    className={cn(CONTROL_CLASSES, "pointer-events-auto")}
                  >
                    <Icon name="chevron_right" size={28} />
                  </button>
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
