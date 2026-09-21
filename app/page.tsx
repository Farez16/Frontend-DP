import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { Button } from "@/components/ui/Button";
import { BrandBeat } from "@/components/layout/BrandBeat";
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
      {/* Splash de marca (fixed, pantalla completa, una vez por pestaña): no ocupa
          espacio en el flujo, así que va antes del hero. */}
      <BrandBeat />
      {/* Hero simplificado (copy real, sin video de fondo todavía) — el hero
          full-bleed es trabajo de página completa, Fase 4. */}
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

      {/* Quiénes somos: sin logo por decisión del cliente ("DP" es texto decorativo con el
          tratamiento de Header/Footer, no una imagen). Ajustes tipográficos afinados a este
          copy (revisar si cambia): max-w 54ch (la 1.ª línea es la 1.ª frase), &nbsp; en
          nombres, fechas y "a"/"y" sueltas, y margen derecho en em en el DP (compensa el
          tracking negativo; sin él la "P" sobresale del borde del contenedor). */}
      <section className="border-b border-line bg-background">
        <Container className="py-30">
          <SectionHeading
            eyebrow="Quiénes somos"
            title="No gestionamos carreras. Construimos legados."
            className="text-balance"
          />
          <div className="mt-16 grid grid-cols-1 items-center gap-12 md:grid-cols-[minmax(0,1fr)_auto] md:gap-12 lg:gap-20">
            <div>
              <p className="mb-10 max-w-[54ch] font-body text-body-lg text-foreground-muted">
                Elegimos acompañar de cerca, en vez de gestionar a&nbsp;distancia. Nos
                encargamos de la representación, comunicación, patrocinios
                y&nbsp;desarrollo comercial. Nuestro primer caso es{" "}
                <span className="font-bold text-foreground">Daniel&nbsp;Pintado</span>,
                campeón olímpico y&nbsp;doble medallista en París&nbsp;2024.
              </p>
              <ArrowLink href="/nosotros">Conócenos</ArrowLink>
            </div>
            <span
              aria-hidden="true"
              className="select-none justify-self-center font-display text-[9rem] leading-none tracking-tighter text-foreground opacity-20 md:mr-[0.04em] md:text-[11rem] lg:text-[15rem] xl:text-[20rem]"
            >
              DP
            </span>
          </div>
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
