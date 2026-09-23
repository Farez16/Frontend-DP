import { defineQuery } from "next-sanity";

/**
 * `client` (ver ./client.ts) no usa token y lee con useCdn:true — un cliente
 * sin token nunca puede ver documentos en borrador (drafts.*), así que
 * "publicado" ya está garantizado por la configuración del cliente, no hace
 * falta un filtro explícito en las queries. Si más adelante se agrega un
 * cliente autenticado (Presentation/preview de Visual Editing), revisar esto.
 */

/**
 * Home — talento(s) destacado(s).
 * `orden` es opcional; se usa coalesce() para mandar al final a los que no
 * lo tienen, en vez de depender del orden que GROQ le da por defecto a los
 * valores null/undefined.
 */
export const TALENTOS_DESTACADOS_QUERY = defineQuery(/* groq */ `
  *[_type == "talento" && destacadoEnInicio == true]
    | order(coalesce(orden, 999999) asc)[0...4]
    {
      _id,
      nombre,
      "slug": slug.current,
      disciplina,
      "foto": fotografiaPrincipal{
        "url": asset->url,
        alt
      },
      orden
    }
`);

/**
 * /talentos — listado completo del roster, sin filtrar por
 * destacadoEnInicio (a diferencia del Home). Orden alfabético por nombre,
 * sin límite de cantidad.
 */
export const TALENTOS_LISTADO_QUERY = defineQuery(/* groq */ `
  *[_type == "talento"]
    | order(nombre asc)
    {
      _id,
      nombre,
      "slug": slug.current,
      disciplina,
      "foto": fotografiaPrincipal{
        "url": asset->url,
        alt
      }
    }
`);

/**
 * /talentos/[slug] — perfil individual completo: identidad, "El Atleta",
 * "Logros", "Galería", "Marcas", "Alcance Digital" y el CTA de conferencista
 * (pasos 1/3 a 3b/3 de la migración de la ficha — última pieza).
 */
export const TALENTO_PERFIL_QUERY = defineQuery(/* groq */ `
  *[_type == "talento" && slug.current == $slug][0]{
    nombre,
    "slug": slug.current,
    disciplina,
    ubicacion,
    fechaNacimiento,
    "foto": fotografiaPrincipal{
      "url": asset->url,
      alt
    },
    redesSociales[]{
      _key,
      red,
      url,
      handle,
      metricas[]{
        fechaReferencia,
        seguidores,
        visualizaciones,
        interacciones,
        meGusta
      }
    },
    bioCorta,
    bioAmpliada,
    valores,
    frase,
    hitos[]{
      _key,
      anio,
      categoria,
      medalla,
      competencia,
      evento,
      ciudad,
      descripcion,
      destacado
    },
    galeria[]{
      _type,
      _key,
      _type == "image" => {
        "url": asset->url,
        alt
      },
      _type == "videoBunny" => {
        videoId,
        titulo,
        "miniatura": miniatura{
          "url": asset->url,
          alt
        }
      }
    },
    // Ojo: nada de backticks en los comentarios dentro de este template literal.
    // _key vive en el miembro del array, no en el documento referenciado, así que no
    // se puede sacar con sponsors[]->. Se proyecta el _key y se aplana el documento
    // encima con el spread, para conservar la forma plana que espera RawSponsor. Usar
    // el _id del sponsor no serviría: si un talento referencia dos veces la misma marca,
    // la clave de React se repetiría.
    sponsors[]{
      _key,
      ...@->{
        nombre,
        tier,
        url,
        "logo": logo{
          "url": asset->url,
          alt
        }
      }
    },
    conferencista{
      ofrece,
      experienciaPrevia
    }
  }
`);

/**
 * Home — últimas noticias.
 */
export const NOTICIAS_HOME_QUERY = defineQuery(/* groq */ `
  *[_type == "noticia"]
    | order(fecha desc)[0...4]
    {
      _id,
      titulo,
      "slug": slug.current,
      categoria,
      fecha,
      extracto,
      "portada": portada{
        "url": asset->url,
        alt
      }
    }
`);

/**
 * Home — marcas, derivadas de los sponsors que referencian los talentos (no
 * de una lista propia de sponsors). array::unique() dedupe los _ref de forma
 * nativa en GROQ, antes de resolver los documentos — evita traer duplicados
 * y filtrar en JavaScript. `tier` se ignora a propósito: esa jerarquía es
 * para el perfil individual del talento, no para esta franja del Home.
 */
export const MARCAS_HOME_QUERY = defineQuery(/* groq */ `
  *[
    _type == "sponsor" &&
    _id in array::unique(*[_type == "talento"].sponsors[]._ref)
  ] | order(nombre asc) {
    _id,
    nombre,
    url,
    "logo": logo{
      "url": asset->url,
      alt
    }
  }
`);
