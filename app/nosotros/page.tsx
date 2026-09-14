import type { Metadata } from "next";
import { PlaceholderNotice } from "@/components/ui/PlaceholderNotice";

export const metadata: Metadata = {
  title: "Nosotros",
  description: "El equipo detrás del deporte.",
};

export default function NosotrosPage() {
  return (
    <PlaceholderNotice
      eyebrow="Nosotros"
      title="El equipo detrás del deporte"
      note="Contenido real del equipo (Juan Pacheco, Joel Gutiérrez) llega en la Fase 4."
    />
  );
}
