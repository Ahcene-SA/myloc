"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties, type FocusEvent, type MouseEvent } from "react";
import { Building2, ChevronLeft, ChevronRight, Plus, PlusCircle } from "lucide-react";
import { useAdmin } from "../AdminContext";
import { apiImageUrl, type CarFromApi, type ReservationFromApi } from "@/lib/api";
import { categoryInfo } from "@/lib/site";
import { cn } from "@/lib/utils";
import {
  ErrorBlock,
  LoadingBlock,
  PageTitle,
  StatusBadge,
  categoryLabel,
  daysBetween,
  formatPrice,
  primaryBtn,
  reservationRef,
  todayIso,
} from "../client/shared";
import { SearchInput, addDays } from "./ui";
import {
  busyOnDay,
  dayDiff,
  hourLabel,
  isWeekStart,
  isWeekend,
  layoutBars,
  monthGroups,
  occupiedDays,
  parseIso,
  percent,
  rangeLabel,
  shortDate,
  weekdayShort,
  type BarSpan,
} from "./planning-utils";

/* ─────────────── Réglages d'affichage ─────────────── */

type ViewDays = 7 | 14 | 30;

/** Largeur minimale d'une journée (px) : écran large / mobile */
const VIEWS: { id: ViewDays; label: string; cellMin: number; cellMinSm: number; step: number }[] = [
  { id: 7, label: "7 jours", cellMin: 104, cellMinSm: 58, step: 7 },
  { id: 14, label: "14 jours", cellMin: 60, cellMinSm: 44, step: 7 },
  { id: 30, label: "30 jours", cellMin: 28, cellMinSm: 32, step: 30 },
];

const SMALL_QUERY = "(max-width: 639px)";

/** Hauteur d'une sous-ligne de réservation (barre + espacement) */
const LANE_H = 38;
const BAR_H = 34;
const ROW_MIN_H = 56;

/** Largeur de la colonne véhicule (variable CSS, plus étroite sur mobile) */
const CAR_COL = "[--car-col:136px] sm:[--car-col:264px]";
const STICKY_COL = "sticky left-0 border-r border-slate-200 shadow-[4px_0_8px_-6px_rgba(15,27,45,0.18)]";

type CategoryFilter = "all" | string;

/** Petit contrôle segmenté (vue, catégorie). */
function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg bg-slate-100 p-0.5 no-scrollbar" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={cn(
            "flex h-8 flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky/50",
            value === o.id ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:text-slate-900"
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="text-xs tabular-nums text-slate-400">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Écran de téléphone ? (suit le redimensionnement) */
function useIsSmall() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(SMALL_QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(SMALL_QUERY).matches,
    () => false
  );
}

/** Heure courante, rafraîchie chaque minute (trait « maintenant »). */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function matches(text: string | null | undefined, q: string) {
  return !!text && text.toLowerCase().includes(q);
}

interface Hovered {
  bar: BarSpan;
  car: CarFromApi;
  rect: DOMRect;
}

