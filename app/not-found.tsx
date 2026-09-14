import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <p className="font-body text-label-caps uppercase tracking-widest text-amber">Error 404</p>
      <h1 className="text-heading-lg font-display uppercase">Esta página no existe</h1>
      <p className="max-w-md font-body text-body-lg text-foreground-muted">
        Puede que el enlace esté roto o que la página se haya movido.
      </p>
      <Button href="/" icon="arrow_forward">
        Volver al inicio
      </Button>
    </Container>
  );
}
