import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "./env";

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  /**
   * El CDN de Sanity (apicdn.sanity.io) sirve respuestas cacheadas en el borde: en
   * producción es justo lo que se quiere, pero en local convierte cada cambio publicado
   * en el Studio en una espera a ciegas de hasta ~1 minuto antes de verlo en la página.
   *
   * `next dev` corre con NODE_ENV=development y `next build`/`next start` con production,
   * así que esta condición apaga el CDN solo donde estorba. Mismo criterio que el `isDev`
   * de Studio-DP/sanity.config.ts, que es ese mismo chequeo con otro nombre.
   *
   * Ojo: en build NODE_ENV ya es production, así que los `withConfig({ useCdn: false })`
   * de los generateStaticParams de /talentos/[slug] y /noticias/[slug] siguen haciendo
   * falta — son los que ven un documento recién publicado que aún no llegó al CDN.
   */
  useCdn: process.env.NODE_ENV === "production",
});
