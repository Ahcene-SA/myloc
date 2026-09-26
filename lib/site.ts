/**
 * Infos de l'agence centralisées : à modifier ici une seule fois
 * (téléphone, WhatsApp, email, agences, horaires).
 */
export const site = {
  name: "MYLOC.DZ",
  phoneDisplay: "+213 555 00 00 00",
  phoneHref: "tel:+213555000000",
  whatsappHref: "https://wa.me/213555000000",
  email: "contact@myloc.dz",
  address: "Alger, Algérie",
  instagram: "https://instagram.com/myloc.dz",
  currency: "€",
  agencies: [
    "Aéroport Messali Hadj",
    "Agence Alger Centre",
    "Agence Oran",
    "Agence Constantine",
    "Agence Annaba",
  ],
  hours: [
    { label: "Lundi – Samedi", value: "08h00 – 20h00" },
    { label: "Dimanche", value: "09h00 – 18h00" },
  ],
} as const;

/** Événement envoyé par le formulaire du Hero pour filtrer la flotte. */
export const FILTER_EVENT = "myloc:filter-category";
