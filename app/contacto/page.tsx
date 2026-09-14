import type { Metadata } from "next";
import { PlaceholderNotice } from "@/components/ui/PlaceholderNotice";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Escríbenos — contacto@somosdp.com, Cuenca, Ecuador.",
};

export default function ContactoPage() {
  return (
    <PlaceholderNotice
      eyebrow="Contacto"
      title="Hablemos"
      note="El formulario real (LeadForm) se construye en la Fase 4/5 con Resend — ver docs/ARQUITECTURA.md. Mientras tanto: contacto@somosdp.com."
    />
  );
}
