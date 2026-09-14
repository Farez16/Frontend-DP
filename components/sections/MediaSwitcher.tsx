"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface MediaSwitchItem {
  key: string;
  type: "video" | "image";
  src: string;
  /** Solo video */
  poster?: string;
  alt: string;
  thumbSrc: string;
}

interface MediaSwitcherProps {
  items: MediaSwitchItem[];
  className?: string;
}

/**
 * Vitrina de medios (data-mediaswitch del prototipo) — un video o foto
 * grande con miniaturas que lo reemplazan. Client Component: necesita
 * estado para saber cuál está activo y pausar el video al salir de él.
 * Único uso hoy: Conferencias (Fase 4); construido ahora como global
 * reutilizable, según pidió la fase de componentes.
 */
export function MediaSwitcher({ items, className }: MediaSwitcherProps) {
  const [activeKey, setActiveKey] = useState(items[0]?.key);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  function select(key: string) {
    setActiveKey(key);
    for (const item of items) {
      const videoEl = videoRefs.current[item.key];
      if (!videoEl) continue;
      if (item.key === key) {
        // Disparado por un clic real: el navegador permite reproducir con sonido.
        videoEl.play().catch(() => {});
      } else {
        videoEl.pause();
      }
    }
  }

  return (
    <div className={className}>
      <div className="relative mx-auto aspect-[9/16] w-full max-w-[380px] overflow-hidden border border-line bg-surface">
        {items.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <div
              key={item.key}
              className={cn(
                "absolute inset-0 transition-opacity duration-[400ms]",
                isActive ? "visible opacity-100" : "invisible opacity-0",
              )}
            >
              {item.type === "video" ? (
                <video
                  ref={(el) => {
                    videoRefs.current[item.key] = el;
                  }}
                  className="absolute inset-0 h-full w-full object-cover"
                  controls
                  playsInline
                  poster={item.poster}
                  preload="metadata"
                >
                  <source src={item.src} type="video/mp4" />
                </video>
              ) : (
                <Image src={item.src} alt={item.alt} fill className="object-cover" />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex justify-center gap-3">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-label={item.alt}
            aria-pressed={item.key === activeKey}
            onClick={() => select(item.key)}
            className={cn(
              "h-24 w-14 shrink-0 overflow-hidden border p-0 transition-opacity duration-200",
              item.key === activeKey
                ? "border-amber opacity-100"
                : "border-line opacity-50 hover:opacity-80",
            )}
          >
            <Image
              src={item.thumbSrc}
              alt=""
              width={56}
              height={96}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
