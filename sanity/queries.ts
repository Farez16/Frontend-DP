import { defineQuery } from "next-sanity";

/**
 * `client` (ver ./client.ts) no usa token y lee con useCdn:true — un cliente
 * sin token nunca puede ver documentos en borrador (drafts.*), así que
 * "publicado" ya está garantizado por la configuración del cliente, no hace
 * falta un filtro explícito en las queries. Si más adelante se agrega un
 * cliente autenticado (Presentation/preview de Visual Editing), revisar esto.
 */

/**
 * Las imágenes que el sitio recorta proyectan, además de la url del asset, el _ref del
 * asset + hotspot + crop: eso es lo que necesita el builder de @sanity/image-url (ver
 * ./image.ts) para que el CDN devuelva el recorte que el editor marcó en el Studio, en
 * vez de un recorte al centro hecho por el navegador con object-cover.
 *
 * No lo llevan las que no se recortan: el logo de una marca va con object-contain y la
 * imagen de OG se entrega tal cual, así que para esas { url, alt } sigue alcanzando.
 */

/**
 * Singleton de configuración del sitio: solo el bloque SEO, que sirve para
 * sobrescribir a mano el título/descripción/imagen de las dos páginas que no son
 * un documento (Inicio y el listado /talentos).
 *
 * Devuelve null mientras nadie haya publicado el documento, y eso es el caso normal,
 * no un error: sin override, cada página se describe sola a partir de los talentos.
 */
export const CONFIGURACION_SITIO_QUERY = defineQuery(/* groq */ `
  *[_id == "configuracionSitio"][0]{
    seo{
      metaTitulo,
      metaDescripcion,
      "imagenOG": imagenOG{
        "url": asset->url
      }
    }
  }
`);

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
        alt,
        "assetRef": asset._ref,
        hotspot,
        crop
      },
      orden
    }
`);

/**
 * /talentos — listado completo del roster, sin filtrar por
 * destacadoEnInicio (a diferencia del Home). Orden alfabético por nombre.
 *
 * Tope de 100 (decisión #64): hoy el roster real es de 1 talento, así que 100 es
 * ~100x de margen y nunca va a recortar nada en la práctica. Existe como red de
 * seguridad contra una consulta sin límite, y porque esta misma query alimenta
 * generateStaticParams — sin tope, el build escala con el dataset. Un roster que
 * pase de 100 necesita paginación de todas formas, y ahí la query se rehace.
 */
export const TALENTOS_LISTADO_QUERY = defineQuery(/* groq */ `
  *[_type == "talento"]
    | order(nombre asc)[0...100]
    {
      _id,
      nombre,
      "slug": slug.current,
      disciplina,
      "foto": fotografiaPrincipal{
        "url": asset->url,
        alt,
        "assetRef": asset._ref,
        hotspot,
        crop
      }
    }
`);

/**
 * /talentos/[slug] — perfil individual completo: identidad, "Atleta",
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
      alt,
      "assetRef": asset._ref,
      hotspot,
      crop
    },
    // Opcional (decisión #59): si está vacía, el hero cae a fotografiaPrincipal.
    "fotoHero": fotografiaHero{
      "url": asset->url,
      alt,
      "assetRef": asset._ref,
      hotspot,
      crop
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
    // Las de la galería llevan además las dimensiones del asset: la vista ampliada
    // (lightbox) muestra la foto entera, sin el recorte cuadrado del mosaico, y
    // next/image necesita la proporción para dibujar una caja del tamaño exacto de la
    // foto. Ver proporcionRecortada() en app/talentos/[slug]/page.tsx, que le descuenta
    // el crop del editor antes de usarlas.
    galeria[]{
      _type,
      _key,
      _type == "image" => {
        "url": asset->url,
        alt,
        "assetRef": asset._ref,
        hotspot,
        crop,
        "ancho": asset->metadata.dimensions.width,
        "alto": asset->metadata.dimensions.height
      },
      _type == "videoBunny" => {
        videoId,
        titulo,
        "miniatura": miniatura{
          "url": asset->url,
          alt,
          "assetRef": asset._ref,
          hotspot,
          crop,
          "ancho": asset->metadata.dimensions.width,
          "alto": asset->metadata.dimensions.height
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
    },
    seo{
      metaTitulo,
      metaDescripcion,
      "imagenOG": imagenOG{
        "url": asset->url
      }
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
        alt,
        "assetRef": asset._ref,
        hotspot,
        crop
      }
    }
`);

/**
 * Home — marcas, derivadas de los sponsors que referencian los talentos (no
 * de una lista propia de sponsors). array::unique() dedupe los _ref de forma
 * nativa en GROQ, antes de resolver los documentos — evita traer duplicados
 * y filtrar en JavaScript. `tier` se ignora a propósito: esa jerarquía es
 * para el perfil individual del talento, no para esta franja del Home.
 *
 * Tope de 200 (decisión #64): red de seguridad contra una consulta sin límite, no
 * un filtro editorial. El corte es alfabético, así que cualquier tope alcanzable
 * haría desaparecer del Home —en silencio— a las marcas del final del abecedario,
 * y eso es un patrocinador pagando por una visibilidad que no recibe. Por eso el
 * número se eligió deliberadamente fuera de alcance en vez de ajustado al dataset.
 *
 * Nota aparte: SponsorMarquee recorre el ciclo en 40s fijos sin importar cuántos
 * logos haya, así que pasadas ~50 marcas la franja deja de ser legible. Ese es un
 * problema del componente (duración o paginación visual), no de esta query, y no
 * se resuelve recortando datos aquí.
 */
export const MARCAS_HOME_QUERY = defineQuery(/* groq */ `
  *[
    _type == "sponsor" &&
    _id in array::unique(*[_type == "talento"].sponsors[]._ref)
  ] | order(nombre asc)[0...200] {
    _id,
    nombre,
    url,
    "logo": logo{
      "url": asset->url,
      alt,
      "ancho": asset->metadata.dimensions.width,
      "alto": asset->metadata.dimensions.height
    }
  }
`);
