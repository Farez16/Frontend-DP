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
          {/* Decisión #78: el botón de contacto va al tamaño de los links del nav
              (Archivo Narrow 14px bold caps), no a la clase base de Button, pensada
              para CTAs grandes (Anton 20px).

              Ya se puede hacer con <Button>: cn() pasa por tailwind-merge, así que
              font-body reemplaza a font-display, text-label-caps a text-[20px],
              px-6 py-3 a px-9 py-4, y hidden al inline-flex de la base —
              xl:inline-flex sobrevive por ser otro breakpoint. Antes esto obligaba a
              un <Link> aparte que replicaba a mano los estilos amber de Button y podía
              desincronizarse de él.

              El tracking no se toca: lo pone la base de Button (tracking-wide, 0.35px
              a 14px) y es exactamente el mismo que llevan los NavLink. text-label-caps
              trae 0.1em, pero los links del nav también lo pisan con tracking-wide, así
              que heredarlo es lo que iguala de verdad a los dos. */}
          <Button
            href={contactoNav.href}
            className="hidden xl:inline-flex px-6 py-3 font-body text-label-caps"
          >
            {contactoNav.label}
          </Button>
          <MobileNav />
        </div>
      </Container>
    </HeaderShell>
  );
}