export function PlanningView() {
  const { cars, reservations, loading, error, refresh, openReservation, startNewReservation } = useAdmin();
  const now = useNow();
  const isSmall = useIsSmall();
  const today = todayIso();
  const [view, setView] = useState<ViewDays>(() =>
    typeof window !== "undefined" && window.matchMedia(SMALL_QUERY).matches ? 7 : 14
  );
  // La veille reste visible : contexte des locations en cours
  const [from, setFrom] = useState(() => addDays(todayIso(), -1));
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [search, setSearch] = useState("");
  const [hovered, setHovered] = useState<Hovered | null>(null);

  const cfg = VIEWS.find((v) => v.id === view) ?? VIEWS[1];
  const N = cfg.id;
  const days = useMemo(() => Array.from({ length: N }, (_, i) => addDays(from, i)), [from, N]);
  const q = search.trim().toLowerCase();

  // Réservations actives (annulées / refusées masquées), groupées par véhicule
  const byCar = useMemo(() => {
    const map = new Map<number, ReservationFromApi[]>();
    for (const r of reservations) {
      if (r.status !== "pending" && r.status !== "confirmed") continue;
      if (!r.car_id || !r.start_date) continue;
      const list = map.get(r.car_id) ?? [];
      list.push(r);
      map.set(r.car_id, list);
    }
    return map;
  }, [reservations]);

  const rows = useMemo(() => {
    return cars
      .filter((c) => category === "all" || (c.category || "").toLowerCase() === category)
      .map((car) => {
        const { bars, lanes } = layoutBars(byCar.get(car.id) ?? [], from, N);
        const carHit = !q || matches(car.name, q) || matches(car.plate, q);
        const hitIds = new Set(bars.filter((b) => matches(b.r.full_name, q) || matches(b.r.phone, q)).map((b) => b.r.id));
        return { car, bars, lanes, occupancy: occupiedDays(bars) / N, carHit, hitIds };
      })
      .filter((row) => row.carHit || row.hitIds.size > 0);
  }, [cars, category, byCar, from, N, q]);

  const categoryOptions = useMemo(() => {
    const present = new Set(cars.map((c) => (c.category || "").toLowerCase()));
    const known = Object.keys(categoryInfo).filter((k) => present.has(k) || k !== "berline");
    return [
      { id: "all" as CategoryFilter, label: "Toutes", count: cars.length },
      ...known.map((k) => ({
        id: k as CategoryFilter,
        label: categoryInfo[k].plural,
        count: cars.filter((c) => (c.category || "").toLowerCase() === k).length,
      })),
    ];
  }, [cars]);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={refresh} />;

  const todayIdx = dayDiff(from, today);
  const nowPos = todayIdx + (now.getHours() + now.getMinutes() / 60) / 24;
  const nowVisible = nowPos >= 0 && nowPos < N;
  const nowPct = `${(nowPos / N) * 100}%`;

  const occupancy = rows.length ? rows.reduce((s, r) => s + r.occupancy, 0) / rows.length : 0;
  const bookingsInRange = new Set(rows.flatMap((r) => r.bars.map((b) => b.r.id))).size;
  const available = days.map((_, i) => rows.filter((r) => !busyOnDay(r.bars, i)).length);

  const cellMin = isSmall ? cfg.cellMinSm : cfg.cellMin;
  const trackMin = N * cellMin;
  const gridStyle: CSSProperties = { gridTemplateColumns: `var(--car-col) minmax(${trackMin}px, 1fr)` };
  const daysStyle: CSSProperties = { gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` };

  const showTip = (e: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>, bar: BarSpan, car: CarFromApi) =>
    setHovered({ bar, car, rect: e.currentTarget.getBoundingClientRect() });

  const dayCellTone = (d: string) =>
    cn(isWeekStart(d) ? "border-s-slate-300" : "border-s-slate-100", isWeekend(d) && "bg-slate-50/80", d === today && "bg-sky-soft/60");

  return (
    <div>
      <PageTitle kicker="Disponibilités" title="Planning">
        <button type="button" onClick={() => startNewReservation()} className={primaryBtn}>
          <PlusCircle className="h-4 w-4" />
          Nouvelle réservation
        </button>
      </PageTitle>

      {/* Barre d'outils */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center rounded-md border border-slate-300 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setFrom(addDays(from, -cfg.step))}
              aria-label="Période précédente"
              className="flex h-9 w-9 items-center justify-center rounded-s-md text-slate-600 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setFrom(addDays(today, -1))}
              className="h-9 border-x border-slate-300 px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Aujourd&apos;hui
            </button>
            <button
              type="button"
              onClick={() => setFrom(addDays(from, cfg.step))}
              aria-label="Période suivante"
              className="flex h-9 w-9 items-center justify-center rounded-e-md text-slate-600 hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <p className="text-base font-semibold text-slate-900 tabular-nums" aria-live="polite">
            {rangeLabel(from, N, addDays)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-sm text-slate-600">
            Taux d&apos;occupation : <span className="font-semibold text-slate-900 tabular-nums">{percent(occupancy)}</span>
          </p>
          <Segmented label="Durée affichée" options={VIEWS.map((v) => ({ id: v.id, label: v.label }))} value={view} onChange={setView} />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:items-center">
          <Segmented label="Catégorie" options={categoryOptions} value={category} onChange={setCategory} />
          <SearchInput value={search} onChange={setSearch} placeholder="Client ou véhicule…" className="sm:w-60" />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
          <span className="text-slate-500">
            {rows.length} véhicule{rows.length > 1 ? "s" : ""} · {bookingsInRange} réservation{bookingsInRange > 1 ? "s" : ""}
          </span>
          <span className="hidden h-3 w-px bg-slate-200 sm:block" />
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-brand" /> Confirmée
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm border border-dashed border-amber-500 bg-amber-50" /> En attente
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-slate-300" /> Terminée
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-0.5 rounded-full bg-red-500" /> Maintenant
          </span>
        </div>
      </div>

      {/* Grille */}
      <div
        onScroll={() => hovered && setHovered(null)}
        className={cn(
          "relative overflow-auto overscroll-x-contain rounded-lg border border-slate-200 bg-white shadow-sm lg:max-h-[calc(100dvh-260px)]",
          CAR_COL
        )}
      >
        <div style={{ minWidth: `calc(var(--car-col) + ${trackMin}px)` }}>
          {/* En-tête : mois + jours */}
          <div className="sticky top-0 z-30 grid border-b border-slate-200 bg-white" style={gridStyle}>
            <div className={cn(STICKY_COL, "z-10 flex items-end bg-white px-3 pb-2 text-xs font-medium text-slate-500 sm:px-4")}>Véhicule</div>
            <div className="relative">
              <div className="grid border-b border-slate-100" style={daysStyle}>
                {monthGroups(days).map((g) => (
                  <div
                    key={g.label}
                    title={g.label}
                    className={cn("min-w-0 px-2 py-1.5 text-xs font-semibold capitalize text-slate-700", g.start > 0 && "border-s border-slate-200")}
                    style={{ gridColumn: `${g.start + 1} / span ${g.span}` }}
                  >
                    <span className="sticky left-[calc(var(--car-col)+8px)] block w-fit max-w-full truncate">{g.span * cellMin < 140 ? g.short : g.label}</span>
                  </div>
                ))}
              </div>
              <div className="grid" style={daysStyle}>
                {days.map((d) => (
                  <div key={d} className={cn("border-s py-1.5 text-center", dayCellTone(d))}>
                    <p className={cn("text-[11px] leading-4", d === today ? "font-medium text-sky-text" : "text-slate-500")}>
                      {N === 30 ? weekdayShort(d).charAt(0).toUpperCase() : weekdayShort(d)}
                    </p>
                    <p
                      className={cn(
                        "mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-sm tabular-nums",
                        d === today ? "bg-sky-text font-semibold text-white" : "font-medium text-slate-900"
                      )}
                    >
                      {parseIso(d).getDate()}
                    </p>
                  </div>
                ))}
              </div>
              {nowVisible && (
                <span
                  className="pointer-events-none absolute -bottom-px h-2 w-2 -translate-x-1/2 rounded-full bg-red-500 ring-2 ring-white"
                  style={{ left: nowPct }}
                  aria-hidden="true"
                />
              )}
            </div>
          </div>

          {rows.length === 0 && (
            <p className="p-6 text-sm text-slate-500">
              {cars.length === 0 ? "Ajoutez des véhicules pour voir le planning." : "Aucun véhicule ne correspond à ces filtres."}
            </p>
          )}

          {/* Lignes véhicules */}
          {rows.map(({ car, bars, lanes, occupancy: occ, carHit, hitIds }) => {
            const rowH = Math.max(ROW_MIN_H, lanes * LANE_H + 14);
            const top0 = (rowH - (lanes * LANE_H - (LANE_H - BAR_H))) / 2;
            const cat = categoryLabel(car.category);
            return (
              <div key={car.id} className="grid border-b border-slate-200" style={{ ...gridStyle, height: rowH }}>
                <div className={cn(STICKY_COL, "z-20 flex min-w-0 items-center gap-3 bg-white px-3 sm:px-4")} title={car.name}>
                  <div className="hidden h-7 w-12 flex-shrink-0 items-center justify-center sm:flex">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={apiImageUrl(car.image_url)}
                      alt=""
                      loading="lazy"
                      className={cn("max-h-7 max-w-12 object-contain", car.status !== "available" && "opacity-50 grayscale")}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-slate-900">{car.name}</p>
                      {car.status !== "available" && (
                        <span className="hidden flex-shrink-0 rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20 sm:inline">
                          Retiré du site
                        </span>
                      )}
                    </div>
                    <p className="hidden truncate text-xs text-slate-500 sm:block">
                      {cat && `${cat} · `}
                      {car.plate || "Immat. non renseignée"}
                    </p>
                    <p className="text-[11px] text-slate-500 sm:hidden">
                      {car.status !== "available" ? "Retiré · " : ""}
                      {percent(occ)} occupé
                    </p>
                  </div>
                  <div className="hidden w-10 flex-shrink-0 flex-col items-end gap-1 sm:flex" title={`Occupation sur la période : ${percent(occ)}`}>
                    <span className="text-[11px] font-medium text-slate-600 tabular-nums">{percent(occ)}</span>
                    <span className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
                      <span className="block h-full rounded-full bg-sky" style={{ width: `${Math.round(occ * 100)}%` }} />
                    </span>
                  </div>
                </div>

                <div className="relative">
                  {/* Cases : clic sur un jour libre = nouvelle réservation */}
                  <div className="absolute inset-0 grid" style={daysStyle}>
                    {days.map((d) =>
                      d < today ? (
                        <div key={d} className={cn("border-s", dayCellTone(d), "bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgb(241_245_249)_6px_7px)]")} />
                      ) : (
                        <button
                          key={d}
                          type="button"
                          onClick={() => startNewReservation({ carId: car.id, startDate: d })}
                          aria-label={`Nouvelle réservation : ${car.name}, ${shortDate(d)}`}
                          className={cn(
                            "group flex items-center justify-center border-s outline-none transition-colors hover:bg-sky-soft/70 focus-visible:bg-sky-soft focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky/50",
                            dayCellTone(d)
                          )}
                        >
                          <Plus className="h-3.5 w-3.5 text-sky-text opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                        </button>
                      )
                    )}
                  </div>

                  {nowVisible && (
                    <span className="pointer-events-none absolute inset-y-0 z-[5] w-px bg-red-500/80" style={{ left: nowPct }} aria-hidden="true" />
                  )}

                  {/* Réservations */}
                  {bars.map((bar) => {
                    const r = bar.r;
                    const pending = r.status === "pending";
                    const past = !pending && bar.end <= nowPos;
                    const dimmed = !carHit && !hitIds.has(r.id);
                    const label = `${r.full_name || "Client"} · ${shortDate(r.start_date!)} ${hourLabel(r.pickup_time)} → ${shortDate(
                      r.end_date || r.start_date!
                    )} ${hourLabel(r.return_time)}${pending ? " · En attente" : ""}`;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setHovered(null);
                          openReservation(r.id);
                        }}
                        onMouseEnter={(e) => showTip(e, bar, car)}
                        onMouseLeave={() => setHovered(null)}
                        onFocus={(e) => showTip(e, bar, car)}
                        onBlur={() => setHovered(null)}
                        aria-label={`${label}. Ouvrir la réservation ${reservationRef(r.id)}`}
                        aria-describedby={hovered?.bar.r.id === r.id ? "planning-tip" : undefined}
                        className={cn(
                          "@container absolute z-10 flex items-center gap-1 overflow-hidden rounded-md px-2 text-start shadow-sm outline-none transition-[filter,box-shadow] focus-visible:ring-2 focus-visible:ring-sky focus-visible:ring-offset-1",
                          pending
                            ? "border border-dashed border-amber-500 bg-amber-50 text-amber-800 hover:bg-amber-100"
                            : past
                              ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                              : "bg-brand text-white hover:bg-brand-hover",
                          bar.clippedStart && "rounded-s-none",
                          bar.clippedEnd && "rounded-e-none",
                          dimmed && "opacity-35"
                        )}
                        style={{
                          left: `calc(${(bar.left / N) * 100}% + ${bar.clippedStart ? 0 : 1}px)`,
                          width: `calc(${((bar.right - bar.left) / N) * 100}% - ${(bar.clippedStart ? 0 : 1) + (bar.clippedEnd ? 0 : 1)}px)`,
                          top: top0 + bar.lane * LANE_H,
                          height: BAR_H,
                        }}
                      >
                        {bar.clippedStart && <ChevronLeft className="-ms-1.5 h-3.5 w-3.5 flex-shrink-0 opacity-80" aria-hidden="true" />}
                        <span className="min-w-0 flex-1 leading-tight">
                          <span className="flex items-center gap-1">
                            {r.source === "agence" && <Building2 className="hidden h-3 w-3 flex-shrink-0 opacity-75 @min-[90px]:block" aria-hidden="true" />}
                            <span className="truncate text-xs font-medium @max-[34px]:hidden">{r.full_name || "Client"}</span>
                          </span>
                          <span className={cn("hidden truncate text-[11px] @min-[170px]:block", pending ? "text-amber-700" : past ? "text-slate-500" : "text-white/80")}>
                            {shortDate(r.start_date!)} {hourLabel(r.pickup_time)} → {shortDate(r.end_date || r.start_date!)} {hourLabel(r.return_time)}
                          </span>
                        </span>
                        {bar.clippedEnd && <ChevronRight className="-me-1.5 h-3.5 w-3.5 flex-shrink-0 opacity-80" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Pied : véhicules disponibles par jour */}
          {rows.length > 0 && (
            <div className="sticky bottom-0 z-30 grid border-t border-slate-200 bg-slate-50" style={gridStyle}>
              <div className={cn(STICKY_COL, "z-10 flex items-center bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 sm:px-4")}>
                Disponibles
              </div>
              <div className="grid" style={daysStyle}>
                {days.map((d, i) => {
                  const free = available[i];
                  const ratio = free / rows.length;
                  return (
                    <div
                      key={d}
                      className={cn("border-s py-2 text-center text-xs tabular-nums", isWeekStart(d) ? "border-s-slate-300" : "border-s-slate-200/70")}
                      title={`${shortDate(d)} : ${free} véhicule${free > 1 ? "s" : ""} disponible${free > 1 ? "s" : ""} sur ${rows.length}`}
                    >
                      <span className={cn("font-semibold", free === 0 ? "text-red-600" : ratio < 0.25 ? "text-amber-700" : "text-slate-900")}>{free}</span>
                      {N !== 30 && <span className="text-slate-400">/{rows.length}</span>}
                      {N === 7 && !isSmall && <span className="ms-1 text-slate-500">dispo</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Cliquez sur une réservation pour l&apos;ouvrir, ou sur un jour libre pour créer une réservation. Heures de départ et de retour
        affichées à la demi-journée près (10h par défaut).
      </p>

      {hovered && <ReservationTip {...hovered} />}
    </div>
  );
}

/* ─────────────── Infobulle d'une réservation ─────────────── */

const TIP_W = 288;
const TIP_H = 214;

function ReservationTip({ bar, car, rect }: Hovered) {
  const r = bar.r;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const left = Math.min(Math.max(8, rect.left), vw - TIP_W - 8);
  const below = rect.bottom + 8 + TIP_H < vh;
  const style: CSSProperties = below ? { left, top: rect.bottom + 6 } : { left, bottom: vh - rect.top + 6 };
  const nights = daysBetween(r.start_date || "", r.end_date || "");
  return (
    <div
      id="planning-tip"
      role="tooltip"
      className="pointer-events-none fixed z-[70] rounded-lg border border-slate-200 bg-white p-3.5 text-sm shadow-lg"
      style={{ ...style, width: TIP_W }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-slate-500">{reservationRef(r.id)}</span>
        <StatusBadge status={r.status} />
      </div>
      <p className="mt-2 truncate font-semibold text-slate-900">{r.full_name || "Client"}</p>
      {r.phone && <p className="text-xs text-slate-500 tabular-nums">{r.phone}</p>}
      <dl className="mt-3 grid grid-cols-[72px_1fr] gap-x-2 gap-y-1 text-xs">
        <dt className="text-slate-500">Véhicule</dt>
        <dd className="truncate text-slate-900">{car.name}</dd>
        <dt className="text-slate-500">Départ</dt>
        <dd className="text-slate-900">
          {shortDate(r.start_date!)} à {hourLabel(r.pickup_time)}
        </dd>
        <dt className="text-slate-500">Retour</dt>
        <dd className="text-slate-900">
          {shortDate(r.end_date || r.start_date!)} à {hourLabel(r.return_time)}
          <span className="text-slate-500"> · {nights} j</span>
        </dd>
        <dt className="text-slate-500">Total</dt>
        <dd className="font-medium text-slate-900 tabular-nums">{formatPrice(r.total_price)}</dd>
        <dt className="text-slate-500">Origine</dt>
        <dd className="text-slate-900">{r.source === "agence" ? "Saisie agence" : "Réservée sur le site"}</dd>
      </dl>
      <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-500">Cliquer pour ouvrir la réservation</p>
    </div>
  );
}
