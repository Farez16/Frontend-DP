import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  AthleteCard,
  RECORTE_TARJETA_TALENTO,
  SIZES_TARJETA_2_Y_3_COLUMNAS,
} from "@/components/sections/AthleteCard";
import { Lightbox } from "@/components/sections/Lightbox";
import { Button } from "@/components/ui/Button";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MOTIVO_PRENSA, PARAM_MOTIVO } from "@/lib/contacto";
import { conSufijo, leerOverrideSeo, OPEN_GRAPH_BASE } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { sanityFetch } from "@/sanity/client";
import {
  imagenesOpenGraph,
  urlDeImagen,
  type ImagenRecortable,
  type ImagenSanity,
} from "@/sanity/image";
import { MEDIOS_QUERY, TALENTOS_LISTADO_QUERY } from "@/sanity/queries";
import type { Talento } from "@/types/content";

interface RawFotoPrensa extends ImagenSanity {
  _key: string;
  ancho: number | null;
  alto: number | null;
  extension: string | null;
  /** En bytes. */
  tamano: number | null;
}

interface RawArchivoDescargable {
  _key: string;
  titulo: string | null;
  url: string | null;
  extension: string | null;
  /** En bytes. */
  tamano: number | null;
}

/** Forma que devuelve MEDIOS_QUERY: null mientras el singleton no esté publicado. */
interface RawMedios {
  galeriaPrensa: RawFotoPrensa[] | null;
  archivosDescargables: RawArchivoDescargable[] | null;
  seo: {
    metaTitulo: string | null;
    metaDescripcion: string | null;
    imagenOG: ImagenRecortable | null;
  } | null;
}

interface RawTalentoListado {
  nombre: string;
  slug: string;
  disciplina: string;
  foto: ImagenSanity;
}

const TITULO_POR_DEFECTO = "Medios y Prensa";
const DESCRIPCION_POR_DEFECTO =
  "Un espacio para facilitar el trabajo de medios de comunicación y centralizar los recursos oficiales de la agencia y sus talentos.";

const URL_CONTACTO_PRENSA = `/contacto?${PARAM_MOTIVO}=${MOTIVO_PRENSA}`;

/**
 * Las fotos y los archivos que se pueden mostrar. La query ya descarta los elementos sin
 * archivo; esto cubre además el que apunta a un asset que ya no existe (la referencia
 * queda, pero `asset->url` llega null).
 */
function fotosPublicables(medios: RawMedios | null): RawFotoPrensa[] {
  return (medios?.galeriaPrensa ?? []).filter((foto) => Boolean(foto.url));
}

function archivosPublicables(
  medios: RawMedios | null,
): Array<RawArchivoDescargable & { url: string }> {
  return (medios?.archivosDescargables ?? []).filter(
    (archivo): archivo is RawArchivoDescargable & { url: string } => Boolean(archivo.url),
  );
}

/**
 * SEO de /medios: el override del propio singleton (`medios.seo`) y, si no lo hay, el
 * texto con el que la página se presenta. La imagen es la primera foto de la galería de
 * prensa; sin galería, ninguna —igual que /nosotros y /contacto—: la foto de un talento
 * diría que la página es sobre él.
 *
 * `leerOverrideSeo` es el mismo normalizador de configuracionSitio: los dos singletons
 * proyectan el bloque `seo` con la misma forma.
 */
