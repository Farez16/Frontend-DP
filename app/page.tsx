import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { Button } from "@/components/ui/Button";
import { AthleteCard } from "@/components/sections/AthleteCard";
import { NewsCard } from "@/components/sections/NewsCard";
import { SponsorMarquee } from "@/components/sections/SponsorMarquee";
import { talentos } from "@/lib/data/talentos";
import { noticias } from "@/lib/data/noticias";
import { getSponsorsPorTier } from "@/lib/data/sponsors";

const talentosDestacados = talentos.filter((talento) => talento.destacadoEnInicio);
const sponsorsPrincipales = getSponsorsPorTier("principal");
// Decisión #8 (docs/ARQUITECTURA.md): con un solo talento real, se comunica como "talento
// destacado" en vez de forzar la grilla de roster — se revierte sola en cuanto haya 2+.
const talentoUnico = talentosDestacados.length === 1 ? talentosDestacados[0] : undefined;

export default function Home() {
  return (
    <>
      {/* Hero simplificado (copy real, sin video de fondo ni brand beat
          todavía) — el hero full-bleed es trabajo de página completa,
          Fase 4. BrandBeat ya está construido (components/layout/BrandBeat.tsx)
          y se monta ahí, cuando tenga un hero real al que preceder. */}
      <section className="border-b border-line bg-background">
        <Container className="py-30">
          <p className="mb-6 font-body text-label-caps uppercase tracking-widest text-amber">
            DP Agencia Deportiva · Cuenca, Ecuador
          </p>
          <h1 className="text-display-hero mb-8 max-w-[15ch] font-display uppercase text-foreground">
            El deporte no se construye solo.
          </h1>
          <p className="mb-10 max-w-[46ch] font-body text-body-lg text-foreground-muted">
            Representamos talento, construimos oportunidades y conectamos a las personas y
            marcas que hacen crecer al deporte.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button href="/talentos" icon="arrow_forward">
              Conoce a nuestros talentos
            </Button>
            <Button href="/contacto" variant="ghost">
              Trabaja con nosotros
            </Button>
          </div>
        </Container>
      </section>

      <section className="border-b border-line bg-background">
        <Container className="py-30">
          <SectionHeading
            eyebrow={talentoUnico ? "Talento destacado" : "Nuestros talentos"}
            title="Élite en cada disciplina"
            action={<ArrowLink href="/talentos">Ver roster completo</ArrowLink>}
          />
          {talentoUnico ? (
            // Un solo talento: solo la tarjeta, centrada. hitoDestacado y bio ya no se
            // muestran en Inicio (siguen en los datos y en la ficha /talentos/[slug]).
            <div className="mx-auto mt-16 max-w-sm">
              <AthleteCard
                talento={talentoUnico}
                href={`/talentos/${talentoUnico.slug}`}
                priority
              />
            </div>
          ) : (
            <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
              {talentosDestacados.map((talento, index) => (
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
      </section>

      <section className="border-b border-line bg-surface">
        <Container className="py-30">
          <SectionHeading
            eyebrow="Actualidad"
            title="Últimas noticias"
            action={<ArrowLink href="/noticias">Ver todas las noticias</ArrowLink>}
          />
          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2">
            {noticias.map((noticia) => (
              <NewsCard key={noticia.slug} noticia={noticia} />
            ))}
          </div>
        </Container>
      </section>

      <section className="overflow-hidden bg-background py-16">
        <p className="mb-12 px-5 text-center font-body text-label-caps uppercase tracking-widest text-foreground-muted">
          Marcas que confían en nuestros talentos
        </p>
        <SponsorMarquee sponsors={sponsorsPrincipales} />
      </section>
    </>
  );
}
