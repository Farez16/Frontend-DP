import Image from "next/image";
import type { CSSProperties } from "react";
import type { Sponsor } from "@/types/content";

interface SponsorMarqueeProps {
  sponsors: Sponsor[];
  durationSeconds?: number;
}

/**
 * Ancho real que ocupa una insignia en la pista: w-36 (144px) más el px-3 (12px) de
 * cada lado de su envoltorio. Es una constante y no una medición: la insignia sin
 * logo usa exactamente la misma caja que la insignia con logo.
 */
const ANCHO_INSIGNIA = 168;

/**
 * El layout más ancho que se verifica (1440px). Cubre los dos usos: la franja del
 * Home ocupa el viewport entero y los tiers de la ficha de talento viven dentro del
 * Container, que a ese viewport deja 1265px de contenido.
 */
const ANCHO_VISIBLE_MAXIMO = 1440;

/**
 * Centraliza el comportamiento visual del marquee (.dp-marquee del
 * prototipo) — recibe sponsors por props, nunca los hardcodea. Repite
 * la lista internamente para el bucle continuo: el prototipo obligaba
 * a pegar cada sponsor dos veces a mano en el HTML.
 * Solo CSS (keyframe + pausa al hover en globals.css) — sin JS de cliente.
 */
export function SponsorMarquee({ sponsors, durationSeconds = 40 }: SponsorMarqueeProps) {
  // Desestructurar en vez de indexar: con `noUncheckedIndexedAccess` activo,
  // `sponsors[0]` es `Sponsor | undefined`, y este guard cubre de paso la lista vacía
  // (que hoy no llega — los dos llamadores filtran antes — pero haría explotar el
  // cálculo de copias de más abajo con una división por cero).
  const [unico] = sponsors;
  if (unico === undefined) return null;

  // Decisión #57: un solo patrocinador se muestra centrado y estático. No es una
  // preferencia estética: la animación desplaza la pista una copia entera hacia la
  // izquierda, así que con una sola insignia el "movimiento" sería esa insignia
  // cruzando una franja por lo demás vacía. Mismo tamaño de insignia que en el
  // marquee, como en el prototipo (tier "Suplementación" de la ficha).
  if (sponsors.length === 1) {
    return (
      <div className="flex justify-center">
        <SponsorBadge sponsor={unico} />
      </div>
    );
  }

  // El keyframe traslada la pista un 50% —una copia completa— y vuelve a empezar, así
  // que para que no se abra un hueco al final del ciclo esa copia tiene que ser al
  // menos tan ancha como la franja visible. Con pocas marcas no alcanza: los 3
  // "aliados" del dato real ocupan 504px contra los 1265px del contenedor. Por eso la
  // lista se repite las veces necesarias ANTES de duplicarla para el bucle. El
  // prototipo pegaba siempre dos copias exactas y por eso sus tiers cortos mostraban
  // ese hueco.
  const copiasPorMitad = Math.ceil(
    ANCHO_VISIBLE_MAXIMO / (ANCHO_INSIGNIA * sponsors.length),
  );
  const mitad = Array.from({ length: copiasPorMitad }, () => sponsors).flat();
  const track = [...mitad, ...mitad];

  const trackStyle: CSSProperties = {
    animation: `dp-marquee ${durationSeconds}s linear infinite`,
  };

  return (
    <div className="marquee-fade relative overflow-hidden">
      <div className="marquee-track flex w-max" style={trackStyle}>
        {track.map((sponsor, index) => (
          <div key={`${sponsor.id}-${index}`} className="shrink-0 px-3">
            {/* Solo la primera copia queda expuesta: las demás son repeticiones del
                bucle y anunciarían cada marca varias veces en el lector de pantalla,
                además de alargar el recorrido con Tab. */}
            <SponsorBadge sponsor={sponsor} duplicate={index >= sponsors.length} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SponsorBadge({
  sponsor,
  duplicate = false,
}: {
  sponsor: Sponsor;
  duplicate?: boolean;
}) {
  const inner = (
    <>
      <div className="flex h-10 w-full items-center justify-center">
        {sponsor.logo ? (
          <Image
            src={sponsor.logo.src}
            alt=""
            aria-hidden="true"
            width={120}
            height={40}
            className="h-full w-full object-contain"
          />
        ) : (
          // Sin logo definitivo todavía (auditoría, decisión pendiente #5):
          // insignia de texto en vez de romper el layout o inventar un logo.
          <span className="text-center font-display text-[13px] uppercase leading-tight tracking-wide text-foreground-muted">
            {sponsor.nombre}
          </span>
        )}
      </div>
      {sponsor.logo ? (
        <span className="text-center font-body text-[9px] uppercase leading-tight tracking-wide text-foreground-muted">
          {sponsor.nombre}
        </span>
      ) : null}
    </>
  );

  // El apagado/color y las transiciones viven en .sponsor-badge (globals.css), no en
  // utilidades: las comparten el Home y la ficha de talento, y esa regla tiene que
  // declarar juntas todas las propiedades animadas (ver el comentario ahí). Acá
  // quedan solo la caja y los valores de hover. `shrink-0` para que la insignia no
  // se comprima cuando es hija directa de un flex sin envoltorio propio — el caso
  // del patrocinador único, que no pasa por el `shrink-0` de la pista.
  const badgeClasses =
    "sponsor-badge flex h-24 w-36 shrink-0 flex-col items-center justify-center gap-2 border border-line bg-surface px-3 py-2 hover:scale-[1.02] hover:border-amber";

  const a11yProps = duplicate ? { "aria-hidden": true as const, tabIndex: -1 } : {};

  if (sponsor.url) {
    return (
      <a
        href={sponsor.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={sponsor.nombre}
        className={badgeClasses}
        {...a11yProps}
      >
        {inner}
      </a>
    );
  }

  return (
    <div className={badgeClasses} {...a11yProps}>
      {inner}
    </div>
  );
}
