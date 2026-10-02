"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import type { AparicionConferencia } from "@/types/content";

interface AppearanceCarouselProps {
  /** Ya vienen ordenadas por fecha descendente desde CONFERENCIA_DETALLE_QUERY. */
  apariciones: AparicionConferencia[];
}

/** Cada cuánto avanza solo. 6s deja leer tres líneas cortas sin que se haga eterno. */
const INTERVALO_MS = 6000;

/**
 * `prefers-reduced-motion` leído desde JavaScript.
 *
 * El bloque de globals.css ya apaga la transición visual, pero eso no alcanza acá: lo
 * que hay que apagar además es el temporizador, y un `@media` no puede hacerlo. Va por
 * useSyncExternalStore y no por useState+useEffect por la misma razón que BrandBeat y
 * MobileNav: el servidor no tiene matchMedia, y leerlo en un efecto es el anti-patrón
 * "setState síncrono dentro de un efecto".
 *
 * El servidor asume "sin preferencia" y el cliente corrige al hidratar. No hay riesgo
 * de mismatch de marcado porque este valor no cambia ni una etiqueta: sólo decide si
 * el temporizador llega a armarse, y los temporizadores no existen en el servidor.
 */
const CONSULTA_MOVIMIENTO = "(prefers-reduced-motion: reduce)";

function suscribirMovimiento(alCambiar: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const consulta = window.matchMedia(CONSULTA_MOVIMIENTO);
  consulta.addEventListener("change", alCambiar);
  return () => consulta.removeEventListener("change", alCambiar);
}

function leerMovimiento() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(CONSULTA_MOVIMIENTO).matches;
}

function leerMovimientoEnServidor() {
  return false;
}

function Aparicion({ aparicion }: { aparicion: AparicionConferencia }) {
  return (
    <>
      <time
        dateTime={aparicion.fecha}
        className="font-body text-body-sm text-foreground-muted"
      >
        {aparicion.fechaLegible}
      </time>
      <p className="mt-1 font-display text-[17px] uppercase leading-tight text-foreground">
        {aparicion.lugar}
      </p>
      {aparicion.ciudad && (
        <p className="mt-0.5 font-body text-body-sm text-foreground-muted">
          {aparicion.ciudad}
        </p>
      )}
    </>
  );
}

/**
 * Carrusel de las apariciones de una conferencia, en el sidebar de su detalle.
 *
 * Con una sola aparición no hay nada que rotar: se dibuja fija, sin controles, sin
 * temporizador y sin envoltorio de carrusel — un control "siguiente" que vuelve al
 * mismo sitio es ruido, y anunciarlo como carrusel a un lector de pantalla, una
 * mentira. La rama de arriba sale antes de montar nada de eso.
 *
 * La transición es un fundido y no un desplazamiento: las apariciones no miden lo mismo
 * —unas traen ciudad y otras no, y un lugar largo envuelve en dos o tres líneas—, así
 * que un desplazamiento horizontal obligaría a fijar un alto y dejaría recortes o huecos
 * según cuál esté al frente. Las tres van apiladas en la misma celda de una grilla de
 * 1×1: el contenedor toma el alto de la más alta y no salta al cambiar.
 *
 * Pausas del avance automático, por orden de dureza:
 * - `prefers-reduced-motion: reduce` lo desactiva por completo; nunca se arma.
 * - Pasar el puntero por encima o mover el foco adentro lo suspende mientras dure.
 * - Tocar una flecha o un punto lo detiene para siempre: si alguien tomó el control,
 *   quitárselo dos segundos después es de mala educación.
 */
export function AppearanceCarousel({ apariciones }: AppearanceCarouselProps) {
  const total = apariciones.length;
  const [indice, setIndice] = useState(0);
  const [tomadoPorElUsuario, setTomadoPorElUsuario] = useState(false);
  const [suspendido, setSuspendido] = useState(false);

  const reduceMovimiento = useSyncExternalStore(
    suscribirMovimiento,
    leerMovimiento,
    leerMovimientoEnServidor,
  );

  const avanzaSolo = total > 1 && !reduceMovimiento && !tomadoPorElUsuario && !suspendido;

  const irA = useCallback((siguiente: number) => {
    setTomadoPorElUsuario(true);
    setIndice(siguiente);
  }, []);

  useEffect(() => {
    if (!avanzaSolo) return;
    const temporizador = window.setInterval(() => {
      setIndice((actual) => (actual + 1) % total);
    }, INTERVALO_MS);
    return () => window.clearInterval(temporizador);
  }, [avanzaSolo, total]);

  const primera = apariciones[0];
  if (total === 0 || !primera) return null;

  if (total === 1) {
    return (
      <div className="py-1">
        <Aparicion aparicion={primera} />
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-roledescription="carrusel"
      aria-label="Apariciones de esta conferencia"
      onMouseEnter={() => setSuspendido(true)}
      onMouseLeave={() => setSuspendido(false)}
      onFocus={() => setSuspendido(true)}
      onBlur={() => setSuspendido(false)}
    >
      {/*
        aria-live en "off" mientras rota solo y en "polite" cuando ya no: un cambio que
        nadie pidió no debería interrumpir la lectura cada seis segundos, pero uno que
        sale de pulsar una flecha sí tiene que anunciarse, o el control parece no hacer
        nada. Las que no están al frente salen del árbol de accesibilidad con aria-hidden
        e inert, para que no se lean las tres seguidas.
      */}
      <div className="grid" aria-live={avanzaSolo ? "off" : "polite"}>
        {apariciones.map((aparicion, posicion) => {
          const activa = posicion === indice;
          return (
            <div
              key={aparicion.key}
              className={cn(
                "dp-aparicion-slide col-start-1 row-start-1 py-1 transition-opacity duration-500",
                activa ? "visible opacity-100" : "invisible opacity-0",
              )}
              aria-hidden={!activa}
              inert={!activa}
            >
              <Aparicion aparicion={aparicion} />
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line/60 pt-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Aparición anterior"
            onClick={() => irA((indice - 1 + total) % total)}
            className="flex h-8 w-8 items-center justify-center border border-line text-foreground-muted transition-colors duration-200 hover:border-amber hover:text-amber"
          >
            <Icon name="arrow_back" size={18} />
          </button>
          <button
            type="button"
            aria-label="Aparición siguiente"
            onClick={() => irA((indice + 1) % total)}
            className="flex h-8 w-8 items-center justify-center border border-line text-foreground-muted transition-colors duration-200 hover:border-amber hover:text-amber"
          >
            <Icon name="arrow_forward" size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {apariciones.map((aparicion, posicion) => (
            <button
              key={aparicion.key}
              type="button"
              aria-label={`Ver la aparición ${posicion + 1} de ${total}`}
              aria-current={posicion === indice}
              onClick={() => irA(posicion)}
              className={cn(
                "h-2 w-2 rounded-full transition-colors duration-200",
                posicion === indice
                  ? "bg-amber"
                  : "bg-outline-variant hover:bg-foreground-muted",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
