import type { Metadata } from "next";
import { PlaceholderNotice } from "@/components/ui/PlaceholderNotice";

export const metadata: Metadata = {
  title: "Conferencias",
  description: "Del alto rendimiento a la vida y los negocios.",
};

export default function ConferenciasPage() {
  return (
    <PlaceholderNotice
      eyebrow="Conferencias"
      title="Del alto rendimiento a la vida y los negocios"
      note='La vitrina de medios (MediaSwitcher, ya construido) y el contenido real de "Ganar antes de ganar" se montan aquí en la Fase 4.'
    />
  );
}
