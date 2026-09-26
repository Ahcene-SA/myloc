"use client";

import { useState } from "react";
import { CalendarDays, Loader2, MapPin, MessageSquareText, PlusCircle, XCircle } from "lucide-react";
import { useClient } from "../ClientContext";
import { WhatsAppIcon } from "../FloatingWhatsApp";
import { apiImageUrl, cancelReservation, type ReservationFromApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Card,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  PageTitle,
  StatusBadge,
  canCancel,
  categoryLabel,
  daysBetween,
  formatDate,
  formatPrice,
  formatTime,
  isActiveOrUpcoming,
  paymentLabels,
  primaryBtn,
  reservationRef,
  reservationWhatsApp,
  splitCarName,
} from "./shared";

type Filter = "upcoming" | "past" | "cancelled" | "all";

const filters: { id: Filter; label: string }[] = [
  { id: "upcoming", label: "À venir" },
  { id: "past", label: "Terminées" },
  { id: "cancelled", label: "Annulées / refusées" },
  { id: "all", label: "Toutes" },
];

function matches(r: ReservationFromApi, f: Filter) {
  if (f === "all") return true;
  if (f === "cancelled") return r.status === "cancelled" || r.status === "rejected";
  if (f === "upcoming") return isActiveOrUpcoming(r);
  return r.status === "confirmed" && !isActiveOrUpcoming(r);
}

export function ReservationsView() {
  const { reservations, loading, error, refresh, goReserve } = useClient();
  const [filter, setFilter] = useState<Filter>("upcoming");

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
      <PageTitle kicker="Suivi" title="Mes réservations">
        <button type="button" onClick={() => goReserve()} className={primaryBtn}>
          <PlusCircle className="h-4 w-4" />
          Nouvelle réservation
        </button>
      </PageTitle>

      <div className="no-scrollbar -mx-1 mb-6 flex gap-2 overflow-x-auto px-1" role="group" aria-label="Filtrer">
        {filters.map((f) => {
          const count = reservations.filter((r) => matches(r, f.id)).length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={cn(
                "flex h-10 flex-shrink-0 items-center gap-2 rounded-full border-2 px-4 text-xs font-bold uppercase tracking-wide",
                filter === f.id ? "border-navy bg-navy text-white" : "border-line bg-white text-navy hover:border-navy"
              )}
            >
              {f.label}
              <span className={filter === f.id ? "text-sky" : "text-muted"}>{count}</span>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={reservations.length === 0 ? "Aucune réservation" : "Rien ici"}
          text={
            reservations.length === 0
              ? "Vos demandes de location apparaîtront ici, avec leur statut."
              : "Aucune réservation ne correspond à ce filtre."
          }
          action={
            reservations.length === 0 ? (
              <button type="button" onClick={() => goReserve()} className={primaryBtn}>
                Réserver un véhicule
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
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
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const { brand, model } = splitCarName(r.car_name);
  const days = daysBetween(r.start_date || "", r.end_date || "");

  const doCancel = async () => {
    setBusy(true);
    setErr("");
    try {
      const updated = await cancelReservation(r.id);
      upsertReservation({ ...r, ...(updated || {}), status: "cancelled" });
      setConfirming(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Annulation impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col md:flex-row">
        <div className="bg-brand-mist flex items-center justify-center p-6 md:w-60 md:flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={apiImageUrl(r.car_image_url)} alt={r.car_name || ""} className="car-reflect max-h-28 w-auto object-contain" />
        </div>

        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                {reservationRef(r.id)} · {categoryLabel(r.car_category)}
              </p>
              <p className="mt-1 text-xl font-extrabold uppercase text-navy">
                {brand} <span className="text-sky-gradient">{model}</span>
              </p>
            </div>
            <StatusBadge status={r.status} />
          </div>

          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="flex gap-2.5">
              <CalendarDays className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-text" />
              <div>
                <p className="font-bold text-navy">
                  {formatDate(r.start_date, true)} {formatTime(r.pickup_time) && `· ${formatTime(r.pickup_time)}`}
                </p>
                <p className="font-bold text-navy">
                  → {formatDate(r.end_date, true)} {formatTime(r.return_time) && `· ${formatTime(r.return_time)}`}
                </p>
                <p className="text-muted">
                  {days} jour{days > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            {(r.pickup_place || r.return_place) && (
              <div className="flex gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-text" />
                <div className="text-ink-soft">
                  {r.pickup_place && (
                    <p>
                      <span className="text-muted">Retrait :</span> {r.pickup_place}
                      {r.delivery_address ? ` (${r.delivery_address})` : ""}
                    </p>
                  )}
                  {r.return_place && (
                    <p>
                      <span className="text-muted">Retour :</span> {r.return_place}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {r.admin_note && (
            <div className="flex gap-2.5 rounded-2xl bg-sky-soft/60 p-4 text-sm text-navy">
              <MessageSquareText className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-text" />
              <p>
                <span className="font-bold">Message de l&apos;agence : </span>
                {r.admin_note}
              </p>
            </div>
          )}

          <div className="mt-auto flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p>
              <span className="text-2xl font-extrabold text-navy">{formatPrice(r.total_price)}</span>
              {r.payment_method && <span className="ml-2 text-xs font-semibold text-muted">{paymentLabels[r.payment_method]}</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={reservationWhatsApp(r)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full border-2 border-line px-4 text-xs font-bold text-navy hover:border-navy"
              >
                <WhatsAppIcon className="h-4 w-4 text-whatsapp" />
                Contacter l&apos;agence
              </a>
              {canCancel(r) && !confirming && (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs font-bold text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4" />
                  Annuler
                </button>
              )}
            </div>
          </div>

          {confirming && (
            <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="font-semibold text-red-800">Annuler cette réservation ? Cette action est définitive.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirming(false)} className="h-10 rounded-full px-4 text-xs font-bold text-navy hover:bg-white">
                  Garder
                </button>
                <button
                  type="button"
                  onClick={doCancel}
                  disabled={busy}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-red-700 px-4 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Oui, annuler
                </button>
              </div>
            </div>
          )}
          {err && <p className="text-sm font-semibold text-red-700">{err}</p>}
        </div>
      </div>
    </Card>
  );
}