export async function generateMetadata(): Promise<Metadata> {
  const medios = await sanityFetch<RawMedios | null>(MEDIOS_QUERY);
  const override = leerOverrideSeo(medios);
  const primeraFoto = fotosPublicables(medios)[0];

  const titulo = override.titulo ?? TITULO_POR_DEFECTO;
  const description = override.descripcion ?? DESCRIPCION_POR_DEFECTO;

  return {
    title: titulo,
    description,
    openGraph: {
      ...OPEN_GRAPH_BASE,
      // og:title no pasa por la plantilla del layout: el sufijo va a mano.
      title: conSufijo(titulo),
      description,
      images: override.imagenOG
        ? imagenesOpenGraph(override.imagenOG, titulo)
        : imagenesOpenGraph(primeraFoto, primeraFoto?.alt ?? titulo),
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

/**
 * La url que descarga el original: la del CDN de Sanity con `?dl=`, que responde con
 * `Content-Disposition: attachment` y el nombre con el que se subió el archivo
 * (verificado con curl el 2026-10-02, en una foto y en un archivo). El atributo
 * `download` del enlace no alcanza solo: los navegadores lo ignoran en otro origen.
 */
function urlDescarga(url: string): string {
  const destino = new URL(url);
  destino.searchParams.set("dl", "");
  return destino.toString();
}

const NUMERO = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 });

/** Peso legible, en base 1024 como lo muestran el explorador de Windows y Chrome. */
function formatoPeso(bytes: number): string {
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb < 10 ? NUMERO.format(mb) : Math.round(mb)} MB`;
  return `${NUMERO.format(mb / 1024)} GB`;
}

/** La extensión del asset y, si faltara, la que trae la propia url del CDN. */
function extensionDe(extension: string | null, url: string): string {
  const deUrl = new URL(url).pathname.split(".").pop() ?? "";
  return (extension || deUrl).toLowerCase();
}

/** "JPG · 1,4 MB". */
function descripcionArchivo(extension: string, tamano: number | null): string {
  return [extension.toUpperCase(), tamano ? formatoPeso(tamano) : null]
    .filter(Boolean)
    .join(" · ");
}

const ICONO_POR_EXTENSION: Record<string, string> = {
  pdf: "picture_as_pdf",
  zip: "folder_zip",
  rar: "folder_zip",
  "7z": "folder_zip",
  jpg: "image",
  jpeg: "image",
  png: "image",
  webp: "image",
  tif: "image",
  tiff: "image",
  mp4: "movie",
  mov: "movie",
  doc: "description",
  docx: "description",
  ppt: "slideshow",
  pptx: "slideshow",
  xls: "table_chart",
  xlsx: "table_chart",
};

/**
 * Las cuatro tarjetas del prototipo, convertidas en índice de la página: cada una lleva
 * a la sección que la cumple. La de biografía no promete "versión corta y ampliada" como
 * el prototipo: cada talento tiene una sola biografía, `bioCorta`.
 */
const INDICE = [
  {
    icono: "photo_library",
    titulo: "Fotografías",
    descripcion: "Baúl de imágenes oficiales en alta resolución.",
    href: "#galeria",
  },
  {
    icono: "description",
    titulo: "Biografía Oficial",
    descripcion: "La biografía de cada talento, en su ficha.",
    href: "#directorio",
  },
  {
    icono: "bar_chart",
    titulo: "Media Kit",
    descripcion: "Datos deportivos, audiencia y métricas comerciales.",
    href: "#descargas",
  },
  {
    icono: "contact_mail",
    titulo: "Contacto de Prensa",
    descripcion: "Un único canal para toda solicitud editorial.",
    href: URL_CONTACTO_PRENSA,
  },
];

/**
 * Cada sección es destino de un ancla del índice: `scroll-mt` para que su inicio no
 * quede debajo del header fijo de 72px, como en /nosotros.
 */
const SECCION_CLASSES = "mt-24 scroll-mt-[72px] border-t border-line pt-16";

// Mosaico de la galería: el mismo de la ficha de talento (cuadrado, gris de fondo,
// borde ámbar al pasar el mouse).
const MOSAICO_CLASSES =
  "group relative aspect-square overflow-hidden border border-line bg-surface transition-[transform,border-color] duration-500 hover:scale-[1.02] hover:border-amber";

/**
 * Grilla de 2 columnas, 3 desde md y 4 desde xl, con los mismos ingredientes que los
 * `sizes` de AthleteCard (Container de 1440 con px-5/md:px-20, gap-x-6):
 *   xl+  (min(100vw, 1440) − 160 de márgenes − 72 de los 3 gaps) / 4 → 302px al topar
 *   md   (100vw − 160 − 48) / 3
 *   base (100vw − 40 − 24) / 2
 */
const SIZES_MOSAICO =
  "(min-width: 1440px) 302px, (min-width: 1280px) calc((100vw - 232px) / 4), (min-width: 768px) calc((100vw - 208px) / 3), calc((100vw - 64px) / 2)";

// Cuadrado, como el marco. El mosaico más grande que pide la grilla son ~360px (3
// columnas justo antes de xl); a 2x eso cae en el escalón de 828 de next/image, y 1080
// deja margen igual que la galería de la ficha.
const MOSAICO_RECORTE = 1080;

/**
 * La vista ampliada pide siempre el techo de next/image, por lo mismo que la galería de la
 * ficha (ver GALERIA_AMPLIADA_RECORTE en app/talentos/[slug]/page.tsx): la foto mide lo que
 * mide su imagen, y si el candidato del srcset trae menos píxeles de los que promete se
 * dibuja más chica.
 */
const AMPLIADA_RECORTE = 3840;

/**
 * La caja de la vista ampliada: los mismos topes que la de la ficha menos 4.5rem de alto,
 * que es lo que ocupan el botón de descarga (42px) y el espacio que lo separa de la foto.
 * Sin ese descuento, en una ventana de menos de ~880px de alto el botón quedaba encima de
 * la foto o de las flechas.
 */
const AMPLIADA_CAJA =
  "pointer-events-auto h-auto max-h-[calc(70vh_-_4.5rem)] w-auto max-w-[90vw] object-contain md:max-h-[calc(85vh_-_4.5rem)] md:max-w-[calc(100vw_-_9rem)]";

/** `sizes` de la vista ampliada: el tope que mande, ancho o alto por la proporción. */
function sizesAmpliada(proporcion: { ancho: number; alto: number }) {
  const r = (proporcion.ancho / proporcion.alto).toFixed(4);
  return [
    `(min-width: 768px) min(100vw - 9rem, (85vh - 4.5rem) * ${r})`,
    `min(90vw, (70vh - 4.5rem) * ${r})`,
  ].join(", ");
}

function MosaicoFoto({ foto }: { foto: RawFotoPrensa }) {
  return (
    <div className={MOSAICO_CLASSES}>
      <Image
        src={urlDeImagen(foto, MOSAICO_RECORTE, MOSAICO_RECORTE)}
        alt={foto.alt}
        fill
        sizes={SIZES_MOSAICO}
        className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
      />
    </div>
  );
}

/**
 * La foto ampliada es el ORIGINAL entero, sin el recorte ni el hotspot del editor: es lo
 * que se descarga, así que es lo que hay que poder ver antes de bajarlo. Sin dimensiones
 * del asset (no debería pasar) cae al recorte cuadrado del mosaico, en grande.
 *
 * El envoltorio no recibe clics (`pointer-events-none`) para que un clic en el hueco entre
 * la foto y el botón siga llegando al fondo y cierre la vista, como en la ficha.
 */
function FotoAmpliada({ foto }: { foto: RawFotoPrensa }) {
  const proporcion =
    foto.ancho && foto.alto ? { ancho: foto.ancho, alto: foto.alto } : null;
  const caja = proporcion ?? { ancho: AMPLIADA_RECORTE, alto: AMPLIADA_RECORTE };
  const src = proporcion
    ? urlDeImagen({ ...foto, hotspot: null, crop: null }, AMPLIADA_RECORTE)
    : urlDeImagen(foto, AMPLIADA_RECORTE, AMPLIADA_RECORTE);
  const extension = extensionDe(foto.extension, foto.url);

  return (
    <div className="pointer-events-none flex flex-col items-center gap-4">
      {/* loading="eager" por lo mismo que en la ficha: con h-auto el <img> mide 0x0
          hasta que carga, y el lazy loading no llegaba a disparar nunca. */}
      <Image
        src={src}
        alt={foto.alt}
        width={caja.ancho}
        height={caja.alto}
        sizes={sizesAmpliada(caja)}
        loading="eager"
        className={AMPLIADA_CAJA}
      />
      <a
        href={urlDescarga(foto.url)}
        download
        className="pointer-events-auto inline-flex items-center gap-3 bg-amber px-6 py-3 text-ink transition-[filter] duration-200 hover:brightness-110"
      >
        <span className="font-display text-[18px] uppercase leading-none tracking-wide">
          Descargar original
        </span>
        <span className="font-body text-body-sm">
          {descripcionArchivo(extension, foto.tamano)}
        </span>
        <Icon name="download" size={20} />
      </a>
    </div>
  );
}

/**
 * Pie del mosaico: el enlace de descarga, fuera del botón que abre la vista ampliada. El
 * `alt` va solo para lectores de pantalla, para que cada enlace diga qué foto baja.
 */
function PieFoto({ foto }: { foto: RawFotoPrensa }) {
  const extension = extensionDe(foto.extension, foto.url);

  return (
    <a
      href={urlDescarga(foto.url)}
      download
      className="mt-3 flex flex-col gap-1 self-start text-foreground-muted transition-colors duration-300 hover:text-amber"
    >
      <span className="inline-flex items-center gap-2 font-body text-label-caps uppercase tracking-widest">
        <Icon name="download" size={20} />
        Descargar
        <span className="sr-only">: {foto.alt}</span>
      </span>
      <span className="font-body text-body-sm opacity-80">
        {descripcionArchivo(extension, foto.tamano)}
      </span>
    </a>
  );
}

/**
 * Una fila de la lista de descargas: ícono según el tipo, título, tipo y peso, y
 * "Descargar". Toda la fila es el enlace. En móvil el título y el peso se apilan y queda
 * solo el ícono de descarga a la derecha; la palabra sigue disponible para lectores de
 * pantalla.
 */
function FilaArchivo({ archivo }: { archivo: RawArchivoDescargable & { url: string } }) {
  const extension = extensionDe(archivo.extension, archivo.url);
  const titulo = archivo.titulo?.trim() || "Archivo";

  return (
    <li className="border-t border-line">
      <a
        href={urlDescarga(archivo.url)}
        download
        className="group flex items-center gap-4 py-6 md:gap-6"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-line text-amber transition-colors duration-300 group-hover:border-amber">
          <Icon name={ICONO_POR_EXTENSION[extension] ?? "draft"} />
        </span>
        {/* min-w-0 + break-words: el título lo escribe el editor y una palabra larga
            no puede empujar la fila fuera del contenedor. */}
        <span className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center md:gap-6">
          <span className="min-w-0 flex-1 break-words font-display text-[22px] uppercase leading-tight text-foreground transition-colors duration-300 group-hover:text-amber">
            {titulo}
          </span>
          <span className="shrink-0 font-body text-label-caps uppercase tracking-widest text-foreground-muted">
            {descripcionArchivo(extension, archivo.tamano)}
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-2 font-body text-label-caps uppercase tracking-widest text-foreground-muted transition-colors duration-300 group-hover:text-amber">
          <span className="sr-only sm:not-sr-only">Descargar</span>
          <Icon name="download" size={20} />
        </span>
      </a>
    </li>
  );
}

export default async function MediosPage() {
  const [medios, talentosRaw] = await Promise.all([
    sanityFetch<RawMedios | null>(MEDIOS_QUERY),
    // La misma query del listado /talentos, como hace /contacto: "los talentos
    // publicados" tiene que significar lo mismo en todo el sitio, y así el directorio
    // crece solo al publicar un talento nuevo.
    sanityFetch<RawTalentoListado[]>(TALENTOS_LISTADO_QUERY),
  ]);
  const fotos = fotosPublicables(medios);
  const archivos = archivosPublicables(medios);
  const talentos = talentosRaw.map(mapTalento);

  return (
    <Container className="py-30">
      {/* Encabezado centrado, como el prototipo (medios_dp_agencia_deportiva), con el
          mismo texto. Sus cuatro tarjetas eran texto quieto; acá son el índice. */}
      <header className="mx-auto max-w-2xl text-center">
        <p className="mb-5 font-body text-label-caps uppercase tracking-widest text-amber">
          Medios y Prensa
        </p>
        <h1 className="text-display-hero mb-8 font-display uppercase">
          Recursos para prensa
        </h1>
        <p className="mb-8 font-body text-body-lg text-foreground-muted">
          {DESCRIPCION_POR_DEFECTO}
        </p>
        <nav aria-label="Recursos para prensa">
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {INDICE.map((item) => (
              <li key={item.titulo} className="flex">
                <Link
                  href={item.href}
                  className="group flex w-full flex-col items-center border border-line p-6 transition-colors duration-300 hover:border-amber"
                >
                  <Icon name={item.icono} className="mb-3 text-amber" />
                  <span className="mb-2 inline-flex items-center gap-1 font-display text-[18px] uppercase leading-none text-foreground transition-colors duration-300 group-hover:text-amber">
                    {item.titulo}
                    <Icon
                      name={
                        item.href.startsWith("#") ? "arrow_downward" : "arrow_forward"
                      }
                      size={18}
                      className={cn(
                        "transition-transform duration-300",
                        item.href.startsWith("#")
                          ? "group-hover:translate-y-0.5"
                          : "group-hover:translate-x-1",
                      )}
                    />
                  </span>
                  <span className="font-body text-body-md text-foreground-muted opacity-70">
                    {item.descripcion}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <section id="galeria" className={SECCION_CLASSES}>
        <SectionHeading eyebrow="Fotografías" title="Galería de prensa" />
        {fotos.length === 0 ? (
          <ComingSoon
            className="mt-16"
            message="Las fotografías oficiales se publican aquí en cuanto el material esté listo."
          />
        ) : (
          <Lightbox
            className="mt-16 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-3 xl:grid-cols-4"
            items={fotos.map((foto) => ({
              key: foto._key,
              descripcion: foto.alt,
              mosaico: <MosaicoFoto foto={foto} />,
              ampliada: <FotoAmpliada foto={foto} />,
              pie: <PieFoto foto={foto} />,
            }))}
          />
        )}
      </section>

      <section id="descargas" className={SECCION_CLASSES}>
        <SectionHeading eyebrow="Media Kit" title="Descargas" />
        {archivos.length === 0 ? (
          <ComingSoon
            className="mt-16"
            message="El media kit y los archivos para prensa se publican aquí en cuanto el material esté listo."
          />
        ) : (
          <ul className="mt-16 border-b border-line">
            {archivos.map((archivo) => (
              <FilaArchivo key={archivo._key} archivo={archivo} />
            ))}
          </ul>
        )}
      </section>

      <section id="directorio" className={SECCION_CLASSES}>
        <SectionHeading eyebrow="Biografía Oficial" title="Directorio de talentos" />
        <p className="mt-8 max-w-3xl font-body text-body-lg text-foreground-muted">
          Cada ficha reúne la biografía, los logros y la galería del talento.
        </p>
        {talentos.length === 0 ? (
          <ComingSoon
            className="mt-16"
            message="Estamos preparando el roster completo de nuestros talentos."
          />
        ) : (
          // La grilla de /talentos tal cual (decisión #8): con un solo talento, una
          // tarjeta angosta en vez de una grilla de 3 con dos huecos.
          <div
            className={cn(
              "mt-16 grid grid-cols-1 gap-6",
              talentos.length === 1 ? "max-w-sm" : "md:grid-cols-2 lg:grid-cols-3",
            )}
          >
            {talentos.map((talento) => (
              <AthleteCard
                key={talento.slug}
                talento={talento}
                href={`/talentos/${talento.slug}`}
                sizes={talentos.length === 1 ? undefined : SIZES_TARJETA_2_Y_3_COLUMNAS}
              />
            ))}
          </div>
        )}
      </section>

      <section className={SECCION_CLASSES}>
        <SectionHeading eyebrow="Contacto de Prensa" title="Hablemos" />
        <div className="mt-16 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <p className="max-w-xl font-body text-body-lg text-foreground-muted">
            Un único canal para toda solicitud editorial.
          </p>
          <Button
            href={URL_CONTACTO_PRENSA}
            icon="arrow_forward"
            className="self-start md:self-auto"
          >
            Escribir a prensa
          </Button>
        </div>
      </section>
    </Container>
  );
}
