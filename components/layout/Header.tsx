import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { primaryNav, contactoNav } from "@/lib/nav";
import { NavLink } from "./NavLink";
import { MobileNav } from "./MobileNav";

/**
 * Server Component: sólido desde el primer momento en las 14 páginas
 * de esta fase (ninguna tiene todavía un hero full-bleed). La variante
 * transparente-sobre-hero del prototipo (Inicio, ficha de atleta) es
 * trabajo de la Fase 4, cuando exista el hero real al que superponerse
 * — añadirla ahora sería estado sin nada que gobernar.
 */
export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line/35 bg-background/82 backdrop-blur-md">
      <Container className="flex h-[72px] items-center justify-between gap-6">
        <Link
          href="/"
          aria-label="DP Agencia Deportiva — Inicio"
          className="shrink-0 font-display text-heading-md leading-none tracking-tighter text-foreground"
        >
          DP
        </Link>

        <ul className="hidden items-center gap-6 xl:flex">
          {primaryNav.map((item) => (
            <li key={item.href}>
              <NavLink href={item.href}>{item.label}</NavLink>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1">
          {/* Envuelto aparte: Button ya trae "inline-flex" fijo para su
              propio layout interno, así que alternar la visibilidad
              (hidden/xl:inline-flex) en el propio Button competiría con
              esa clase por especificidad. El wrapper resuelve la
              visibilidad sin tocar el display interno del botón. */}
          <div className="hidden xl:inline-flex">
            <Button href={contactoNav.href} className="px-6 py-3">
              {contactoNav.label}
            </Button>
          </div>
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
