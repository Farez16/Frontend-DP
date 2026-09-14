import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { contactoNav } from "@/lib/nav";

const LEGAL_LINKS = ["Privacidad", "Cookies", "Términos"];

/**
 * Idéntico en las 14 páginas del prototipo, cero variación — el caso
 * más simple de componentizar. Los enlaces legales siguen inertes a
 * propósito (todavía no existen esas páginas; decisión ya tomada, no
 * se inventan ahora).
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto w-full border-t border-line bg-surface-deep">
      <Container className="grid grid-cols-1 items-center gap-6 py-16 md:grid-cols-[1fr_auto_1fr] md:gap-10">
        <div className="flex items-baseline justify-center gap-3 md:justify-start">
          <span className="font-display text-heading-md leading-none text-foreground opacity-20">
            DP
          </span>
          <p className="font-body text-body-md text-foreground-muted">
            El deporte no se construye solo.
          </p>
        </div>

        <p className="text-center font-body text-body-md text-foreground-muted md:whitespace-nowrap">
          © {year} DP Agencia Deportiva. Todos los derechos reservados.
        </p>

        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 font-body text-body-md md:justify-end">
          {LEGAL_LINKS.map((label) => (
            <li key={label}>
              <span className="cursor-default text-foreground-muted opacity-55 select-none">
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
