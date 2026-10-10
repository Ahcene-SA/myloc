"use client";

import type { ReactNode } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { categoryInfo, site, whatsappLink } from "@/lib/site";
import type { PaymentMethod, ReservationFromApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { dateLocale, t } from "@/lib/i18n";

/* ─────────────── Formats ─────────────── */

export function formatPrice(value: number | string | undefined | null): string {
  const n = typeof value === "string" ? parseFloat(value) : value ?? 0;
  return `${(Number.isFinite(n) ? n : 0).toLocaleString(dateLocale(), { maximumFractionDigits: 2 })} ${t(site.currency)}`;
}

export function formatDate(date?: string | null, withWeekday = false): string {
  if (!date) return "—";
  return new Date(`${date}T00:00:00`).toLocaleDateString(dateLocale(), {
    weekday: withWeekday ? "short" : undefined,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(time?: string | null): string {
  return time ? time.slice(0, 5).replace(":", "h") : "";
}

export function daysBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const ms = new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

export function todayIso(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

/** Durée lisible : « 1 jour » / « 3 jours ». */
export function daysLabel(n: number): string {
  return `${n} ${t(n > 1 ? "jours" : "jour")}`;
}

/** Référence lisible d'une réservation : MYL-000042 */
export function reservationRef(id: number): string {
  return `MYL-${String(id).padStart(6, "0")}`;
}

export function categoryLabel(cat?: string | null): string {
  const label = (cat && categoryInfo[cat.toLowerCase()]?.label) || cat || "";
  return label ? t(label) : "";
}

export function splitCarName(name?: string | null) {
  const [brand, ...rest] = (name || "").trim().split(/\s+/);
  return { brand, model: rest.join(" ") };
}

/** Libellés en français : les traduire avec t() à l'affichage. */
/** Préfixe (en français, envoyé au serveur) d'un retour « récupération à domicile ». */
export const HOME_PICKUP_PREFIX = "Récupération à domicile : ";

/**
 * Lieu de retrait / retour à afficher : un nom d'agence est traduit, mais l'adresse
 * saisie par le client reste telle quelle (seul le préfixe est traduit).
 */
export function placeLabel(place?: string | null): string {
  if (!place) return "";
  if (place.startsWith(HOME_PICKUP_PREFIX)) {
    return `${t("Récupération à domicile")} : ${place.slice(HOME_PICKUP_PREFIX.length)}`;
  }
  return t(place);
}

export const paymentLabels: Record<PaymentMethod, string> = {
  especes: "Espèces à la remise des clés",
  carte: "Carte bancaire à la remise des clés",
  virement: "Virement bancaire",
};

/* ─────────────── Statuts ─────────────── */

export type ReservationStatus = NonNullable<ReservationFromApi["status"]>;

export const statusMeta: Record<ReservationStatus, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  confirmed: { label: "Confirmée", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  rejected: { label: "Refusée", className: "bg-red-50 text-red-700 ring-red-600/20" },
  cancelled: { label: "Annulée", className: "bg-slate-50 text-slate-600 ring-slate-500/20" },
};

/** Petite pastille de statut (fond léger + liseré). */
export const badgeBase = "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset";

export function StatusBadge({ status, expired = false }: { status?: ReservationFromApi["status"]; expired?: boolean }) {
  if (expired) {
    return <span className={cn(badgeBase, "bg-slate-50 text-slate-600 ring-slate-500/20")}>{t("Expirée")}</span>;
  }
  const meta = statusMeta[status || "pending"];
  return <span className={cn(badgeBase, meta.className)}>{t(meta.label)}</span>;
}

/** Location terminée (date de retour passée). */
export function isPast(r: ReservationFromApi): boolean {
  return !!r.end_date && r.end_date < todayIso();
}

/**
 * Demande jamais confirmée par l'agence alors que la date de départ est passée :
 * elle n'est plus « à venir », on la range avec les demandes sans suite.
 */
export function isExpiredPending(r: ReservationFromApi): boolean {
  return r.status === "pending" && !!r.start_date && r.start_date < todayIso();
}

export function isActiveOrUpcoming(r: ReservationFromApi): boolean {
  return (r.status === "pending" || r.status === "confirmed") && !isPast(r) && !isExpiredPending(r);
}

export function canCancel(r: ReservationFromApi): boolean {
  return (r.status === "pending" || r.status === "confirmed") && !!r.start_date && r.start_date > todayIso();
}

/** Champs utilisés dans le récapitulatif WhatsApp : une réservation enregistrée
 *  (ReservationFromApi et id → référence MYL) ou bien la demande en cours dans le
 *  formulaire, pas encore enregistrée (id absent, pas de référence). */
export interface WhatsAppRecapFields {
  id?: number | null;
  car_name?: string | null;
  car_price_per_day?: string | number | null;
  start_date?: string | null;
  end_date?: string | null;
  pickup_time?: string | null;
  return_time?: string | null;
  pickup_place?: string | null;
  return_place?: string | null;
  total_price?: string | number | null;
  payment_method?: string | null;
  full_name?: string | null;
  birth_date?: string | null;
  phone?: string | null;
  email?: string | null;
  client_note?: string | null;
}

/** Récapitulatif complet (réservation + client), identique à ce que l'API envoie
 *  à l'agence en alerte WhatsApp ; footer adaptable (réservation enregistrée ou
 *  pas encore envoyée). */
export function whatsappRecap(f: WhatsAppRecapFields, footer = "⏳ Demande en attente — à confirmer dans l'espace agence."): string {
  const time = (v?: string | null) => (v ? ` à ${v.slice(0, 5)}` : "");
  const place = (v?: string | null) => (v ? ` — ${placeLabel(v)}` : "");
  const payment: Partial<Record<PaymentMethod, string>> = { especes: "espèces", carte: "carte", virement: "virement" };
  const lines = [
    f.id != null ? t("🚗 Nouvelle réservation {ref}", { ref: reservationRef(f.id) }) : t("🚗 Nouvelle réservation"),
    "",
    t("Véhicule : {car} · {price}/j", { car: f.car_name || "—", price: formatPrice(f.car_price_per_day) }),
    t("Départ : {day}{hour}{place}", { day: formatDate(f.start_date), hour: time(f.pickup_time), place: place(f.pickup_place) }),
    t("Retour : {day}{hour}{place}", { day: formatDate(f.end_date), hour: time(f.return_time), place: place(f.return_place) }),
  ];
  if (f.total_price != null) {
    lines.push(t("Total : {price}", { price: formatPrice(f.total_price) }));
  }
  if (f.payment_method != null) {
    lines.push(t("Paiement : {method}", { method: t(payment[f.payment_method as PaymentMethod] ?? f.payment_method) }));
  }
  lines.push("");
  lines.push(t("👤 Client : {name}", { name: f.full_name || "—" }));
  if (f.birth_date) {
    lines.push(t("🎂 Né(e) le : {date}", { date: formatDate(f.birth_date) }));
  }
  if (f.phone) {
    lines.push(t("📞 {phone}", { phone: f.phone }));
  }
  if (f.email) {
    lines.push(t("✉️ {email}", { email: f.email }));
  }
  if (f.client_note) {
    lines.push(t("📝 « {note} »", { note: f.client_note }));
  }
  lines.push("");
  lines.push(t(footer));
  return whatsappLink(lines.join("\n"));
}

/** Message prérempli pour l'agence à partir d'une réservation enregistrée. */
export function reservationWhatsApp(r: ReservationFromApi): string {
  return whatsappRecap(r);
}

/* ─────────────── Blocs d'interface ─────────────── */

export function PageTitle({ kicker, title, children }: { kicker: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{kicker}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-lg border border-slate-200 bg-white shadow-sm", className)}>{children}</div>;
}

/** Titre de section dans une carte. */
export const sectionTitle = "text-sm font-semibold text-slate-900";

export function LoadingBlock({ label }: { label?: string }) {
  return (
    <div className="flex h-64 items-center justify-center gap-2.5 text-slate-500" role="status">
      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      <span className="text-sm">{label ?? t("Chargement…")}</span>
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      <p className="text-sm font-semibold text-slate-900">{t("Impossible de charger vos données")}</p>
      <p className="max-w-md text-sm text-slate-500">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={cn(secondaryBtn, "mt-1")}>
          <RefreshCw className="h-4 w-4" />
          {t("Réessayer")}
        </button>
      )}
    </Card>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-1.5 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="max-w-md text-sm leading-relaxed text-slate-500">{text}</p>
      {action && <div className="mt-3">{action}</div>}
    </Card>
  );
}

const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-sky/50 focus-visible:ring-offset-1";

export const primaryBtn = cn(
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-navy px-3.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-50",
  focusRing
);
export const secondaryBtn = cn(
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50",
  focusRing
);
/** Bouton discret (actions secondaires dans une liste). */
export const ghostBtn = cn(
  "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50",
  focusRing
);
export const dangerBtn = cn(
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-red-200 bg-white px-3.5 text-sm font-medium text-red-700 shadow-sm transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50",
  focusRing
);
export const inputClass =
  "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-sky focus:ring-2 focus:ring-sky/25 disabled:bg-slate-50 disabled:text-slate-500";
export const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

/** « Prix de base barré + remise » quand une réservation a bénéficié d'une remise. */
export function DiscountLine({ r }: { r: ReservationFromApi }) {
  const discount = parseFloat(String(r.discount_amount ?? 0)) || 0;
  if (discount <= 0) return null;
  return (
    <span className="block text-xs text-emerald-700">
      <span className="text-slate-500 line-through">{formatPrice(r.base_price)}</span> · {r.discount_label ? t(r.discount_label) : t("Remise")} (-{formatPrice(discount)})
    </span>
  );
}
