import type { Sponsor } from "@/types/content";

/**
 * FIXTURE TEMPORAL — no es Sanity todavía (Fase 6). Nombres reales
 * (marcas confirmadas de Daniel Pintado), pero sin campo `logo`: los
 * PNG actuales del prototipo son provisionales (auditoría, decisión
 * pendiente #5), así que no se copian todavía. SponsorMarquee muestra
 * una insignia de texto mientras tanto — ver components/sections/SponsorMarquee.tsx.
 */
export const sponsors: Sponsor[] = [
  { slug: "adidas", nombre: "Adidas", tier: "principal", url: "https://www.adidas.com.ec/" },
  { slug: "hyundai", nombre: "Hyundai", tier: "principal", url: "https://www.hyundai.com.ec/" },
  {
    slug: "pichincha-crisfe",
    nombre: "Banco Pichincha / Fundación CRISFE",
    tier: "principal",
    url: "https://www.pichincha.com",
  },
  { slug: "fybeca", nombre: "Fybeca", tier: "principal", url: "https://www.fybeca.com" },
  {
    slug: "bike-shop",
    nombre: "Bike Shop",
    tier: "principal",
    url: "https://www.instagram.com/bikeshop_ecuador/",
  },
  {
    slug: "ucacue",
    nombre: "Universidad Católica de Cuenca",
    tier: "principal",
    url: "https://www.ucacue.edu.ec",
  },
  {
    slug: "gold-nutrition",
    nombre: "Gold Nutrition",
    tier: "suplementacion",
    url: "https://www.instagram.com/goldnutrition_ecuador/",
  },
  {
    slug: "physio-elite",
    nombre: "Physio Elite",
    tier: "aliado",
    url: "https://www.instagram.com/physioelite1/",
  },
  {
    slug: "neo-lab",
    nombre: "Neo Lab",
    tier: "aliado",
    url: "https://www.centromediconeolab.com/",
  },
  { slug: "spa-novaqua", nombre: "Spa Novaqua", tier: "aliado", url: "https://novaqua.com.ec/" },
];

export function getSponsorsPorTier(tier: Sponsor["tier"]): Sponsor[] {
  return sponsors.filter((sponsor) => sponsor.tier === tier);
}
