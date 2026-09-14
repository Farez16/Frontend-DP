import type { Metadata } from "next";
import { PlaceholderNotice } from "@/components/ui/PlaceholderNotice";

export const metadata: Metadata = {
  title: "Proyectos",
  description: "DP Team — proyecto independiente, no una división de DP Agencia Deportiva.",
};

export default function ProyectosPage() {
  return (
    <PlaceholderNotice
      eyebrow="Proyectos"
      title="DP Team"
      note="Contenido real en la Fase 4 — el aviso de proyecto independiente (no es una división de DP Agencia Deportiva) debe modelarse como campo de datos, no como texto libre."
    />
  );
}
