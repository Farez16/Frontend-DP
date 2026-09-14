import { Anton, Archivo_Narrow, Dancing_Script } from "next/font/google";

/**
 * Las 3 familias reales del prototipo, autohospedadas vía next/font
 * (cero peticiones a Google en runtime, cero <link> por página).
 * Se aplican una sola vez en app/layout.tsx.
 */

export const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-anton",
});

export const archivoNarrow = Archivo_Narrow({
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-archivo-narrow",
});

// Uso único: firma cursiva en la ficha de Daniel Pintado (Fase 4).
export const dancingScript = Dancing_Script({
  weight: "700",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dancing-script",
});

export const fontVariables = [
  anton.variable,
  archivoNarrow.variable,
  dancingScript.variable,
].join(" ");
