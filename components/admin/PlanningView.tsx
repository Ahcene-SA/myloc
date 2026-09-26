"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, PlusCircle } from "lucide-react";
import { useAdmin } from "../AdminContext";
import { cn } from "@/lib/utils";
import { ErrorBlock, LoadingBlock, PageTitle, primaryBtn, todayIso } from "../client/shared";
import { addDays } from "./ui";

const DAYS = 14;

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

  const cols = `minmax(150px, 190px) repeat(${DAYS}, minmax(46px, 1fr))`;

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
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-line bg-white text-navy hover:border-navy"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setFrom(today)}
            className="h-11 rounded-full border-2 border-line bg-white px-4 text-xs font-bold uppercase tracking-wide text-navy hover:border-navy"
          >
            Aujourd&apos;hui
          </button>
          <button
            type="button"
            onClick={() => setFrom(addDays(from, 7))}
            aria-label="Semaine suivante"
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-line bg-white text-navy hover:border-navy"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <p className="ml-2 text-sm font-bold capitalize text-navy">{rangeLabel}</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-5 rounded bg-navy" /> Confirmée
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-5 rounded border-2 border-dashed border-amber-500 bg-amber-100" /> En attente
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-line bg-white">
        <div className="min-w-[860px]">
          {/* En-tête des jours */}
          <div className="grid border-b border-line bg-mist" style={{ gridTemplateColumns: cols }}>
            <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Véhicule</div>
            {days.map((d) => {
              const l = dayLabel(d);
              return (
                <div
                  key={d}
                  className={cn(
                    "border-l border-line py-2 text-center",
                    l.weekend && "bg-sky-soft/50",
                    d === today && "bg-sky text-navy"
                  )}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{l.weekday}</p>
                  <p className="text-sm font-extrabold text-navy">{l.day}</p>
                </div>
              );
            })}
          </div>

          {cars.length === 0 && <p className="p-6 text-sm text-muted">Ajoutez des véhicules pour voir le planning.</p>}

          {cars.map((car) => {
            const carRes = active.filter((r) => r.car_id === car.id);
            return (
              <div key={car.id} className="grid border-b border-line last:border-0" style={{ gridTemplateColumns: cols }}>
                <div className="row-start-1 flex min-h-14 flex-col justify-center px-4 py-2" style={{ gridColumn: 1 }}>
                  <p className="truncate text-sm font-extrabold text-navy">{car.name}</p>
                  {car.status !== "available" && <p className="text-[11px] font-semibold text-muted">Retiré du site</p>}
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
                      "row-start-1 min-h-14 border-l border-line transition-colors hover:bg-sky-soft",
                      dayLabel(d).weekend && "bg-sky-soft/30",
                      d === today && "bg-sky/10"
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
                      title={`${r.full_name} · ${r.start_date} → ${r.end_date}`}
                      className={cn(
                        "row-start-1 z-10 mx-0.5 my-2 flex items-center overflow-hidden rounded-xl px-2.5 text-left text-xs font-bold",
                        pending ? "border-2 border-dashed border-amber-500 bg-amber-100 text-amber-900" : "bg-navy text-white hover:bg-navy-soft"
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
      <p className="mt-3 text-xs text-muted">
        Cliquez sur une réservation pour l&apos;ouvrir, ou sur une case libre pour créer une réservation à cette date. Le jour du retour reste libre
        pour une nouvelle location.
      </p>
    </div>
  );
}
