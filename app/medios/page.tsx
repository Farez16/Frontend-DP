import type { Metadata } from "next";
import { PlaceholderNotice } from "@/components/ui/PlaceholderNotice";

export const metadata: Metadata = {
  title: "Medios y Prensa",
  description: "Recursos para prensa: fotografías, biografía oficial, media kit y contacto.",
};

export default function MediosPage() {
  return (
    <PlaceholderNotice
      eyebrow="Medios y Prensa"
      title="Recursos para prensa"
      note="Fotografías, biografía oficial y media kit se publican aquí en cuanto el material oficial esté listo (Fase 4)."
    />
  );
}
