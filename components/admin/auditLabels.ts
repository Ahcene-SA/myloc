import type { AuditEntry } from "@/lib/api";

type Tone = "neutral" | "good" | "bad" | "warn" | "security";

/** Libellé lisible de chaque action du journal. */
export const auditActions: Record<string, { label: string; tone: Tone; group: string }> = {
  login: { label: "Connexion", tone: "neutral", group: "connexion" },
  login_failed: { label: "Échec de connexion", tone: "bad", group: "connexion" },
  login_refused_inactive: { label: "Connexion refusée (compte désactivé)", tone: "bad", group: "connexion" },
  login_recovery_code: { label: "Connexion avec un code de secours", tone: "warn", group: "connexion" },
  logout_all: { label: "A déconnecté tous ses appareils", tone: "security", group: "connexion" },
  password_changed: { label: "A changé son mot de passe", tone: "security", group: "compte" },
  "2fa_enabled": { label: "A activé la double authentification", tone: "security", group: "compte" },
  "2fa_disabled": { label: "A désactivé la double authentification", tone: "warn", group: "compte" },
  "2fa_recovery_regenerated": { label: "A généré de nouveaux codes de secours", tone: "security", group: "compte" },
  "2fa_reset_cli": { label: "Double authentification réinitialisée (serveur)", tone: "warn", group: "compte" },

  reservation_confirmed: { label: "Réservation confirmée", tone: "good", group: "reservation" },
  reservation_rejected: { label: "Réservation refusée", tone: "bad", group: "reservation" },
  reservation_cancelled: { label: "Réservation annulée", tone: "bad", group: "reservation" },
  reservation_pending: { label: "Réservation remise en attente", tone: "warn", group: "reservation" },
  reservation_created: { label: "Réservation saisie par l'agence", tone: "good", group: "reservation" },
  reservation_note: { label: "Message envoyé au client", tone: "neutral", group: "reservation" },
  inspection_depart: { label: "État des lieux de départ", tone: "neutral", group: "reservation" },
  inspection_retour: { label: "État des lieux de retour", tone: "neutral", group: "reservation" },

  car_created: { label: "Véhicule ajouté", tone: "good", group: "vehicule" },
  car_updated: { label: "Véhicule modifié", tone: "neutral", group: "vehicule" },
  car_price_changed: { label: "Prix d'un véhicule modifié", tone: "warn", group: "vehicule" },
  car_online: { label: "Véhicule remis en ligne", tone: "good", group: "vehicule" },
  car_offline: { label: "Véhicule retiré du site", tone: "warn", group: "vehicule" },
  car_deleted: { label: "Véhicule supprimé", tone: "bad", group: "vehicule" },

  promo_created: { label: "Code promo créé", tone: "good", group: "promo" },
  promo_updated: { label: "Code promo modifié", tone: "neutral", group: "promo" },
  promo_activated: { label: "Code promo activé", tone: "good", group: "promo" },
  promo_deactivated: { label: "Code promo désactivé", tone: "warn", group: "promo" },
  promo_deleted: { label: "Code promo supprimé", tone: "bad", group: "promo" },
  pricing_rules_updated: { label: "Remises automatiques modifiées", tone: "warn", group: "promo" },

  member_created: { label: "Compte employé créé", tone: "good", group: "equipe" },
  member_updated: { label: "Fiche employé modifiée", tone: "neutral", group: "equipe" },
  member_role_changed: { label: "Rôle modifié", tone: "warn", group: "equipe" },
  member_activated: { label: "Compte réactivé", tone: "good", group: "equipe" },
  member_deactivated: { label: "Compte désactivé", tone: "bad", group: "equipe" },
  member_password_reset: { label: "Mot de passe réinitialisé", tone: "security", group: "equipe" },
  member_2fa_reset: { label: "Double authentification réinitialisée", tone: "security", group: "equipe" },
};

export const auditGroups: { id: string; label: string; prefix: string }[] = [
  { id: "", label: "Toutes les actions", prefix: "" },
  { id: "reservation", label: "Réservations", prefix: "reservation" },
  { id: "inspection", label: "États des lieux", prefix: "inspection" },
  { id: "car", label: "Véhicules", prefix: "car" },
  { id: "promo", label: "Promos et remises", prefix: "promo" },
  { id: "member", label: "Équipe", prefix: "member" },
  { id: "login", label: "Connexions", prefix: "login" },
];

export const toneClass: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  good: "bg-emerald-100 text-emerald-800",
  bad: "bg-red-100 text-red-700",
  warn: "bg-amber-100 text-amber-800",
  security: "bg-sky-soft text-sky-text",
};

export function auditLabel(action: string) {
  return auditActions[action] ?? { label: action, tone: "neutral" as Tone, group: "" };
}

const roleLabel = (r: unknown) => (r === "owner" ? "propriétaire" : r === "employee" ? "employé" : String(r));
const statusLabel: Record<string, string> = {
  pending: "en attente",
  confirmed: "confirmée",
  rejected: "refusée",
  cancelled: "annulée",
  available: "en ligne",
  unavailable: "retiré",
};

/** Détail court d'une entrée (« Karim Benali · « prévenez-nous » », « 55 € → 60 € »…). */
export function auditDetail(e: AuditEntry): string {
  const d = (e.details ?? {}) as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof d.client === "string") parts.push(d.client);
  if (typeof d.name === "string") parts.push(d.name);
  if (typeof d.code === "string") parts.push(d.code);
  if (typeof d.car === "string") parts.push(d.car);
  if (typeof d.from === "string" && e.action.startsWith("reservation_")) parts.push(`avant : ${statusLabel[d.from] ?? d.from}`);
  if (e.action === "member_role_changed") parts.push(`${roleLabel(d.from)} → ${roleLabel(d.to)}`);
  if (d.changes && typeof d.changes === "object") {
    const ch = d.changes as Record<string, [unknown, unknown]>;
    if (ch.price_per_day) parts.push(`prix ${ch.price_per_day[0]} → ${ch.price_per_day[1]}`);
    const others = Object.keys(ch).filter((k) => k !== "price_per_day" && k !== "status");
    if (others.length) parts.push(`champs : ${others.join(", ")}`);
  }
  if (typeof d.mileage === "number") parts.push(`${d.mileage.toLocaleString("fr-FR")} km`);
  if (typeof d.damages === "number" && d.damages > 0) parts.push(`${d.damages} dommage(s)`);
  if (typeof d.note === "string" && d.note) parts.push(`« ${d.note.length > 80 ? d.note.slice(0, 80) + "…" : d.note} »`);
  if (typeof d.email === "string" && e.action === "login_failed") parts.push(d.email);
  if (typeof d.remaining === "number") parts.push(`${d.remaining} code(s) restant(s)`);
  return parts.join(" · ");
}
