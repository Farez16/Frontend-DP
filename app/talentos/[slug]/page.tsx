import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { IconType } from "react-icons";
import { SiInstagram, SiTiktok } from "react-icons/si";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { Icon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { client } from "@/sanity/client";
import { TALENTO_PERFIL_QUERY, TALENTOS_LISTADO_QUERY } from "@/sanity/queries";

interface RawRedSocial {
  red: string;
  url: string;
  handle: string | null;
}

// `red` es texto libre en Sanity (ver studio: "Ej: Instagram, TikTok, YouTube. Usar el
// mismo nombre de forma consistente"), no un enum — normaliza antes de comparar (el dato
// real de hoy trae "Tik Tok", con espacio). Red no mapeada (YouTube, etc.) cae al ícono
// genérico de Icon en vez de no renderizar nada.
const ICONOS_RED_SOCIAL: Record<string, IconType> = {
  instagram: SiInstagram,
  tiktok: SiTiktok,
};

function iconoDeRed(nombreRed: string): IconType | undefined {
  return ICONOS_RED_SOCIAL[nombreRed.toLowerCase().replace(/\s+/g, "")];
}

interface RawTalentoPerfil {
  nombre: string;
  slug: string;
  disciplina: string;
  ubicacion: string | null;
  fechaNacimiento: string;
  foto: { url: string; alt: string };
  redesSociales: RawRedSocial[] | null;
  bioCorta: string;
  bioAmpliada: unknown;
  valores: string[] | null;
  frase: string | null;
}

async function getTalentoPerfil(slug: string) {
  return client.fetch<RawTalentoPerfil | null>(TALENTO_PERFIL_QUERY, { slug });
}

// useCdn:false a propósito, distinto del resto del sitio (ver sanity-best-practices/nextjs):
// generateStaticParams corre en build, donde un talento recién publicado y todavía no
// propagado al CDN de Sanity debe igual generar su página estática.
export async function generateStaticParams() {
  const talentos = await client
    .withConfig({ useCdn: false })
    .fetch<{ slug: string }[]>(TALENTOS_LISTADO_QUERY);
  return talentos.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/talentos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const talento = await getTalentoPerfil(slug);
  if (!talento) return {};
  return {
    title: talento.nombre,
    description: `${talento.nombre} — ${talento.disciplina}, DP Agencia Deportiva.`,
  };
}

// Manual, sin Date() sobre el string ISO (mismo motivo que formatearFechaLegible en
// app/page.tsx): new Date("YYYY-MM-DD") parsea en UTC y puede correr un día en zonas
// horarias negativas.
function calcularEdad(fechaNacimientoISO: string): number {
  const partes = fechaNacimientoISO.split("-");
  const anioNac = Number(partes[0]);
  const mesNac = Number(partes[1]);
  const diaNac = Number(partes[2]);

  const hoy = new Date();
  const anioHoy = hoy.getFullYear();
  const mesHoy = hoy.getMonth() + 1;
  const diaHoy = hoy.getDate();

  let edad = anioHoy - anioNac;
  const aunNoCumpleEsteAnio = mesHoy < mesNac || (mesHoy === mesNac && diaHoy < diaNac);
  if (aunNoCumpleEsteAnio) edad -= 1;
  return edad;
}

export default async function TalentoPage({ params }: PageProps<"/talentos/[slug]">) {
  const { slug } = await params;
  const talento = await getTalentoPerfil(slug);
  if (!talento) notFound();

  const primerNombre = talento.nombre.split(" ")[0] ?? talento.nombre;
  const edad = calcularEdad(talento.fechaNacimiento);

  return (
    <Container className="py-30">
      <ArrowLink href="/talentos" className="mb-8">
        Volver al roster
      </ArrowLink>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-center">
        <div className="relative aspect-[3/4] overflow-hidden border border-line md:col-span-5">
          <Image
            src={talento.foto.url}
            alt={talento.foto.alt}
            fill
            priority
            className="object-cover"
          />
        </div>
        <div className="md:col-span-7">
          <p className="mb-4 font-body text-label-caps uppercase tracking-widest text-amber">
            {talento.disciplina}
          </p>
          <h1 className="text-display-hero mb-8 font-display uppercase">{talento.nombre}</h1>
          <Button href={`/talentos/${talento.slug}/patrocinar`} icon="arrow_forward">
            Quiero patrocinar a {primerNombre}
          </Button>
          <p className="mt-10 border-t border-line pt-8 font-body text-body-md text-foreground-muted opacity-60">
            La ficha completa (hitos, galería, sponsors/marcas, alcance digital) se construye
            en la Fase 4.
          </p>
        </div>
      </div>

      <section className="mt-24 border-t border-line pt-16">
        <SectionHeading eyebrow="Perfil" title="El Atleta" />
        <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-12">
          <div className="md:col-span-7">
            {talento.frase ? (
              <blockquote className="mb-8 border-l-2 border-amber pl-6 font-body text-body-lg italic text-foreground">
                “{talento.frase}”
              </blockquote>
            ) : null}
            <p className="mb-8 max-w-[60ch] font-body text-body-lg text-foreground-muted">
              {talento.bioCorta}
            </p>
            {talento.valores && talento.valores.length > 0 ? (
              <div className="mb-10 flex flex-wrap gap-3">
                {talento.valores.map((valor) => (
                  <Pill key={valor}>{valor}</Pill>
                ))}
              </div>
            ) : null}
            <p className="font-signature text-heading-lg text-amber">{talento.nombre}</p>
          </div>
          <div className="md:col-span-5">
            <p className="mb-8 font-body text-body-md text-foreground-muted">
              {talento.ubicacion ? `${talento.ubicacion} · ` : ""}
              {edad} años
            </p>
            {talento.redesSociales && talento.redesSociales.length > 0 ? (
              <div className="flex flex-col gap-4">
                {talento.redesSociales.map((red) => {
                  const IconoMarca = iconoDeRed(red.red);
                  return (
                    <a
                      key={red.red}
                      href={red.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2 font-body text-label-caps uppercase tracking-widest text-foreground-muted transition-colors duration-300 hover:text-amber"
                    >
                      {IconoMarca ? (
                        <IconoMarca className="text-[20px] transition-transform duration-300 group-hover:translate-x-1" />
                      ) : (
                        <Icon
                          name="open_in_new"
                          className="text-[20px] transition-transform duration-300 group-hover:translate-x-1"
                        />
                      )}
                      {red.red}
                      {red.handle ? ` · @${red.handle}` : ""}
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </Container>
  );
}
