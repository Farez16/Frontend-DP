/**
 * Cuánto mide, en em de Anton, la palabra más larga de un título que viene de Sanity.
 *
 * Lo usan las utilidades `text-display-hero-ajustable` y `text-heading-md-ajustable`
 * (app/globals.css): el tamaño de letra queda en `min(tamaño de diseño, 100cqi / este
 * ancho)`, así que si la palabra más larga entra en su columna el título se ve igual que
 * siempre, y si no entra se achica lo justo para que entre entera. El salto de línea solo
 * puede caer entre palabras: lo que se parte a la mitad es una palabra más ancha que la
 * columna, y esa es la única que importa medir.
 *
 * Por qué una tabla y no un promedio por letra: en Anton una "I" mide 0,227em y una "M"
 * 0,746em, así que "MMMM" ocupa más del triple que "IIII". Con un promedio, las palabras
 * con letras anchas se seguían partiendo, o había que achicar de más todo lo demás.
 *
 * Solo importa un tipo de React, que desaparece al compilar: el módulo se puede probar
 * de forma aislada.
 */

import type { CSSProperties } from "react";

/**
 * Avance de cada carácter en mayúsculas, en em. Medido el 2026-10-02 con canvas
 * (`measureText` a 1000px) sobre la Anton que sirve next/font en este sitio. La suma de
 * avances nunca queda por debajo del ancho real de la palabra —el kerning de Anton solo
 * acerca letras ("AVATAR": 2,797 sumado contra 2,730 real)—, así que la estimación
 * siempre peca de grande, nunca de chica.
 *
 * Fuera de Prettier a propósito: es una tabla, y una entrada por línea la haría ilegible.
 */
// prettier-ignore
const AVANCE_ANTON: Record<string, number> = {
  A: 0.485, B: 0.479, C: 0.474, D: 0.493, E: 0.412, F: 0.399, G: 0.485, H: 0.499,
  I: 0.227, J: 0.466, K: 0.472, L: 0.397, M: 0.746, N: 0.498, O: 0.486, P: 0.472,
  Q: 0.494, R: 0.477, S: 0.461, T: 0.396, U: 0.474, V: 0.469, W: 0.712, X: 0.484,
  Y: 0.446, Z: 0.41, Á: 0.485, É: 0.412, Í: 0.227, Ó: 0.486, Ú: 0.474, Ü: 0.474,
  Ñ: 0.498, "0": 0.494, "1": 0.331, "2": 0.494, "3": 0.494, "4": 0.494, "5": 0.494,
  "6": 0.494, "7": 0.494, "8": 0.494, "9": 0.494, "-": 0.311, ".": 0.229, ",": 0.236,
  "&": 0.52, "'": 0.214, "’": 0.232, '"': 0.429, "“": 0.464, "”": 0.463, "(": 0.291,
  ")": 0.291, "/": 0.405, "!": 0.229, "¿": 0.493, "?": 0.492, ":": 0.242, "+": 0.355,
  "#": 0.546,
};

/** Un carácter que no está en la tabla cuenta como el más ancho medido, la "M". */
const AVANCE_DESCONOCIDO = 0.746;

/**
 * 2% de margen por el redondeo a subpíxeles del navegador: sin él, una palabra que
 * entraba justa podía quedarse sin el último píxel y partirse igual.
 */
const MARGEN = 1.02;

export function anchoPalabraMasLarga(texto: string): number {
  const palabras = texto.toLocaleUpperCase("es").split(/\s+/).filter(Boolean);
  const anchos = palabras.map((palabra) =>
    [...palabra].reduce(
      (suma, caracter) => suma + (AVANCE_ANTON[caracter] ?? AVANCE_DESCONOCIDO),
      0,
    ),
  );
  // Nunca por debajo de 1: es un divisor en el CSS, y un nombre vacío no debe dejar
  // la regla inválida.
  return Math.max(1, Math.ceil(Math.max(0, ...anchos) * MARGEN * 1000) / 1000);
}

/**
 * El `style` que lleva el título: la variable que leen las utilidades ajustables. Va en
 * una función para que el nombre de la variable viva en un solo lugar del lado de React.
 */
export function estiloTituloAjustable(texto: string): CSSProperties {
  // CSSProperties no conoce variables propias; React las escribe tal cual, sin "px".
  return { "--palabra-mas-larga": anchoPalabraMasLarga(texto) } as CSSProperties;
}
