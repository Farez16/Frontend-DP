import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectHero } from "@/components/sections/ProjectHero";
import { client, sanityFetch } from "@/sanity/client";
import { imagenesOpenGraph } from "@/sanity/image";
import { PROYECTO_DETALLE_QUERY, PROYECTOS_LISTADO_QUERY } from "@/sanity/queries";
import {
  describirProyecto,
  imagenOGDelProyecto,
  mapProyectoDetalle,
  type RawProyectoDetalle,
} from "@/lib/proyectos";
import { conSufijo, OPEN_GRAPH_BASE } from "@/lib/seo";

// useCdn:false a propósito, igual que en los demás detalles: en build hay que ver
// proyectos recién publicados que todavía no llegaron al CDN.
export async function generateStaticParams() {
  const proyectos = await client
    .withConfig({ useCdn: false })
    .fetch<{ slug: string }[]>(PROYECTOS_LISTADO_QUERY);
  return proyectos.map(({ slug }) => ({ slug }));
}

/**
 * SEO del detalle, mismo patrón que /conferencias/[slug]: metaTitulo y metaDescripcion
 * mandan si el editor los escribió; si no, el nombre y la descripción aplanada. La imagen
 * es `seo.imagenOG` recortada o, sin ella, el logo entero (ver imagenOGDelProyecto).
 *
 * Con un solo proyecto, /proyectos ya muestra esta misma presentación, así que esta url
 * declara a aquella como canónica: son la misma página con dos direcciones, y la que
 * está en el menú es la que debe aparecer en buscadores.
 */
export async function generateMetadata({
  params,
}: PageProps<"/proyectos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const raw = await sanityFetch<RawProyectoDetalle | null>(PROYECTO_DETALLE_QUERY, {
    slug,
  });
  if (!raw) return {};

  // || y no ??: cadena vacía debe caer al respaldo.
  const title = raw.seo?.metaTitulo?.trim() || raw.nombre;
  const description = describirProyecto(raw);
  const og = imagenOGDelProyecto(raw);

  return {
    title,
    description,
    alternates: raw.totalProyectos === 1 ? { canonical: "/proyectos" } : undefined,
    openGraph: {
      ...OPEN_GRAPH_BASE,
      title: conSufijo(title),
      description,
      images: imagenesOpenGraph(og.imagen, og.alt, og.ajuste),
    },
  };
}

export default async function ProyectoPage({ params }: PageProps<"/proyectos/[slug]">) {
  const { slug } = await params;
  const raw = await sanityFetch<RawProyectoDetalle | null>(PROYECTO_DETALLE_QUERY, {
    slug,
  });

  // Slug inexistente → 404 limpio, sin crash.
  if (!raw) notFound();

  // Con un solo proyecto, "Ver todos" llevaría a /proyectos, que es esta misma
  // presentación: ahí el secundario vuelve al inicio, como en el prototipo.
  const volver =
    raw.totalProyectos === 1
      ? { href: "/", label: "Volver al inicio" }
      : { href: "/proyectos", label: "Ver todos los proyectos" };

  return (
    <ProjectHero
      proyecto={mapProyectoDetalle(raw)}
      descripcion={raw.descripcion}
      eyebrow="Proyecto"
      volver={volver}
    />
  );
}
