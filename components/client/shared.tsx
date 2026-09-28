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
  return `${(Number.isFinite(n) ? n : 0).toLocaleString(dateLocale(), { maximumFractionDigits: 2 })} ${site.currency}`;
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
  pending: { label: "En attente", className: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Confirmée", className: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Refusée", className: "bg-red-100 text-red-700" },
  cancelled: { label: "Annulée", className: "bg-slate-200 text-slate-700" },
};

export function StatusBadge({ status, expired = false }: { status?: ReservationFromApi["status"]; expired?: boolean }) {
  if (expired) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">{t("Expirée")}</span>
    );
  }
  const meta = statusMeta[status || "pending"];
  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-bold", meta.className)}>{t(meta.label)}</span>
  );
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

export function reservationWhatsApp(r: ReservationFromApi): string {
  return whatsappLink(
    t("Bonjour MYLOC.DZ, au sujet de ma réservation {ref} ({car}, du {start} au {end}).", {
      ref: reservationRef(r.id),
      car: r.car_name || "",
      start: formatDate(r.start_date),
      end: formatDate(r.end_date),
    })
  );
}

/* ─────────────── Blocs d'interface ─────────────── */

export function PageTitle({ kicker, title, children }: { kicker: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <span className="kicker text-sky-text">{kicker}</span>
        <h1 className="mt-2 text-3xl font-extrabold uppercase leading-tight text-navy sm:text-4xl">{title}</h1>
        <span className="mt-3 block h-[3px] w-12 rounded-full bg-sky" />
      </div>
      {children}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-3xl border border-line bg-white", className)}>{children}</div>;
}

export function LoadingBlock({ label }: { label?: string }) {
  return (
    <div className="flex h-64 items-center justify-center gap-3 text-muted" role="status">
      <Loader2 className="h-5 w-5 animate-spin text-sky" />
      <span className="text-sm font-semibold">{label ?? t("Chargement…")}</span>
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-4 p-10 text-center">
      <p className="font-bold text-navy">{t("Impossible de charger vos données")}</p>
      <p className="max-w-md text-sm text-muted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-navy px-5 text-sm font-bold text-white hover:bg-navy-soft"
        >
          <RefreshCw className="h-4 w-4" />
          {t("Réessayer")}
        </button>
      )}
    </Card>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <p className="text-lg font-extrabold uppercase text-navy">{title}</p>
      <p className="max-w-md text-sm leading-relaxed text-muted">{text}</p>
      {action && <div className="mt-2">{action}</div>}
    </Card>
  );
}

export const primaryBtn =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-sky px-6 text-sm font-bold text-navy transition-colors hover:bg-sky-mid hover:text-white disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryBtn =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 border-line px-6 text-sm font-bold text-navy transition-colors hover:border-navy disabled:opacity-50";
export const inputClass =
  "h-12 w-full rounded-2xl border-2 border-line bg-mist px-4 text-[15px] font-semibold text-navy outline-none transition-colors placeholder:font-medium placeholder:text-muted/60 focus:border-sky focus:bg-white disabled:opacity-60";
export const labelClass = "mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-muted";

/** « Prix de base barré + remise » quand une réservation a bénéficié d'une remise. */
export function DiscountLine({ r }: { r: ReservationFromApi }) {
  const discount = parseFloat(String(r.discount_amount ?? 0)) || 0;
  if (discount <= 0) return null;
  return (
    <span className="block text-xs font-semibold text-emerald-700">
      <span className="text-muted line-through">{formatPrice(r.base_price)}</span> · {r.discount_label ? t(r.discount_label) : t("Remise")} (-{formatPrice(discount)})
    </span>
  );
}
