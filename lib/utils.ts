import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Las utilidades tipográficas del sitio (ver app/globals.css) no son tamaños del
 * tema de Tailwind sino clases propias — `@utility text-label-caps`, `.text-body-lg`,
 * etc. tailwind-merge no las conoce, y su heurística para `text-*` las tomaría por
 * colores: `text-label-caps` conviviría con `text-[20px]` en vez de reemplazarlo, que
 * es justo el conflicto que se quería resolver. Registrándolas en `font-size` pasan a
 * competir entre ellas y con cualquier `text-[Npx]`, y los colores (`text-amber`,
 * `text-foreground-muted`) siguen en su propio grupo, intactos.
 *
 * Esta lista es un espejo de globals.css: al añadir una utilidad `text-*` allá, hay
 * que añadirla aquí. `font-signature` va en font-family por el mismo motivo.
 */
const twMerge = extendTailwindMerge({
  /**
   * Por defecto tailwind-merge asume que una clase de tamaño borra un `leading-*`
   * anterior, porque el `text-sm` de Tailwind trae su propio line-height. Aquí esa
   * regla sólo hace daño: el sitio no usa esa escala (no hay un solo `text-sm` /
   * `text-lg` / `text-xl` en el código) y sus tamaños arbitrarios —`text-[32px]`,
   * `text-[clamp(...)]`— no traen line-height ninguno, así que borrar el
   * `leading-none` del componente dejaba el valor a merced del line-height heredado.
   * Se vio en los 10 StatBlock del perfil de talento. El idioma del proyecto es
   * escribir el tamaño y el interlineado juntos, y los dos deben sobrevivir.
   */
  override: {
    conflictingClassGroups: {
      "font-size": [],
    },
  },
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display-hero",
            "display-hero-ajustable",
            "heading-lg",
            "heading-md",
            "heading-md-ajustable",
            "stat",
            "body-lg",
            "body-md",
            "body-sm",
            "label-caps",
          ],
        },
      ],
      "font-family": [{ font: ["display", "body", "signature"] }],
    },
  },
});

/**
 * Combina clases y resuelve los conflictos de Tailwind: de dos clases del mismo
 * grupo gana la última, que es lo que permite que el `className` de quien usa un
 * componente sobrescriba las clases base que ese componente inyecta.
 *
 * Antes era un `filter(Boolean).join(" ")`: las dos clases sobrevivían y el ganador
 * lo decidía el orden del CSS generado, no el del argumento. Por eso el botón de
 * contacto del Header tuvo que dejar de usar <Button> para poder cambiarle la
 * tipografía (decisión #78).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
