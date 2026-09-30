"use client";

import { useState } from "react";
import { CalendarDays, Loader2, MapPin, MessageSquareText, PlusCircle, XCircle } from "lucide-react";
import { useClient } from "../ClientContext";
import { WhatsAppIcon } from "../FloatingWhatsApp";
import { apiImageUrl, cancelReservation, type ReservationFromApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import {
  Card,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  PageTitle,
  StatusBadge,
  DiscountLine,
  canCancel,
  categoryLabel,
  daysBetween,
  daysLabel,
  formatDate,
  formatPrice,
  formatTime,
  isActiveOrUpcoming,
  isExpiredPending,
  paymentLabels,
  primaryBtn,
  secondaryBtn,
  reservationRef,
  reservationWhatsApp,
  splitCarName,
  todayIso,
  placeLabel,
} from "./shared";
import { InspectionButton } from "./InspectionReadOnly";

type Filter = "upcoming" | "past" | "cancelled" | "all";

const filters: { id: Filter; label: string }[] = [
  { id: "upcoming", label: "À venir" },
  { id: "past", label: "Terminées" },
  { id: "cancelled", label: "Annulées / refusées" },
  { id: "all", label: "Toutes" },
];

function matches(r: ReservationFromApi, f: Filter) {
  if (f === "all") return true;
  // Demandes sans suite : annulées, refusées, ou jamais confirmées avant la date de départ
  if (f === "cancelled") return r.status === "cancelled" || r.status === "rejected" || isExpiredPending(r);
  if (f === "upcoming") return isActiveOrUpcoming(r);
  return r.status === "confirmed" && !isActiveOrUpcoming(r);
}

export function ReservationsView() {
  const { reservations, loading, error, refresh, goReserve } = useClient();
  const [filter, setFilter] = useState<Filter>("upcoming");
  const { t } = useLang();

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={refresh} />;

  const list = reservations
    .filter((r) => matches(r, filter))
    .sort((a, b) =>
      filter === "upcoming"
        ? (a.start_date || "").localeCompare(b.start_date || "")
        : (b.start_date || "").localeCompare(a.start_date || "")
    );

  return (
    <div>
      <PageTitle kicker={t("Suivi")} title={t("Mes réservations")}>
        <button type="button" onClick={() => goReserve()} className={primaryBtn}>
          <PlusCircle className="h-4 w-4" />
          {t("Nouvelle réservation")}
        </button>
      </PageTitle>

      <div className="no-scrollbar -mx-1 mb-5 overflow-x-auto px-1">
      <div className="inline-flex gap-0.5 rounded-lg bg-slate-100 p-0.5" role="group" aria-label={t("Filtrer")}>
        {filters.map((f) => {
          const count = reservations.filter((r) => matches(r, f.id)).length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={cn(
                "flex h-8 flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors",
                filter === f.id ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:text-slate-900"
              )}
            >
              {t(f.label)}
              <span className={cn("text-xs tabular-nums", filter === f.id ? "text-slate-500" : "text-slate-400")}>{count}</span>
            </button>
          );
        })}
      </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={reservations.length === 0 ? t("Aucune réservation") : t("Rien ici")}
          text={
            reservations.length === 0
              ? t("Vos demandes de location apparaîtront ici, avec leur statut.")
              : t("Aucune réservation ne correspond à ce filtre.")
          }
          action={
            reservations.length === 0 ? (
              <button type="button" onClick={() => goReserve()} className={primaryBtn}>
                {t("Réserver un véhicule")}
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((r) => (
            <ReservationCard key={r.id} r={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReservationCard({ r }: { r: ReservationFromApi }) {
  const { upsertReservation } = useClient();
  const { t } = useLang();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const { brand, model } = splitCarName(r.car_name);
  const days = daysBetween(r.start_date || "", r.end_date || "");
  const expired = isExpiredPending(r);

  const doCancel = async () => {
    setBusy(true);
    setErr("");
    try {
      const updated = await cancelReservation(r.id);
      upsertReservation({ ...r, ...(updated || {}), status: "cancelled" });
      setConfirming(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("Annulation impossible."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col md:flex-row">
        <div className="flex items-center justify-center border-b border-slate-200 bg-slate-50 p-4 md:w-52 md:flex-shrink-0 md:border-b-0 md:border-e">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={apiImageUrl(r.car_image_url)} alt={r.car_name || ""} className="max-h-24 w-auto object-contain" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">
                {reservationRef(r.id)} · {categoryLabel(r.car_category)}
              </p>
              <p className="mt-0.5 text-base font-semibold text-slate-900">
                <bdi dir="ltr">
                  {brand} {model}
                </bdi>
              </p>
            </div>
            <StatusBadge status={r.status} expired={expired} />
          </div>

          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="flex gap-2.5">
              <CalendarDays className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
              <div>
                <p className="font-medium text-slate-900">
                  {formatDate(r.start_date, true)} {formatTime(r.pickup_time) && `· ${formatTime(r.pickup_time)}`}
                </p>
                <p className="font-medium text-slate-900">
                  {t("→")} {formatDate(r.end_date, true)} {formatTime(r.return_time) && `· ${formatTime(r.return_time)}`}
                </p>
                <p className="text-slate-500">{daysLabel(days)}</p>
              </div>
            </div>
            {(r.pickup_place || r.return_place) && (
              <div className="flex gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                <div className="text-slate-600">
                  {r.pickup_place && (
                    <p>
                      <span className="text-slate-500">{t("Retrait :")}</span> {placeLabel(r.pickup_place)}
                      {r.delivery_address ? ` (${r.delivery_address})` : ""}
                    </p>
                  )}
                  {r.return_place && (
                    <p>
                      <span className="text-slate-500">{t("Retour :")}</span> {placeLabel(r.return_place)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {expired && (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
              {t("L'agence n'a pas confirmé cette demande avant la date de départ. Contactez-la ou faites une nouvelle demande.")}
            </p>
          )}

          {r.admin_note && (
            <div className="flex gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
              <MessageSquareText className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
              <p>
                <span className="font-medium text-slate-900">{t("Message de l'agence :")} </span>
                {r.admin_note}
              </p>
            </div>
          )}

          <div className="mt-auto flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p>
              <span className="text-lg font-semibold tabular-nums text-slate-900">{formatPrice(r.total_price)}</span>
              {r.payment_method && <span className="ms-2 text-xs text-slate-500">{t(paymentLabels[r.payment_method])}</span>}
              <DiscountLine r={r} />
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={reservationWhatsApp(r)}
                target="_blank"
                rel="noopener noreferrer"
                className={secondaryBtn}
              >
                <WhatsAppIcon className="h-4 w-4 text-whatsapp" />
                {t("Contacter l'agence")}
              </a>
              {r.status === "confirmed" && (r.start_date || "") <= todayIso() && <InspectionButton r={r} />}
              {canCancel(r) && !confirming && (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4" />
                  {t("Annuler")}
                </button>
              )}
            </div>
          </div>

          {confirming && (
            <div className="flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="font-medium text-red-800">{t("Annuler cette réservation ? Cette action est définitive.")}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirming(false)} className={secondaryBtn}>
                  {t("Garder")}
                </button>
                <button
                  type="button"
                  onClick={doCancel}
                  disabled={busy}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-red-600 px-3.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {t("Oui, annuler")}
                </button>
              </div>
            </div>
          )}
          {err && <p className="text-sm text-red-700">{err}</p>}
        </div>
      </div>
    </Card>
  );
}
