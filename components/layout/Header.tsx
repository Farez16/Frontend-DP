import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { primaryNav, contactoNav } from "@/lib/nav";
import { NavLink } from "./NavLink";
import { MobileNav } from "./MobileNav";
import { HeaderShell } from "./HeaderShell";

/**
 * Sigue siendo Server Component: el único estado (transparente sobre el hero →
 * sólido al scrollear, decisión #52) vive en HeaderShell, que envuelve esto sin
 * arrastrar los links ni el botón al cliente.
 */
export function Header() {
  return (
    <HeaderShell>
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
    </HeaderShell>
  );
}
