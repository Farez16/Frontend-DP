/**
 * Combina clases condicionalmente. Se evaluó instalar clsx/tailwind-merge;
 * se pospone — con el tamaño actual del set de componentes, esta función
 * de 1 línea cubre el mismo caso sin sumar una dependencia.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
