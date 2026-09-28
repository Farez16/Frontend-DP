import type { NextConfig } from "next";
import { MOTIVO_PATROCINIO, PARAM_DEPORTISTA, PARAM_MOTIVO } from "./lib/contacto";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
    ],
  },
  async redirects() {
    return [
      {
        /**
         * `/talentos/:slug/patrocinar` existió como placeholder y se borró: su caso
         * de uso lo cubre /contacto con el formulario prellenado (decisión #51, que
         * ya había movido el CTA del perfil allá).
         *
         * 308 permanente porque la ruta no vuelve — el pedido de patrocinio es ahora
         * un motivo del formulario, no una página. Nunca estuvo enlazada desde el
         * sitio (la auditoría la encontró huérfana), así que casi nadie puede tenerla
         * cacheada; aun así el redirect existe para que un enlace viejo o un
         * marcador no caigan en un 404.
         *
         * Los identificadores no se escriben a mano acá: salen de lib/contacto.ts,
         * el mismo módulo que usa el botón del perfil para construir la URL y el
         * formulario para validar lo que llega. Ese módulo es TypeScript puro, sin
         * React ni Next, justamente para poder importarse desde este archivo.
         */
        source: "/talentos/:slug/patrocinar",
        destination: `/contacto?${PARAM_MOTIVO}=${MOTIVO_PATROCINIO}&${PARAM_DEPORTISTA}=:slug`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
