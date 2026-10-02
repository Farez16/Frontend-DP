import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { ProjectCard } from "@/components/sections/ProjectCard";
import { ProjectHero } from "@/components/sections/ProjectHero";
import { sanityFetch } from "@/sanity/client";
import { imagenesOpenGraph } from "@/sanity/image";
import { PROYECTOS_LISTADO_QUERY } from "@/sanity/queries";
import {
  DESCRIPCION_SIN_PROYECTOS,
  describirProyecto,
  describirProyectos,
  imagenOGDelProyecto,
  mapProyecto,
  mapProyectoDetalle,
  type RawProyecto,
} from "@/lib/proyectos";
import { conSufijo, OPEN_GRAPH_BASE } from "@/lib/seo";
import { cn } from "@/lib/utils";

const TITULO = "Proyectos";

/**
 * Con un solo proyecto la página es su presentación, así que se describe con su texto y
 * comparte su imagen. Con varios, la imagen es la del primero del listado (el criterio de
 * /conferencias) y la descripción nombra a todos. Sin proyectos se comparte sin imagen.
 *
 * El título queda "Proyectos" en los tres casos: es la página del menú, y el <title> del
 * prototipo también lo era.
 *
 * Se repite la query de la página a propósito: Next deduplica el fetch entre
 * generateMetadata y el render.
 */
export async function generateMetadata(): Promise<Metadata> {
  const proyectos = await sanityFetch<RawProyecto[]>(PROYECTOS_LISTADO_QUERY);
  const primero = proyectos[0];
  const description =
    proyectos.length === 1 && primero
      ? describirProyecto(primero)
      : describirProyectos(proyectos.map((proyecto) => proyecto.nombre));
  const og = primero ? imagenOGDelProyecto(primero) : undefined;

  return {
    title: TITULO,
    description,
    openGraph: {
      ...OPEN_GRAPH_BASE,
      // og:title no pasa por la plantilla del layout: el sufijo va a mano.
      title: conSufijo(TITULO),
      description,
      images: og ? imagenesOpenGraph(og.imagen, og.alt, og.ajuste) : undefined,
    },
  };
}

/**
 * Las dos configuraciones de la grilla y su `sizes`, juntas por lo mismo que en
 * /conferencias: el ancho de la tarjeta lo decide esta rama y nada más. No hay una de
 * una sola tarjeta porque con un proyecto la página no es una grilla.
 *
 * Mismas cuentas que allá (Container de 1440px con px-5 / md:px-20, gap-6), menos los
 * 80px del `p-10` con que la tarjeta rodea al logo: ese es el ancho máximo que el logo
 * puede ocupar, y lo alcanza uno apaisado. Con el ancho entero de la tarjeta, a 768 y
 * DPR 2 se pedían 828px para un logo dibujado a 138 (medido el 2026-10-02).
 * - 2 columnas: a 1440 la caja mide (1280 - 24) / 2 = 628px → 548px de logo.
 * - 3 columnas: a 1440 la caja mide (1280 - 48) / 3 = 411px → 331px de logo.
 */
const GRILLAS = {
  dos: {
    clases: "md:grid-cols-2",
    sizes:
      "(min-width: 1440px) 548px, (min-width: 768px) calc(50vw - 80px), calc(100vw - 120px)",
  },
  tres: {
    clases: "md:grid-cols-2 lg:grid-cols-3",
    sizes:
      "(min-width: 1440px) 331px, (min-width: 1024px) calc(33vw - 80px), (min-width: 768px) calc(50vw - 80px), calc(100vw - 120px)",
  },
} as const;

export default async function ProyectosPage() {
  const proyectosRaw = await sanityFetch<RawProyecto[]>(PROYECTOS_LISTADO_QUERY);

  // Un solo proyecto se presenta entero, como en el prototipo, y no como una tarjeta
  // sola en una grilla (criterio de talento único, decisión #8). La condición es la
  // cantidad real: con el segundo proyecto publicado vuelve la grilla sola.
  const unico = proyectosRaw.length === 1 ? proyectosRaw[0] : undefined;
  if (unico) {
    return (
      <ProjectHero
        proyecto={mapProyectoDetalle(unico)}
        descripcion={unico.descripcion}
        eyebrow="Proyectos"
        volver={{ href: "/", label: "Volver al inicio" }}
      />
    );
  }

  const proyectos = proyectosRaw.map(mapProyecto);
  const grilla = proyectos.length === 2 ? GRILLAS.dos : GRILLAS.tres;

  return (
    <Container className="py-30">
      <h1 className="text-heading-lg mb-16 font-display uppercase">Proyectos</h1>
      {proyectos.length === 0 ? (
        <ComingSoon message={DESCRIPCION_SIN_PROYECTOS} />
      ) : (
        <div className={cn("grid grid-cols-1 gap-6", grilla.clases)}>
          {proyectos.map((proyecto, index) => (
            <ProjectCard
              key={proyecto.slug}
              proyecto={proyecto}
              sizes={grilla.sizes}
              priority={index === 0}
            />
          ))}
        </div>
      )}
    </Container>
  );
}
