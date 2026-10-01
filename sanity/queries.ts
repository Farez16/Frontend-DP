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
        // Las escribe la function bunny-stream-upload leyendo la API de Bunny, y solo
        // cuando la codificacion termino. Pueden faltar por un rato; el sitio cae a 16:9.
        dimensiones,
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
    // Conferencias de este talento (decisiones #81 y #83). El bloque "Tambien es
    // conferencista" de la ficha las necesita para dos cosas: para existir —el flag
    // conferencista.ofrece solo enciende el bloque si hay algo real a lo que llevar— y
    // para decidir si el CTA es un boton a una conferencia o un mini-listado.
    //
    // Va como subconsulta y no como query aparte a proposito: filtrar por talento._ref
    // necesita el _id del talento, que solo se conoce despues de resolver esta, asi que
    // una segunda query obligaria a encadenar dos viajes en vez de hacer uno. El ^._id
    // lo resuelve GROQ del documento que se esta proyectando.
    //
    // defined(slug.current) por el mismo motivo que en CONFERENCIAS_LISTADO_QUERY: sin
    // slug no hay ruta de detalle a la que enlazar, y el enlace caeria en un 404. El
    // orden alfabetico y el tope de 100 son los mismos que ese listado, para que la
    // ficha y /conferencias no presenten el mismo catalogo de dos formas distintas.
    "conferencias": *[
      _type == "conferencia" &&
      talento._ref == ^._id &&
      defined(slug.current)
    ] | order(titulo asc)[0...100] {
      _id,
      titulo,
      "slug": slug.current
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
 * /noticias — listado completo, orden cronológico descendente.
 *
 * Sin límite explícito: las noticias crecen despacio y en el momento en que el
 * volumen justifique paginación, la query se rehace de todas formas. El Home tiene
 * su propio tope de 4 que no afecta aquí.
 */
export const NOTICIAS_LISTADO_QUERY = defineQuery(/* groq */ `
  *[_type == "noticia"]
    | order(fecha desc)
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
 * /noticias/[slug] — detalle de una noticia por slug.
 *
 * `cuerpo` (Portable Text) se proyecta plano, sin sub-proyección: el campo es un
 * array de bloques `block` a secas, sin tipos personalizados adentro, así que no
 * hay ninguna referencia ni asset que resolver con `->`. Lo dibuja el componente
 * RichText. El bloque `seo` se incluye para que generateMetadata pueda usar
 * override real en lugar del fallback automático.
 */
export const NOTICIA_DETALLE_QUERY = defineQuery(/* groq */ `
  *[_type == "noticia" && slug.current == $slug][0]{
    _id,
    titulo,
    "slug": slug.current,
    categoria,
    fecha,
    extracto,
    cuerpo,
    "portada": portada{
      "url": asset->url,
      alt,
      "assetRef": asset._ref,
      hotspot,
      crop
    },
    talentosRelacionados[]->{
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
 * /noticias/[slug] — otras noticias recientes para la barra lateral (excluye la actual).
 *
 * Proyecta sólo lo que la tarjeta dibuja: categoría, fecha, título y el slug del
 * enlace. Nada de `portada` a propósito — el sidebar no muestra imagen, y proyectar
 * el asset con su hotspot y su crop hace que el CDN arme un recorte que nadie ve.
 */
export const NOTICIAS_RECIENTES_QUERY = defineQuery(/* groq */ `
  *[_type == "noticia" && slug.current != $slug]
    | order(fecha desc)[0...3]
    {
      titulo,
      "slug": slug.current,
      categoria,
      fecha
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

/**
 * /conferencias — listado de conferencias con slug, en orden alfabético.
 *
 * `slug` no es requerido en el schema de conferencia.ts, así que se filtra con
 * `defined(slug.current)`. Ojo con lo que eso implica hoy: la ruta de detalle
 * `/conferencias/[slug]` todavía no existe —se construye en la fase Co2—, así que
 * el filtro no garantiza ningún destino; por ahora solo evita listar documentos que
 * no podrían tener uno. La contracara es que una conferencia a la que el editor no
 * le generó el slug desaparece del listado en silencio.
 *
 * Tope de 100, mismo criterio que TALENTOS_LISTADO_QUERY: red de seguridad contra una
 * consulta sin límite, no un filtro editorial. El corte es alfabético, así que un tope
 * alcanzable escondería sin aviso las conferencias del final del abecedario; 100 está
 * deliberadamente fuera del alcance del catálogo previsible.
 *
 * Proyecta:
 * - Identidad y contenido para la tarjeta: _id, titulo, slug, publicoObjetivo.
 * - Talento referenciado: nombre y foto principal (con _ref, hotspot y crop para que
 *   el CDN de Sanity aplique el encuadre del editor). El slug del talento no se
 *   proyecta: la tarjeta muestra el nombre como texto, no como enlace al perfil.
 * - Portada: el `medio` que eligió el editor —la imagen, o la miniatura si es un video
 *   de Bunny Stream— con _ref, hotspot y crop. Sin medio, null y la tarjeta cae a la
 *   foto del talento. Se lee `medio[0]` aunque el schema ya tope el array en uno: si
 *   algo escribiera un segundo elemento por API, la tarjeta sigue mostrando el primero.
 */
export const CONFERENCIAS_LISTADO_QUERY = defineQuery(/* groq */ `
  *[_type == "conferencia" && defined(slug.current)]
    | order(titulo asc)[0...100]
    {
      _id,
      titulo,
      "slug": slug.current,
      publicoObjetivo,
      talento->{
        nombre,
        "foto": fotografiaPrincipal{
          "url": asset->url,
          alt,
          "assetRef": asset._ref,
          hotspot,
          crop
        }
      },
      "portada": select(
        medio[0]._type == "image" => medio[0]{
          "url": asset->url,
          alt,
          "assetRef": asset._ref,
          hotspot,
          crop
        },
        medio[0]._type == "videoBunny" => medio[0].miniatura{
          "url": asset->url,
          alt,
          "assetRef": asset._ref,
          hotspot,
          crop
        }
      )
    }
`);

/**
 * /conferencias/[slug] — detalle de una conferencia.
 *
 * Proyecta los nueve campos del schema de conferencia.ts, ninguno de más:
 * titulo, slug, descripcion, publicoObjetivo, talento, apariciones, medio,
 * notaComercial y seo.
 *
 * `descripcion` (Portable Text) va plana, sin sub-proyección, por el mismo motivo que
 * el `cuerpo` de la noticia: es un array de bloques `block` a secas, sin tipos
 * personalizados adentro, así que no hay referencia ni asset que resolver. Lo dibuja
 * RichText.
 *
 * `apariciones` proyecta su `_key` porque es lo único estable para la clave de React:
 * dos apariciones pueden repetir fecha y lugar.
 *
 * Van ordenadas por fecha descendente, la más reciente primero. Esto reemplaza al
 * criterio anterior —respetar el orden en que el editor las arrastraba en el Studio—,
 * que se descartó al pasar el bloque a carrusel: la primera que se ve es ahora la que
 * abre la rotación, y que eso dependa de un arrastre manual hacía que la aparición
 * destacada fuera la que alguien dejó arriba sin pensarlo, no la más actual. El orden
 * se resuelve acá y no en JavaScript por lo mismo que los demás listados del archivo.
 *
 * `medio` llega como un solo objeto (`medio[0]`, mismo motivo que en el listado) con su
 * `_type`, que es lo que decide qué se dibuja. Si es un video se proyecta entero (no solo
 * la miniatura como en el listado): el detalle necesita saber si existe `videoId` para
 * decidir si dibuja el reproductor, que sería mentira sobre una portada sin video.
 */
export const CONFERENCIA_DETALLE_QUERY = defineQuery(/* groq */ `
  *[_type == "conferencia" && slug.current == $slug][0]{
    _id,
    titulo,
    "slug": slug.current,
    descripcion,
    publicoObjetivo,
    notaComercial,
    talento->{
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
    },
    "apariciones": apariciones[] | order(fecha desc) {
      _key,
      fecha,
      lugar,
      ciudad
    },
    "medio": medio[0]{
      _type,
      _type == "image" => {
        "url": asset->url,
        alt,
        "assetRef": asset._ref,
        hotspot,
        crop
      },
      _type == "videoBunny" => {
        videoId,
        titulo,
        // Ver la nota en la galeria de talento: las escribe la function cuando Bunny
        // termino de codificar, asi que pueden faltar por un rato.
        dimensiones,
        "miniatura": miniatura{
          "url": asset->url,
          alt,
          "assetRef": asset._ref,
          hotspot,
          crop
        }
      }
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
