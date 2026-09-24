import Image from "next/image";
import type { CSSProperties } from "react";
import type { Sponsor } from "@/types/content";

interface SponsorMarqueeHomeProps {
  sponsors: Sponsor[];
  durationSeconds?: number;
}

/**
 * Alto del logo: h-8 en móvil, h-11 desde md. El ancho lo pone la proporción real
 * del archivo, que es justamente la diferencia con la insignia del perfil.
 */
const ALTO_LOGO_MOVIL = 32;
const ALTO_LOGO_ESCRITORIO = 44;

/** Lo que suma cada ítem además del logo: px-10 (40px por lado) y md:px-16 (64px). */
const PADDING_ITEM_MOVIL = 80;
const PADDING_ITEM_ESCRITORIO = 128;

/**
 * Anchos visibles que la pista tiene que cubrir. La franja del Home es full-bleed,
 * así que el ancho visible es el viewport entero: 1440 es el layout más ancho que se
 * verifica, y 768 —donde entra el md:— es el viewport más ancho que todavía usa las
 * medidas de móvil. Hay que satisfacer los dos, porque la cantidad de copias se
 * decide una sola vez al renderizar y no puede cambiar por breakpoint.
 */
const ANCHO_VISIBLE_MAXIMO = 1440;
const ANCHO_VISIBLE_MAXIMO_MOVIL = 768;

/**
 * Ancho que ocupa el logo a una altura dada, respetando su proporción real.
 *
 * Sin dimensiones no hay proporción que respetar (y sin logo se pinta el nombre,
 * cuyo ancho depende de la fuente): se cuenta 0 a propósito. El ancho de una copia
 * queda subestimado, la cuenta de copias se redondea hacia arriba y la pista sobra
 * en vez de faltar — con un hueco no habría bucle, y de más sólo hay DOM extra.
 */
function anchoDelLogo(sponsor: Sponsor, altoLogo: number): number {
  const logo = sponsor.logo;
  if (!logo?.ancho || !logo.alto) return 0;
  return Math.round((altoLogo * logo.ancho) / logo.alto);
}

function anchoDeUnaCopia(sponsors: Sponsor[], altoLogo: number, padding: number): number {
  return sponsors.reduce(
    (total, sponsor) => total + anchoDelLogo(sponsor, altoLogo) + padding,
    0,
  );
}

/**
 * Franja de marcas del Home — el .dp-marquee de la página de inicio del prototipo,
 * que NO es el mismo que el de la ficha de talento: acá el logo va suelto sobre el
 * fondo, sin tarjeta, sin el nombre debajo y sin enlace, a una altura fija y con su
 * ancho natural. La insignia con tarjeta vive en ./SponsorMarquee.tsx y la sigue
 * usando el perfil; son hermanos a propósito, así que un arreglo del bucle
 * (el cálculo de copias de abajo, por ejemplo) hay que llevarlo a los dos.
 *
 * Comparte con aquél el CSS del bucle: keyframe, difuminado de bordes, pausa al
 * hover y apagado/color, todo en globals.css.
 */
export function SponsorMarqueeHome({
  sponsors,
  durationSeconds = 40,
}: SponsorMarqueeHomeProps) {
  const [unico] = sponsors;
  if (unico === undefined) return null;

  // Un solo logo no puede animarse: el bucle desplaza la pista una copia entera, así
  // que sería ese logo cruzando una franja vacía. Mismo criterio que la ficha.
  if (sponsors.length === 1) {
    return (
      <div className="flex justify-center">
        <ItemLogo sponsor={unico} />
      </div>
    );
  }

  // La animación traslada la pista un 50% —una copia— y reinicia, así que esa copia
  // tiene que ser al menos tan ancha como la franja visible o se abre un hueco al
  // final del ciclo. Acá el ancho no es una constante como en la insignia del perfil:
  // cada logo mide distinto, así que se suma de verdad, a las dos escalas.
  const copiasPorMitad = Math.max(
    Math.ceil(
      ANCHO_VISIBLE_MAXIMO /
        anchoDeUnaCopia(sponsors, ALTO_LOGO_ESCRITORIO, PADDING_ITEM_ESCRITORIO),
    ),
    Math.ceil(
      ANCHO_VISIBLE_MAXIMO_MOVIL /
        anchoDeUnaCopia(sponsors, ALTO_LOGO_MOVIL, PADDING_ITEM_MOVIL),
    ),
  );
  const mitad = Array.from({ length: copiasPorMitad }, () => sponsors).flat();
  const track = [...mitad, ...mitad];

  // Sólo la duración, y como propiedad individual: el atajo `animation` fijaría
  // también animation-play-state en running y, por venir del atributo style, le
  // ganaría a la pausa al hover de globals.css.
  const trackStyle: CSSProperties = {
    animationDuration: `${durationSeconds}s`,
  };

  return (
    <div className="marquee-fade relative overflow-hidden">
      <div className="marquee-track flex w-max" style={trackStyle}>
        {track.map((sponsor, index) => (
          <ItemLogo
            key={`${sponsor.id}-${index}`}
            sponsor={sponsor}
            duplicate={index >= sponsors.length}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * El apagado/color va en el envoltorio y no en el <img>, igual que el
 * .dp-marquee__item del prototipo: así el área que responde al mouse incluye el
 * padding lateral y no se reduce al logo, que en los más angostos son 35px de ancho.
 */
function ItemLogo({
  sponsor,
  duplicate = false,
}: {
  sponsor: Sponsor;
  duplicate?: boolean;
}) {
  const a11yProps = duplicate ? { "aria-hidden": true as const } : {};

  return (
    <div
      className="sponsor-logo flex shrink-0 items-center px-10 md:px-16"
      {...a11yProps}
    >
      {sponsor.logo ? (
        <Image
          src={sponsor.logo.src}
          // Sin nombre visible ni enlace que lo anuncie, el alt es lo único que
          // identifica la marca — al revés que en la insignia del perfil, donde el
          // rótulo y el aria-label ya lo dicen y la imagen va decorativa.
          alt={duplicate ? "" : sponsor.nombre}
          // Las dimensiones reales del archivo (ver sanity/queries.ts): fijan la
          // proporción exacta, así que el navegador reserva el ancho correcto y el
          // logo no salta al cargar. Se pide a la escala mayor (44px) y el móvil lo
          // muestra más chico.
          width={anchoDelLogo(sponsor, ALTO_LOGO_ESCRITORIO) || ALTO_LOGO_ESCRITORIO}
          height={ALTO_LOGO_ESCRITORIO}
          className="h-8 w-auto object-contain md:h-11"
        />
      ) : (
        // Sin logo cargado todavía (decisión pendiente #5): el nombre en texto, que
        // es lo único que queda cuando no hay imagen.
        <span className="font-display text-[13px] uppercase leading-tight tracking-wide text-foreground-muted">
          {sponsor.nombre}
        </span>
      )}
    </div>
  );
}
