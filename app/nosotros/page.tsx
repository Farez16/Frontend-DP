import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { conSufijo, OPEN_GRAPH_BASE } from "@/lib/seo";

const TITULO = "Nosotros";
const DESCRIPCION =
  "Somos un equipo que trabaja detrás del talento y de las oportunidades que hacen crecer al deporte.";

/**
 * Página estática: todo el texto es el del prototipo (`nosotros_dp_agencia_deportiva` y,
 * para los servicios, `modelo_de_gesti_n_dp_gesti_n_deportiva`), sin pasar por Sanity.
 * La descripción es la frase con la que la propia página presenta a la agencia.
 *
 * Se comparte sin imagen a propósito: el sitio no tiene una imagen OG genérica (el
 * layout no declara ninguna y configuracionSitio no está publicado), las fotos del
 * equipo todavía no llegaron, y tomar una de Sanity sacaría a la página de estática.
 */
export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  openGraph: {
    ...OPEN_GRAPH_BASE,
    // og:title no pasa por la plantilla del layout: el sufijo va a mano.
    title: conSufijo(TITULO),
    description: DESCRIPCION,
  },
};

const EQUIPO = [
  {
    nombre: "Juan Pacheco",
    cargo: "Director / Gestión Comercial",
    descripcion:
      "Lidera la visión estratégica de DP y participa en el desarrollo de atletas, alianzas y nuevas oportunidades. Responsable del desarrollo comercial y la negociación de patrocinios.",
  },
  {
    nombre: "Joel Gutiérrez",
    cargo: "Comunicación y Contenido",
    descripcion:
      "Responsable de la estrategia de comunicación, producción de contenido y desarrollo de imagen de talentos y proyectos.",
  },
];

/** El primero es el servicio insignia: ocupa la fila entera y lleva el ícono en ámbar. */
const SERVICIOS = [
  {
    icono: "handshake",
    titulo: "Representación de Deportistas",
    descripcion:
      "Acompañamiento estratégico y comercial de la carrera de atletas, generando oportunidades dentro y fuera del deporte.",
  },
  {
    icono: "public",
    titulo: "Imagen y Comunicación",
    descripcion:
      "Posicionamiento, estrategia de comunicación, producción de contenido y construcción de marca personal.",
  },
  {
    icono: "attach_money",
    titulo: "Patrocinios y Alianzas",
    descripcion:
      "Desarrollo de propuestas comerciales y conexión de talentos y proyectos deportivos con empresas y marcas.",
  },
  {
    icono: "mic",
    titulo: "Conferencias",
    descripcion:
      "Representación y comercialización de conferencistas deportivos para empresas, instituciones, organizaciones y eventos corporativos.",
  },
  {
    icono: "event",
    titulo: "Gestión Comercial de Eventos",
    descripcion:
      "Construcción y comercialización de oportunidades de patrocinio: paquetes, búsqueda de marcas, negociación y alianzas.",
    nota: "La organización y operación del evento corresponde a otra estructura especializada.",
  },
];

/**
 * Padding de las tarjetas de servicio. El prototipo usa 64px en todos los anchos, y con
 * eso los títulos se salen de la tarjeta en los cuatro anchos de prueba: "COMUNICACIÓN"
 * mide 178px a 32px y, medido en el prototipo, la tarjeta le deja 155px a 768, 168 a
 * 1440 y 128 a 1280. Por eso 32px en móvil, 48px desde md y, cuando la grilla pasa a 4
 * columnas en xl, 32px a los lados: a 1280 quedan 192px (con 40px quedarían 176, y no
 * entra). Es el mismo en todas las tarjetas, la insignia incluida, para que el ícono y
 * el título de cada una arranquen en la misma vertical.
 */
const TARJETA_SERVICIO =
  "border border-line bg-surface p-8 transition-colors duration-300 hover:border-amber md:p-12 xl:px-8";

