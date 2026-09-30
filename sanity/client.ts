import { createClient, type QueryParams } from "next-sanity";

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
   * de los generateStaticParams de /talentos/[slug], /noticias/[slug] y
   * /conferencias/[slug] siguen haciendo falta — son los que ven un documento recién
   * publicado que aún no llegó al CDN.
   */
  useCdn: process.env.NODE_ENV === "production",
});

/**
 * Vida del Data Cache de Next para las lecturas de Sanity, en segundos.
 *
 * 60 es el valor que usa la propia guía de Sanity para Next (`sanityFetch` de
 * "Caching and revalidation in Next.js"). Acá cumple dos cosas distintas:
 *
 * - En runtime: cada página pasa a ISR de 60s, así que publicar en el Studio se ve
 *   en el sitio como máximo un minuto después, sin redeploy.
 * - En build: la entrada del caché queda vencida entre un build y el siguiente, así
 *   que `next build` vuelve a preguntarle a Sanity en vez de reusar la respuesta
 *   guardada en `.next/cache/fetch-cache`.
 *
 * Ese segundo punto es el que arregla el bug real: sin `revalidate`, Next guardaba
 * cada respuesta con `revalidate: 31536000` (un año, el default que hereda una ruta
 * estática con `revalidate = false`) y la reusaba en builds posteriores, así que
 * publicar en el Studio no se reflejaba hasta borrar `.next/cache/fetch-cache` a mano.
 * `.next/cache` se comparte entre builds a propósito, y en hosts como Vercel sobrevive
 * a los redeploys, así que el problema no era solo local.
 *
 * Contrapartida conocida: si se publica y se rebuildea dentro de la misma ventana de
 * 60s, ese build todavía sale con el contenido viejo. En runtime se corrige solo al
 * minuto. Si algún día hace falta que sea inmediato y exacto, el camino es el otro que
 * documenta Sanity: `next: { tags }` + un webhook del Studio que llame a
 * `revalidateTag`, y ahí `revalidate` pasa a `false`.
 */
export const REVALIDACION_SANITY_SEGUNDOS = 60;

/**
 * Único punto de lectura de Sanity para lo que se renderiza (páginas y
 * `generateMetadata`). Envuelve `client.fetch` solo para fijar la política de caché en
 * un lugar, en vez de repetir `{ next: { revalidate } }` en cada llamada.
 *
 * Los `generateStaticParams` quedan afuera a propósito, con `client.withConfig(...)`
 * directo: Next no guarda en el Data Cache los fetch de esa fase —verificado leyendo
 * `.next/cache/fetch-cache` tras un build: cero entradas de esas queries—, así que ya
 * ven siempre la lista de slugs fresca y no necesitan `revalidate`.
 */
export function sanityFetch<T>(
  query: string,
  params: QueryParams = {},
): Promise<T> {
  return client.fetch<T>(query, params, {
    next: { revalidate: REVALIDACION_SANITY_SEGUNDOS },
  });
}
