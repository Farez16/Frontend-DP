import Image from "next/image";
import type { CSSProperties } from "react";
import type { Sponsor } from "@/types/content";

interface SponsorMarqueeProps {
  sponsors: Sponsor[];
  durationSeconds?: number;
}

/**
 * Centraliza el comportamiento visual del marquee (.dp-marquee del
 * prototipo) — recibe sponsors por props, nunca los hardcodea. Duplica
 * la lista una sola vez internamente para el bucle continuo: el
 * prototipo obligaba a pegar cada sponsor dos veces a mano en el HTML.
 * Solo CSS (keyframe + pausa al hover en globals.css) — sin JS de cliente.
 */
export function SponsorMarquee({ sponsors, durationSeconds = 40 }: SponsorMarqueeProps) {
  const track = [...sponsors, ...sponsors];
  const trackStyle: CSSProperties = {
    animation: `dp-marquee ${durationSeconds}s linear infinite`,
  };

  return (
    <div className="marquee-fade relative overflow-hidden">
      <div className="marquee-track flex w-max" style={trackStyle}>
        {track.map((sponsor, index) => (
          <SponsorBadge
            key={`${sponsor.id}-${index}`}
            sponsor={sponsor}
            duplicate={index >= sponsors.length}
          />
        ))}
      </div>
    </div>
  );
}

function SponsorBadge({ sponsor, duplicate }: { sponsor: Sponsor; duplicate: boolean }) {
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

  const badgeClasses =
    "flex h-24 w-36 flex-col items-center justify-center gap-2 border border-line bg-surface px-3 py-2 transition-[transform,border-color] duration-300 hover:scale-[1.02] hover:border-amber";

  const a11yProps = duplicate ? { "aria-hidden": true as const, tabIndex: -1 } : {};

  if (sponsor.url) {
    return (
      <div className="shrink-0 px-3">
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
      </div>
    );
  }

  return (
    <div className="shrink-0 px-3">
      <div className={badgeClasses} {...a11yProps}>
        {inner}
      </div>
    </div>
  );
}
