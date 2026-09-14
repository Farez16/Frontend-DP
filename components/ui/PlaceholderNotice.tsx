import { Container } from "./Container";
import { Button } from "./Button";

interface PlaceholderNoticeProps {
  eyebrow: string;
  title: string;
  note?: string;
}

/**
 * Cuerpo mínimo para las rutas todavía sin contenido real (Conferencias,
 * Proyectos, Medios, Nosotros, Contacto) — la Fase 1-3 pide validar el
 * routing, no migrar las 8 páginas completas. Cada ruta sigue teniendo
 * su propio eyebrow/H1 real (y por lo tanto su propio <title>), sólo el
 * cuerpo es un placeholder honesto.
 */
export function PlaceholderNotice({ eyebrow, title, note }: PlaceholderNoticeProps) {
  return (
    <Container className="flex min-h-[50vh] flex-col items-center justify-center gap-6 py-30 text-center">
      <p className="font-body text-label-caps uppercase tracking-widest text-amber">{eyebrow}</p>
      <h1 className="text-heading-lg font-display uppercase">{title}</h1>
      <p className="max-w-lg font-body text-body-lg text-foreground-muted">
        {note ??
          "Esta sección se construye sobre la arquitectura ya lista en la Fase 4 de la migración."}
      </p>
      <Button href="/" icon="arrow_forward">
        Volver al inicio
      </Button>
    </Container>
  );
}
