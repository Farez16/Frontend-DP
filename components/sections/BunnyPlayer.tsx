"use client";

import { useContext, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { LightboxActivoContext } from "@/components/sections/Lightbox";
import { cn } from "@/lib/utils";

/**
 * El host del player nuevo. `iframe.mediadelivery.net` está deprecado: la documentación
 * dice que los embeds viejos siguen andando pero que lo nuevo va acá.
 */
const HOST_EMBED = "https://player.mediadelivery.net/embed";

/**
 * Proporción a la que se cae cuando Bunny todavía no dijo cuánto mide el video. 16:9 no es
 * una adivinanza informada, es el encuadre que menos molesta: deja una caja del tamaño
 * habitual mientras llega el dato real.
 */
const PROPORCION_POR_DEFECTO = { ancho: 16, alto: 9 };

interface BunnyPlayerProps {
  videoId: string;
  /** Nombre accesible del reproductor. */
  titulo: string | null;
  /** Proporción real del video; null mientras Bunny no terminó de codificar. */
  proporcion: { ancho: number; alto: number } | null;
  /**
   * La portada, ya renderizada en el servidor. Se ve hasta que alguien pulsa reproducir, y
   * es lo que evita que el iframe exista antes de que lo pidan.
   */
  children?: ReactNode;
  /**
   * `_key` del elemento dentro de un `Lightbox`. Solo hace falta ahí: sirve para saber si
   * este video sigue siendo el que el visitante está mirando. Fuera de un lightbox se omite.
   */
  claveLightbox?: string;
  className?: string;
}

/**
 * Reproductor de un video de Bunny Stream.
 *
 * ## Por qué el iframe se monta al hacer clic y no antes
 *
 * Dos motivos, y el segundo es un error de verdad y no una optimización.
 *
 * El primero es el `Lightbox`, que monta el elemento visible **y sus dos vecinos** para que
 * la foto siguiente ya esté descargada al pulsar la flecha. Con fotos es lo correcto; con
 * video significaría hasta tres players de Bunny cargando a la vez por abrir la galería.
 *
 * El segundo: el `Lightbox` oculta a los vecinos con `hidden`, que es `display:none`, y eso
 * **no pausa nada**. Un video andando al que le pasan la flecha por encima se queda sonando
 * detrás del que se está mirando.
 *
 * Montar al clic resuelve lo primero —nunca existe un iframe que nadie pidió— y el contexto
 * del lightbox resuelve lo segundo: cuando este deja de ser el elemento activo, el iframe se
 * desmonta y el audio se corta con él. Fuera de un lightbox no hay contexto y el reproductor
 * se queda como está.
 *
 * ## Foco
 *
 * Un iframe de otro origen es una caja negra: el player de Bunny es Media Chrome y sus
 * controles viven en un shadow DOM, así que ni siquiera desde el mismo origen los alcanza un
 * `querySelectorAll`. La trampa de foco del `Lightbox` no puede tratarlos como paradas
 * propias, y no falta que lo haga: le alcanza con contar al iframe como una sola parada. Ver
 * el comentario de `FOCUSABLE_SELECTOR` en `Lightbox.tsx`.
 */
export function BunnyPlayer({
  videoId,
  titulo,
  proporcion,
  children,
  claveLightbox,
  className,
}: BunnyPlayerProps) {
  const [montado, setMontado] = useState(false);
  const activo = useContext(LightboxActivoContext);

  /**
   * Deja de ser el elemento activo del lightbox -> fuera el iframe, y con él el audio.
   * `activo` es null fuera de un lightbox, y entonces esto no interviene nunca.
   *
   * El reseteo va en el cuerpo del render y no en un `useEffect` a propósito: es el patrón
   * que React documenta para ajustar estado cuando cambia una prop. Con un efecto, el
   * iframe alcanzaría a renderizarse una vez ya oculto antes de que el efecto lo quitara —
   * un render en cascada que además dejaría sonando el audio ese instante. Acá React
   * descarta el render a medias y vuelve a empezar con el valor nuevo, sin pintar nada.
   */
  const visible =
    activo === null || claveLightbox === undefined || activo === claveLightbox;
  if (!visible && montado) setMontado(false);

  const libraryId = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID;
  const { ancho, alto } = proporcion ?? PROPORCION_POR_DEFECTO;

  /**
   * El marco ocupa todo el ancho disponible hasta que su alto llegaría al tope, y a partir
   * de ahí encoge conservando la proporción. El `max-width` en `calc()` es lo que traduce un
   * tope de alto a uno de ancho: un video de proporción r que no puede pasar de N de alto no
   * puede pasar de N*r de ancho.
   *
   * Sin esto, un video vertical a lo ancho de la columna principal de la conferencia (~876px
   * a 1440) mediría más de 1500px de alto y empujaría toda la página hacia abajo.
   *
   * El tope va por variable CSS y no por prop porque en el lightbox cambia con el viewport
   * —70vh en móvil, 85vh desde md, los mismos valores que usan las fotos— y un estilo en
   * línea no puede llevar media queries. Quien llama lo fija con clases utilitarias; acá
   * queda el valor por defecto.
   */
  const estiloMarco = {
    aspectRatio: `${ancho} / ${alto}`,
    maxWidth: `calc(var(--dp-video-tope-alto, 70vh) * ${(ancho / alto).toFixed(4)})`,
  };

  const etiqueta = titulo?.trim() || "Video";

  // Sin Library ID no hay URL posible. Se cae a la portada sola, sin botón: ofrecer un play
  // que no puede reproducir sería mentirle al visitante.
  if (!libraryId) {
    return (
      <div
        className={cn("relative mx-auto w-full overflow-hidden", className)}
        style={estiloMarco}
      >
        {children}
      </div>
    );
  }

  if (!montado) {
    return (
      <div
        className={cn("relative mx-auto w-full overflow-hidden", className)}
        style={estiloMarco}
      >
        {children}
        <button
          type="button"
          onClick={() => setMontado(true)}
          aria-label={`Reproducir: ${etiqueta}`}
          className="group/play absolute inset-0 flex cursor-pointer items-center justify-center bg-ink/20 transition-colors hover:bg-ink/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
        >
          <Icon
            name="play_circle"
            filled
            size={56}
            className="text-foreground transition-[transform,color] duration-300 group-hover/play:scale-110 group-hover/play:text-amber"
          />
        </button>
      </div>
    );
  }

  /**
   * `autoplay=true` porque llegar acá exige un clic: el gesto ya ocurrió, así que arrancar
   * solo es lo que el visitante pidió, no un autoplay sorpresa.
   *
   * Los atributos de `allow` son los que pide la documentación de Bunny; sin ellos el player
   * queda sin pantalla completa ni picture-in-picture. `loading="lazy"` casi no aplica —el
   * iframe recién existe cuando se pulsa— pero no cuesta nada y cubre el caso de que alguien
   * monte esto dentro de algo que ya está fuera de pantalla.
   */
  return (
    <div
      className={cn("relative mx-auto w-full overflow-hidden", className)}
      style={estiloMarco}
    >
      <iframe
        src={`${HOST_EMBED}/${libraryId}/${videoId}?autoplay=true&preload=true`}
        title={etiqueta}
        loading="lazy"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );
}
