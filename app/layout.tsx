import type { Metadata } from "next";
import "./globals.css";
import { anton, archivoNarrow, dancingScript } from "@/lib/fonts";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://somosdp.com"),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "es_EC",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${anton.variable} ${archivoNarrow.variable} ${dancingScript.variable}`}
    >
      <head>
        {/* Material Symbols: fuente de ícono variable con ejes propios
            (FILL/wght/GRAD/opsz) — se mantiene como <link> centralizado
            aquí (una sola vez, no por página) en vez de next/font/google,
            ver docs/ARQUITECTURA.md. display=block es intencional para
            un ícono (evita mostrar el texto-ligature de respaldo, p. ej.
            "arrow_forward" literal, mientras carga) — no aplica el mismo
            criterio que para texto de lectura. eslint-plugin-next no
            puede distinguir "ya está en el layout raíz, una sola vez"
            de "un <link> de fuente cualquiera", de ahí las 2 reglas. */}
        {/* eslint-disable-next-line @next/next/google-font-display, @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body className="flex min-h-screen flex-col font-body text-foreground antialiased selection:bg-amber selection:text-on-amber">
        <Header />
        <main className="flex-1 pt-[72px]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
