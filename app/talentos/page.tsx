import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { AthleteCard, RECORTE_TARJETA_TALENTO } from "@/components/sections/AthleteCard";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { client } from "@/sanity/client";
import { urlDeImagen, type ImagenSanity } from "@/sanity/image";
import { CONFIGURACION_SITIO_QUERY, TALENTOS_LISTADO_QUERY } from "@/sanity/queries";
import { cn } from "@/lib/utils";
import {
  conSufijo,
  describirRoster,
  leerOverrideSeo,
  type RawConfiguracionSitio,
} from "@/lib/seo";
import type { Talento } from "@/types/content";

interface RawTalentoListado {
  nombre: string;
  slug: string;
  disciplina: string;
  foto: ImagenSanity;
}

const TITULO_POR_DEFECTO = "Talentos";

/**
 * SEO del listado (decisión #62). Sin override, el texto sale del roster real en el
 * momento de generar la página: nombres y cantidad no están escritos a mano en ningún
 * lado, así que agregar o quitar un talento en Sanity actualiza la descripción.
 *
 * Aquí el `title` sí es una cadena suelta: este es un segmento hijo del layout raíz,
 * así que la plantilla le agrega "| DP Agencia Deportiva" sola.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [configuracion, talentosRaw] = await Promise.all([
    client.fetch<RawConfiguracionSitio | null>(CONFIGURACION_SITIO_QUERY),
    client.fetch<RawTalentoListado[]>(TALENTOS_LISTADO_QUERY),
  ]);

  const override = leerOverrideSeo(configuracion);
  const primero = talentosRaw[0];

  const titulo = override.titulo ?? TITULO_POR_DEFECTO;
  const description = override.descripcion ?? describirRoster(talentosRaw);
  const imagenOG = override.imagenOG ?? primero?.foto.url;

  return {
    title: titulo,
    description,
    openGraph: {
      title: conSufijo(titulo),
      description,
      images: imagenOG
        ? [{ url: imagenOG, alt: primero?.foto.alt ?? titulo }]
        : undefined,
    },
  };
}

function mapTalento(raw: RawTalentoListado): Talento {
  return {
    slug: raw.slug,
    nombre: raw.nombre,
    disciplina: raw.disciplina,
    foto: {
      src: urlDeImagen(
        raw.foto,
        RECORTE_TARJETA_TALENTO.ancho,
        RECORTE_TARJETA_TALENTO.alto,
      ),
      alt: raw.foto.alt,
    },
  };
}

export default async function TalentosPage() {
  const talentosRaw = await client.fetch<RawTalentoListado[]>(TALENTOS_LISTADO_QUERY);
  const talentos = talentosRaw.map(mapTalento);

  return (
    <Container className="py-30">
      <header className="mb-16">
        <h1 className="text-display-hero font-display uppercase tracking-tighter">
          NUESTROS
          <br />
          <span className="text-amber">TALENTOS</span>
        </h1>
      </header>
      {talentos.length === 0 ? (
        <ComingSoon message="Estamos preparando el roster completo de nuestros talentos." />
      ) : (
        // Decisión #8 (docs/ARQUITECTURA.md): con 1 solo talento real, no forzar la grilla de
        // 3 columnas (queda una tarjeta sola junto a espacio vacío) — se cae sola en cuanto
        // haya 2+ talentos reales, sin bandera manual que recordar quitar.
        <div
          className={cn(
            "grid grid-cols-1 gap-6",
            talentos.length === 1 ? "max-w-sm" : "md:grid-cols-2 lg:grid-cols-3",
          )}
        >
          {talentos.map((talento, index) => (
            <AthleteCard
              key={talento.slug}
              talento={talento}
              href={`/talentos/${talento.slug}`}
              priority={index === 0}
            />
          ))}
        </div>
      )}
    </Container>
  );
}
