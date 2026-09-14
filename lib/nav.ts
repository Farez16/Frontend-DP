import type { NavItem } from "@/types/content";

/**
 * Fuente única del nav — Header (desktop) y MobileNav leen de aquí,
 * así nunca pueden desincronizarse entre sí. Orden y etiquetas según
 * el rebranding "Talentos" (2026-09-11): Inicio · Talentos · Proyectos ·
 * Conferencias · Noticias · Medios · Nosotros + Contacto aparte.
 */
export const primaryNav: NavItem[] = [
  { href: "/", label: "Inicio" },
  { href: "/talentos", label: "Talentos" },
  { href: "/proyectos", label: "Proyectos" },
  { href: "/conferencias", label: "Conferencias" },
  { href: "/noticias", label: "Noticias" },
  { href: "/medios", label: "Medios" },
  { href: "/nosotros", label: "Nosotros" },
];

export const contactoNav: NavItem = { href: "/contacto", label: "Contacto" };
