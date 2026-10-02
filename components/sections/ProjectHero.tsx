import Image from "next/image";
import type { PortableTextBlock } from "@portabletext/react";
import type { IconType } from "react-icons";
import { SiInstagram, SiTiktok } from "react-icons/si";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { RichText } from "@/components/ui/RichText";
import { MOTIVO_CONSULTA_GENERAL, PARAM_MOTIVO } from "@/lib/contacto";
import { estiloTituloAjustable } from "@/lib/tituloAjustable";
import type { ProyectoDetalle, RedConIcono } from "@/types/content";

/**
 * Ancho que se le pide al CDN para el logo de la presentación. Va a 340px como máximo
 * (el `max-w` de abajo), ×2 por las pantallas 2x = 680, y el escalón de next/image que
 * lo cubre es 750. Sin alto: el logo nunca se recorta.
 *
 * Su ancho en pantalla lo fija el CSS (`w-full` hasta 340px), no el archivo, así que un
 * original más chico que esto se ve del mismo tamaño, solo que menos nítido.
 */
export const RECORTE_LOGO_PRESENTACION = { ancho: 750 };

const ICONOS_RED: Record<RedConIcono, IconType> = {
  instagram: SiInstagram,
  tiktok: SiTiktok,
};

interface ProjectHeroProps {
  proyecto: ProyectoDetalle;
  descripcion: PortableTextBlock[] | null;
  /** "Proyectos" en /proyectos (como el prototipo), "Proyecto" en el detalle. */
  eyebrow: string;
  /** Botón secundario: al inicio, o al listado cuando hay más de un proyecto. */
  volver: { href: string; label: string };
}

/**
 * Presentación completa de un proyecto. Es la página `proyectos_dp_agencia_deportiva`
 * del prototipo —que solo existía para DP Team, con el texto escrito a mano— pasada a
 * datos de Sanity. La usan /proyectos/[slug] y también /proyectos cuando hay un solo
 * proyecto publicado (criterio de talento único, decisión #8).
 *
 * Diferencias con el prototipo, a propósito:
 * - Sin la nota de cierre "Estamos preparando la presentación completa de DP Team…":
 *   era un aviso del prototipo, no contenido del proyecto.
 * - La etiqueta "Proyecto independiente — no es una división…" es `notaRelacionAgencia`
 *   (decisión #34): se dibuja solo si el editor la escribió.
 * - La frase sale del campo `frase` (agregado al schema el 2026-10-02) y va entre comillas
 *   tipográficas, como la de la ficha de talento.
 * - Los íconos de red son los de react-icons que ya usa la ficha de talento, no el SVG de
 *   contorno del prototipo.
 */
export function ProjectHero({
  proyecto,
  descripcion,
  eyebrow,
  volver,
}: ProjectHeroProps) {
  const { nombre, notaRelacionAgencia, frase, logo, enlaces } = proyecto;

  return (
    <Container className="py-30">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
        {/* @container: la columna es la medida contra la que se ajusta el nombre. */}
        <div className="@container lg:col-span-7">
          <p className="mb-5 font-body text-label-caps uppercase tracking-widest text-amber">
            {eyebrow}
          </p>
          {/* El nombre viene de Sanity: a 120px fijos, una palabra de más de ~9 letras se
              partía a la mitad en la columna de 1024. La versión ajustable se achica lo
              justo para que la palabra más larga entre entera, y con un nombre corto se ve
              igual que text-display-hero (ver globals.css). break-words queda como red de
              seguridad por si algo se escapara de la medida: evita el desborde. */}
          <h1
            className="mb-8 break-words font-display text-display-hero-ajustable uppercase"
            style={estiloTituloAjustable(nombre)}
          >
            {nombre}
          </h1>

          {notaRelacionAgencia ? (
            <p className="mb-6 inline-block border-l-2 border-amber bg-surface-high px-4 py-2 font-body text-label-caps uppercase tracking-widest text-foreground">
              {notaRelacionAgencia}
            </p>
          ) : null}

          {/* El prototipo abre con un párrafo a 20px y sigue a 16px: el primero hace de
              entrada. Aquí el texto es Portable Text de un solo campo, así que la
              jerarquía la pone el selector y no el editor. */}
          <RichText
            value={descripcion}
            className="text-body-md [&>p:first-child]:text-[20px] [&>p:first-child]:leading-[30px]"
          />

          {frase ? (
            <blockquote className="mt-6 font-display text-[22px] uppercase leading-normal text-amber">
              “{frase}”
            </blockquote>
          ) : null}

          {enlaces.length > 0 ? (
            <ul className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              {enlaces.map((enlace) => {
                const IconoMarca = enlace.red ? ICONOS_RED[enlace.red] : undefined;
                return (
                  <li key={enlace.key}>
                    {IconoMarca ? (
                      <a
                        href={enlace.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${enlace.etiqueta} de ${nombre}`}
                        className="inline-flex items-center text-foreground-muted transition-colors duration-300 hover:text-amber"
                      >
                        <IconoMarca aria-hidden="true" className="text-[20px]" />
                      </a>
                    ) : (
                      <a
                        href={enlace.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-2 font-body text-label-caps uppercase tracking-widest text-foreground-muted transition-colors duration-300 hover:text-amber"
                      >
                        {enlace.etiqueta}
                        <Icon
                          name="open_in_new"
                          size={18}
                          className="transition-transform duration-300 group-hover:translate-x-0.5"
                        />
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Button
              href={`/contacto?${PARAM_MOTIVO}=${MOTIVO_CONSULTA_GENERAL}`}
              icon="arrow_forward"
            >
              Quiero saber más
            </Button>
            <Button href={volver.href} variant="ghost">
              {volver.label}
            </Button>
          </div>
        </div>

        {logo ? (
          <div className="mt-16 flex items-center justify-center lg:col-span-5 lg:mt-0">
            {/* Escala + brillo ámbar al hover: el .dp-emblem del prototipo, con las mismas
                clases con que Inicio lo adaptó (decisión #79). El ancho lo pone el CSS, así
                que `sizes` es ese mismo ancho: el del contenido por debajo de 380px, 340px
                desde ahí. */}
            <Image
              src={logo.src}
              alt={logo.alt}
              width={logo.ancho}
              height={logo.alto}
              priority
              sizes="(min-width: 380px) 340px, calc(100vw - 40px)"
              className="h-auto w-full max-w-[340px] transition-[transform,filter] duration-[400ms] hover:scale-[1.06] hover:drop-shadow-[0_0_26px_rgba(255,191,0,0.38)]"
            />
          </div>
        ) : null}
      </div>
    </Container>
  );
}
