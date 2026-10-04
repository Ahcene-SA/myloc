/**
 * Passage d'une recherche de l'accueil vers l'espace client :
 * le visiteur choisit ses dates et sa voiture sur l'accueil, se connecte si besoin,
 * et retrouve le formulaire de réservation déjà rempli.
 */

export const AVAILABILITY_EVENT = "myloc:availability-search";

export interface AvailabilitySearch {
  start: string;
  end: string;
  category: string;
  pickupPlace?: string;
  pickupAddress?: string;
  /** Vide = retour au lieu de retrait (pas de « retour ailleurs »). */
  returnPlace?: string;
  returnAddress?: string;
}

export interface BookingIntent extends Omit<AvailabilitySearch, "category"> {
  carId: number;
}

const KEY = "myloc_booking_intent";

export function saveBookingIntent(intent: BookingIntent) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...intent, savedAt: Date.now() }));
  } catch {
    /* navigation privée : on continue sans pré-remplissage */
  }
}

/** Lit et efface l'intention (valable 2 heures). */
export function takeBookingIntent(): BookingIntent | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const data = JSON.parse(raw) as BookingIntent & { savedAt?: number };
    if (!data.carId || (data.savedAt && Date.now() - data.savedAt > 2 * 3600_000)) return null;
    return data;
  } catch {
    return null;
  }
}

/** Onglet et voiture présélectionnée de l'espace client (lu par ClientContext). */
export const CLIENT_NAV_KEY = "myloc_client_nav";

/** « Réserver » sur une carte sans dates : on ouvre l'espace client sur « Réserver » avec la voiture choisie. */
export function saveReserveCar(carId: number) {
  try {
    sessionStorage.setItem(CLIENT_NAV_KEY, JSON.stringify({ tab: "reserver", carId }));
  } catch {
    /* navigation privée : l'espace client s'ouvre sur l'accueil */
  }
}
