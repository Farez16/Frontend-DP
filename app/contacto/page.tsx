import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { LeadForm } from "@/components/sections/LeadForm";
import { client } from "@/sanity/client";
import { TALENTOS_LISTADO_QUERY } from "@/sanity/queries";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Escríbenos — contacto@somosdp.com, Cuenca, Ecuador.",
};

/**
 * Contacto centralizado: el documento de información final del cliente pide que
 * todas las solicitudes del sitio lleguen a una sola dirección. Está escrito acá y
 * no en Sanity porque hoy no existe ningún campo de contacto en el Studio (el
 * singleton configuracionSitio sólo tiene SEO); si alguna vez debe ser editable,
 * este es el único lugar que cambia.
 */
const CORREO_AGENCIA = "contacto@somosdp.com";
const CIUDAD = "Cuenca, Ecuador";

/**
 * Dato de contacto con ícono en círculo, como el prototipo: el círculo se llena de
 * ámbar y el ícono se invierte a tinta al pasar por cualquier parte del bloque.
 */
function BloqueDato({
  icono,
  etiqueta,
  children,
}: {
  icono: string;
  etiqueta: string;
  children: ReactNode;
}) {
  return (
    <div className="group flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-high transition-colors duration-300 group-hover:bg-amber">
        <Icon
          name={icono}
          className="text-foreground transition-colors duration-300 group-hover:text-ink"
        />
      </div>
      <div>
        <h2 className="mb-1 font-body text-label-caps text-foreground-muted">
          {etiqueta}
        </h2>
        {children}
      </div>
    </div>
  );
}

export default async function ContactoPage() {
  /**
   * Se reutiliza la query del listado /talentos en vez de escribir una nueva: "los
   * talentos publicados" tiene que significar exactamente lo mismo en las dos
   * páginas. Proyecta más campos de los que acá se leen (foto, disciplina, slug) y
   * se acepta ese sobre-consumo a cambio de no tener una segunda definición del
   * roster que pueda divergir de la primera. El tipo declara sólo lo que se usa.
   */
  const talentos = await client.fetch<Array<{ nombre: string }>>(TALENTOS_LISTADO_QUERY);
  const nombresTalentos = talentos.map((talento) => talento.nombre);

  return (
    <Container className="py-30">
      {/* Las 2 columnas del prototipo (5/7) recién desde lg y no desde md: a 768px una
          columna de 5/12 deja ~205px útiles, y el H1 a 64px no cabe ahí ni de lejos.
          Ese es el mismo tipo de overflow que la auditoría responsive ya había
          encontrado dos veces por emparejar saltos a mano. Hasta lg va apilado, con el
          H1 usando todo el ancho. */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-6">
        <div className="flex flex-col justify-center gap-8 lg:col-span-5 xl:pr-12">
          <div className="space-y-6">
            <h1 className="text-heading-lg font-display uppercase tracking-tight">
              CONECTAMOS
              <br />
              <span className="text-amber">TALENTO</span> CON
              <br />
              EL MUNDO.
            </h1>
            <p className="max-w-md font-body text-body-lg text-foreground-muted">
              Forjamos alianzas estratégicas entre atletas de élite y marcas líderes.
              Estamos aquí para impulsar resultados comerciales y deportivos
              excepcionales. Hablemos.
            </p>
          </div>

          <div className="space-y-6 border-t border-line pt-8">
            <BloqueDato icono="mail" etiqueta="Email">
              {/* El correo como mailto real, no como texto: hasta ahora la página lo
                  mostraba dentro de un párrafo y había que copiarlo a mano. */}
              <a
                href={`mailto:${CORREO_AGENCIA}`}
                className="font-body text-body-lg text-foreground transition-colors duration-300 hover:text-amber"
              >
                {CORREO_AGENCIA}
              </a>
            </BloqueDato>
            <BloqueDato icono="location_on" etiqueta="Oficina Central">
              <p className="font-body text-body-lg text-foreground">{CIUDAD}</p>
            </BloqueDato>
          </div>
        </div>

        {/* Tarjeta del formulario: borde superior ámbar de 2px sobre superficie
            elevada, como el prototipo. `overflow-hidden` recorta tanto el halo
            decorativo como el campo trampa del formulario, que vive fuera de
            pantalla. */}
        <div className="relative overflow-hidden border-t-2 border-amber bg-surface p-8 lg:col-span-7 md:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber/5 blur-3xl"
          />
          <div className="relative">
            <LeadForm nombresTalentos={nombresTalentos} correoAgencia={CORREO_AGENCIA} />
          </div>
        </div>
      </div>
    </Container>
  );
}
