import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { IconType } from "react-icons";
import { SiInstagram, SiTiktok } from "react-icons/si";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Icon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatBlock } from "@/components/ui/StatBlock";
import { Expandable } from "@/components/sections/Expandable";
import { client } from "@/sanity/client";
import { TALENTO_PERFIL_QUERY, TALENTOS_LISTADO_QUERY } from "@/sanity/queries";
import { cn } from "@/lib/utils";

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

interface RawHito {
  anio: number | null;
  categoria: string;
  medalla: string | null;
  competencia: string | null;
  evento: string | null;
  ciudad: string | null;
  descripcion: string;
  destacado: boolean | null;
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
  hitos: RawHito[] | null;
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

const ETIQUETAS_MEDALLA: Record<string, string> = {
  oro: "Oro",
  plata: "Plata",
  bronce: "Bronce",
  finalista: "Finalista",
  participacion: "Participación",
};

// La lista completa se ordena año descendente (más reciente primero); los hitos sin año
// se mandan al final sin importar la dirección de orden, en vez de saltar al frente.
function ordenarHitosDescendente(hitos: RawHito[]): RawHito[] {
  return [...hitos].sort((a, b) => (b.anio ?? -Infinity) - (a.anio ?? -Infinity));
}

// "20km Marcha Lima 2019" a partir de evento/ciudad/año — omite lo que falte.
function etiquetaHito(hito: RawHito): string {
  return [hito.evento, hito.ciudad, hito.anio != null ? String(hito.anio) : null]
    .filter((parte): parte is string => Boolean(parte))
    .join(" ");
}

interface GrupoLogros {
  competencia: string;
  cantidad: number;
  anioMasReciente: number;
  detalle: string;
}

/**
 * Agrupa por `competencia` (texto libre — "Juegos Olímpicos", "Campeonato
 * Panamericano", etc.), no por `categoria` (ese campo es un enum interno,
 * sin uso visual todavía). Hitos sin `competencia` quedan fuera del resumen
 * agrupado a propósito — igual aparecen en la lista completa de abajo.
 * Grupos ordenados por año más reciente descendente (mismo criterio que la
 * lista completa); dentro de cada grupo, los eventos van en orden
 * ascendente (más antiguo primero — cuenta una progresión de carrera).
 */
function agruparLogros(hitos: RawHito[]): GrupoLogros[] {
  const grupos = new Map<string, RawHito[]>();
  for (const hito of hitos) {
    if (!hito.competencia) continue;
    const lista = grupos.get(hito.competencia) ?? [];
    lista.push(hito);
    grupos.set(hito.competencia, lista);
  }

  return Array.from(grupos.entries())
    .map(([competencia, hitosDelGrupo]) => {
      const ordenAscendente = [...hitosDelGrupo].sort(
        (a, b) => (a.anio ?? Infinity) - (b.anio ?? Infinity),
      );
      return {
        competencia,
        cantidad: hitosDelGrupo.length,
        anioMasReciente: Math.max(...hitosDelGrupo.map((hito) => hito.anio ?? -Infinity)),
        detalle: ordenAscendente.map(etiquetaHito).filter(Boolean).join(" · "),
      };
    })
    .sort((a, b) => b.anioMasReciente - a.anioMasReciente);
}

const LOGROS_VISIBLES_SIN_EXPANDIR = 3;

// `destacado` recibe año más grande + color ámbar (mismo idioma visual que StatBlock
// `emphasis`), en vez de reordenar la lista — el orden sigue siendo año descendente.
function HitoItem({ hito }: { hito: RawHito }) {
  const titulo = [hito.competencia, hito.evento].filter(Boolean).join(" · ");
  return (
    <div className={cn("border-l-2 pl-6", hito.destacado ? "border-amber" : "border-line")}>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "font-display uppercase leading-none",
            hito.destacado ? "text-heading-md text-amber" : "text-body-lg text-foreground",
          )}
        >
          {hito.anio ?? "—"}
        </span>
        {hito.medalla ? <Pill>{ETIQUETAS_MEDALLA[hito.medalla] ?? hito.medalla}</Pill> : null}
      </div>
      {titulo ? <p className="mb-1 font-body text-body-md text-foreground">{titulo}</p> : null}
      {hito.ciudad ? (
        <p className="mb-3 font-body text-label-caps uppercase tracking-widest text-foreground-muted">
          {hito.ciudad}
        </p>
      ) : null}
      <p className="max-w-[60ch] font-body text-body-md text-foreground-muted">
        {hito.descripcion}
      </p>
    </div>
  );
}

export default async function TalentoPage({ params }: PageProps<"/talentos/[slug]">) {
  const { slug } = await params;
  const talento = await getTalentoPerfil(slug);
  if (!talento) notFound();

  const primerNombre = talento.nombre.split(" ")[0] ?? talento.nombre;
  const edad = calcularEdad(talento.fechaNacimiento);

  const hitosOrdenados = ordenarHitosDescendente(talento.hitos ?? []);
  const hitosVisibles = hitosOrdenados.slice(0, LOGROS_VISIBLES_SIN_EXPANDIR);
  const hitosExpandibles = hitosOrdenados.slice(LOGROS_VISIBLES_SIN_EXPANDIR);
  const gruposLogros = agruparLogros(hitosOrdenados);

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
            La ficha completa (galería, sponsors/marcas, alcance digital) se construye en la
            Fase 4.
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

      <section className="mt-24 border-t border-line pt-16">
        <SectionHeading eyebrow="Trayectoria" title="Logros" />
        {hitosOrdenados.length === 0 ? (
          <ComingSoon
            className="mt-16"
            message="Estamos registrando los logros de este talento."
          />
        ) : (
          <div className="mt-16">
            {gruposLogros.length > 0 ? (
              <div className="mb-16 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
                {gruposLogros.map((grupo) => (
                  <div key={grupo.competencia}>
                    <StatBlock value={`${grupo.cantidad}×`} label={grupo.competencia} />
                    {grupo.detalle ? (
                      <p className="mt-3 font-body text-body-md text-foreground-muted">
                        {grupo.detalle}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex flex-col gap-10">
              {hitosVisibles.map((hito) => (
                <HitoItem key={`${hito.competencia}-${hito.anio}-${hito.descripcion}`} hito={hito} />
              ))}
            </div>

            {hitosExpandibles.length > 0 ? (
              <Expandable labelMore="Ver todos los logros" labelLess="Ver menos" className="mt-10">
                <div className="flex flex-col gap-10">
                  {hitosExpandibles.map((hito) => (
                    <HitoItem
                      key={`${hito.competencia}-${hito.anio}-${hito.descripcion}`}
                      hito={hito}
                    />
                  ))}
                </div>
              </Expandable>
            ) : null}
          </div>
        )}
      </section>
    </Container>
  );
}
