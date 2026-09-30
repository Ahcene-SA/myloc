"use client";

import { useState, type UIEvent } from "react";
import { ChevronLeft, ChevronRight, PlusCircle } from "lucide-react";
import { useAdmin } from "../AdminContext";
import { cn } from "@/lib/utils";
import { ErrorBlock, LoadingBlock, PageTitle, primaryBtn, todayIso } from "../client/shared";
import { addDays } from "./ui";

const DAYS = 14;
// Colonnes (classes écrites en entier pour Tailwind) : colonne véhicule plus étroite sur mobile
const GRID_COLS = "grid-cols-[112px_repeat(14,minmax(42px,1fr))] sm:grid-cols-[minmax(150px,190px)_repeat(14,minmax(46px,1fr))]";
// Colonne véhicule fixée à gauche pendant le défilement horizontal
const STICKY_COL = "sticky left-0 z-20 border-r border-slate-200 shadow-[4px_0_8px_-6px_rgba(10,31,68,0.25)]";

function dayLabel(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return {
    weekday: d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""),
    day: d.getDate(),
    weekend: d.getDay() === 5 || d.getDay() === 6, // vendredi / samedi (week-end en Algérie)
  };
}

export function PlanningView() {
  const { cars, reservations, loading, error, refresh, openReservation, startNewReservation } = useAdmin();
  const today = todayIso();
  const [from, setFrom] = useState(today);
  // Indice « faites défiler » tant que la fin du planning n'est pas visible
  const [atEnd, setAtEnd] = useState(false);
  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
  };

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={refresh} />;

  const days = Array.from({ length: DAYS }, (_, i) => addDays(from, i));
  const to = addDays(from, DAYS); // exclu
  const active = reservations.filter(
    (r) => (r.status === "pending" || r.status === "confirmed") && (r.start_date || "") < to && (r.end_date || "") > from
  );
  const rangeLabel = `${new Date(`${from}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} → ${new Date(
    `${addDays(to, -1)}T00:00:00`
  ).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;

  return (
    <div>
      <PageTitle kicker="Disponibilités" title="Planning">
        <button type="button" onClick={() => startNewReservation()} className={primaryBtn}>
          <PlusCircle className="h-4 w-4" />
          Nouvelle réservation
        </button>
      </PageTitle>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFrom(addDays(from, -7))}
            aria-label="Semaine précédente"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setFrom(today)}
            className="h-9 rounded-md border border-slate-300 bg-white px-3.5 text-sm font-medium hover:bg-slate-50 text-slate-700 shadow-sm"
          >
            Aujourd&apos;hui
          </button>
          <button
            type="button"
            onClick={() => setFrom(addDays(from, 7))}
            aria-label="Semaine suivante"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <p className="ms-2 text-sm font-semibold capitalize text-slate-900">{rangeLabel}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-sky" /> Confirmée
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm border border-dashed border-amber-400 bg-amber-50" /> En attente
          </span>
        </div>
      </div>

      {!atEnd && (
        <p className="mb-2 flex items-center justify-end gap-1 text-xs text-slate-500 lg:hidden" aria-hidden="true">
          Faites défiler pour voir les {DAYS} jours <ChevronRight className="h-3.5 w-3.5" />
        </p>
      )}
      <div className="relative">
        <div onScroll={onScroll} className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="min-w-[700px] sm:min-w-[860px]">
            {/* En-tête des jours */}
            <div className={cn("grid border-b border-slate-200 bg-slate-50", GRID_COLS)}>
              <div className={cn(STICKY_COL, "bg-slate-50 px-3 py-3 text-xs font-medium text-slate-500 sm:px-4")}>
                Véhicule
              </div>
              {days.map((d) => {
                const l = dayLabel(d);
                return (
                  <div
                    key={d}
                    className={cn(
                      "border-s border-slate-200 py-2 text-center",
                      l.weekend && "bg-slate-100/70",
                      d === today && "bg-sky-soft text-sky-text"
                    )}
                  >
                    <p className="text-xs text-slate-500">{l.weekday}</p>
                    <p className={cn("text-sm font-medium tabular-nums", d === today ? "text-sky-text" : "text-slate-900")}>{l.day}</p>
                  </div>
                );
              })}
            </div>

            {cars.length === 0 && <p className="p-6 text-sm text-slate-500">Ajoutez des véhicules pour voir le planning.</p>}

            {cars.map((car) => {
              const carRes = active.filter((r) => r.car_id === car.id);
              return (
                <div key={car.id} className={cn("grid border-b border-slate-200 last:border-0", GRID_COLS)}>
                  <div
                    className={cn(STICKY_COL, "row-start-1 flex min-h-12 min-w-0 flex-col justify-center bg-white px-3 py-2 sm:px-4")}
                    style={{ gridColumn: 1 }}
                    title={car.name}
                  >
                    <p className="truncate text-sm font-medium text-slate-900">{car.name}</p>
                    {car.status !== "available" && <p className="text-xs text-slate-500">Retiré du site</p>}
                  </div>

                  {/* Cases libres : clic = nouvelle réservation ce jour-là */}
                  {days.map((d, i) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => startNewReservation({ carId: car.id, startDate: d < today ? today : d })}
                      aria-label={`Réserver ${car.name} le ${d}`}
                      title="Nouvelle réservation"
                      className={cn(
                        "row-start-1 min-h-12 border-s border-slate-100 transition-colors hover:bg-slate-100",
                        dayLabel(d).weekend && "bg-slate-50",
                        d === today && "bg-sky-soft/40"
                      )}
                      style={{ gridColumn: i + 2 }}
                    />
                  ))}

                  {/* Réservations */}
                  {carRes.map((r) => {
                    const s = Math.max(0, Math.round((new Date(`${r.start_date}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86_400_000));
                    const e = Math.min(
                      DAYS,
                      Math.round((new Date(`${r.end_date}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86_400_000)
                    );
                    if (e <= s) return null;
                    const pending = r.status === "pending";
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => openReservation(r.id)}
                        title={`${r.full_name} · ${car.name} · ${r.start_date} → ${r.end_date}${pending ? " · En attente" : ""}`}
                        aria-label={`${r.full_name}, ${car.name}, du ${r.start_date} au ${r.end_date}${pending ? ", en attente" : ""}`}
                        className={cn(
                          "row-start-1 z-10 mx-0.5 my-2 flex items-center overflow-hidden rounded px-2 text-start text-xs font-medium",
                          pending ? "border border-dashed border-amber-400 bg-amber-50 text-amber-900" : "bg-sky text-white hover:bg-sky-mid"
                        )}
                        style={{ gridColumn: `${s + 2} / ${e + 2}` }}
                      >
                        <span className="truncate">{r.full_name}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        {/* Dégradé sur le bord droit : il reste des jours à voir */}
        {!atEnd && (
          <div className="pointer-events-none absolute inset-y-0 end-0 w-10 rounded-e-lg bg-gradient-to-l from-white to-transparent lg:hidden" />
        )}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Cliquez sur une réservation pour l&apos;ouvrir, ou sur une case libre pour créer une réservation à cette date. Le jour du retour reste libre
        pour une nouvelle location.
      </p>
    </div>
  );
}
