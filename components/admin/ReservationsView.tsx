"use client";

import { ChevronRight, PlusCircle } from "lucide-react";
import { useAdmin, type ReservationFilter } from "../AdminContext";
import type { ReservationFromApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  PageTitle,
  StatusBadge,
  daysBetween,
  formatDate,
  formatPrice,
  primaryBtn,
  reservationRef,
  todayIso,
} from "../client/shared";
import { FilterChips, SearchInput, SourceBadge, formatDateTime, phaseLabel, phaseOf } from "./ui";

const filters: { id: ReservationFilter; label: string }[] = [
  { id: "pending", label: "À traiter" },
  { id: "upcoming", label: "À venir" },
  { id: "ongoing", label: "En cours" },
  { id: "past", label: "Terminées" },
  { id: "closed", label: "Annulées / refusées" },
  { id: "all", label: "Toutes" },
];

function matchesFilter(r: ReservationFromApi, f: ReservationFilter, today: string) {
  return f === "all" || phaseOf(r, today) === f;
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function matchesSearch(r: ReservationFromApi, q: string) {
  const query = normalize(q.trim());
  if (!query) return true;
  const digits = query.replace(/\D/g, "");
  const hay = normalize(
    [reservationRef(r.id), r.id, r.full_name, r.email, r.user_email, r.car_name, r.license_number].filter(Boolean).join(" ")
  );
  if (hay.includes(query)) return true;
  return digits.length >= 3 && (r.phone || "").replace(/\D/g, "").includes(digits);
}

function sortFor(f: ReservationFilter) {
  return (a: ReservationFromApi, b: ReservationFromApi) => {
    if (f === "pending") return (a.created_at || "").localeCompare(b.created_at || "");
    if (f === "upcoming") return (a.start_date || "").localeCompare(b.start_date || "");
    if (f === "ongoing") return (a.end_date || "").localeCompare(b.end_date || "");
    return (b.start_date || "").localeCompare(a.start_date || "");
  };
}

export function ReservationsView() {
  const {
    reservations,
    loading,
    error,
    refresh,
    reservationFilter: filter,
    setReservationFilter,
    reservationSearch: search,
    setReservationSearch,
    openReservation,
    startNewReservation,
  } = useAdmin();

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={refresh} />;

  const today = todayIso();
  const searched = reservations.filter((r) => matchesSearch(r, search));
  const list = searched.filter((r) => matchesFilter(r, filter, today)).sort(sortFor(filter));

  return (
    <div>
      <PageTitle kicker="Gestion" title="Réservations">
        <button type="button" onClick={() => startNewReservation()} className={primaryBtn}>
          <PlusCircle className="h-4 w-4" />
          Nouvelle réservation
        </button>
      </PageTitle>

      <div className="mb-6 flex flex-col gap-4">
        <SearchInput
          value={search}
          onChange={setReservationSearch}
          placeholder="Rechercher : nom, téléphone, email, référence, véhicule…"
        />
        <FilterChips
          options={filters.map((f) => ({ ...f, count: searched.filter((r) => matchesFilter(r, f.id, today)).length }))}
          value={filter}
          onChange={setReservationFilter}
        />
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={reservations.length === 0 ? "Aucune réservation" : "Rien ici"}
          text={
            reservations.length === 0
              ? "Les réservations faites sur le site et celles que vous saisissez apparaîtront ici."
              : search
                ? "Aucune réservation ne correspond à cette recherche dans ce filtre."
                : "Aucune réservation dans cette catégorie pour le moment."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-line bg-white">
          {/* En-têtes (grand écran) */}
          <div className="hidden grid-cols-[1.1fr_1.3fr_1.1fr_0.7fr_0.8fr_24px] gap-4 border-b border-line bg-mist px-6 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted lg:grid">
            <span>Client</span>
            <span>Véhicule · période</span>
            <span>Réservation</span>
            <span className="text-right">Montant</span>
            <span>Statut</span>
            <span />
          </div>
          <ul className="divide-y divide-line">
            {list.map((r) => {
              const phase = phaseOf(r, today);
              const days = daysBetween(r.start_date || "", r.end_date || "");
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => openReservation(r.id)}
                    className={cn(
                      "grid w-full gap-2 px-6 py-4 text-left transition-colors hover:bg-sky-soft/40 lg:grid-cols-[1.1fr_1.3fr_1.1fr_0.7fr_0.8fr_24px] lg:items-center lg:gap-4",
                      phase === "pending" && "bg-amber-50/60"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-extrabold text-navy">{r.full_name}</p>
                      <p className="truncate text-sm text-muted">{r.phone}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-navy">{r.car_name}</p>
                      <p className="text-sm text-ink-soft">
                        {formatDate(r.start_date)} → {formatDate(r.end_date)} · {days} j
                      </p>
                    </div>
                    <div className="min-w-0 text-sm">
                      <p className="font-bold text-navy">{reservationRef(r.id)}</p>
                      <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                        {formatDateTime(r.created_at)} <SourceBadge source={r.source} />
                      </p>
                    </div>
                    <p className="font-extrabold text-navy lg:text-right">{formatPrice(r.total_price)}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={r.status} />
                      {(phase === "ongoing" || phase === "past") && (
                        <span className="text-[11px] font-bold uppercase tracking-wide text-muted">{phaseLabel[phase]}</span>
                      )}
                    </div>
                    <ChevronRight className="hidden h-5 w-5 text-muted lg:block" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
