/**
 * Infos de l'agence centralisées : à modifier ici une seule fois
 * (téléphone, WhatsApp, email, agences, horaires).
 */
export const site = {
  name: "MYLOC.DZ",
  phoneDisplay: "+213 560 55 05 90",
  phoneHref: "tel:+213560550590",
  whatsappHref: "https://wa.me/213560550590",
  email: "contact@myloc.dz",
  address: "Résidence AM, 08 lotissement du Stade, Zonka, Birkhadem, Alger",
  instagram: "https://instagram.com/myloc.dz",
  instagramHandle: "@myloc.dz",
  currency: "DA",
  /** Registre du commerce (en-tête du contrat) */
  rc: "16/00-5921518 25",
  /** Caution et franchise (conditions générales du contrat) */
  deposit: 120000,
  depositEur: 500,
  franchise: 200000,
  /** Points de retrait / livraison proposés au client */
  agencies: ["Agence Birkhadem (Alger)", "Aéroport d'Alger Houari Boumediene"],
  hours: [
    { label: "Lundi – Samedi", value: "08h00 – 20h00" },
    { label: "Dimanche", value: "09h00 – 18h00" },
  ],
} as const;

/** Catégories et accroches reprises des posts Instagram. */
export const categoryInfo: Record<string, { label: string; plural: string; tagline: string }> = {
  citadine: { label: "Citadine", plural: "Citadines", tagline: "Agiles, économiques et parfaites pour la ville" },
  compacte: { label: "Compacte", plural: "Compactes", tagline: "Polyvalentes, confortables et élégantes au quotidien" },
  suv: { label: "SUV", plural: "SUV", tagline: "Spacieux, puissants et prêts pour toutes les routes" },
  berline: { label: "Berline", plural: "Berlines", tagline: "Confort et élégance pour vos longs trajets" },
};

/** Événement envoyé par le formulaire du Hero pour filtrer la flotte. */
export const FILTER_EVENT = "myloc:filter-category";

/** Lien WhatsApp avec un message pré-rempli. */
export function whatsappLink(message?: string) {
  return message ? `${site.whatsappHref}?text=${encodeURIComponent(message)}` : site.whatsappHref;
}
