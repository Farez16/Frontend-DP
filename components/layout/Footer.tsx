import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { contactoNav } from "@/lib/nav";

const LEGAL_LINKS = ["Privacidad", "Cookies", "Términos"];

/**
 * Idéntico en las 14 páginas del prototipo, cero variación — el caso
 * más simple de componentizar. Los enlaces legales siguen inertes a
 * propósito (todavía no existen esas páginas; decisión ya tomada, no
 * se inventan ahora).
 *
 * Rediseño 2026-09-23: layout de 2 columnas — wordmark + eslogan +
 * copyright a la izquierda; links en fila a la derecha. En ≤ md se
 * apilan en columna para evitar overflow en 375px.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto w-full border-t border-line bg-surface-deep">
      <Container className="flex flex-col items-center gap-6 py-10 md:flex-row md:items-center md:justify-between md:gap-10">
        {/* Bloque izquierdo: wordmark + eslogan + copyright */}
        <div className="flex flex-col items-center gap-1 md:items-start">
          <span className="font-display text-heading-md leading-none text-foreground opacity-20">
            DP
          </span>
          <p className="font-body text-body-md text-foreground-muted">
            El deporte no se construye solo.
          </p>
          <p className="font-body text-body-md text-foreground-muted opacity-60">
            © {year} DP Agencia Deportiva. Todos los derechos reservados.
          </p>
        </div>

        {/* Bloque derecho: links en fila horizontal */}
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 font-body text-body-md md:flex-nowrap md:justify-end">
          {LEGAL_LINKS.map((label) => (
            <li key={label}>
              <span className="cursor-default select-none text-foreground-muted opacity-55">
                {label}
              </span>
            </li>
          ))}
          <li>
            <Link
              href={contactoNav.href}
              className="inline-block text-foreground-muted transition-[color,padding-left] duration-300 hover:pl-1 hover:text-amber"
            >
              {contactoNav.label}
            </Link>
          </li>
        </ul>
      </Container>
    </footer>
  );
}
