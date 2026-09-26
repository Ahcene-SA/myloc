"use client";

import { useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  Car,
  Check,
  Inbox,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  PlusCircle,
  Wallet,
} from "lucide-react";
import { useAdmin } from "../AdminContext";
import { useAuth } from "../AuthContext";
import { apiImageUrl, updateReservationStatus, type ReservationFromApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Card,
  ErrorBlock,
  LoadingBlock,
  PageTitle,
  formatDate,
  formatPrice,
  formatTime,
  primaryBtn,
  reservationRef,
  todayIso,
} from "../client/shared";
import { SourceBadge, addDays, formatDateTime, phaseOf } from "./ui";

function amount(v: unknown) {
  return parseFloat(String(v ?? 0)) || 0;
}

export function DashboardView() {
  const { user } = useAuth();
  const { cars, reservations, loading, error, refresh, showReservations, startNewReservation, openReservation, setActiveTab } = useAdmin();

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={refresh} />;

  const today = todayIso();
  const tomorrow = addDays(today, 1);
  const month = today.slice(0, 7);

  const pending = reservations
    .filter((r) => r.status === "pending")
    .sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
  const confirmed = reservations.filter((r) => r.status === "confirmed");
  const ongoing = confirmed.filter((r) => phaseOf(r, today) === "ongoing");
  const onSite = cars.filter((c) => c.status === "available");
  const rentedIds = new Set(ongoing.map((r) => r.car_id));
  const freeToday = onSite.filter((c) => !rentedIds.has(c.id)).length;
  const monthRevenue = confirmed
    .filter((r) => (r.start_date || "").startsWith(month))
    .reduce((s, r) => s + amount(r.total_price), 0);

  const departures = confirmed
    .filter((r) => r.start_date === today || r.start_date === tomorrow)
    .sort((a, b) => `${a.start_date}${a.pickup_time}`.localeCompare(`${b.start_date}${b.pickup_time}`));
  const returns = confirmed
    .filter((r) => r.end_date === today || r.end_date === tomorrow)
    .sort((a, b) => `${a.end_date}${a.return_time}`.localeCompare(`${b.end_date}${b.return_time}`));

  const firstName = (user?.full_name || "").split(" ")[0] || "l'équipe";
  const monthLabel = new Date(`${today}T00:00:00`).toLocaleDateString("fr-FR", { month: "long" });

  const stats: { label: string; value: string; hint: string; icon: React.ElementType; go: () => void; alert?: boolean }[] = [
    {
      label: "À traiter",
      value: String(pending.length),
      hint: pending.length ? "demande(s) en attente" : "rien en attente",
      icon: Inbox,
      go: () => showReservations("pending"),
      alert: pending.length > 0,
    },
    {
      label: "En location",
      value: String(ongoing.length),
      hint: "véhicule(s) chez un client",
      icon: KeyRound,
      go: () => showReservations("ongoing"),
    },
    {
      label: "Disponibles aujourd'hui",
      value: `${freeToday}/${onSite.length}`,
      hint: "véhicules en ligne libres",
      icon: Car,
      go: () => setActiveTab("planning"),
    },
    {
      label: `Confirmé en ${monthLabel}`,
      value: formatPrice(monthRevenue),
      hint: "locations qui démarrent ce mois-ci",
      icon: Wallet,
      go: () => showReservations("all"),
    },
  ];

  return (
    <div>
      <PageTitle kicker="Tableau de bord" title={`Bonjour, ${firstName}`}>
        <button type="button" onClick={() => startNewReservation()} className={primaryBtn}>
          <PlusCircle className="h-4 w-4" />
          Nouvelle réservation
        </button>
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map(({ label, value, hint, icon: Icon, go, alert }) => (
          <button
            key={label}
            type="button"
            onClick={go}
            className={cn(
              "group rounded-3xl border bg-white p-4 text-left transition-colors hover:border-navy sm:p-5",
              alert ? "border-amber-300 ring-4 ring-amber-100" : "border-line"
            )}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl",
                  alert ? "bg-amber-100 text-amber-800" : "bg-sky-soft text-sky-text"
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-1" />
            </div>
            <p className="mt-4 truncate text-2xl font-extrabold text-navy sm:text-3xl">{value}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-navy">{label}</p>
            <p className="hidden text-xs text-muted sm:block">{hint}</p>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        {/* Demandes à traiter */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-extrabold uppercase tracking-wide text-navy">Demandes à traiter</p>
            {pending.length > 0 && (
              <button type="button" onClick={() => showReservations("pending")} className="text-xs font-bold text-sky-text hover:underline">
                Tout voir
              </button>
            )}
          </div>
          {pending.length === 0 ? (
            <p className="rounded-2xl bg-mist px-4 py-8 text-center text-sm text-muted">
              Aucune demande en attente. Les nouvelles réservations du site arriveront ici.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {pending.slice(0, 5).map((r) => (
                <PendingRow key={r.id} r={r} onOpen={() => openReservation(r.id)} />
              ))}
            </ul>
          )}
        </Card>

        {/* Mouvements du jour */}
        <Card className="p-6">
          <p className="mb-4 text-sm font-extrabold uppercase tracking-wide text-navy">Aujourd&apos;hui et demain</p>
          <MovementList
            title="Départs"
            icon={LogOut}
            empty="Aucun départ prévu."
            items={departures.map((r) => ({
              r,
              when: `${r.start_date === today ? "Aujourd'hui" : "Demain"}${r.pickup_time ? ` · ${formatTime(r.pickup_time)}` : ""}`,
              where: r.pickup_place,
            }))}
            onOpen={openReservation}
          />
          <div className="my-5 h-px bg-line" />
          <MovementList
            title="Retours"
            icon={LogIn}
            empty="Aucun retour prévu."
            items={returns.map((r) => ({
              r,
              when: `${r.end_date === today ? "Aujourd'hui" : "Demain"}${r.return_time ? ` · ${formatTime(r.return_time)}` : ""}`,
              where: r.return_place,
            }))}
            onOpen={openReservation}
          />
        </Card>
      </div>

      {/* État de la flotte aujourd'hui */}
      <Card className="mt-6 p-6">
        <p className="mb-4 text-sm font-extrabold uppercase tracking-wide text-navy">La flotte aujourd&apos;hui</p>
        {cars.length === 0 ? (
          <p className="text-sm text-muted">Aucun véhicule pour l&apos;instant.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cars.map((c) => {
              const current = ongoing.find((r) => r.car_id === c.id);
              const next = confirmed
                .filter((r) => r.car_id === c.id && (r.start_date || "") > today)
                .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""))[0];
              const state =
                c.status !== "available"
                  ? { label: "Retiré du site", cls: "bg-slate-200 text-slate-700" }
                  : current
                    ? { label: `Loué → ${formatDate(current.end_date)}`, cls: "bg-sky-soft text-sky-text" }
                    : { label: "Libre", cls: "bg-emerald-100 text-emerald-800" };
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                  <div className="bg-brand-mist flex h-14 w-20 flex-shrink-0 items-center justify-center rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={apiImageUrl(c.image_url)} alt="" className="max-h-11 w-auto object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-navy">{c.name}</p>
                    <span className={cn("mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold", state.cls)}>{state.label}</span>
                    {next && !current && c.status === "available" && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted">
                        <CalendarClock className="h-3 w-3" /> Prochaine : {formatDate(next.start_date)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function PendingRow({ r, onOpen }: { r: ReservationFromApi; onOpen: () => void }) {
  const { upsertReservation } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const confirm = async () => {
    setBusy(true);
    setErr("");
    try {
      const updated = await updateReservationStatus(r.id, "confirmed");
      upsertReservation({ ...r, ...(updated || {}), status: "confirmed" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action impossible.");
      setBusy(false);
    }
  };

  return (
    <li className="rounded-2xl border border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button type="button" onClick={onOpen} className="min-w-0 text-left">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            {reservationRef(r.id)} · reçue {formatDateTime(r.created_at)} <SourceBadge source={r.source} />
          </p>
          <p className="mt-1 font-extrabold text-navy">
            {r.full_name} <span className="font-semibold text-muted">· {r.car_name}</span>
          </p>
          <p className="text-sm text-ink-soft">
            {formatDate(r.start_date)} → {formatDate(r.end_date)} · <span className="font-bold">{formatPrice(r.total_price)}</span>
          </p>
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex h-10 items-center rounded-full border-2 border-line px-4 text-xs font-bold text-navy hover:border-navy"
          >
            Détails
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Confirmer
          </button>
        </div>
      </div>
      {err && <p className="mt-2 text-sm font-semibold text-red-700">{err}</p>}
    </li>
  );
}

function MovementList({
  title,
  icon: Icon,
  items,
  empty,
  onOpen,
}: {
  title: string;
  icon: React.ElementType;
  items: { r: ReservationFromApi; when: string; where?: string | null }[];
  empty: string;
  onOpen: (id: number) => void;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
        <Icon className="h-4 w-4 text-sky-text" /> {title}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map(({ r, when, where }) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onOpen(r.id)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl bg-mist px-4 py-3 text-left hover:bg-sky-soft/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-navy">
                    {r.car_name} · {r.full_name}
                  </p>
                  <p className="truncate text-xs text-muted">{where || "Lieu non précisé"}</p>
                </div>
                <span className="flex-shrink-0 text-xs font-bold text-sky-text">{when}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