export default function NosotrosPage() {
  const [insignia, ...servicios] = SERVICIOS;

  return (
    <Container className="py-30">
      {/* Dos columnas desde xl y no desde lg como el prototipo: a 1024, con la barra de
          scroll clásica, la columna de 7/12 mide 485px y "DETRÁS DEL" a 120px mide 487,
          así que el H1 se partía en cuatro líneas con un "DEL" suelto. Desde 1280 la
          columna ya mide 634.

          Mientras va en una columna, el bloque se topa en 672px (max-w-2xl). Sin tope, a
          1024 los párrafos ocupaban 849px: 111 caracteres por línea en el de 20px y
          hasta 139 en los de 16px, más que los 89 y 117 que el diseño ya acepta a 1440.
          Con el tope quedan en 89 y 112. En 375 y 768 no cambia nada: ahí el contenido
          ya mide menos de 672. */}
      <div className="grid max-w-2xl grid-cols-1 gap-6 xl:max-w-none xl:grid-cols-12 xl:items-center">
        <div className="xl:col-span-7">
          <p className="mb-5 font-body text-label-caps uppercase tracking-widest text-amber">
            Nosotros
          </p>
          <h1 className="text-display-hero mb-6 font-display uppercase">
            El equipo detrás del deporte
          </h1>
          <p className="mb-6 font-body text-body-md text-foreground-muted">
            Detrás de cada atleta y cada oportunidad hay personas trabajando para que las
            cosas sucedan.
          </p>
          <p className="mb-6 font-body text-body-lg text-foreground-muted">
            Somos un equipo que trabaja detrás del talento y de las oportunidades que
            hacen crecer al deporte. Acompañamos a talentos, marcas y proyectos en todo lo
            que ocurre alrededor de la competencia: representación, comunicación,
            desarrollo comercial y alianzas estratégicas.
          </p>
          <p className="mb-8 font-body text-body-md text-foreground-muted">
            Nacemos desde la experiencia real del alto rendimiento y entendemos que detrás
            de cada resultado existe mucho más que un atleta. No buscamos únicamente
            conseguir un patrocinio o colocar una marca — construimos relaciones de largo
            plazo alrededor del deporte.
          </p>
          {/* Decisión de negocio #1: los servicios no tienen página propia, viven más
              abajo en esta misma. Por eso "Ver servicios" es un ancla y no el enlace a
              Modelo de Gestión del prototipo, y se quitó la nota que lo acompañaba ("El
              detalle completo de cada servicio vive en Nuestros Servicios"), que remitía
              a esa página. */}
          <div className="mt-2 flex flex-col gap-4 sm:flex-row">
            <Button href="#servicios" icon="arrow_forward">
              Ver servicios
            </Button>
            <Button href="/" variant="ghost">
              Volver al inicio
            </Button>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-10 xl:col-span-5 xl:mt-0 xl:border-l xl:border-line xl:pl-6">
          <div>
            <h2 className="mb-3 font-body text-label-caps uppercase tracking-widest text-amber">
              Nuestro Propósito
            </h2>
            <p className="font-body text-body-md text-foreground-muted">
              Que el talento y las buenas ideas en el deporte no tengan que avanzar solos.
              Construimos alrededor de ellos el equipo, las relaciones y las oportunidades
              necesarias para crecer.
            </p>
          </div>
          <div>
            <h2 className="mb-3 font-body text-label-caps uppercase tracking-widest text-amber">
              Qué Nos Diferencia
            </h2>
            <p className="font-body text-body-md text-foreground-muted">
              Conocemos el deporte desde dentro. Entendemos las exigencias de una carrera
              de alto rendimiento y, al mismo tiempo, comprendemos lo que necesita una
              empresa para invertir y construir una relación de valor con el deporte.
            </p>
          </div>
        </div>
      </div>

      <section className="mt-30 border-t border-line pt-16">
        <h2 className="mb-8 font-body text-label-caps uppercase tracking-widest text-amber">
          El Equipo
        </h2>
        {/* Dos columnas recién desde lg y no desde sm como el prototipo: cada miembro ya
            es una fila (foto de 180px + texto), y a 768 una columna de 284px le deja al
            texto 80, menos que su palabra más larga ("COMUNICACIÓN", 109px). Medido en
            el prototipo: la fila de Joel Gutiérrez se sale 28px del contenedor. */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 lg:grid-cols-2">
          {EQUIPO.map((miembro) => (
            <div key={miembro.nombre} className="flex items-start gap-6">
              {/* Silueta en lugar de la foto, como el prototipo, hasta que lleguen las
                  del equipo. Son dos íconos y no uno porque el tamaño de <Icon> sólo se
                  puede fijar por `style` (ver Icon.tsx), que no admite breakpoints: 56px
                  en la caja de 140 y 72px en la de 180. El cambio de uno a otro va en
                  los <span> y no en el ícono: el `display: inline-block` de
                  .material-symbols-outlined está fuera de las capas de Tailwind y le
                  gana a un `hidden` puesto sobre el propio ícono. */}
              <div
                aria-hidden="true"
                className="flex aspect-[3/4] w-[140px] shrink-0 items-center justify-center border border-line bg-surface text-foreground-muted opacity-30 sm:w-[180px]"
              >
                <span className="flex sm:hidden">
                  <Icon name="person" size={56} />
                </span>
                <span className="hidden sm:flex">
                  <Icon name="person" size={72} />
                </span>
              </div>
              <div className="pt-1">
                <h3 className="mb-2 font-display text-[22px] uppercase leading-none">
                  {miembro.nombre}
                </h3>
                <p className="mb-3 font-body text-label-caps uppercase tracking-widest text-foreground-muted">
                  {miembro.cargo}
                </p>
                <p className="max-w-[42ch] font-body text-body-md text-foreground-muted opacity-80">
                  {miembro.descripcion}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* `scroll-mt` para que el ancla de "Ver servicios" no deje el inicio de la
          sección debajo del header fijo de 72px. */}
      <section
        id="servicios"
        className="mt-30 scroll-mt-[72px] border-t border-line pt-16"
      >
        <h2 className="mb-6 font-body text-label-caps uppercase tracking-widest text-amber">
          Nuestros Servicios
        </h2>
        <p className="mb-16 max-w-3xl font-body text-body-lg text-foreground-muted">
          Cinco servicios diseñados para maximizar el potencial deportivo y comercial de
          nuestros atletas: representación, comunicación, patrocinios, conferencias y
          gestión comercial de eventos.
        </p>
        {/* La insignia ocupa la fila entera y las otras cuatro van de a dos hasta xl. El
            prototipo las ponía en 4 columnas desde lg, pero a 1024 cada tarjeta mide
            194px y, aun con 32px de padding, al título le quedarían 128. */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {insignia ? (
            <div className={`${TARJETA_SERVICIO} md:col-span-2 xl:col-span-4`}>
              <Icon name={insignia.icono} filled size={36} className="mb-4 text-amber" />
              {/* A 48px (el tamaño móvil de .text-heading-lg) "REPRESENTACIÓN" mide
                  296px y la tarjeta deja 269 a 375: en móvil baja al 32px de las demás
                  tarjetas, y desde md vuelve a los 64px del prototipo. Va con valores
                  sueltos porque .text-heading-lg es una clase plana, sin variante md:. */}
              <h3 className="text-heading-md mb-4 font-display uppercase md:text-[64px] md:leading-[70px]">
                {insignia.titulo}
              </h3>
              <p className="max-w-3xl font-body text-body-md text-foreground-muted">
                {insignia.descripcion}
              </p>
            </div>
          ) : null}
          {servicios.map((servicio) => (
            <div key={servicio.titulo} className={`${TARJETA_SERVICIO} flex flex-col`}>
              <Icon name={servicio.icono} size={36} className="mb-4 text-foreground" />
              <h3 className="text-heading-md mb-4 font-display uppercase">
                {servicio.titulo}
              </h3>
              <p className="flex-grow font-body text-body-md text-foreground-muted">
                {servicio.descripcion}
              </p>
              {/* 65% y no el 50% del prototipo: a 11px, el 50% sobre bg-surface daba
                  3,5:1 de contraste, bajo el 4,5:1 que pide WCAG AA para texto chico. */}
              {servicio.nota ? (
                <p className="mt-4 font-body text-[11px] uppercase tracking-wide text-foreground-muted opacity-65">
                  {servicio.nota}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </Container>
  );
}
