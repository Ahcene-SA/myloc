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
  X,
} from "lucide-react";
import { useAdmin } from "../AdminContext";
import { useAuth } from "../AuthContext";
import { apiImageUrl, isOwner, updateReservationStatus, type ReservationFromApi } from "@/lib/api";
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
  secondaryBtn,
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
  // Demandes dont la date de départ est passée : à refuser (ou à régulariser), pas à confirmer
  const pendingFresh = pending.filter((r) => (r.start_date || "") >= today);
  const pendingOverdue = pending.filter((r) => (r.start_date || "") < today);
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
      hint: pendingOverdue.length
        ? `dont ${pendingOverdue.length} à date dépassée`
        : pending.length
          ? "demande(s) en attente"
          : "rien en attente",
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
    // Le chiffre d'affaires n'est visible que par le propriétaire
    isOwner(user?.role)
      ? {
          label: `Confirmé en ${monthLabel}`,
          value: formatPrice(monthRevenue),
          hint: "locations qui démarrent ce mois-ci",
          icon: Wallet,
          go: () => showReservations("all"),
        }
      : {
          label: "Départs et retours",
          value: String(departures.length + returns.length),
          hint: "aujourd'hui et demain",
          icon: CalendarClock,
          go: () => setActiveTab("planning"),
        },
  ];

  return (
    <div>
      <PageTitle kicker={`Bonjour, ${firstName}`} title="Tableau de bord">
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
              "group min-w-0 rounded-lg border border-slate-200 bg-white p-4 text-start shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50/60",
              alert && "border-t-2 border-t-amber-400"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium text-slate-500">{label}</span>
              <Icon className={cn("h-4 w-4 flex-shrink-0", alert ? "text-amber-600" : "text-slate-400")} />
            </div>
            <p className="mt-2 truncate text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
              <span className="truncate">{hint}</span>
              <ArrowRight className="h-3 w-3 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
            </p>
          </button>
        ))}
      </div>

      {/* items-start : la carte « Aujourd'hui et demain » garde sa hauteur naturelle */}
      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1.25fr_1fr]">
        {/* Demandes à traiter */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
            <p className="text-sm font-semibold text-slate-900">Demandes à traiter</p>
            {pending.length > 0 && (
              <button type="button" onClick={() => showReservations("pending")} className="text-sm font-medium text-sky-text hover:underline">
                Tout voir
              </button>
            )}
          </div>
          {pending.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              Aucune demande en attente. Les nouvelles réservations du site arriveront ici.
            </p>
          ) : (
            <>
              {pendingFresh.length > 0 && (
                <ul className="divide-y divide-slate-200">
                  {pendingFresh.slice(0, 5).map((r) => (
                    <PendingRow key={r.id} r={r} onOpen={() => openReservation(r.id)} />
                  ))}
                </ul>
              )}
              {pendingOverdue.length > 0 && (
                <div className={cn(pendingFresh.length > 0 && "border-t border-slate-200")}>
                  <p className="bg-slate-50 px-5 pt-3 text-xs font-medium text-red-700">
                    Date de départ dépassée ({pendingOverdue.length})
                  </p>
                  <p className="border-b border-slate-200 bg-slate-50 px-5 pb-3 text-xs text-slate-500">Demandes restées sans réponse : refusez-les, ou ouvrez-les pour changer les dates.</p>
                  <ul className="divide-y divide-slate-200">
                    {pendingOverdue.slice(0, 5).map((r) => (
                      <PendingRow key={r.id} r={r} overdue onOpen={() => openReservation(r.id)} />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Mouvements du jour */}
        <Card className="overflow-hidden">
          <p className="border-b border-slate-200 px-5 py-3.5 text-sm font-semibold text-slate-900">Aujourd&apos;hui et demain</p>
          <div className="p-5">
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
          <div className="my-4 h-px bg-slate-200" />
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
          </div>
        </Card>
      </div>

      {/* État de la flotte aujourd'hui */}
      <Card className="mt-6 p-5">
        <p className="mb-4 text-sm font-semibold text-slate-900">La flotte aujourd&apos;hui</p>
        {cars.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun véhicule pour l&apos;instant.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cars.map((c) => {
              const current = ongoing.find((r) => r.car_id === c.id);
              const next = confirmed
                .filter((r) => r.car_id === c.id && (r.start_date || "") > today)
                .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""))[0];
              const state =
                c.status !== "available"
                  ? { label: "Retiré du site", cls: "bg-slate-50 text-slate-600 ring-slate-500/20" }
                  : current
                    ? { label: `Loué → ${formatDate(current.end_date)}`, cls: "bg-sky-soft/60 text-sky-text ring-sky/30" }
                    : { label: "Libre", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" };
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-md border border-slate-200 p-2.5">
                  <div className="flex h-12 w-16 flex-shrink-0 items-center justify-center rounded border border-slate-100 bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={apiImageUrl(c.image_url)} alt="" className="max-h-9 w-auto object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{c.name}</p>
                    <span className={cn("mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", state.cls)}>{state.label}</span>
                    {next && !current && c.status === "available" && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
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

function PendingRow({ r, onOpen, overdue = false }: { r: ReservationFromApi; onOpen: () => void; overdue?: boolean }) {
  const { upsertReservation } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Date dépassée : l'action proposée est de refuser la demande (et non de la confirmer)
  const decide = async (status: "confirmed" | "rejected") => {
    setBusy(true);
    setErr("");
    try {
      const updated = await updateReservationStatus(r.id, status, status === "rejected" ? "Date de départ dépassée." : undefined);
      upsertReservation({ ...r, ...(updated || {}), status });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action impossible.");
      setBusy(false);
    }
  };

  return (
    <li className={cn("px-5 py-3.5 transition-colors hover:bg-slate-50/60", overdue && "bg-red-50/30")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onOpen} className="min-w-0 text-start">
          <p className="text-xs text-slate-500">
            {reservationRef(r.id)} · reçue {formatDateTime(r.created_at)} <SourceBadge source={r.source} />
            {overdue && (
              <span className="ms-1 inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                Date dépassée
              </span>
            )}
          </p>
          <p className="mt-0.5 text-sm font-medium text-slate-900">
            {r.full_name} <span className="font-normal text-slate-500">· {r.car_name}</span>
          </p>
          <p className="text-sm text-slate-600">
            {formatDate(r.start_date)} → {formatDate(r.end_date)} · <span className="font-medium tabular-nums text-slate-900">{formatPrice(r.total_price)}</span>
          </p>
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onOpen}
            className={cn(secondaryBtn, "h-8 px-3")}
          >
            Détails
          </button>
          {overdue ? (
            <button
              type="button"
              onClick={() => decide("rejected")}
              disabled={busy}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-red-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              Refuser
            </button>
          ) : (
            <button
              type="button"
              onClick={() => decide("confirmed")}
              disabled={busy}
              className={cn(primaryBtn, "h-8 px-3")}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Confirmer
            </button>
          )}
        </div>
      </div>
      {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
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
      <p className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
        <Icon className="h-4 w-4 text-slate-400" /> {title}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-md border border-slate-200">
          {items.map(({ r, when, where }) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onOpen(r.id)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-start hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {r.car_name} · {r.full_name}
                  </p>
                  <p className="truncate text-xs text-slate-500">{where || "Lieu non précisé"}</p>
                </div>
                <span className="flex-shrink-0 text-xs font-medium text-slate-600">{when}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
